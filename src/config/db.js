const { Pool } = require('pg');
const mongoose = require('mongoose');
require('dotenv').config();

let pgPool;
try {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/canteen42',
  });
} catch (error) {
  console.warn('PostgreSQL pool initialization error:', error);
}

const connectMongoDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    }
  } catch (error) {
    console.warn('MongoDB connection error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const testPgConnection = async () => {
  if (!pgPool) {
    console.warn('PostgreSQL pool not initialized, skipping connection test');
    return false;
  }
  
  try {
    const client = await pgPool.connect();
    console.log('PostgreSQL connected');
    client.release();
    return true;
  } catch (error) {
    console.warn('PostgreSQL connection error:', error);
    return false;
  }
};

const inMemoryStore = {
  products: [],
  users: [],
  orders: []
};

module.exports = {
  pgPool,
  connectMongoDB,
  testPgConnection,
  inMemoryStore
};
