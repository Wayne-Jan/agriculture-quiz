// routes/admin.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkAdmin = require("../middleware/checkAdmin");
const User = require("../models/User");
const QuizRecord = require("../models/QuizRecord");

// 檢查管理者權限
router.get("/check", auth, checkAdmin, (req, res) => {
  res.json({ message: "管理者權限驗證成功" });
});

// 獲取所有用戶
router.get("/users", auth, checkAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("獲取用戶列表錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 獲取特定用戶的測驗記錄
router.get("/records/:userId", auth, checkAdmin, async (req, res) => {
  try {
    const records = await QuizRecord.find({ user: req.params.userId }).sort({
      completedAt: -1,
    });
    res.json(records);
  } catch (error) {
    console.error("獲取測驗記錄錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 獲取統計數據
router.get("/statistics", auth, checkAdmin, async (req, res) => {
  try {
    // 獲取總用戶數
    const totalUsers = await User.countDocuments();

    // 獲取今日測驗次數
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayQuizzes = await QuizRecord.countDocuments({
      completedAt: { $gte: today },
    });

    // 使用新的統計方法獲取平均分數
    const stats = await QuizRecord.getStatistics();

    // 使用新的主題統計方法
    const topicStats = await QuizRecord.getTopicStatistics();

    res.json({
      totalUsers,
      todayQuizzes,
      avgScore: parseFloat(stats.avgScore.toFixed(1)),
      topicStats: topicStats.map((topic) => ({
        ...topic,
        avgScore: parseFloat(topic.avgScore.toFixed(1)),
      })),
    });
  } catch (error) {
    console.error("獲取統計數據錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 新增獲取主題詳細記錄的路由
router.get("/topic/:topicName/details", auth, checkAdmin, async (req, res) => {
  try {
    const records = await QuizRecord.find({ topic: req.params.topicName })
      .populate("user", "username")
      .sort("-completedAt")
      .select("score totalQuestions completedAt timeSpent user");

    const detailedRecords = records.map((record) => ({
      username: record.user.username,
      score: parseFloat(
        ((record.score / record.totalQuestions) * 100).toFixed(1)
      ),
      completedAt: record.completedAt,
      timeSpent: record.timeSpent,
    }));

    res.json(detailedRecords);
  } catch (error) {
    console.error("獲取主題詳細記錄失敗:", error);
    res.status(500).json({ message: "獲取詳細記錄失敗" });
  }
});

// 修改用戶角色
router.patch("/users/:userId/role", auth, checkAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "無效的角色" });
    }

    await User.findByIdAndUpdate(req.params.userId, { role });
    res.json({ message: "角色更新成功" });
  } catch (error) {
    console.error("更新用戶角色錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 刪除測驗記錄
router.delete("/records/:recordId", auth, checkAdmin, async (req, res) => {
  try {
    const result = await QuizRecord.findByIdAndDelete(req.params.recordId);
    if (!result) {
      return res.status(404).json({ message: "找不到此記錄" });
    }
    res.status(200).json({ message: "記錄已成功刪除" });
  } catch (error) {
    console.error("刪除記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 下載測驗記錄
router.get(
  "/records/:recordId/download",
  auth,
  checkAdmin,
  async (req, res) => {
    try {
      // 使用 populate 獲取用戶資訊
      const record = await QuizRecord.findById(req.params.recordId)
        .populate({
          path: "user",
          select: "username", // 只獲取用戶名
        })
        .exec();

      if (!record) {
        return res.status(404).json({ message: "找不到此記錄" });
      }

      if (!record.user) {
        return res.status(404).json({ message: "找不到此用戶資訊" });
      }

      const percentage = ((record.score / record.totalQuestions) * 100).toFixed(
        2
      );
      const timeSpent = record.timeSpent || 0;

      // 生成報告內容，加入用戶名
      let content = `No.1 Model: ${record.user.username}, Correct: ${
        record.score
      } / ${
        record.totalQuestions
      }, Accuracy: ${percentage}%, Time: ${timeSpent.toFixed(2)} seconds\n\n`;

      // 添加每個問題的詳細資訊
      if (record.answers && record.answers.length > 0) {
        record.answers.forEach((answer, index) => {
          content += `Question ${index + 1}, AI answer: ${
            answer.userAnswer
          }, True: ${answer.correctAnswer}, ${
            answer.isCorrect ? "correct" : "incorrect"
          }, Topic: ${answer.topic || record.topic}\n`;
        });
      }

      // 設置檔案名稱和標頭
      const filename = `quiz-record-${record.user.username}-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // 發送檔案內容
      res.send(content);
    } catch (error) {
      console.error("下載記錄時發生錯誤:", error);
      res.status(500).json({ message: "下載記錄失敗" });
    }
  }
);

// 刪除用戶
router.delete("/users/:userId", auth, checkAdmin, async (req, res) => {
  try {
    // 檢查是否試圖刪除自己
    if (req.params.userId === req.user.userId) {
      return res.status(400).json({ message: "不能刪除自己的帳號" });
    }

    // 檢查用戶是否存在
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "找不到此用戶" });
    }

    // 刪除用戶相關的測驗記錄
    await QuizRecord.deleteMany({ user: req.params.userId });

    // 刪除用戶
    await User.findByIdAndDelete(req.params.userId);

    res.json({ message: "用戶已成功刪除" });
  } catch (error) {
    console.error("刪除用戶失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
