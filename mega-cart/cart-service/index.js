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

// share cart
app.post('/:id/share', async (req, res) => {
    const cartId = req.params.id;
    const { userId, canEdit = false } = req.body; // user to share with
    const ownerId = req.user.id;

    try {
        // verify ownership
        const cartRes = await query('SELECT user_id FROM carts WHERE id = $1', [cartId]);
        if (cartRes.rows.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }
        if (cartRes.rows[0].user_id !== ownerId) {
            return res.status(403).json({ error: "Forbidden: Only the owner can share this cart" });
        }

        // can still update can_edit if cart is already shared
        await query('INSERT INTO shared_carts (cart_id, user_id, can_edit) VALUES ($1, $2, $3) ON CONFLICT (cart_id, user_id) DO UPDATE SET can_edit = EXCLUDED.can_edit', [cartId, userId, canEdit]);

        res.json({ message: "Cart shared successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to share cart" });
    }
});

// list pending cart invites
app.get('/invites', async (req, res) => {
    const userId = req.user.id;
    try {
        const text = `
            SELECT c.id, c.name, c.description, c.created_at, sc.status, sc.can_edit
            FROM carts c
            JOIN shared_carts sc ON c.id = sc.cart_id
            WHERE sc.user_id = $1 AND sc.status = 'pending'
            ORDER BY c.created_at DESC
        `;
        const result = await query(text, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Invites Failed" });
    }
});

// accept a cart invite
app.post('/:id/invites/accept', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await query(
            "UPDATE shared_carts SET status = 'accepted' WHERE cart_id = $1 AND user_id = $2 AND status = 'pending' RETURNING *",
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Pending invite not found" });
        }
        res.json({ message: "Invite accepted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to accept invite" });
    }
});

// decline a cart invite
app.post('/:id/invites/decline', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await query(
            "DELETE FROM shared_carts WHERE cart_id = $1 AND user_id = $2 AND status = 'pending' RETURNING *",
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Pending invite not found" });
        }
        res.json({ message: "Invite declined" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to decline invite" });
    }
});

// this one will be the one that runs when you go to some /mycarts type page to view ALL of a user's carts
app.get('/', async (req, res) => {
    const userId = req.user.id;
    const { label } = req.query;

    try {
        let text, params;

        if (label) {

            // man wtf is this comment robert
            // turns the labels into an array, so ?label=ash&label=poop in the uri becomes ['ash',poop'] 
            const tags = Array.isArray(label) ? label : [label];

            text = `
                SELECT DISTINCT c.id, c.name, c.description, c.created_at, sc.can_edit 
                FROM carts c
                JOIN labeled_carts lc ON c.id = lc.cart_id
                LEFT JOIN shared_carts sc ON c.id = sc.cart_id AND sc.user_id = $1 AND sc.status = 'accepted'
                WHERE (c.user_id = $1 OR (sc.user_id = $1 AND sc.status = 'accepted')) AND lc.label_name = ANY($2)
                ORDER BY c.created_at DESC
            `;
            params = [userId, tags];
        } else {
            text = `
                SELECT DISTINCT c.id, c.name, c.description, c.created_at, sc.can_edit 
                FROM carts c
                LEFT JOIN shared_carts sc ON c.id = sc.cart_id AND sc.user_id = $1 AND sc.status = 'accepted'
                WHERE c.user_id = $1 OR (sc.user_id = $1 AND sc.status = 'accepted')
                ORDER BY c.created_at DESC
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

// view a specific cart, id refers to cartId not userId
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
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const cart = result.rows[0];
        const userId = req.user.id;

        if (cart.user_id !== userId) {
            const sharedRes = await db.query("SELECT can_edit FROM shared_carts WHERE cart_id = $1 AND user_id = $2 AND status = 'accepted'", [id, userId]);
            if (sharedRes.rows.length === 0) {
                return res.status(403).json({ error: "Forbidden: You do not have access to this cart" });
            }
            cart.can_edit = sharedRes.rows[0].can_edit;
        } else {
            cart.can_edit = true;
        }

        res.json(cart);
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
    const userId = req.user.id;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const cartCheck = await client.query('SELECT user_id FROM carts WHERE id = $1', [id]);
        if (cartCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: "Cart not found" });
        }

        let canEdit = false;
        if (!(cartCheck.rows[0].user_id === userId)) {
            const sharedCheck = await client.query("SELECT can_edit FROM shared_carts WHERE cart_id = $1 AND user_id = $2 AND status = 'accepted'", [id, userId]);
            if (sharedCheck.rows.length > 0 && sharedCheck.rows[0].can_edit) {
                canEdit = true;
            }
        }
        // if user is not owner and cannot edit, return 403
        if (!(canEdit || cartCheck.rows[0].user_id === userId)) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(403).json({ error: "Forbidden: You do not have permission to update this cart" });
        }

        const cartRes = await client.query(
            'UPDATE carts SET name = $1, description = $2 WHERE id = $3 RETURNING id',
            [name, description, id]
        );

        const cartId = cartRes.rows[0].id;

        await client.query('DELETE FROM items WHERE cart_id = $1', [cartId]);

        if (items && items.length > 0) { // <--- ADD THIS CHECK  <----- kiratgpt
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
    const userId = req.user.id;

    try {
        const cartCheck = await query('SELECT user_id FROM carts WHERE id = $1', [id]);
        if (cartCheck.rows.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }
        if (cartCheck.rows[0].user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: Only the owner can delete this cart" });
        }

        const cartRes = await query(
            'DELETE FROM carts WHERE id = $1 RETURNING id',
            [id]
        );

        res.json({ message: "Cart deleted", cartId: cartRes.rows[0].id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Delete Failed" });
    }
});



app.listen(3007, () => console.log('Cart Service running on 3007'))