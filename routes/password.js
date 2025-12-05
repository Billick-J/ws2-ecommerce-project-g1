// routes/password.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const verifyTurnstile = require('../utils/turnstileVerify.js');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');

const saltRounds = 12;
const resend = new Resend(process.env.RESEND_API_KEY);

// ----- GET Forgot Password -----
router.get('/forgot', (req, res) => {
  res.render('forgot-password', { title: "Forgot Password" });
});

// ----- POST Forgot Password -----
router.post('/forgot', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection('users');

    // Turnstile
    const turnToken = req.body['cf-turnstile-response'];
    const verifyResult = await verifyTurnstile(turnToken, req.ip);

    if (!verifyResult?.success) {
      return res.send("Verification failed. Try again.");
    }

    const email = req.body.email;
    const user = await usersCollection.findOne({ email });

    // Always pretend success for security
    if (!user)
      return res.send("If this email exists, a reset link has been sent.");

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 3600000);

    await usersCollection.updateOne(
      { email },
      { $set: { resetToken, resetExpiry } }
    );

    const baseUrl = process.env.BASE_URL;
    const resetUrl = `${baseUrl}/password/reset/${resetToken}`;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Reset Your Password",
      html: `<h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>`
    });

    res.send("If this email exists, a reset link has been sent.");

  } catch (err) {
    console.error("Forgot error:", err);
    res.send("Something went wrong.");
  }
});

// ----- GET Reset Page -----
router.get('/reset/:token', (req, res) => {
  res.render('reset-password', {
    title: "Reset Password",
    token: req.params.token
  });
});

// ----- POST Reset Password -----
router.post('/reset/:token', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection('users');

    // Turnstile
    const turnToken = req.body['cf-turnstile-response'];
    const verifyResult = await verifyTurnstile(turnToken, req.ip);

    if (!verifyResult?.success) {
    return res.status(400).send("Verification failed. Try again.");
    }


    const user = await usersCollection.findOne({
      resetToken: req.params.token,
      resetExpiry: { $gt: new Date() }
    });

    if (!user) return res.send("Reset link invalid or expired.");

    if (req.body.password !== req.body.confirm)
      return res.send("Passwords do not match.");

    const hashedPass = await bcrypt.hash(req.body.password, saltRounds);

    await usersCollection.updateOne(
      { email: user.email },
      {
        $set: { passwordHash: hashedPass, updatedAt: new Date() },
        $unset: { resetToken: "", resetExpiry: "" }
      }
    );

    res.send("Password reset successful. You can now log in.");

  } catch (err) {
    console.error("Reset error:", err);
    res.send("Something went wrong.");
  }
});

module.exports = router;
