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

    // 檢查是否已有管理員
    const adminCount = await User.countDocuments({ role: "admin" });

    // 建立新用戶
    user = new User({
      username,
      password,
      role: adminCount === 0 ? "admin" : "user", // 如果還沒有管理員，則設為管理員
    });

    await user.save();

    // 根據角色返回不同的訊息
    const message =
      adminCount === 0
        ? "註冊成功！您是第一位用戶，已被設為管理員"
        : "註冊成功！";

    res.status(201).json({ message });
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
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role, // 在 token 中加入角色信息
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    res.json({
      token,
      role: user.role, // 返回用戶角色
    });
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
