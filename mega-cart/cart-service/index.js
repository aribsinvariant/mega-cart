const axios = require('axios');
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

app.post('/carts', async (req, res) => {
    const { userId, name, description, items } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        const cartRes = await client.query(
            'INSERT INTO carts (name, description, user_id) VALUES ($1, $2, $3) RETURNING id',
            [name, description, userId]
        );

        const cartId = cartRes.rows[0].id;

        for (const item of items) {
            await client.query(
                'INSERT INTO items (cart_id, name, description, price, quantity) VALUES ($1, $2, $3, $4, $5)',
                [cartId, item.name, item.description, item.price, item.quantity]
            );
        }

        await client.query('COMMIT');

        res.json({ message: "Entry and items created", cartId });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Transaction Failed" });
    } finally {
        client.release();
    }

});

// this one will be the one that runs when you go to some /mycarts type page to view ALL of a user's carts
app.get('/carts', async (req, res) => {
    const { userId } = req.query;

    const text = `
        SELECT id, name, description, created_at 
        FROM carts 
        WHERE user_id = $1 
        ORDER BY created_at DESC
    `;

    const result = await query(text, [userId]);
    res.json(result.rows);
});

// this one will be the one that runs when you click on a specific cart, id refers to cartId not userId
// will need to rewrite this so that it actually checks for authorization, right now anyone can see anyones carts
app.get('/carts/:id', async (req, res) => {
    const { id } = req.params;


    const text = `
        SELECT c.*, COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') as items
        FROM carts c
        LEFT JOIN items i ON c.id = i.cart_id
        WHERE c.id = $1
        GROUP BY c.id
    `;
    /*`
        SELECT c.*, json_agg(i.*) as items 
        FROM carts c
        LEFT JOIN items i ON c.id = i.entry_id
        WHERE c.id = $1
        GROUP BY c.id
    `;*/


    const result = await db.query(text, [id]);
    res.json(result.rows[0]);
});

app.listen(3007, () => console.log('Cart Service running on 3007'))