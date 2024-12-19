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
    const { username, password, name, organization, education } = req.body;

    // 檢查用戶是否已存在
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "用戶名已被使用" });
    }

    // 驗證教育程度是否有效
    const validEducation = ["highschool", "university", "graduate"];
    if (!validEducation.includes(education)) {
      return res.status(400).json({ message: "無效的教育程度" });
    }

    // 檢查是否已有管理員
    const adminCount = await User.countDocuments({ role: "admin" });

    // 建立新用戶
    user = new User({
      username,
      password,
      name,
      organization,
      education,
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
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    res.json({
      token,
      role: user.role,
      // 可以選擇是否要返回用戶的其他資訊
      name: user.name,
      organization: user.organization,
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
    if (!user) {
      return res.status(404).json({ message: "用戶不存在" });
    }

    // 回傳角色和必要的用戶資訊
    res.json({
      role: user.role,
      name: user.name,
      organization: user.organization,
      education: user.education,
    });
  } catch (error) {
    console.error("檢查角色失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 添加一個新的路由用於獲取所有用戶資訊(僅管理員可用)
router.get("/users/all", auth, async (req, res) => {
  try {
    // 檢查請求用戶是否為管理員
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "無權限訪問此資源" });
    }

    // 獲取所有用戶資訊(排除密碼欄位)
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    console.error("獲取用戶列表失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
