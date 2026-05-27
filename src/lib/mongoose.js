import mongoose from 'mongoose';
import dns from 'dns';

// Force Node to cache DNS lookups — critical for MongoDB Atlas SRV connections
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
  const start = Date.now();

  if (cached.conn) {
    console.log(`[DB] Connection reused in ${Date.now() - start}ms`);
    return cached.conn;
  }

  if (!cached.promise) {
    // Set maxPoolSize to 10 and minPoolSize to 1 to allow parallel server-side queries under high load and page refreshes
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
      family: 4,                      // IPv4 only
      autoIndex: false,               // Do not build indexes on the fly
    };

    console.log('[DB] Establishing new database connection promise...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log(`[DB] New connection successfully established in ${Date.now() - start}ms`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`[DB] Connection failed after ${Date.now() - start}ms:`, e.message);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
