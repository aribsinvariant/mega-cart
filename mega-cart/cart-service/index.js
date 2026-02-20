const axios = require('axios');
const express = require('express');
const amqp = require('amqplib');
const db = require('./db');
const { query } = require('./db');
const app = express();
app.use(express.json());

const authMiddleware = require('./authMiddleware');
app.use((req, res, next) => {
    console.log("CART-SERVICE HIT:", req.method, req.originalUrl);
    next();
});
app.use(authMiddleware);
let channel;



// rabbitmq not used right now, but may use it for deleting carts when users are deleted
async function connectQueue() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        channel = await connection.createChannel();
        await channel.assertQueue('USER_CREATED');
        console.log('Connected to RabbitMQ');
    } catch (err) {
        console.log('RabbitMQ not ready; retrying in 3s...');
        setTimeout(connectQueue, 3000);
    }
}
connectQueue();

// create cart with items
app.post('/', async (req, res) => {
    const userId = req.user.id;
    const { name, description, items = [], labels } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        const cartRes = await client.query(
            'INSERT INTO carts (name, description, user_id) VALUES ($1, $2, $3) RETURNING id',
            [name, description, userId]
        );

        const cartId = cartRes.rows[0].id;

        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    'INSERT INTO items (cart_id, name, description, price, quantity) VALUES ($1, $2, $3, $4, $5)',
                    [cartId, item.name, item.description, item.price, item.quantity]
                );
            }
        }

        if (labels && labels.length > 0) {
            for (const label of labels) {
                // create label
                await client.query(
                    'INSERT INTO labels (label_name) VALUES ($1) ON CONFLICT (label_name) DO NOTHING',
                    [label]
                );
                // link cart with label
                await client.query(
                    'INSERT INTO labeled_carts (cart_id, label_name) VALUES ($1, $2)',
                    [cartId, label]
                );
            }
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
app.get('/', async (req, res) => {
    const userId = req.user.id;
    const { label } = req.query;

    try {
        let text, params;

        if (label) {

            // turns the labels into an array, so ?label=ash&label=poop in the uri becomes ['ash',poop'] 
            const tags = Array.isArray(label) ? label : [label];

            text = `
                SELECT DISTINCT c.id, c.name, c.description, c.created_at 
                FROM carts c
                JOIN labeled_carts lc ON c.id = lc.cart_id
                WHERE c.user_id = $1 AND lc.label_name = ANY($2)
                ORDER BY c.created_at DESC
            `;
            params = [userId, tags];
        } else {
            text = `
                SELECT id, name, description, created_at 
                FROM carts 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `;
            params = [userId];
        }

        const result = await query(text, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Carts Failed" });
    }
});

// this one will be the one that runs when you click on a specific cart, id refers to cartId not userId
// will need to rewrite this so that it actually checks for authorization, right now anyone can see anyones carts
app.get('/:id', async (req, res) => {
    const { id } = req.params;


    const text = `
        SELECT 
            c.*, 
            COALESCE((SELECT json_agg(i.*) FROM items i WHERE i.cart_id = c.id), '[]') as items,
            COALESCE((SELECT json_agg(lc.label_name) FROM labeled_carts lc WHERE lc.cart_id = c.id), '[]') as labels
        FROM carts c
        WHERE c.id = $1
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
app.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, items, labels } = req.body;

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

        if (items && items.length > 0) { // <--- ADD THIS CHECK
            for (const item of items) {
                await client.query(
                    'INSERT INTO items (cart_id, name, description, price, quantity) VALUES ($1, $2, $3, $4, $5)',
                    [cartId, item.name, item.description, item.price, item.quantity]
                );
            }
        }

        await client.query('DELETE FROM labeled_carts WHERE cart_id = $1', [cartId]);

        if (labels && labels.length > 0) {
            for (const label of labels) {
                // Ensure label exists in global table
                await client.query(
                    'INSERT INTO labels (label_name) VALUES ($1) ON CONFLICT (label_name) DO NOTHING',
                    [label]
                );
                // Link label to cart
                await client.query(
                    'INSERT INTO labeled_carts (cart_id, label_name) VALUES ($1, $2)',
                    [cartId, label]
                );
            }
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
app.delete('/:id', async (req, res) => {
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