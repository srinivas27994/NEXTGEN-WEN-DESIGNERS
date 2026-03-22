require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

const GMAIL_USER   = process.env.GMAIL_USER;
const GMAIL_PASS   = process.env.GMAIL_PASS;
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Create reviews.json if not exists
if (!fs.existsSync(REVIEWS_FILE)) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify({ reviews: [] }, null, 2));
}

// Read reviews
function readReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
  } catch {
    return { reviews: [] };
  }
}

// Save reviews
function saveReviews(data) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2));
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// POST - Submit review
app.post('/api/review', async (req, res) => {
  const { name, business, email, service, rating, message } = req.body;

  if (!name || !message || !rating) {
    return res.status(400).json({ 
      success: false, 
      error: 'Name, rating and message are required.' 
    });
  }

  // Save to reviews.json
  const db = readReviews();
  const newReview = {
    id:       Date.now(),
    name:     name.trim(),
    business: business || '',
    email:    email    || '',
    service:  service  || '',
    rating:   Number(rating),
    message:  message.trim(),
    date:     new Date().toISOString(),
    dateIST:  new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata' 
    }) + ' IST',
  };
  db.reviews.unshift(newReview);
  saveReviews(db);
  console.log('✅ Review saved:', name, rating + '★');

  // Send email
  const starStr = '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));

  try {
    await transporter.sendMail({
      from:    `"NextGen Website" <${GMAIL_USER}>`,
      to:      GMAIL_USER,
      subject: `⭐ ${rating}-Star Review from ${name} | NextGen Web Designers`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;">⭐ New Review Received!</h2>
            <p style="color:rgba(255,255,255,.85);margin:.3rem 0 0;font-size:.9rem;">NextGen Web Designers</p>
          </div>
          <div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e9ecef;">
            <p><strong>Rating:</strong> ${starStr} (${rating}/5)</p>
            <p><strong>Name:</strong> ${name}</p>
            ${business ? `<p><strong>Business:</strong> ${business}</p>` : ''}
            ${email    ? `<p><strong>Email:</strong> ${email}</p>`       : ''}
            ${service  ? `<p><strong>Service:</strong> ${service}</p>`   : ''}
            <p><strong>Date:</strong> ${newReview.dateIST}</p>
            <hr style="border:none;border-top:1px solid #dee2e6;margin:16px 0;">
            <p><strong>Review:</strong></p>
            <p style="background:white;padding:16px;border-radius:8px;border-left:4px solid #7c3aed;font-style:italic;">"${message}"</p>
            <p style="font-size:.75rem;color:#6c757d;margin-top:16px;">
              Total reviews: ${db.reviews.length}
            </p>
          </div>
        </div>
      `,
    });
    console.log('📧 Email sent successfully!');
    return res.status(200).json({ success: true, review: newReview });

  } catch (emailErr) {
    console.error('❌ Email error:', emailErr.message);
    return res.status(200).json({ 
      success: true, 
      warning: 'Review saved but email failed.',
      review: newReview 
    });
  }
});

// GET - All reviews
app.get('/api/reviews', (req, res) => {
  const db = readReviews();
  res.json({ success: true, total: db.reviews.length, reviews: db.reviews });
});

// Serve website
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Gmail: ${GMAIL_USER}`);
});
