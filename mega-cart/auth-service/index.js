const express = require('express');
const amqp = require('amqplib');
const db = require('./db');
const { query } = require('./db');
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

app.post('/register', (req, res) => {
    
});

app.post('/login', (req, res) => {

});

// maybe add delete user, forgot password (will need notify service for this), etc. 

app.listen(3001, () => console.log('Auth Service running on 3001'))