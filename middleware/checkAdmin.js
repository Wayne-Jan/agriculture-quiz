// middleware/checkAdmin.js
const User = require("../models/User");

const checkAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user && user.role === "admin") {
      next();
    } else {
      res.status(403).json({ message: "權限不足" });
    }
  } catch (error) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

module.exports = checkAdmin;
