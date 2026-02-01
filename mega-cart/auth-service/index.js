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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
        // username is taken
    } else {
        // user available
    }
    


});

app.post('/login', (req, res) => {

});

// maybe add delete user, forgot password (will need notify service for this), etc. 

app.listen(3001, () => console.log('Auth Service running on 3001'))