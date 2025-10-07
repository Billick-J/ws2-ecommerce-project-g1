// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// trust proxy (Render and many PaaS sit behind a proxy)
app.set('trust proxy', 1);

// security & performance
app.use(helmet());
app.use(compression());

// static files (served from /public)
app.use(express.static(path.join(__dirname, 'public')));

// body parser + view engine
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Session setup (15 minutes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true if you serve only HTTPS
    maxAge: 15 * 60 * 1000
  }
}));

// expose user session and req to views (must be before routes/404)
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.req = req; // allows templates to read req.originalUrl
  next();
});


// Routes (mount routers)
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
const passwordRoute = require('./routes/password');

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute);

// Health check (useful for Render / uptime checks)
app.get('/health', (req, res) => res.type('text').send('ok'));

// ✅ STEP 5: Test routes for error handling
app.get('/crash', (req, res) => { // ✅ Added
  throw new Error('Intentional crash for testing (sync)');
});

app.get('/boom', (req, res) => { // ✅ Added (you already had this)
  throw new Error('Test 500');
});

app.get('/crash-async', async (req, res, next) => { // ✅ Added
  try {
    throw new Error('Async crash test');
  } catch (err) {
    next(err);
  }
});


// Lightweight 404 logger (keep before final 404 handler)
app.use((req, res, next) => {
  if (!res.headersSent) {
    console.warn('404 candidate:', req.method, req.originalUrl, 'referrer:', req.get('referer') || '-');
  }
  next();
});

// API-aware 404 + no-store cache header
app.use((req, res) => {
  // prevent caching of 404 responses
  res.set('Cache-Control', 'no-store');

  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found', path: req.path });
  }
  res.status(404).render('404', { title: 'Page Not Found' });
});

// 500 error handler (last)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  // in production show a gentle message
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Server Error' });
  }
  res.status(500).render('500', { title: 'Server Error' });
});

// MongoDB Setup + start server
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

async function main() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
main();
