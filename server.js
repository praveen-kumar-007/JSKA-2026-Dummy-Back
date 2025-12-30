const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db.js');
const instRoutes = require('./routes/instRoutes');
const playerRoutes = require('./routes/playerRoutes');
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
    'http://localhost:5173',
    'https://ddka.vercel.app',
    'https://dhanbadkabaddiassociation.tech',
    'https://www.dhanbadkabaddiassociation.tech',
    process.env.FRONTEND_URL
].filter(Boolean); // Removes undefined values if FRONTEND_URL is missing

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);
        
        // Normalize the origin (remove trailing slash)
        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked]: Attempted access from ${origin}`);
            callback(new Error('CORS Policy: Origin not allowed by DDKA Security'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
        owner: 'Pappu Kumar Yadav & Praveen Kumar',
        established: 2017 
    });
});

app.use('/api/institutions', instRoutes);
app.use('/api/players', playerRoutes);

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