const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const Gallery = require('../models/Gallery');

    const images = await Gallery.find().lean();
    console.log(`Found ${images.length} gallery images`);

    for (const img of images) {
      const newUrl = (img.url || '').replace(/[\r\n\t]+/g, '').trim();
      const newPublicId = (img.public_id || '').replace(/[\r\n\t]+/g, '').trim();
      if (newUrl !== img.url || newPublicId !== img.public_id) {
        await Gallery.updateOne({ _id: img._id }, { $set: { url: newUrl, public_id: newPublicId } });
        console.log(`Updated ${img._id}`);
      }
    }

    console.log('Done cleaning gallery URLs');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();