const express = require('express');
const dotenv = require('dotenv');
// Load environment variables immediately so modules that run at import time (like mailer) see them
dotenv.config();
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db.js');
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
const verificationRoutes = require('./routes/verificationRoutes');
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
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:3000',
    'http://localhost:3001',
    // Production Deployments
    'https://jska.vercel.app',
    'https://jska-a6bglnrea-praveen-kumar.vercel.app',
    'https://jharkhandkabaddiassociation.org',
    'https://www.jharkhandkabaddiassociation.org',
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

        const isVercelPreview = normalizedOrigin.endsWith('.vercel.app');

        if (allowed.includes(normalizedOrigin) || isVercelPreview) {
            callback(null, true);
        } else {
            // Warn only in development
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[CORS Blocked]: Attempted access from ${origin}`);
            }
            callback(new Error('CORS Policy: Origin not allowed by JSKA Security'));
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
        message: 'JSKA API Gateway Online', 
        owner: 'Jharkhand State Kabaddi Association',
        established: 2001 
    });
});

// Image proxy to avoid CORS issues in client-side exports
app.get('/api/proxy/image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'Missing url parameter' });
    }

    let parsed;
    try {
        parsed = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ success: false, message: 'Invalid protocol' });
        }
    } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid url' });
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return res.status(502).json({ success: false, message: 'Failed to fetch image' });
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(buffer);
    } catch (err) {
        console.error('Proxy image error:', err);
        return res.status(500).json({ success: false, message: 'Proxy error' });
    }
});

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
app.use('/api/verification', verificationRoutes);

// Sitemap (dynamic) - serves sitemap.xml including dynamic articles/images
const sitemapRoutes = require('./routes/sitemapRoutes');
app.use('/', sitemapRoutes);

// Share / Preview pages for static routes (help crawlers read meta tags)
const sharePageRoutes = require('./routes/sharePageRoutes');
app.use('/', sharePageRoutes);

// 7. Error Handling Middleware
app.use(errorHandler);

// 8. Server Activation
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    ============================================
    JSKA SERVER RUNNING ON PORT: ${PORT}
    MODE: ${process.env.NODE_ENV || 'Development'}
    ============================================
    `);
});