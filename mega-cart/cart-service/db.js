const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => {
    console.log(`Query: ${text}`);

    return pool.query(text, params);
  },
  pool
};

// need to init db, do this by writing a .sql file in this folder to create the table for users
// need to remember to update the docker-compose to add this init file to volumes 