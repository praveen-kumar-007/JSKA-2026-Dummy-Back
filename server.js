const express = require('express');
const dotenv = require('dotenv');
// Load environment variables immediately so modules that run at import time (like mailer) see them
dotenv.config();
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db.js');
const instRoutes = require('./routes/instRoutes');
const playerRoutes = require('./routes/playerRoutes');
const newsRoutes = require('./routes/newsRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const technicalOfficialRoutes = require('./routes/technicalOfficialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const refereeRoutes = require('./routes/refereeRoutes');
const championPlayerRoutes = require('./routes/championPlayerRoutes');
const refereeAdminRoutes = require('./routes/refereeAdminRoutes');
const donationRoutes = require('./routes/donationRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

// 1. Load Environment Variables
dotenv.config();

// 2. Database Connection
connectDB();

// 3. Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// 4. Enhanced CORS Configuration
// Whitelist includes local dev, Vercel, and your technical domains
const allowedOrigins = [
    // Local Development
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    // Production Deployments
    'https://ddka.vercel.app',
    'https://dhanbadkabaddiassociation.tech',
    'https://www.dhanbadkabaddiassociation.tech',
    // Environment Variable
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);

        // Normalize the origin (remove trailing slash and lowercase)
        const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
        const allowed = allowedOrigins.map(o => o.replace(/\/$/, '').toLowerCase());

        if (allowed.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            // Warn only in development
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[CORS Blocked]: Attempted access from ${origin}`);
            }
            callback(new Error('CORS Policy: Origin not allowed by DDKA Security'));
        }
    },
    // Allow PATCH so admin management toggles work (CORS preflight)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 5. Middleware
// Increased limits to handle large image data/strings during registration
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 6. Routes
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'DDKA API Gateway Online', 
        owner: 'Dhanbad District Kabaddi Association',
        established: 2001 
    });
});

app.use('/api/institutions', instRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/technical-officials', technicalOfficialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referees', refereeRoutes);
// Settings (public + admin)
const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);
app.use('/api/champion-players', championPlayerRoutes);
app.use('/api/admin/referees', refereeAdminRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/auth', authRoutes);

// 7. Error Handling Middleware
app.use(errorHandler);

// 8. Server Activation
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    ============================================
    DDKA SERVER RUNNING ON PORT: ${PORT}
    MODE: ${process.env.NODE_ENV || 'Development'}
    ============================================
    `);
});