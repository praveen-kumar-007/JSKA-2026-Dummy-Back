// sharePageController.js
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const FRONTEND_BASE = (process.env.FRONTEND_URL || 'https://dhanbadkabaddiassociation.tech').replace(/\/$/, '');

const pages = {
  register: {
    title: 'Player Registration | DDKA',
    description: 'Register as a Kabaddi player with Dhanbad District Kabaddi Association (DDKA). Online form for players in Dhanbad, Jharkhand.',
    path: '/register'
  },
  institution: {
    title: 'Institution Affiliation | DDKA',
    description: 'Register your school, college or club for affiliation with DDKA. Join the Dhanbad kabaddi community.',
    path: '/institution'
  },
  contact: {
    title: 'Contact DDKA',
    description: 'Get in touch with Dhanbad District Kabaddi Association (DDKA) for queries, tournament details and affiliation.',
    path: '/contact'
  },
  gallery: {
    title: 'DDKA Gallery',
    description: 'Photos and highlights from DDKA events and tournaments.',
    path: '/gallery'
  },
  'hall-of-fame': {
    title: 'Hall of Fame | DDKA',
    description: 'Honouring the finest kabaddi players from Dhanbad who made us proud.',
    path: '/hall-of-fame'
  },
  'terms-conditions': {
    title: 'Terms & Conditions | DDKA',
    description: 'Official terms and conditions for registrations and participation with DDKA.',
    path: '/terms-conditions'
  },
  'privacy-policy': {
    title: 'Privacy Policy | DDKA',
    description: 'Our privacy practices and how we handle personal information for DDKA registrations and services.',
    path: '/privacy-policy'
  },
  'kabaddi-rules': {
    title: 'Kabaddi Rules | DDKA',
    description: 'Official kabaddi rules and playing guidelines as followed by DDKA.',
    path: '/kabaddi-rules'
  },
  'technical-official-registration': {
    title: 'Technical Official Registration | DDKA',
    description: 'Register as a referee or technical official with DDKA.',
    path: '/technical-official-registration'
  }
};

exports.sharePage = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = pages[slug];
    if (!page) return res.status(404).send('Page not found');

    const pageUrl = `${FRONTEND_BASE}${page.path}`;
    const title = escapeHtml(page.title);
    const description = escapeHtml(page.description);
    const image = process.env.EMAIL_LOGO_URL || `${FRONTEND_BASE}/logo.png`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <meta name="description" content="${description}" />
    <link rel="canonical" href="${pageUrl}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${image}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />

    <meta name="robots" content="index,follow" />
  </head>
  <body>
    <p>This page is a preview for sharing and indexing. You will be redirected in a moment to <a href="${pageUrl}">${pageUrl}</a>.</p>
    <noscript><p>If not redirected automatically, <a href="${pageUrl}">click here</a>.</p></noscript>
    <script>setTimeout(function(){ window.location.replace('${pageUrl}'); }, 2500);</script>
  </body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('Error generating preview');
  }
};