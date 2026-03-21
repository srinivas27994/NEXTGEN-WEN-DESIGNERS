// ============================================================
//  NextGen Web Designers — Backend Server
//  Node.js + Express | Gmail (nodemailer) | JSON file DB
// ============================================================

const express    = require('express');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html

// ── Config — fill these in .env or directly here ─────────
const GMAIL_USER = process.env.GMAIL_USER || 'nextgenwebdesigners279@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'YOUR_APP_PASSWORD_HERE'; // Gmail App Password
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

// ── Ensure reviews.json exists ────────────────────────────
if (!fs.existsSync(REVIEWS_FILE)) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify({ reviews: [] }, null, 2));
  console.log('✅ Created reviews.json');
}

// ── Nodemailer transporter ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,   // Use Gmail App Password (not your real password)
  },
});

// ── Helper: read reviews ──────────────────────────────────
function readReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
  } catch {
    return { reviews: [] };
  }
}

// ── Helper: save reviews ──────────────────────────────────
function saveReviews(data) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2));
}

// ════════════════════════════════════════════════════════════
//  POST /api/review  — submit a new review
// ════════════════════════════════════════════════════════════
app.post('/api/review', async (req, res) => {
  const { name, business, email, service, rating, message } = req.body;

  // Basic validation
  if (!name || !message || !rating) {
    return res.status(400).json({ success: false, error: 'Name, rating, and message are required.' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
  }

  // ── 1. Save to reviews.json ───────────────────────────
  const db = readReviews();
  const newReview = {
    id:        Date.now(),
    name:      name.trim(),
    business:  business ? business.trim() : '',
    email:     email    ? email.trim()    : '',
    service:   service  || '',
    rating:    Number(rating),
    message:   message.trim(),
    date:      new Date().toISOString(),
    dateIST:   new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
  };
  db.reviews.unshift(newReview); // newest first
  saveReviews(db);
  console.log(`✅ Review saved from: ${name} (${rating}★)`);

  // ── 2. Send email via Gmail ───────────────────────────
  const starStr = '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));

  const htmlBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#f1f5f9;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:28px 32px;">
      <h2 style="margin:0;font-size:1.4rem;">⭐ New Client Review Received!</h2>
      <p style="margin:.4rem 0 0;opacity:.85;font-size:.9rem;">NextGen Web Designers</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:.93rem;">
        <tr><td style="padding:8px 0;color:#94a3b8;width:130px;">Rating</td>
            <td style="padding:8px 0;font-size:1.3rem;letter-spacing:2px;">${starStr} <strong style="font-size:.9rem;">(${rating}/5)</strong></td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Name</td>
            <td style="padding:8px 0;font-weight:700;">${name}</td></tr>
        ${business ? `<tr><td style="padding:8px 0;color:#94a3b8;">Business</td><td style="padding:8px 0;">${business}</td></tr>` : ''}
        ${email    ? `<tr><td style="padding:8px 0;color:#94a3b8;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#a78bfa;">${email}</a></td></tr>` : ''}
        ${service  ? `<tr><td style="padding:8px 0;color:#94a3b8;">Service</td><td style="padding:8px 0;">${service}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#94a3b8;">Date</td>
            <td style="padding:8px 0;">${newReview.dateIST}</td></tr>
      </table>
      <div style="margin-top:20px;padding:18px;background:rgba(255,255,255,.05);border-left:4px solid #7c3aed;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">Review Message</p>
        <p style="margin:0;font-style:italic;line-height:1.7;">"${message}"</p>
      </div>
      <p style="margin-top:24px;font-size:.78rem;color:#64748b;border-top:1px solid rgba(255,255,255,.08);padding-top:16px;">
        This review was automatically submitted via the NextGen Web Designers website and saved to your reviews database.
        <br>Total reviews stored: <strong>${db.reviews.length}</strong>
      </p>
    </div>
  </div>`;

  const textBody = [
    '⭐ NEW REVIEW — NextGen Web Designers',
    '',
    `Rating   : ${starStr} (${rating}/5)`,
    `Name     : ${name}`,
    business ? `Business : ${business}` : null,
    email    ? `Email    : ${email}`    : null,
    service  ? `Service  : ${service}`  : null,
    `Date     : ${newReview.dateIST}`,
    '',
    '── Message ──────────────────────────',
    message,
    '─────────────────────────────────────',
    `Total reviews in DB: ${db.reviews.length}`,
  ].filter(Boolean).join('\n');

  try {
    await transporter.sendMail({
      from:    `"NextGen Website" <${GMAIL_USER}>`,
      to:      GMAIL_USER,
      subject: `⭐ ${rating}-Star Review from ${name} | NextGen Web Designers`,
      text:    textBody,
      html:    htmlBody,
    });
    console.log(`📧 Email sent to ${GMAIL_USER}`);
  } catch (emailErr) {
    // Still return success — review is saved even if email fails
    console.error('⚠️  Email failed (review still saved):', emailErr.message);
    return res.status(200).json({
      success: true,
      warning: 'Review saved but email delivery failed. Check Gmail App Password.',
      review:  newReview,
    });
  }

  return res.status(200).json({ success: true, review: newReview });
});

// ════════════════════════════════════════════════════════════
//  GET /api/reviews  — fetch all saved reviews (for display)
// ════════════════════════════════════════════════════════════
app.get('/api/reviews', (req, res) => {
  const db = readReviews();
  res.json({ success: true, total: db.reviews.length, reviews: db.reviews });
});

// ════════════════════════════════════════════════════════════
//  GET /api/reviews/stats  — aggregate stats
// ════════════════════════════════════════════════════════════
app.get('/api/reviews/stats', (req, res) => {
  const db = readReviews();
  const all = db.reviews;
  if (!all.length) return res.json({ success: true, total: 0, average: 0, distribution: {} });

  const total   = all.length;
  const average = (all.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const dist    = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  all.forEach(r => dist[r.rating]++);

  res.json({ success: true, total, average: Number(average), distribution: dist });
});

// ── Fallback: serve index.html for any unknown route ─────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 NextGen Web Designers — Server Running!');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Reviews: http://localhost:${PORT}/api/reviews`);
  console.log(`   Stats:   http://localhost:${PORT}/api/reviews/stats`);
  console.log('');
  console.log('⚙️  Make sure GMAIL_PASS is set to a Gmail App Password.');
  console.log('   Guide: https://myaccount.google.com/apppasswords');
  console.log('');
});
