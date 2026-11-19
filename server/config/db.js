const mongoose = require('mongoose');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

const getDataSource = () => 'configured';

const getDbStatus = () => ({
  source: getDataSource(),
  connectedTo: mongoose.connection.readyState === 1 ? mongoose.connection.host : null,
});

module.exports = connectDB;
module.exports.getDataSource = getDataSource;
module.exports.getDbStatus = getDbStatus;
