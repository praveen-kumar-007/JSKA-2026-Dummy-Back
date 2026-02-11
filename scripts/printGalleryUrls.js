const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const Gallery = require('../models/Gallery');
    const imgs = await Gallery.find().lean();
    for (const img of imgs) {
      console.log('URL JSON:', JSON.stringify(img.url));
      console.log('CHARS:', [...img.url].map(c => c.charCodeAt(0)).join(','));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();