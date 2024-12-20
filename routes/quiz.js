// routes/quiz.js
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
    // 修改文件路徑以匹配新的目錄結構
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
    // 須確認 data/quizzes/{type}/{type}_Total.json 檔案已存在於部署後的檔案系統中
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

    // 若在server.js中有設定
    // app.use('/quizzes', express.static(path.join(__dirname, '..', 'data', 'quizzes')));
    // 則此處的 imagePath 可以直接指定為 `/quizzes/...`
    questions = questions.map((q) => ({
      ...q,
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
    const { topic, score, totalQuestions, answers, quizFormat, timeSpent } =
      req.body;

    // // 記錄收到的資料，以便除錯
    // console.log("收到的測驗資料:", {
    //   topic,
    //   score,
    //   totalQuestions,
    //   answersLength: answers.length,
    //   quizFormat,
    //   timeSpent,
    // });

    // 1. 驗證是否有所需資料
    if (!topic || score === undefined || !totalQuestions || !answers) {
      return res.status(400).json({
        message: "缺少必要資料",
        details: {
          hasTopic: !!topic,
          hasScore: score !== undefined,
          hasTotalQuestions: !!totalQuestions,
          hasAnswers: !!answers,
        },
      });
    }

    // 2. 驗證答案數量
    if (answers.length !== totalQuestions) {
      return res.status(400).json({
        message: "答案數量與題目數量不符",
        details: {
          expectedQuestions: totalQuestions,
          actualAnswers: answers.length,
        },
      });
    }

    // 3. 檢查重複答案
    const uniqueQuestions = new Set(answers.map((answer) => answer.question));
    if (uniqueQuestions.size !== answers.length) {
      return res.status(400).json({
        message: "存在重複答案",
        details: {
          totalAnswers: answers.length,
          uniqueAnswers: uniqueQuestions.size,
          duplicateCount: answers.length - uniqueQuestions.size,
        },
      });
    }

    // 4. 確認分數計算
    const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
    if (correctAnswers !== score) {
      return res.status(400).json({
        message: "分數計算不正確",
        details: {
          submittedScore: score,
          calculatedScore: correctAnswers,
        },
      });
    }

    // 5. 驗證作答時間
    if (timeSpent < 0 || timeSpent > 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        message: "作答時間不合理",
        details: {
          submittedTime: timeSpent,
          maxAllowedTime: 24 * 60 * 60 * 1000,
        },
      });
    }

    // 儲存測驗記錄
    const quizRecord = new QuizRecord({
      user: req.user.userId,
      topic,
      score,
      totalQuestions,
      answers: answers.map((answer) => ({
        ...answer,
        topic: topic,
        imagePath: answer.imagePath || null,
      })),
      quizFormat,
      timeSpent: timeSpent, // 使用前端傳來的時間
      completedAt: new Date(),
    });

    await quizRecord.save();

    // 獲取 AI 模型數據
    const aiModelFilePath = path.join(
      __dirname,
      "..",
      "data",
      "quizzes",
      "ai_model.json"
    );
    let aiModelData = {};
    try {
      const aiModelContent = await fs.readFile(aiModelFilePath, "utf8");
      aiModelData = JSON.parse(aiModelContent);
    } catch (error) {
      console.error("讀取 AI 模型數據失敗:", error);
    }

    // 計算統計資訊
    const percentage = (score / totalQuestions) * 100;
    const categoryType = topic.includes("獸醫") ? "veterinary" : "agriculture";
    const aiModels =
      aiModelData[categoryType] && aiModelData[categoryType][topic]
        ? aiModelData[categoryType][topic]
        : [];

    const betterThanCount = aiModels.filter(
      (model) => percentage > model.score
    ).length;

    // 回傳成功訊息
    res.status(201).json({
      message: "測驗記錄已保存",
      statistics: {
        percentage,
        betterThanCount,
        totalModels: aiModels.length,
        aiModels,
        timeSpent,
      },
      details: {
        score,
        totalQuestions,
        answersCount: answers.length,
      },
    });
  } catch (error) {
    console.error("保存測驗記錄失敗:", error);
    res.status(500).json({
      message: "伺服器錯誤",
      details: error.message,
    });
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

router.get("/ai-models/:category/:topic", async (req, res) => {
  try {
    const { category, topic } = req.params;
    const filePath = path.join(
      __dirname,
      "..",
      "data",
      "quizzes",
      "ai_model.json"
    );
    const data = await fs.readFile(filePath, "utf8");
    const aiModelData = JSON.parse(data);

    if (!aiModelData[category] || !aiModelData[category][topic]) {
      return res.status(404).json({ message: "找不到對應的 AI 模型數據" });
    }

    res.json(aiModelData[category][topic]);
  } catch (error) {
    console.error("讀取 AI 模型數據失敗:", error);
    res.status(500).json({ message: "載入 AI 模型數據失敗" });
  }
});

module.exports = router;
