// routes/password.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { Resend } = require('resend');

const saltRounds = 12;
const resend = new Resend(process.env.RESEND_API_KEY);

// Show forgot password form
router.get('/forgot', (req, res) => {
    res.render('forgot-password', { title: "Forgot Password" });
});

// Handle forgot password form submission
router.post('/forgot', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ email: req.body.email });
        if (!user) {
            return res.send("If an account with that email exists, a reset link has been sent.");
        }

        // Generate reset token and expiry (1 hour)
        const token = uuidv4();
        const expiry = new Date(Date.now() + 3600000);

        await usersCollection.updateOne(
            { email: user.email },
            { $set: { resetToken: token, resetExpiry: expiry } }
        );

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/password/reset/${token}`;

        // Send email via Resend
        await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: user.email,
            subject: "Password Reset Request",
            html: `
                <h2>Password Reset</h2>
                <p>Click below to reset your password:</p>
                <a href="${resetUrl}">${resetUrl}</a>
            `
        });

        res.send("If an account with that email exists, a reset link has been sent.");
    } catch (err) {
        console.error("Error in password reset:", err);
        res.send("Something went wrong.");
    }
});

// Show reset password form
router.get('/reset/:token', (req, res) => {
    res.render('reset-password', { title: "Reset Password", token: req.params.token });
});

// Handle reset password form
router.post('/reset/:token', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({
            resetToken: req.params.token,
            resetExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.send("Reset link is invalid or has expired.");
        }

        if (req.body.password !== req.body.confirm) {
            return res.send("Passwords do not match.");
        }

        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        await usersCollection.updateOne(
            { email: user.email },
            {
                $set: { passwordHash: hashedPassword, updatedAt: new Date() },
                $unset: { resetToken: "", resetExpiry: "" }
            }
        );

        res.send("Password has been reset. You can now log in with your new password.");
    } catch (err) {
        console.error("Error resetting password:", err);
        res.send("Something went wrong.");
    }
});

module.exports = router;
