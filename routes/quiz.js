const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const QuizRecord = require("../models/QuizRecord");
const path = require("path");
const fs = require("fs").promises;

// 獲取文字題庫檔案
router.get("/questions/:type", async (req, res) => {
  try {
    const { type } = req.params;
    let filename;
    if (type === "veterinary") {
      filename = "01_獸醫 benchmark_60.json";
    } else if (type === "agriculture") {
      filename = "01_農業 benchmark_90.json";
    } else {
      return res.status(400).json({ message: "無效的題庫類型" });
    }
    const filePath = path.join(__dirname, "..", "data", "quizzes", filename);
    const data = await fs.readFile(filePath, "utf8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("讀取題庫檔案失敗:", error);
    res.status(500).json({ message: "載入題庫失敗" });
  }
});

// 獲取圖片題庫檔案
router.get("/questions/image/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const filePath = path.join(
      __dirname,
      "..",
      "data",
      "quizzes",
      type,
      `${type}_Total.json`
    );
    const data = await fs.readFile(filePath, "utf8");
    let questions = JSON.parse(data);

    // 處理圖片路徑
    questions = questions.map((q) => ({
      ...q,
      // 添加完整的圖片路徑，這裡假設圖片存放在 public/quizzes/{type}/image/ 目錄下
      imagePath: q.filepath ? `/quizzes/${type}/image/${q.filepath}` : null,
    }));

    res.json(questions);
  } catch (error) {
    console.error("讀取圖片題庫失敗:", error);
    res.status(500).json({ message: "載入題庫失敗" });
  }
});

// 儲存測驗記錄
router.post("/record", auth, async (req, res) => {
  try {
    const { topic, score, totalQuestions, answers, quizFormat } = req.body;
    const quizRecord = new QuizRecord({
      user: req.user.userId,
      topic,
      score,
      totalQuestions,
      answers,
      quizFormat, // 新增欄位記錄是文字還是圖片題庫
    });
    await quizRecord.save();
    res.status(201).json({ message: "測驗記錄已保存" });
  } catch (error) {
    console.error("保存測驗記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 獲取用戶的測驗記錄
router.get("/records", auth, async (req, res) => {
  try {
    const records = await QuizRecord.find({ user: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json(records);
  } catch (error) {
    console.error("獲取測驗記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 獲取特定測驗記錄
router.get("/record/:recordId", auth, async (req, res) => {
  try {
    const record = await QuizRecord.findOne({
      _id: req.params.recordId,
      user: req.user.userId,
    });
    if (!record) {
      return res.status(404).json({ message: "找不到測驗記錄" });
    }
    res.json(record);
  } catch (error) {
    console.error("獲取測驗記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 刪除測驗記錄
router.delete("/record/:recordId", auth, async (req, res) => {
  try {
    const result = await QuizRecord.findOneAndDelete({
      _id: req.params.recordId,
      user: req.user.userId,
    });
    if (!result) {
      return res.status(404).json({ message: "找不到測驗記錄" });
    }
    res.json({ message: "測驗記錄已刪除" });
  } catch (error) {
    console.error("刪除測驗記錄失敗:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
