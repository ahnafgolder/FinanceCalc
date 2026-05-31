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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4,
      autoIndex: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((conn) => conn);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Warm connection on cold serverless starts (skipped during build)
if (
  typeof window === 'undefined' &&
  process.env.MONGODB_URI &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  dbConnect().catch(() => {});
}

export default dbConnect;
