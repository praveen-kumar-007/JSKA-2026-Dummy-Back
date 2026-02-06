
const Player = require('../models/Player');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { sendApprovalEmail, sendRejectionEmail, sendDeletionEmail, sendApplicationReceivedEmail, sendRegistrationNotification } = require('../utils/mailer');
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
        let pathParts = segments.slice(uploadIndex + 1); // e.g. ['v123', 'ddka', 'players', 'profiles', 'file.jpg']
        if (pathParts.length && /^v[0-9]+$/.test(pathParts[0])) {
            pathParts = pathParts.slice(1);
        }
        if (!pathParts.length) return;
        const publicIdWithExt = pathParts.join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Failed to delete Cloudinary asset for player:', err);
    }
};

// Get a single player by Mongo _id (for admin details view)
exports.getPlayerById = async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
        const loginActivities = await getLoginActivities(player._id, 'player');
        // Map backend fields to frontend expected fields
        const mappedPlayer = {
            ...player.toObject(),
            photo: player.photoUrl,
            front: player.aadharFrontUrl,
            back: player.aadharBackUrl,
            receipt: player.receiptUrl
        };
        mappedPlayer.loginActivities = loginActivities;
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

        // Enforce global setting: if IDs are hidden to users, do not expose idNo in public endpoint
        try {
            const Setting = require('../models/Setting');
            const settings = await Setting.findOne().sort({ createdAt: -1 });
            const showIdsToUsers = settings ? settings.showIdsToUsers : true;
            if (!showIdsToUsers) {
                // hide id-related fields
                delete mappedPlayer.idNo;
            }
        } catch (e) {
            // if settings lookup fails, default to showing ids
            console.error('Error checking settings for public ID exposure', e);
        }

        res.status(200).json({ success: true, data: mappedPlayer });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching player by idNo' });
    }
};

// Helper: generate a unique player ID like DDKA-1234
const generateUniquePlayerIdNo = async () => {
    const prefix = 'DDKA-';
    for (let attempt = 0; attempt < 10; attempt++) {
        const random = Math.floor(1000 + Math.random() * 9000); // 4-digit number
        const idNo = `${prefix}${random}`;
        const existing = await Player.findOne({ idNo }).select('_id').lean();
        if (!existing) return idNo;
    }
    throw new Error('Unable to generate unique player ID number');
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

        if (newPlayer.email) {
            try {
                await sendApplicationReceivedEmail({ to: newPlayer.email, name: newPlayer.fullName, entityType: 'player' });
            } catch (err) {
                console.error('Failed to send application received email:', err);
            }
        }

        try {
            await sendRegistrationNotification({
                entityType: 'player',
                name: newPlayer.fullName,
                details: {
                    Email: newPlayer.email,
                    Phone: newPlayer.phone,
                    Parents: newPlayer.parentsPhone,
                    Aadhar: newPlayer.aadharNumber,
                    'Transaction ID': newPlayer.transactionId,
                    'Player Role': newPlayer.memberRole,
                    Reason: newPlayer.reasonForJoining
                },
                documents: [
                    { label: 'Photo', url: newPlayer.photoUrl },
                    { label: 'Aadhar (Front)', url: newPlayer.aadharFrontUrl },
                    { label: 'Aadhar (Back)', url: newPlayer.aadharBackUrl },
                    { label: 'Payment receipt', url: newPlayer.receiptUrl }
                ]
            });
        } catch (err) {
            console.error('Failed to notify DDKA of player registration:', err);
        }

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

        const player = await Player.findById(id);
        if (!player) return res.status(404).json({ success: false, message: "Player not found" });

        const previousStatus = player.status;
        player.status = status;

        // Automatically generate ID number when approving a player, if not already set
        if (status === 'Approved' && !player.idNo) {
            try {
                player.idNo = await generateUniquePlayerIdNo();
            } catch (genErr) {
                console.error('Failed to generate player ID number:', genErr);
            }
        }

        const updated = await player.save();

        // Send status emails (only when status changes)
        let emailSent = false;
        let emailType = null;
        let emailSkipped = false;
        let emailSkipReason = null;
        if (updated.email && status !== previousStatus) {
            if (status === 'Approved') {
                try {
                    const result = await sendApprovalEmail({
                        to: updated.email,
                        name: updated.fullName,
                        idNo: updated.idNo,
                        entityType: 'player',
                        loginId: updated.email,
                        loginPassword: updated.phone,
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
                    const result = await sendRejectionEmail({ to: updated.email, name: updated.fullName, entityType: 'player' });
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

        res.status(200).json({ success: true, message: `Status updated to ${status}`, data: updated, emailSent, emailType, emailSkipped, emailSkipReason });
    } catch (error) {
        console.error('updatePlayerStatus error:', error);
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

// 4. Admin: edit core details and optionally replace Cloudinary documents
exports.updatePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const player = await Player.findById(id);
        if (!player) {
            // cleanup any uploaded temp files if player not found
            if (req.files) {
                Object.values(req.files).forEach((f) => safeUnlink(f));
            }
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        // Only allow specific fields to be edited from admin UI
        const allowedFields = [
            'fullName',
            'fathersName',
            'gender',
            'dob',
            'bloodGroup',
            'email',
            'phone',
            'parentsPhone',
            'address',
            'aadharNumber',
            'sportsExperience',
            'reasonForJoining',
            'memberRole',
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                player[field] = req.body[field];
            }
        });

        if (req.body.dob) {
            player.dob = new Date(req.body.dob);
        }

        // Handle optional new files for Cloudinary
        const files = req.files || {};
        const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
        const frontFile = Array.isArray(files.front) ? files.front[0] : files.front;
        const backFile = Array.isArray(files.back) ? files.back[0] : files.back;
        const receiptFile = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

        const uploadPromises = [];
        if (photoFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(player.photoUrl);
                    const resUpload = await cloudinary.uploader.upload(photoFile.path, { folder: 'ddka/players/profiles' });
                    player.photoUrl = resUpload.secure_url;
                    safeUnlink(photoFile);
                })()
            );
        }
        if (frontFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(player.aadharFrontUrl);
                    const resUpload = await cloudinary.uploader.upload(frontFile.path, { folder: 'ddka/players/aadhar' });
                    player.aadharFrontUrl = resUpload.secure_url;
                    safeUnlink(frontFile);
                })()
            );
        }
        if (backFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(player.aadharBackUrl);
                    const resUpload = await cloudinary.uploader.upload(backFile.path, { folder: 'ddka/players/aadhar' });
                    player.aadharBackUrl = resUpload.secure_url;
                    safeUnlink(backFile);
                })()
            );
        }
        if (receiptFile) {
            uploadPromises.push(
                (async () => {
                    await deleteCloudinaryByUrl(player.receiptUrl);
                    const resUpload = await cloudinary.uploader.upload(receiptFile.path, { folder: 'ddka/players/payments' });
                    player.receiptUrl = resUpload.secure_url;
                    safeUnlink(receiptFile);
                })()
            );
        }

        if (uploadPromises.length > 0) {
            await Promise.all(uploadPromises);
        }

        const updated = await player.save();
        const mappedPlayer = {
            ...updated.toObject(),
            photo: updated.photoUrl,
            front: updated.aadharFrontUrl,
            back: updated.aadharBackUrl,
            receipt: updated.receiptUrl,
        };

        return res.status(200).json({ success: true, message: 'Player updated successfully', data: mappedPlayer });
    } catch (error) {
        console.error('updatePlayer error:', error);
        if (req.files) {
            Object.values(req.files).forEach((f) => safeUnlink(f));
        }
        return res.status(500).json({ success: false, message: 'Failed to update player' });
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
        const existing = await Player.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Player not found" });

        // Delete associated Cloudinary documents if present
        try {
            const deletions = [];
            if (existing.photoUrl) deletions.push(deleteCloudinaryByUrl(existing.photoUrl));
            if (existing.aadharFrontUrl) deletions.push(deleteCloudinaryByUrl(existing.aadharFrontUrl));
            if (existing.aadharBackUrl) deletions.push(deleteCloudinaryByUrl(existing.aadharBackUrl));
            if (existing.receiptUrl) deletions.push(deleteCloudinaryByUrl(existing.receiptUrl));
            if (deletions.length) {
                await Promise.all(deletions);
            }
        } catch (err) {
            console.error('Failed to delete one or more player assets from Cloudinary:', err);
        }

        const deleted = await Player.findByIdAndDelete(req.params.id);

        if (deleted && deleted.email) {
            try {
                await sendDeletionEmail({ to: deleted.email, name: deleted.fullName, entityType: 'player' });
            } catch (err) {
                console.error('Failed to send deletion email:', err);
            }
        }

        res.status(200).json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};