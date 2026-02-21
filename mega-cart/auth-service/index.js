const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const amqp = require('amqplib');
const db = require('./db');
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
app.use(express.json());

let channel;

// Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    }
});

// rabbitmq
async function connectQueue() {
    const url = process.env.AMQP_URL
    const tryConnect = async () => {
        try {
            const connection = await amqp.connect(url);
            channel = await connection.createChannel();
            await channel.assertQueue('USER_CREATED');
            console.log('Connected to RabbitMQ');
        } catch (error) {
            console.log('RabbitMQ not ready; retrying in 3s...');
            setTimeout(tryConnect, 3000);
        }
    }
}
connectQueue();

app.get('/users/by-email', async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await db.query(
      "SELECT id FROM users WHERE lower(email) = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ userId: result.rows[0].id });
  } catch (err) {
    console.error("Error in /users/by-email:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post('/register', async (req, res) => {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;

        // Check user values
        if (!username) {
            return res.status(400).json({ error: 'Username value required' });
        }
        if (!email) {
            return res.status(400).json({ error: 'Email value required' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Password value required' });
        }

        // Check if email already exists
        const emailSelect = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailSelect.rows.length > 0) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        // Add user to database
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        // Send success confirmation
        if (channel) {
            channel.sendToQueue('USER_CREATED', Buffer.from(JSON.stringify({ username, email })));
        } else {
            console.error("RabbitMQ channel is not available!");
        }
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error in /register:', error);
        res.status(500).json({ error: 'Register Failed' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        // Check user values
        if (!email) {
            return res.status(400).json({ error: 'Email value required' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Password value required' });
        }

        // Check if email doesn't exist
        const emailSelect = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailSelect.rows.length == 0) {
            return res.status(404).json({ error: 'Invalid credentials' });
        }

        // Get hashed password
        const hashedPassword = emailSelect.rows[0].password_hash;

        const passwordMatch = await bcrypt.compare(password, hashedPassword)
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Send success confirmation
        const user = emailSelect.rows[0];
        const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
        );

        res.status(200).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
        },
        });
    } catch (error) {
        console.error('Error in /login:', error);
        res.status(500).json({ error: 'Login Failed' });
    }
});

app.post('/forgot-password', async (req, res) => {
    try {
        const email = req.body.email;

        // Check if email doesn't exist
        const emailSelect = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailSelect.rows.length == 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Generate random token
        const passwordToken = crypto.randomBytes(32).toString('hex')

        // Expiry date (15 minutes from)
        const tokenExpiry = new Date(Date.now() + 1000 * 60 * 15)

        // Add token and expiry to user db entry
        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
            [passwordToken, tokenExpiry, email]
        );

        await transporter.sendMail({
            from: 'no-reply@megacart.com',
            to: email,
            subject: 'Password Reset',
            text: `Your password reset token is: ${passwordToken}`
        });

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Error in /forgot-password:', error);
        res.status(500).json({ error: 'Forgot Password Failed' });
    }
});

app.post('/reset-password', async (req, res) => {
    try {
        const passwordToken = req.body.token;
        const newPassword = req.body.password;

        // Attempt to fetch non-expired token user
        const result = await db.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [passwordToken]
        );

        // If token does not exist
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token invalid or expired' });
        }

        // Compare new password to old password
        const oldHashedPassword = result.rows[0].password_hash;
        const passwordMatch = await bcrypt.compare(newPassword, oldHashedPassword);
        if (passwordMatch) {
            return res.status(409).json({ error: 'New password cannot be the same as the old password'});
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        const email = result.rows[0].email;
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [newHashedPassword, email]
        );

        // Remove token and expiry from user db entry
        await db.query(
            'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE email = $1',
            [email]
        );


        res.status(200).json({ message: 'Password successfully reset' });
    } catch (error) {
        console.error('Error in /reset-password:', error);
        res.status(500).json({ error: 'Reset Password Failed'});
    }
});

// maybe add delete user, forgot password (will need notify service for this), etc. 
app.listen(3001, () => console.log('Auth Service running on 3001'))