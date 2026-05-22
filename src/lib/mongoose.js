import mongoose from 'mongoose';
import dns from 'dns';

// Force Node to cache DNS lookups — critical for MongoDB Atlas SRV connections
// Default TTL is 0 (no caching), so every request re-resolves DNS
dns.setDefaultResultOrder('ipv4first');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,                // Slightly larger pool for concurrent requests
      minPoolSize: 2,                 // Keep 2 connections warm to avoid cold starts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,    // Keep-alive heartbeat
      family: 4,                      // IPv4 — avoids slow DNS on Vercel
      autoIndex: false,               // Don't auto-build indexes in production (we define them in models)
      compressors: ['zstd', 'snappy'], // Compress wire protocol for faster data transfer
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
