// scripts/createAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // 添加這行
const User = require("../models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const adminUser = await User.findOneAndUpdate(
      { username: "admin" },
      {
        $setOnInsert: {
          password: await bcrypt.hash("admin", 10),
          role: "admin",
        },
      },
      { upsert: true, new: true }
    );
    console.log("管理者帳號創建成功");
    process.exit(0);
  } catch (error) {
    console.error("創建管理者失敗:", error);
    process.exit(1);
  }
}

createAdmin();
