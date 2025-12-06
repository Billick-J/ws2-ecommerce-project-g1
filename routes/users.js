// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const verifyTurnstile = require('../utils/TurnstileVerify.js');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');

const saltRounds = 12;
const resend = new Resend(process.env.RESEND_API_KEY);

// ----- Middleware: Require Admin -----
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send("Access denied. Admins only.");
  }
  next();
}

// ----- GET Register -----
router.get('/register', (req, res) => {
  res.render('register', { title: "Register", message: null });
});

// ----- POST Register -----
router.post('/register', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection('users');

    const { firstName, lastName, email, password } = req.body;

    // ----- Server-side password validation -----
    const passwordValid = password.length >= 8 &&
                          /[A-Z]/.test(password) &&
                          /[a-z]/.test(password) &&
                          /\d/.test(password);

    if (!passwordValid) {
      return res.status(400).render('register', {
        title: "Register",
        message: "Password does not meet requirements. It must have at least 8 characters, 1 uppercase, 1 lowercase, and 1 number."
      });
    }

    // Turnstile verification
    const token = req.body['cf-turnstile-response'];
    const verifyResult = await verifyTurnstile(token, req.ip);

    if (!verifyResult?.success) {
      return res.status(400).render('register', {
        title: "Register",
        message: "Verification failed. Please try again."
      });
    }

    // Check if email exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.render('register', {
        title: "Register",
        message: "Email already registered."
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Email verification setup
    const verificationToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    const newUser = {
      userId: uuidv4(),
      firstName,
      lastName,
      email,
      passwordHash,
      role: "customer",
      accountStatus: "active",
      isEmailVerified: false,
      verificationToken,
      tokenExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(newUser);

    // Email verification link
    const baseUrl = process.env.BASE_URL;
    const verifyUrl = `${baseUrl}/users/verify/${verificationToken}`;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `<h2>Welcome, ${firstName}!</h2>
      <p>Please verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>`
    });

    res.render('register', {
      title: "Register",
      message: "Registration successful! Check your email to verify your account.",
      showVerificationLink: verifyUrl
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.render('register', {
      title: "Register",
      message: "Something went wrong."
    });
  }
});


// ----- GET Login -----
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/users/dashboard');
  res.render('login', { title: "Login", message: null });
});

// ----- POST Login -----
router.post('/login', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection('users');

    // Turnstile
    const token = req.body['cf-turnstile-response'];
    const verifyResult = await verifyTurnstile(token, req.ip);

    if (!verifyResult?.success) {
      return res.status(400).render('login', {
        title: "Login",
        message: "Verification failed. Please try again."
      });
    }

    const { email, password } = req.body;
    const user = await usersCollection.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.render('login', { title: "Login", message: "Invalid email or password." });

    if (!user.isEmailVerified)
      return res.render('login', { title: "Login", message: "Please verify your email first." });

    if (user.accountStatus !== "active")
      return res.render('login', { title: "Login", message: "Account inactive. Contact support." });

    req.session.user = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      accountStatus: user.accountStatus
    };

    res.redirect('/users/dashboard');

  } catch (err) {
    console.error("Login error:", err);
    res.render('login', { title: "Login", message: "Something went wrong." });
  }
});

// ----- GET Dashboard -----
router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  res.render('dashboard', { title: "Dashboard", user: req.session.user });
});

// ----- GET Admin Dashboard -----
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const users = await db.collection('users').find().toArray();
    res.render('admin', { title: "Admin Dashboard", users });
  } catch (err) {
    console.error("Admin error:", err);
    res.send("Unable to load admin dashboard.");
  }
});

// ----- GET Logout -----
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ----- Email Verification -----
router.get('/verify/:token', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      verificationToken: req.params.token,
      tokenExpiry: { $gt: new Date() }
    });

    if (!user) return res.send("Verification link invalid or expired.");

    await usersCollection.updateOne(
      { email: user.email },
      {
        $set: { isEmailVerified: true, updatedAt: new Date() },
        $unset: { verificationToken: "", tokenExpiry: "" }
      }
    );

    res.send("Email verified! You can now log in.");

  } catch (err) {
    console.error("Verify error:", err);
    res.send("Something went wrong.");
  }
});

module.exports = router;
