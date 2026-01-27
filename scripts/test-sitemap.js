require('dotenv').config();
const mongoose = require('mongoose');
const News = require('../models/News');
const Player = require('../models/Player');
const Institution = require('../models/Institution');
const Gallery = require('../models/Gallery');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const newsList = await News.find({ status: 'published' }).sort({ createdAt: -1 }).select('updatedAt createdAt _id title images').lean();
    const playerList = await Player.find().select('updatedAt createdAt _id idNo status').lean();
    const instList = await Institution.find().select('updatedAt createdAt _id status instName instLogoUrl').lean();
    const galleryList = await Gallery.find().select('updatedAt createdAt _id images').lean();

    console.log('news count', newsList.length);
    console.log('player count', playerList.length, 'examples', playerList.slice(0,3));
    console.log('inst count', instList.length, 'examples', instList.slice(0,3));
    console.log('gallery count', galleryList.length);

    // Check for problematic dates
    const badNews = newsList.filter(n => !(n.updatedAt || n.createdAt));
    console.log('news missing dates', badNews.length);
    const badPlayers = playerList.filter(p => !(p.updatedAt || p.createdAt));
    console.log('players missing dates', badPlayers.length);
    const badInst = instList.filter(i => !(i.updatedAt || i.createdAt));
    console.log('inst missing dates', badInst.length);

    process.exit(0);
  } catch (err) {
    console.error('Error testing sitemap queries', err);
    process.exit(1);
  }
};

run();