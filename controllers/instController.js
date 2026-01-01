const Institution = require('../models/Institution');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// 1. Register a new institution with Cloudinary Screenshot
const registerInstitution = async (req, res) => {
    try {
        const { regNo, transactionId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required." });
        }

        const existing = await Institution.findOne({ $or: [{ regNo }, { transactionId }] });
        if (existing) {
            if (file) fs.unlinkSync(file.path); 
            return res.status(400).json({ success: false, message: "Reg No or Transaction ID already exists." });
        }

        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'ddka_payments',
        });

        if (file) fs.unlinkSync(file.path);

        const newInstitution = new Institution({
            ...req.body,
            screenshotUrl: result.secure_url
        });

        await newInstitution.save();
        res.status(201).json({ success: true, message: "Application submitted successfully!" });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
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