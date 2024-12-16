// config/db.js
const mongoose = require("mongoose");

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB 連接成功");
  } catch (err) {
    console.error("MongoDB 連接失敗:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
