const express = require('express');
const { query } = require('./db');
const crypto = require('crypto');
const amqp = require('amqplib');
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./db');
const app = express();

app.use(express.json());

const authMiddleware = require('./authMiddleware');
app.use((req, res, next) => {
    console.log("CART-SERVICE HIT:", req.method, req.originalUrl);
    next();
});

// Show shared cart [no login necessary]
app.get('/shared/:token', async (req, res) => {
    const { token } = req.params;

    const text = `
        SELECT 
            c.*, 
            COALESCE((SELECT json_agg(i.*) FROM items i WHERE i.cart_id = c.id), '[]') as items,
            COALESCE((SELECT json_agg(lc.label_name) FROM labeled_carts lc WHERE lc.cart_id = c.id), '[]') as labels
        FROM carts c
        WHERE c.share_token = $1
    `;
    try {
        const result = await db.query(text, [token]);

        if (result.rows.length == 0){
            return res.status(404).json({ error: 'Cart not found' });   
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Shared Cart Failed" });          
    }
});

app.use(authMiddleware);
let channel;

app.get('/shared', async (req, res) => {
    const userId = req.user.id;
    const {editable} = req.query;

    try {
        let text = `
            SELECT c.id, c.name, c.description, c.created_at,
                    sc.can_edit,
                    c.user_id AS owner_id,
                    COALESCE(array_agg(lc.label_name) FILTER (WHERE lc.label_name IS NOT NULL), '{}') AS labels
            FROM shared_carts sc
            JOIN carts c ON c.id = sc.cart_id
            LEFT JOIN labeled_carts lc ON c.id = lc.cart_id
            WHERE sc.user_id = $1 AND sc.status = 'accepted'
            GROUP BY c.id, c.name, c.description, c.created_at, sc.can_edit, c.user_id
            `;
        const params = [userId];

        if (editable === "true") {
        text += ` AND sc.can_edit = true`;
        } else if (editable === "false") {
        text += ` AND sc.can_edit = false`;
        }

        text += ` ORDER BY c.created_at DESC`;

        const result = await query(text, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Get Shared Carts Failed" });
    }
    });


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

// remove shared cart for invitee
app.delete('/shared/:id', async (req, res) => {
    const cartId = req.params.id;
    const userId = req.user.id;

    console.log("cartId:", cartId, "userId:", userId);
    try {
        const result = await query(
            "DELETE FROM shared_carts WHERE cart_id = $1 AND user_id = $2 AND status = 'accepted' RETURNING *",
            [cartId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Shared cart not found" });
        }
        res.json({ message: "Shared cart removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove shared cart" });
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
                SELECT c.id, c.name, c.description, c.created_at, sc.can_edit,
                    COALESCE(array_agg(lc.label_name) FILTER (WHERE lc.label_name IS NOT NULL), '{}') AS labels
                FROM carts c
                JOIN labeled_carts lc ON c.id = lc.cart_id
                LEFT JOIN shared_carts sc ON c.id = sc.cart_id AND sc.user_id = $1 AND sc.status = 'accepted'
                WHERE c.user_id = $1 AND lc.label_name = ANY($2)
                GROUP BY c.id, c.name, c.description, c.created_at, sc.can_edit
                ORDER BY c.created_at DESC
            `;
            params = [userId, tags];
            
        } else {
            text = `
                SELECT c.id, c.name, c.description, c.created_at, sc.can_edit,
                    COALESCE(array_agg(lc.label_name) FILTER (WHERE lc.label_name IS NOT NULL), '{}') AS labels
                FROM carts c
                LEFT JOIN shared_carts sc ON c.id = sc.cart_id AND sc.user_id = $1 AND sc.status = 'accepted'
                LEFT JOIN labeled_carts lc ON c.id = lc.cart_id
                WHERE c.user_id = $1
                GROUP BY c.id, c.name, c.description, c.created_at, sc.can_edit
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

        if (items && items.length > 0) { // <--- ADD THIS CHECK  <----- kiratgpt <----- 😭
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

// returns whether this user is allowed  to comment and if they are the owner of the cart
async function getCommentAccess(cartId, userId) {
    const cartRes = await query('SELECT user_id FROM carts WHERE id = $1', [cartId]);
    if (cartRes.rows.length === 0) return { allowed: false, isOwner: false, notFound: true };

    const isOwner = cartRes.rows[0].user_id === userId;
    if (isOwner) return { allowed: true, isOwner: true };

    const sharedRes = await query(
        "SELECT 1 FROM shared_carts WHERE cart_id = $1 AND user_id = $2 AND status = 'accepted'",
        [cartId, userId]
    );
    const allowed = sharedRes.rows.length > 0;
    return { allowed, isOwner: false };
}

// lists all the comments on the cart
app.get('/:id/comments', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const access = await getCommentAccess(id, userId);
        if (access.notFound) return res.status(404).json({ error: "Cart not found" });
        if (!access.allowed) return res.status(403).json({ error: "Forbidden: You do not have access to this cart's comments" });

        const result = await query(
        'SELECT id, user_id, content, created_at FROM cart_comments WHERE cart_id = $1 ORDER BY created_at ASC',
        [id]
        );

        const comments = result.rows;

        const userIds = [...new Set(comments.map(c => c.user_id))];

        let usersMap = {};

        if (userIds.length > 0) {
        try {
            const usersRes = await axios.get('http://auth-service:3001/users/bulk', {
            params: { ids: userIds.join(',') }
            });

            usersRes.data.forEach(user => {
            usersMap[user.id] = user;
            });
        } catch (err) {
            console.error("Failed to fetch user data:", err.message);
        }
        }

        const enrichedComments = comments.map(comment => ({
        ...comment,
        username: usersMap[comment.user_id]?.username || "Unknown",
        profile_picture: usersMap[comment.user_id]?.profile_picture || null
        }));

        res.json(enrichedComments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// adds the comment to the cart
app.post('/:id/comments', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    try {
        const access = await getCommentAccess(id, userId);
        if (access.notFound) return res.status(404).json({ error: "Cart not found" });
        if (!access.allowed) return res.status(403).json({ error: "Forbidden: Only the cart owner or accepted collaborators can comment" });

        const result = await query(
            'INSERT INTO cart_comments (cart_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [id, userId, content.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to post comment" });
    }
});

// delete a comment
// the only people allowed to delete comments are the ones who wrote the comment or own the cart
app.delete('/:id/comments/:commentId', async (req, res) => {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    try {
        const access = await getCommentAccess(id, userId);
        if (access.notFound) return res.status(404).json({ error: "Cart not found" });
        if (!access.allowed) return res.status(403).json({ error: "Forbidden: You do not have access to this cart" });

        const commentRes = await query(
            'SELECT user_id FROM cart_comments WHERE id = $1 AND cart_id = $2',
            [commentId, id]
        );
        if (commentRes.rows.length === 0) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const commentAuthorId = commentRes.rows[0].user_id;
        const canDelete = access.isOwner || commentAuthorId === userId;
        if (!canDelete) {
            return res.status(403).json({ error: "Forbidden: You can only delete your own comments" });
        }

        await query('DELETE FROM cart_comments WHERE id = $1', [commentId]);
        res.json({ message: "Comment deleted", commentId: parseInt(commentId) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete comment" });
    }
});

// create cart share link
app.post('/:id/share-link', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Check if cart id doesn't exist
        const cartSelect = await db.query('SELECT * FROM carts WHERE id = $1', [id]);
        if (cartSelect.rows.length == 0) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Check if cart belongs to logged in user
        if (cartSelect.rows[0].user_id != userId) {
            return res.status(401).json({ error: 'Cart not found' });
        }

        // Generate random token
        const shareToken = crypto.randomBytes(32).toString('hex');

        // Add token to cart db entry
        await db.query(
            'UPDATE carts SET share_token = $1 WHERE id = $2',
            [shareToken, id]           
        );

        res.status(200).json({message: "Cart link created", token: shareToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Share Failed" });    
    }
});

// gets price more cosistenly
function parsePrice(raw) {
    if (raw == null) return null;
    const cleaned = String(raw)
        .replace(/[^0-9.,]/g, '')
        .replace(/,(\d{2})$/, '.$1')
        .replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

// gets details to auto add cart given a link
function extractProductDetails($) {
    const PRODUCT_TYPES = ['product', 'individualproduct', 'productgroup', 'productmodel'];

    let name = null;
    let price = null;
    
    // try jsonld structured data
    const scripts = $('script[type="application/ld+json"]');
    for (let el of scripts) {
        try {
            const data = JSON.parse($(el).html());
            const items = [data].flat();
            const graphItems = items.flatMap(d => d['@graph'] ? [d['@graph']].flat() : [d]);
            const product = graphItems.find(d => PRODUCT_TYPES.includes(d['@type']?.toLowerCase()));
            if (product) {
                if (!name && product.name) name = product.name.split(/[|\-–]/)[0].trim();
                if (!price) {
                    const offer = product.offers?.offers?.[0] ?? product.offers;
                    price = parsePrice(offer?.price);
                }
            }
        } catch (_) {}
    }
 
    // try open graph meta tags if jsonld didn't work
    if (!name) {
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) name = ogTitle.split(/[|\-–]/)[0].trim();
    }
    if (!price) {
        const rawPrice = $('meta[property="product:price:amount"]').attr('content')
            ?? $('meta[property="og:price:amount"]').attr('content');
        price = parsePrice(rawPrice);
    }

    // try just html
    if (!name) {
        name = $('h1').first().text().split(/[|\-–]/)[0].trim() || null;
    }
    if (!price) {
        const priceSelectors = ['meta[itemprop="price"]', '[itemprop="price"]'];
        for (const selector of priceSelectors) {
            const el = $(selector);
            if (el.length) {
                const val = el.attr('content') ?? el.attr('data-price') ?? el.text();
                price = parsePrice(val);
                if (price) break;
            }
        }
    }

    return { name, price, quantity: 1 };
}
 
// takes "https://..." and gives { name, price, quantity } to auto fill the add item fields
app.post('/autofill', async (req, res) => {
    const { url } = req.body;
 
    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ message: 'A valid URL is required' });
    }
 
    // get the page html
    let pageHtml;
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            },
            maxContentLength: 5 * 1024 * 1024,
        });
        pageHtml = response.data;
    } catch (err) {
        console.error('Autofill fetch error:', err.message);
        return res.status(422).json({ message: 'Could not fetch the provided URL' });
    }
 
    // get product details from html
    try {
        const $ = cheerio.load(pageHtml);
        const item = extractProductDetails($);
        if (!item) {
            return res.status(422).json({ message: 'Could not extract product details from this URL' });
        }
        res.json(item);
    } catch (err) {
        console.error('Autofill parse error:', err.message);
        res.status(500).json({ message: 'Failed to parse product details from URL' });
    }
});

app.listen(3007, () => console.log('Cart Service running on 3007'))