const axios = require('axios');
const express = require('express');
const amqp = require('amqplib');
const db = require('./db');
const { query } = require('./db');
const app = express();
app.use(express.json());

let channel;

// rabbitmq not used right now, but may use it for deleting carts when users are deleted
async function connectQueue() {
    const connection = await amqp.connect('amqp://rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('USER_CREATED');
}
connectQueue();

// create cart with items
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

        res.json({ message: "Cart and items created", cartId });
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

    try {
        const result = await query(text, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Carts Failed" });
    }
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
        LEFT JOIN items i ON c.id = i.cart_id
        WHERE c.id = $1
        GROUP BY c.id
    `;*/

    try {
        const result = await db.query(text, [id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Cart Failed" });
    }
});

// update cart
app.put('/carts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        const cartRes = await client.query(
            'UPDATE carts SET name = $1, description = $2 WHERE id = $3 RETURNING id',
            [name, description, id]
        );

        if (cartRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: "Cart not found" });
        }

        const cartId = cartRes.rows[0].id;

        await client.query('DELETE FROM items WHERE cart_id = $1', [cartId]);

        for (const item of items) {
            await client.query(
                'INSERT INTO items (cart_id, name, description, price, quantity) VALUES ($1, $2, $3, $4, $5)',
                [cartId, item.name, item.description, item.price, item.quantity]
            );
        }

        await client.query('COMMIT');

        res.json({ message: "Cart and items updated", cartId });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Update Cart Failed" });
    } finally {
        client.release();
    }
});

// delete cart
app.delete('/carts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const cartRes = await query(
            'DELETE FROM carts WHERE id = $1 RETURNING id',
            [id]
        );

        if (cartRes.rows.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        res.json({ message: "Cart deleted", cartId: cartRes.rows[0].id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Delete Failed" });
    }
});



app.listen(3007, () => console.log('Cart Service running on 3007'))