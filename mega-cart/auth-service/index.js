const express = require('express');
const amqp = require('amqplib');
const db = require('./db');
const bcrypt = require('bcrypt');
// const { query } = require('./db');
const app = express();
app.use(express.json());

let channel;

// rabbitmq
async function connectQueue() {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('USER_CREATED');
}
connectQueue();

app.post('/register', async (req, res) => {
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

    // Check if user already exists
    const userSelect = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userSelect.rows.length > 0) {
        return res.status(409).json({ error: 'Username already taken' });
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
    channel.sendToQueue('USER_CREATED', Buffer.from(JSON.stringify({ username, email })));
    res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {

});

// maybe add delete user, forgot password (will need notify service for this), etc. 

app.listen(3001, () => console.log('Auth Service running on 3001'))