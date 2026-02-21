CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(1024),
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    share_token VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(255),
    price FLOAT(2),
    quantity INT,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS labels (
    label_name VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS labeled_carts (
    label_name VARCHAR(255) REFERENCES labels(label_name) ON DELETE CASCADE ON UPDATE CASCADE,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    PRIMARY KEY (cart_id, label_name)
);