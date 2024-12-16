const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_MONGODB_URI
        : process.env.LOCAL_MONGODB_URI;

    await mongoose.connect(uri);
    console.log(
      `MongoDB: ${
        process.env.NODE_ENV === "production" ? "Atlas" : "Local"
      } 資料庫連接成功`
    );
  } catch (err) {
    console.error("MongoDB 連接失敗:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
