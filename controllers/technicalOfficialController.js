const TechnicalOfficial = require('../models/TechnicalOfficial');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Helper to safely delete temp files
const safeUnlink = (file) => {
  if (!file) return;
  const path = file.path || (Array.isArray(file) && file[0] && file[0].path);
  if (path && fs.existsSync(path)) {
    fs.unlinkSync(path);
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

    const updateDoc = { status };
    if (remarks !== undefined) updateDoc.remarks = remarks;

    const updated = await TechnicalOfficial.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    return res.status(200).json({ success: true, message: 'Status updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Admin: edit core details (without changing files)
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
      'remarks'
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

    const updated = await TechnicalOfficial.findByIdAndUpdate(req.params.id, updateDoc, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }

    return res.status(200).json({ success: true, message: 'Technical Official updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update official' });
  }
};

// Admin: delete official
exports.deleteTechnicalOfficial = async (req, res) => {
  try {
    const deleted = await TechnicalOfficial.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Technical Official not found' });
    }
    return res.status(200).json({ success: true, message: 'Technical Official deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete official' });
  }
};
