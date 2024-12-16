// routes/quiz.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const QuizRecord = require("../models/QuizRecord"); // 確保路徑正確

router.post("/record", auth, async (req, res) => {
  try {
    const { topic, score, totalQuestions, answers } = req.body;

    const quizRecord = new QuizRecord({
      user: req.user.userId,
      topic,
      score,
      totalQuestions,
      answers,
    });

    await quizRecord.save();
    res.status(201).json({ message: "測驗記錄已保存" });
  } catch (error) {
    console.error("保存測驗記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
