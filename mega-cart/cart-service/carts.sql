CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(1024),
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(255),
    price FLOAT(2),
    quantity INT,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE
    -- labels will reference a labels table
);