const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db.js');
const instRoutes = require('./routes/instRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// --- UPDATED ALLOWED ORIGINS ---
const allowedOrigins = [
    'http://localhost:5173',           // Local Development
    'https://ddka.vercel.app',         // Vercel Deployment Link
    'https://dhanbadkabaddiassociation.tech',    // Your Purchased Domain (e.g., ddka.in)
    'https://www.dhanbadkabaddiassociation.tech/',// Include www version of your domain
    process.env.FRONTEND_URL           // URL from your .env file
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Log the blocked origin to help you debug if a new link fails
            console.log("Blocked by CORS:", origin);
            callback(new Error('CORS Policy: This origin is not allowed'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => res.send('DDKA Backend is Online with Cloudinary Support'));
app.use('/api/institutions', instRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));