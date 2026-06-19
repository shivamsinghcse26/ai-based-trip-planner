const mongoose = require('mongoose');

function getMongoUri() {
  // Prefer explicit MONGODB_URI; fallback to MONGO_URI for students.
  return process.env.MONGODB_URI || process.env.MONGO_URI;
}

async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      '[backend] Missing Mongo connection string. Set MONGODB_URI (or MONGO_URI) in .env',
    );
  }

  // Mongoose v9: useUnifiedTopology is default; keep simple.
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('[backend] MongoDB connected');
}

module.exports = { connectDB };

