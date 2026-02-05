const TechnicalOfficial = require('../models/TechnicalOfficial');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { sendApprovalEmail, sendRejectionEmail, sendDeletionEmail, sendApplicationReceivedEmail } = require('../utils/mailer');

// Helper to safely delete temp files
const safeUnlink = (file) => {
  if (!file) return;
  const path = file.path || (Array.isArray(file) && file[0] && file[0].path);
  if (path && fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
};

// Derive Cloudinary public_id from a secure_url and delete it
const deleteCloudinaryByUrl = async (url) => {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.findIndex((s) => s === 'upload');
    if (uploadIndex === -1) return;
    let pathParts = segments.slice(uploadIndex + 1);
    if (pathParts.length && /^v[0-9]+$/.test(pathParts[0])) {
      pathParts = pathParts.slice(1);
    }
    if (!pathParts.length) return;
    const publicIdWithExt = pathParts.join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary asset for technical official:', err);
  }
};

// Public: register a technical official
exports.registerTechnicalOfficial = async (req, res) => {
  try {
    const {
      candidateName,
      parentName,
      dob,
      address,
      aadharNumber,
      gender,
      bloodGroup,
      playerLevel,
      work,
      mobile,
      education,
      email,
      transactionId
    } = req.body;

    const files = req.files || {};
    const signatureFile = Array.isArray(files.signature) ? files.signature[0] : files.signature;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    const receiptFile = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

    // Validate required text fields
    if (
      !candidateName ||
      !parentName ||
      !dob ||
      !address ||
      !aadharNumber ||
      !gender ||
      !playerLevel ||
      !work ||
      !mobile ||
      !education ||
      !email ||
      !transactionId
    ) {
      safeUnlink(signatureFile);
      safeUnlink(photoFile);
      safeUnlink(receiptFile);
      return res.status(400).json({ success: false, message: 'All fields are mandatory, including Transaction ID.' });
    }

    // Validate files
    if (!signatureFile || !photoFile || !receiptFile) {
      safeUnlink(signatureFile);
      safeUnlink(photoFile);
      safeUnlink(receiptFile);
      return res.status(400).json({ success: false, message: 'Signature, Passport Size Photo and Payment Screenshot are required.' });
    }

    // Basic duplicate check by Aadhar, Email or Transaction ID
    const existing = await TechnicalOfficial.findOne({
      $or: [
        { aadharNumber },
        { email },
        { transactionId: transactionId && transactionId.toUpperCase().trim() }
      ]
    });

    if (existing) {
      safeUnlink(signatureFile);
      safeUnlink(photoFile);
      safeUnlink(receiptFile);
      return res.status(400).json({ success: false, message: 'Aadhar Number, Email or Transaction ID already registered as Technical Official.' });
    }

    // Upload to Cloudinary
    const [signatureUpload, photoUpload, receiptUpload] = await Promise.all([
      cloudinary.uploader.upload(signatureFile.path, {
        folder: 'ddka/technical-officials/signatures'
      }),
      cloudinary.uploader.upload(photoFile.path, {
        folder: 'ddka/technical-officials/photos'
      }),
      cloudinary.uploader.upload(receiptFile.path, {
        folder: 'ddka/technical-officials/payments'
      })
    ]);

    // Cleanup temp files
    safeUnlink(signatureFile);
    safeUnlink(photoFile);
    safeUnlink(receiptFile);

    const official = new TechnicalOfficial({
      candidateName,
      parentName,
      dob: new Date(dob),
      address,
      aadharNumber,
      gender,
      bloodGroup: bloodGroup || 'NA',
      playerLevel,
      work,
      mobile,
      education,
      email,
      transactionId: transactionId.toUpperCase().trim(),
      examFee: 1000,
      receiptUrl: receiptUpload.secure_url,
      signatureUrl: signatureUpload.secure_url,
      photoUrl: photoUpload.secure_url,
      status: 'Pending'
    });

    await official.save();

    // Send application received (pending) email
    if (official.email) {
      try {
        await sendApplicationReceivedEmail({
          to: official.email,
          name: official.candidateName,
          entityType: 'official',
        });
      } catch (err) {
        console.error('Failed to send technical official application received email:', err);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Technical Official application submitted successfully.',
      data: official
    });
  } catch (error) {
    if (req.files) {
      const files = req.files;
      safeUnlink(files.signature);
      safeUnlink(files.photo);
      safeUnlink(files.receipt);
    }
    console.error('registerTechnicalOfficial error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// Admin: get all technical officials
exports.getAllTechnicalOfficials = async (req, res) => {
  try {
    const officials = await TechnicalOfficial.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: officials });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching officials' });
  }
};

// Admin: get single official by ID
exports.getTechnicalOfficialById = async (req, res) => {
  try {
    const official = await TechnicalOfficial.findById(req.params.id);
    if (!official) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }
    return res.status(200).json({ success: true, data: official });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching official' });
  }
};

// Admin: update status (approve / reject / pending)
exports.updateTechnicalOfficialStatus = async (req, res) => {
  try {
    const { id, status, remarks } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const existing = await TechnicalOfficial.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    const previousStatus = existing.status;

    const updateDoc = { status };
    if (remarks !== undefined) updateDoc.remarks = remarks;
    const updated = await TechnicalOfficial.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    // Send status-based emails when status actually changes
    let emailSent = false;
    let emailType = null;
    let emailSkipped = false;
    let emailSkipReason = null;

    if (updated.email && status !== previousStatus) {
      try {
        if (status === 'Approved') {
          const result = await sendApprovalEmail({
            to: updated.email,
            name: updated.candidateName,
            entityType: 'official',
            loginId: updated.email,
            loginPassword: updated.mobile,
          });
          if (result && result.skipped) {
            emailSkipped = true;
            emailSkipReason = result.reason || 'disabled';
          } else {
            emailSent = true;
            emailType = 'approval';
          }
        } else if (status === 'Rejected') {
          const result = await sendRejectionEmail({
            to: updated.email,
            name: updated.candidateName,
            entityType: 'official',
          });
          if (result && result.skipped) {
            emailSkipped = true;
            emailSkipReason = result.reason || 'disabled';
          } else {
            emailSent = true;
            emailType = 'rejection';
          }
        } else if (status === 'Pending') {
          // Optional: notify when moved back to pending
          const result = await sendApplicationReceivedEmail({
            to: updated.email,
            name: updated.candidateName,
            entityType: 'official',
          });
          if (result && result.skipped) {
            emailSkipped = true;
            emailSkipReason = result.reason || 'disabled';
          } else {
            emailSent = true;
            emailType = 'pending';
          }
        }
      } catch (err) {
        console.error('Failed to send technical official status email:', err);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: updated,
      emailSent,
      emailType,
      emailSkipped,
      emailSkipReason,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Admin: edit core details and optionally replace uploaded files
exports.updateTechnicalOfficial = async (req, res) => {
  try {
    const allowedFields = [
      'candidateName',
      'parentName',
      'dob',
      'address',
      'aadharNumber',
      'gender',
      'playerLevel',
      'work',
      'mobile',
      'education',
      'email',
      'email',
      'remarks',
      'grade',
      'examScore'
    ];

    const updateDoc = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateDoc[field] = req.body[field];
      }
    });

    if (updateDoc.dob) {
      updateDoc.dob = new Date(updateDoc.dob);
    }

    // If examScore is provided, normalize to a number and auto-calculate grade
    if (updateDoc.examScore !== undefined) {
      const rawScore = updateDoc.examScore;
      const numericScore = Number(rawScore);

      if (Number.isNaN(numericScore)) {
        // Invalid score; remove from update and do not touch grade
        delete updateDoc.examScore;
      } else {
        updateDoc.examScore = numericScore;

        // Auto-assign grade based on score range
        if (numericScore >= 71 && numericScore <= 100) {
          updateDoc.grade = 'A';
        } else if (numericScore >= 61 && numericScore <= 70) {
          updateDoc.grade = 'B';
        } else if (numericScore >= 50 && numericScore <= 60) {
          updateDoc.grade = 'C';
        } else {
          // Outside defined bands: clear grade
          updateDoc.grade = null;
        }
      }
    }

    // Handle optional new files
    const files = req.files || {};
    const signatureFile = Array.isArray(files.signature) ? files.signature[0] : files.signature;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    const receiptFile = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

    const uploadPromises = [];
    if (signatureFile) {
      uploadPromises.push(
        (async () => {
          // delete previous signature
          if (req.params.id) {
            const existing = await TechnicalOfficial.findById(req.params.id).select('signatureUrl');
            if (existing && existing.signatureUrl) {
              await deleteCloudinaryByUrl(existing.signatureUrl);
            }
          }
          const up = await cloudinary.uploader.upload(signatureFile.path, {
            folder: 'ddka/technical-officials/signatures'
          });
          updateDoc.signatureUrl = up.secure_url;
          safeUnlink(signatureFile);
        })()
      );
    }
    if (photoFile) {
      uploadPromises.push(
        (async () => {
          if (req.params.id) {
            const existing = await TechnicalOfficial.findById(req.params.id).select('photoUrl');
            if (existing && existing.photoUrl) {
              await deleteCloudinaryByUrl(existing.photoUrl);
            }
          }
          const up = await cloudinary.uploader.upload(photoFile.path, {
            folder: 'ddka/technical-officials/photos'
          });
          updateDoc.photoUrl = up.secure_url;
          safeUnlink(photoFile);
        })()
      );
    }
    if (receiptFile) {
      uploadPromises.push(
        (async () => {
          if (req.params.id) {
            const existing = await TechnicalOfficial.findById(req.params.id).select('receiptUrl');
            if (existing && existing.receiptUrl) {
              await deleteCloudinaryByUrl(existing.receiptUrl);
            }
          }
          const up = await cloudinary.uploader.upload(receiptFile.path, {
            folder: 'ddka/technical-officials/payments'
          });
          updateDoc.receiptUrl = up.secure_url;
          safeUnlink(receiptFile);
        })()
      );
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const updated = await TechnicalOfficial.findByIdAndUpdate(req.params.id, updateDoc, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    return res.status(200).json({ success: true, message: 'Technical Official updated successfully', data: updated });
  } catch (error) {
    if (req.files) {
      const files = req.files;
      ['signature', 'photo', 'receipt'].forEach((field) => {
        const f = files[field];
        const file = Array.isArray(f) ? f[0] : f;
        safeUnlink(file);
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to update official' });
  }
};

// Admin: delete official
exports.deleteTechnicalOfficial = async (req, res) => {
  try {
    const existing = await TechnicalOfficial.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    // Delete associated Cloudinary assets if present
    try {
      const deletions = [];
      if (existing.signatureUrl) deletions.push(deleteCloudinaryByUrl(existing.signatureUrl));
      if (existing.photoUrl) deletions.push(deleteCloudinaryByUrl(existing.photoUrl));
      if (existing.receiptUrl) deletions.push(deleteCloudinaryByUrl(existing.receiptUrl));
      if (deletions.length) {
        await Promise.all(deletions);
      }
    } catch (err) {
      console.error('Failed to delete one or more technical official assets from Cloudinary:', err);
    }

    const deleted = await TechnicalOfficial.findByIdAndDelete(req.params.id);

    if (deleted.email) {
      try {
        await sendDeletionEmail({
          to: deleted.email,
          name: deleted.candidateName,
          entityType: 'official',
        });
      } catch (err) {
        console.error('Failed to send technical official deletion email:', err);
      }
    }

    return res.status(200).json({ success: true, message: 'Technical Official deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete official' });
  }
};
