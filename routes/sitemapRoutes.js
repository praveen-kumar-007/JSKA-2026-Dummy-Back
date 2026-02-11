const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Player = require('../models/Player');
const Institution = require('../models/Institution');
const Gallery = require('../models/Gallery');

// Simple dynamic sitemap generator
router.get('/sitemap.xml', async (req, res) => {
  console.log('[SITEMAP] Request received');
  try {
    const hostname = (process.env.FRONTEND_URL || 'https://jharkhandkabaddiassociation.org').replace(/\/$/, '');
    console.log('[SITEMAP] hostname', hostname);

    const staticUrls = [
      { loc: '/', priority: 1.0, changefreq: 'daily' },
      { loc: '/about', priority: 0.7, changefreq: 'monthly' },
      { loc: '/affiliated-institutions', priority: 0.8, changefreq: 'monthly' },
      { loc: '/gallery', priority: 0.7, changefreq: 'weekly' },
      { loc: '/news', priority: 0.9, changefreq: 'daily' },
      { loc: '/kabaddi-rules', priority: 0.5, changefreq: 'yearly' },
      { loc: '/register', priority: 1.0, changefreq: 'weekly' },
      { loc: '/institution', priority: 0.95, changefreq: 'weekly' },
      { loc: '/technical-official-registration', priority: 0.95, changefreq: 'weekly' },
      { loc: '/verification', priority: 0.85, changefreq: 'monthly' },
      { loc: '/donate', priority: 0.7, changefreq: 'monthly' },
      { loc: '/login', priority: 0.6, changefreq: 'monthly' },
      { loc: '/contact', priority: 0.6, changefreq: 'monthly' },
      { loc: '/privacy-policy', priority: 0.3, changefreq: 'yearly' },
      { loc: '/terms-conditions', priority: 0.3, changefreq: 'yearly' }
    ];

    // fetch dynamic content
    const [newsList, playerList, instList, galleryList] = await Promise.all([
      News.find({ status: 'published' }).sort({ createdAt: -1 }).select('updatedAt createdAt _id title images').lean(),
      Player.find().select('updatedAt createdAt _id idNo status').lean(),
      Institution.find().select('updatedAt createdAt _id status instName instLogoUrl').lean(),
      Gallery.find().select('updatedAt createdAt _id images').lean()
    ]).catch(() => [[], [], [], []]);

    const urls = [];

    const safeDateToIso = (d) => {
      try {
        if (!d) return null;
        const date = new Date(d);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch (e) {
        return null;
      }
    };

    // add static urls
    staticUrls.forEach(u => urls.push({ loc: hostname + u.loc, changefreq: u.changefreq, priority: u.priority }));

    // add published news items
    newsList.forEach(n => {
      const loc = `${hostname}/news/${n._id}`;
      urls.push({ loc, lastmod: safeDateToIso(n.updatedAt || n.createdAt), priority: 0.8, images: n.images && n.images.length ? [n.images[0]] : [] });
    });

    // add players (only approved players with assigned idNo, map to public ID card URL)
    playerList.filter(p => p.idNo && p.status === 'Approved').forEach(p => {
      const loc = `${hostname}/id-card/${encodeURIComponent(p.idNo)}`;
      urls.push({ loc, lastmod: safeDateToIso(p.updatedAt || p.createdAt), priority: 0.9 });
    });

    // institutions (only include approved institutions if public)
    instList.filter(i => i.status === 'Approved').forEach(i => {
      const loc = `${hostname}/institution/${i._id}`;
      urls.push({ loc, lastmod: safeDateToIso(i.updatedAt || i.createdAt), priority: 0.9 });
    });

    // gallery items
    galleryList.forEach(g => {
      const loc = `${hostname}/gallery/${g._id}`;
      urls.push({ loc, lastmod: safeDateToIso(g.updatedAt || g.createdAt), priority: 0.6, images: g.images && g.images.length ? [g.images[0]] : [] });
    });

    // build xml
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    urls.forEach(u => {
      xml += '  <url>\n';
      xml += `    <loc>${u.loc}</loc>\n`;
      if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
      if (u.changefreq) xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority !== undefined) xml += `    <priority>${u.priority}</priority>\n`;
      if (u.images && u.images.length) {
        u.images.forEach(img => {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${img}</image:loc>\n`;
          xml += '    </image:image>\n';
        });
      }
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    // cache sitemap for an hour
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (err) {
    console.error('[SITEMAP] Error building sitemap', err);
    return res.status(500).end();
  }
});

module.exports = router;
