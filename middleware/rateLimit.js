const rateLimit = require('express-rate-limit');

// Generic API limiter (can be used later if needed)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for contact form submissions
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per 10 minutes per IP
  message: {
    success: false,
    message: 'Too many contact requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for newsletter subscriptions
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many newsletter requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  contactLimiter,
  newsletterLimiter,
  // Public registration endpoints (players, institutions, technical officials)
  registrationLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 registrations per IP per hour
    message: {
      success: false,
      message: 'Too many registration attempts from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};
