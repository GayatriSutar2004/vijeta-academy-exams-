const { MongoClient } = require('mongodb');

let client;
let db;

const getDb = async () => {
  if (db) return db;
  
  if (!client) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(mongoUri);
  }
  
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'vijeta_db');
  return db;
};

module.exports = { getDb, client };