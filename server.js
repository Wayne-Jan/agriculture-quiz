require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const authRoutes = require("./routes/auth");
const quizRoutes = require("./routes/quiz");
const adminRoutes = require("./routes/admin");

const app = express();

// 根據環境選擇 MongoDB 連線
const isDevelopment = process.env.NODE_ENV !== "production";
const mongoURI = isDevelopment
  ? process.env.LOCAL_MONGODB_URI
  : process.env.PRODUCTION_MONGODB_URI;

// 連接資料庫
connectDB(mongoURI).then(() => {
  console.log(`MongoDB: ${isDevelopment ? "本地資料庫" : "Atlas 資料庫"}`);
});

// 中間件設定
app.use(
  cors({
    origin: isDevelopment
      ? "http://localhost:5000"
      : "https://agriculture-quiz.onrender.com",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務
app.use(express.static(path.join(__dirname, "public")));
app.use("/quizzes", express.static(path.join(__dirname, "data", "quizzes")));

// API 路由
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);

// 添加特定頁面路由
app.get("/quiz", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "quiz.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: isDevelopment ? err.message : "伺服器錯誤",
  });
});

// 處理其他所有請求，返回 index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || "development"}`);
});

// 優雅關閉
process.on("SIGTERM", () => {
  console.log("收到 SIGTERM 信號，準備關閉伺服器");
  server.close(async () => {
    console.log("HTTP 伺服器已關閉");
    try {
      await mongoose.connection.close(false);
      console.log("MongoDB 連接已關閉");
      process.exit(0);
    } catch (err) {
      console.error("關閉 MongoDB 連接時發生錯誤:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("無法正常關閉，強制終止程序");
    process.exit(1);
  }, 10000);
});
