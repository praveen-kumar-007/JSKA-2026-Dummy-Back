require('dotenv').config();
const mongoose = require('mongoose');
// Using global fetch (Node 18+)
// const fetch = require('node-fetch');
const Gallery = require('../models/Gallery');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    const docs = await Gallery.find().sort({ createdAt: -1 }).limit(10).lean();
    if (!docs || docs.length === 0) {
      console.log('No gallery documents found');
      return process.exit(0);
    }
    console.log('Latest gallery docs:');
    docs.forEach((d, i) => console.log(i + 1, d._id, d.url, d.public_id));

    // Fetch the first URL headers
    const first = docs[0].url;
    console.log('\nFetching URL headers for the first image:', first);
    const res = await fetch(first, { method: 'HEAD' });
    console.log('Status:', res.status);
    console.log('Content-type:', res.headers.get('content-type'));
    console.log('Content-length:', res.headers.get('content-length'));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
