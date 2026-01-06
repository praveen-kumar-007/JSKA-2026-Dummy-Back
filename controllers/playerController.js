
const Player = require('../models/Player');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Get a single player by Mongo _id (for admin details view)
exports.getPlayerById = async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
        // Map backend fields to frontend expected fields
        const mappedPlayer = {
            ...player.toObject(),
            photo: player.photoUrl,
            front: player.aadharFrontUrl,
            back: player.aadharBackUrl,
            receipt: player.receiptUrl
        };
        res.status(200).json({ success: true, data: mappedPlayer });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching player' });
    }
};

// Get a single player by stored ID card number (idNo)
exports.getPlayerByIdNo = async (req, res) => {
    try {
        const player = await Player.findOne({ idNo: req.params.idNo });
        if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

        const mappedPlayer = {
            ...player.toObject(),
            photo: player.photoUrl,
            front: player.aadharFrontUrl,
            back: player.aadharBackUrl,
            receipt: player.receiptUrl
        };

        res.status(200).json({ success: true, data: mappedPlayer });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching player by idNo' });
    }
};

// 1. Register Player with 4 Mandatory Files
exports.registerPlayer = async (req, res) => {
    try {
        const { 
            fullName, fathersName, gender, dob, bloodGroup, 
            email, phone, parentsPhone, address, aadharNumber, 
            sportsExperience, reasonForJoining, transactionId, acceptedTerms 
        } = req.body;
        
        const files = req.files;

        // --- STRICT VALIDATION ---
        // Validate text fields including mandatory reasonForJoining
        if (!fullName || !fathersName || !dob || !email || !phone || !aadharNumber || !transactionId || !reasonForJoining) {
            if (files) Object.values(files).forEach(f => {
                if (fs.existsSync(f[0].path)) fs.unlinkSync(f[0].path);
            });
            return res.status(400).json({ success: false, message: "All text fields are mandatory." });
        }

        if (acceptedTerms !== 'true' && acceptedTerms !== true) {
            if (files) Object.values(files).forEach(f => {
                if (fs.existsSync(f[0].path)) fs.unlinkSync(f[0].path);
            });
            return res.status(400).json({ success: false, message: "You must agree to the Terms & Conditions to register." });
        }

        // Validate mandatory 4 files
        if (!files || !files.photo || !files.front || !files.back || !files.receipt) {
            if (files) Object.values(files).forEach(f => {
                if (fs.existsSync(f[0].path)) fs.unlinkSync(f[0].path);
            });
            return res.status(400).json({ success: false, message: "All 4 documents (Photo, Aadhar Front/Back, and Receipt) are required." });
        }

        // --- DUPLICATE CHECK ---
        const existing = await Player.findOne({ 
            $or: [{ aadharNumber }, { transactionId: transactionId.toUpperCase().trim() }] 
        });
        
        if (existing) {
            Object.values(files).forEach(f => fs.unlinkSync(f[0].path));
            return res.status(400).json({ success: false, message: "Aadhar Number or Transaction ID already registered." });
        }

        // --- CLOUDINARY UPLOAD ---
        const uploadPromises = [
            cloudinary.uploader.upload(files.photo[0].path, { folder: 'ddka/players/profiles' }),
            cloudinary.uploader.upload(files.front[0].path, { folder: 'ddka/players/aadhar' }),
            cloudinary.uploader.upload(files.back[0].path, { folder: 'ddka/players/aadhar' }),
            cloudinary.uploader.upload(files.receipt[0].path, { folder: 'ddka/players/payments' })
        ];

        const [photo, front, back, receipt] = await Promise.all(uploadPromises);

        // --- CLEANUP LOCAL TEMP FILES ---
        Object.values(files).forEach(fileArray => {
            if (fs.existsSync(fileArray[0].path)) fs.unlinkSync(fileArray[0].path);
        });

        // --- SAVE TO DATABASE ---
        const newPlayer = new Player({
            fullName,
            fathersName,
            gender,
            dob: new Date(dob),
            bloodGroup,
            email,
            phone,
            parentsPhone,
            address,
            aadharNumber,
            sportsExperience,
            reasonForJoining,
            transactionId: transactionId.toUpperCase().trim(),
            acceptedTerms: acceptedTerms === 'true' || acceptedTerms === true,
            photoUrl: photo.secure_url,
            aadharFrontUrl: front.secure_url,
            aadharBackUrl: back.secure_url,
            receiptUrl: receipt.secure_url,
            status: 'Pending'
        });

        await newPlayer.save();
        res.status(201).json({ 
            success: true, 
            message: "Registration successful! Awaiting manual verification." 
        });

    } catch (error) {
        console.error("Backend Error:", error);
        if (req.files) {
            Object.values(req.files).forEach(f => {
                if (fs.existsSync(f[0].path)) fs.unlinkSync(f[0].path);
            });
        }
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// 2. Get All Players (Dashboard)
exports.getAllPlayers = async (req, res) => {
    try {
        const players = await Player.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: players });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching players" });
    }
};

// 3. Update Status (Dashboard)
exports.updatePlayerStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        const updated = await Player.findByIdAndUpdate(id, { status }, { new: true });
        
        if (!updated) return res.status(404).json({ success: false, message: "Player not found" });
        
        res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// 3b. Assign / save ID card number (idNo) for a player
exports.assignPlayerIdNo = async (req, res) => {
    try {
        const { id, transactionId, idNo, memberRole } = req.body;

        if (!idNo) {
            return res.status(400).json({ success: false, message: 'idNo is required' });
        }

        // Prefer _id if provided, otherwise fall back to transactionId
        const query = id
            ? { _id: id }
            : transactionId
                ? { transactionId: transactionId.toUpperCase().trim() }
                : null;

        if (!query) {
            return res.status(400).json({ success: false, message: 'Player id or transactionId is required' });
        }

        const updateDoc = { idNo };
        if (memberRole) {
            updateDoc.memberRole = memberRole;
        }

        const updated = await Player.findOneAndUpdate(query, updateDoc, { new: true });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        res.status(200).json({ success: true, message: 'ID number assigned successfully', data: updated });
    } catch (error) {
        console.error('assignPlayerIdNo error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign ID number' });
    }
};

// 3c. Clear/remove ID card number and role for a player
exports.clearPlayerIdNo = async (req, res) => {
    try {
        const { id, transactionId } = req.body;

        const query = id
            ? { _id: id }
            : transactionId
                ? { transactionId: transactionId.toUpperCase().trim() }
                : null;

        if (!query) {
            return res.status(400).json({ success: false, message: 'Player id or transactionId is required' });
        }

        const updated = await Player.findOneAndUpdate(
            query,
            { idNo: null, memberRole: 'Player' },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        res.status(200).json({ success: true, message: 'ID number removed successfully', data: updated });
    } catch (error) {
        console.error('clearPlayerIdNo error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear ID number' });
    }
};

// 4. Delete Player (Dashboard)
exports.deletePlayer = async (req, res) => {
    try {
        const deleted = await Player.findByIdAndDelete(req.params.id);
        
        if (!deleted) return res.status(404).json({ success: false, message: "Player not found" });
        
        res.status(200).json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};