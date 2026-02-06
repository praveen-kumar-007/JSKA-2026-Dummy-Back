const Institution = require('../models/Institution');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { sendApprovalEmail, sendRejectionEmail, sendDeletionEmail, sendApplicationReceivedEmail } = require('../utils/mailer');
const { getLoginActivities } = require('../utils/loginActivity');

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
        console.error('Failed to delete Cloudinary asset for institution:', err);
    }
};

// 1. Register a new institution with Cloudinary Screenshot
const registerInstitution = async (req, res) => {
    try {
        const { regNo, transactionId, acceptedTerms } = req.body;
        const files = req.files || {};
        const screenshotFile = Array.isArray(files.screenshot) ? files.screenshot[0] : files.screenshot;
        const logoFile = Array.isArray(files.instLogo) ? files.instLogo[0] : files.instLogo;

        if (!screenshotFile) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required." });
        }

        if (!logoFile) {
            if (screenshotFile && fs.existsSync(screenshotFile.path)) fs.unlinkSync(screenshotFile.path);
            return res.status(400).json({ success: false, message: "Institution / college / club logo is required." });
        }

        if (acceptedTerms !== 'true' && acceptedTerms !== true) {
            if (screenshotFile && fs.existsSync(screenshotFile.path)) fs.unlinkSync(screenshotFile.path);
            if (logoFile && fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path);
            return res.status(400).json({ success: false, message: "You must agree to the Terms & Conditions to register." });
        }

        const existing = await Institution.findOne({ $or: [{ regNo }, { transactionId }] });
        if (existing) {
            if (screenshotFile && fs.existsSync(screenshotFile.path)) fs.unlinkSync(screenshotFile.path); 
            if (logoFile && fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path); 
            return res.status(400).json({ success: false, message: "Reg No or Transaction ID already exists." });
        }

        const paymentUpload = await cloudinary.uploader.upload(screenshotFile.path, {
            folder: 'ddka_payments',
        });

        if (screenshotFile && fs.existsSync(screenshotFile.path)) fs.unlinkSync(screenshotFile.path);

        const logoUpload = await cloudinary.uploader.upload(logoFile.path, {
            folder: 'ddka_institution_logos',
        });
        const logoUrl = logoUpload.secure_url;
        if (fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path);

        const newInstitution = new Institution({
            ...req.body,
            acceptedTerms: acceptedTerms === 'true' || acceptedTerms === true,
            screenshotUrl: paymentUpload.secure_url,
            instLogoUrl: logoUrl
        });

        await newInstitution.save();

        // Send application received email (non-blocking)
        if (newInstitution.email) {
            try {
                await sendApplicationReceivedEmail({ to: newInstitution.email, name: newInstitution.instName, entityType: 'institution' });
            } catch (err) {
                console.error('Failed to send application received email:', err);
            }
        }

        res.status(201).json({ success: true, message: "Application submitted successfully!" });
    } catch (error) {
        if (req.files) {
            const files = req.files;
            ['screenshot', 'instLogo'].forEach((field) => {
                const f = files[field];
                const file = Array.isArray(f) ? f[0] : f;
                safeUnlink(file);
            });
        }
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 2. Get all institutions (For Admin Dashboard)
const getAllInstitutions = async (req, res) => {
    try {
        const institutions = await Institution.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: institutions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
};

// 2b. Get only approved institutions (Public - for Affiliated Institutions page)
const getApprovedInstitutions = async (req, res) => {
    try {
        const institutions = await Institution.find({ status: 'Approved' }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: institutions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
};

// 3. Update Status (Handles ID from body to match your frontend)
const updateStatus = async (req, res) => {
    try {
        const { id, status } = req.body; 
        const inst = await Institution.findById(id);
        if (!inst) return res.status(404).json({ success: false, message: "Record not found" });

        const previousStatus = inst.status;
        inst.status = status;
        const updated = await inst.save();

        let emailSent = false;
        let emailType = null;
        let emailSkipped = false;
        let emailSkipReason = null;
        if (updated.email && status !== previousStatus) {
            if (status === 'Approved') {
                try {
                    const result = await sendApprovalEmail({
                        to: updated.email,
                        name: updated.instName,
                        entityType: 'institution',
                        loginId: updated.email,
                        loginPassword: updated.officePhone || updated.altPhone,
                    });
                    if (result && result.skipped) {
                        emailSkipped = true;
                        emailSkipReason = result.reason || 'disabled';
                    } else {
                        emailSent = true;
                        emailType = 'approval';
                    }
                } catch (err) {
                    console.error('Failed to send approval email:', err);
                }
            } else if (status === 'Rejected') {
                try {
                    const result = await sendRejectionEmail({ to: updated.email, name: updated.instName, entityType: 'institution' });
                    if (result && result.skipped) {
                        emailSkipped = true;
                        emailSkipReason = result.reason || 'disabled';
                    } else {
                        emailSent = true;
                        emailType = 'rejection';
                    }
                } catch (err) {
                    console.error('Failed to send rejection email:', err);
                }
            }
        }

        res.status(200).json({ success: true, data: updated, emailSent, emailType, emailSkipped, emailSkipReason });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// 4. Delete Entry
const deleteInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Institution.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Record not found" });

        // Delete associated Cloudinary assets if present
        try {
            const deletions = [];
            if (existing.screenshotUrl) deletions.push(deleteCloudinaryByUrl(existing.screenshotUrl));
            if (existing.instLogoUrl) deletions.push(deleteCloudinaryByUrl(existing.instLogoUrl));
            if (deletions.length) {
                await Promise.all(deletions);
            }
        } catch (err) {
            console.error('Failed to delete one or more institution assets from Cloudinary:', err);
        }

        const deleted = await Institution.findByIdAndDelete(id);

        if (deleted && deleted.email) {
            try {
                await sendDeletionEmail({ to: deleted.email, name: deleted.instName, entityType: 'institution' });
            } catch (err) {
                console.error('Failed to send deletion email:', err);
            }
        }

        res.status(200).json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};

// 5. Get a single institution by ID (for admin details view)
const getInstitutionById = async (req, res) => {
    try {
        const inst = await Institution.findById(req.params.id);
        if (!inst) return res.status(404).json({ success: false, message: 'Institution not found' });
        const loginActivities = await getLoginActivities(inst._id, 'institution');
        const payload = inst.toObject();
        payload.loginActivities = loginActivities;
        res.status(200).json({ success: true, data: payload });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching institution' });
    }
};

// 6. Public: get a single approved institution by id for SEO-friendly public pages
const getInstitutionPublicById = async (req, res) => {
    try {
        const inst = await Institution.findById(req.params.id);
        if (!inst || inst.status !== 'Approved') return res.status(404).json({ success: false, message: 'Institution not found' });
        // send subset to avoid leaking admin-only or personal fields (no phones, no surfaceType, no transaction/regNo)
        const payload = {
            _id: inst._id,
            instName: inst.instName,
            instType: inst.instType,
            instLogoUrl: inst.instLogoUrl,
            year: inst.year,
            totalPlayers: inst.totalPlayers,
            area: inst.area,
            // intentionally excluded: surfaceType, officePhone, altPhone, regNo, transactionId
            email: inst.email || null,
            headName: inst.headName || null,
            secretaryName: inst.secretaryName || null,
            website: inst.website || null,
            address: inst.address,
            description: inst.description || null
        };
        res.status(200).json({ success: true, data: payload });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching institution' });
    }
};

// 7. Admin: edit core details and optionally replace logo / screenshot
const updateInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await Institution.findById(id);
        if (!inst) {
            if (req.files) {
                const files = req.files;
                ['screenshot', 'instLogo'].forEach((field) => {
                    const f = files[field];
                    const file = Array.isArray(f) ? f[0] : f;
                    safeUnlink(file);
                });
            }
            return res.status(404).json({ success: false, message: 'Institution not found' });
        }

        const allowedFields = [
            'instType',
            'instName',
            'regNo',
            'year',
            'headName',
            'secretaryName',
            'totalPlayers',
            'area',
            'surfaceType',
            'officePhone',
            'altPhone',
            'email',
            'address',
            'description',
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                inst[field] = req.body[field];
            }
        });

        if (req.body.year) {
            const yearNum = Number(req.body.year);
            if (!Number.isNaN(yearNum)) {
                inst.year = yearNum;
            }
        }
        if (req.body.totalPlayers) {
            const totalPlayersNum = Number(req.body.totalPlayers);
            if (!Number.isNaN(totalPlayersNum)) {
                inst.totalPlayers = totalPlayersNum;
            }
        }

        const files = req.files || {};
        const screenshotFile = Array.isArray(files.screenshot) ? files.screenshot[0] : files.screenshot;
        const logoFile = Array.isArray(files.instLogo) ? files.instLogo[0] : files.instLogo;

        const uploadPromises = [];
        if (screenshotFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(inst.screenshotUrl);
                    const up = await cloudinary.uploader.upload(screenshotFile.path, { folder: 'ddka_payments' });
                    inst.screenshotUrl = up.secure_url;
                    safeUnlink(screenshotFile);
                })()
            );
        }
        if (logoFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(inst.instLogoUrl);
                    const up = await cloudinary.uploader.upload(logoFile.path, { folder: 'ddka_institution_logos' });
                    inst.instLogoUrl = up.secure_url;
                    safeUnlink(logoFile);
                })()
            );
        }

        if (uploadPromises.length > 0) {
            await Promise.all(uploadPromises);
        }

        const updated = await inst.save();
        return res.status(200).json({ success: true, message: 'Institution updated successfully', data: updated });
    } catch (error) {
        console.error('updateInstitution error:', error);
        if (req.files) {
            const files = req.files;
            ['screenshot', 'instLogo'].forEach((field) => {
                const f = files[field];
                const file = Array.isArray(f) ? f[0] : f;
                safeUnlink(file);
            });
        }
        return res.status(500).json({ success: false, message: 'Failed to update institution' });
    }
};

module.exports = { registerInstitution, getAllInstitutions, getApprovedInstitutions, updateStatus, deleteInstitution, getInstitutionById, getInstitutionPublicById, updateInstitution };