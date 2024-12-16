// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// 註冊路由
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    // 檢查用戶是否已存在
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "用戶名已被使用" });
    }
    // 建立新用戶
    user = new User({
      username,
      password, // 密碼會在 model 中自動加密
    });
    await user.save();
    res.status(201).json({ message: "註冊成功" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 登入路由
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    // 檢查用戶是否存在
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "用戶名或密碼錯誤" });
    }
    // 驗證密碼
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "用戶名或密碼錯誤" });
    }
    // 生成 JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 檢查角色路由
router.get("/check-role", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ role: user.role });
  } catch (error) {
    console.error("檢查角色失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
