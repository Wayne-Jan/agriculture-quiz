// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
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

// 連接資料庫並在連接成功後創建管理員帳號
connectDB(mongoURI).then(() => {
  console.log(`MongoDB: ${isDevelopment ? "本地資料庫" : "Atlas 資料庫"}`);
});

// 中間件設定
app.use(
  cors({
    origin: isDevelopment
      ? "http://localhost:5000"
      : "https://agriculture-quiz.onrender.com", // 移除最後的斜線
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

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: isDevelopment ? err.message : "伺服器錯誤",
  });
});

// 處理所有其他請求，返回 index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || "development"}`);
});

// 優雅關閉
process.on("SIGTERM", () => {
  console.log("收到 SIGTERM 信號，準備關閉伺服器");
  app.close(() => {
    console.log("伺服器已關閉");
    process.exit(0);
  });
});
