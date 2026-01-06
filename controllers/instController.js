const Institution = require('../models/Institution');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

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
        res.status(201).json({ success: true, message: "Application submitted successfully!" });
    } catch (error) {
        if (req.files) {
            const files = req.files;
            ['screenshot', 'instLogo'].forEach((field) => {
                const f = files[field];
                const file = Array.isArray(f) ? f[0] : f;
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
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

// 3. Update Status (Handles ID from body to match your frontend)
const updateStatus = async (req, res) => {
    try {
        const { id, status } = req.body; 
        const inst = await Institution.findByIdAndUpdate(id, { status }, { new: true });
        
        if (!inst) return res.status(404).json({ success: false, message: "Record not found" });
        
        res.status(200).json({ success: true, data: inst });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// 4. Delete Entry
const deleteInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Institution.findByIdAndDelete(id);
        
        if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
        
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
        res.status(200).json({ success: true, data: inst });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching institution' });
    }
};

module.exports = { registerInstitution, getAllInstitutions, updateStatus, deleteInstitution, getInstitutionById };