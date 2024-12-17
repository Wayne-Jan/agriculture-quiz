const mongoose = require("mongoose");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");

const quizRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  quizFormat: {
    // 新增題庫形式欄位
    type: String,
    enum: ["text", "image"],
    required: true,
    default: "text",
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  answers: [
    {
      question: String,
      userAnswer: String,
      correctAnswer: String,
      isCorrect: Boolean,
      topic: String,
      // 新增圖片相關欄位
      imagePath: String, // 圖片路徑
      userAnswerText: String, // 使用者答案的文字內容
      correctAnswerText: String, // 正確答案的文字內容
    },
  ],
  completedAt: {
    type: Date,
    default: Date.now,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
});

// 計算百分比方法
quizRecordSchema.methods.getPercentage = function () {
  return ((this.score / this.totalQuestions) * 100).toFixed(2);
};

// 修改後的報告生成方法，支援圖片題庫
quizRecordSchema.methods.generateReport = async function (
  modelName = "農業知識測驗系統"
) {
  const tempDir = os.tmpdir();
  const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
  const filename = path.join(tempDir, `quiz-record-${timestamp}.txt`);

  let content = `測驗報告\n`;
  content += `===================\n`;
  content += `模型: ${modelName}\n`;
  content += `題庫類型: ${
    this.quizFormat === "image" ? "圖片題庫" : "文字題庫"
  }\n`;
  content += `正確題數: ${this.score} / ${this.totalQuestions}\n`;
  content += `正確率: ${this.getPercentage()}%\n`;
  content += `作答時間: ${this.timeSpent.toFixed(2)} 秒\n`;
  content += `完成時間: ${new Date(this.completedAt).toLocaleString()}\n`;
  content += `===================\n\n`;

  this.answers.forEach((answer, index) => {
    content += `題目 ${index + 1}\n`;
    content += `題型: ${answer.topic}\n`;
    if (answer.imagePath) {
      content += `圖片路徑: ${answer.imagePath}\n`;
    }
    content += `問題: ${answer.question}\n`;
    content += `使用者答案: ${answer.userAnswerText || answer.userAnswer}\n`;
    content += `正確答案: ${
      answer.correctAnswerText || answer.correctAnswer
    }\n`;
    content += `結果: ${answer.isCorrect ? "正確" : "錯誤"}\n`;
    content += `-------------------\n`;
  });

  try {
    await fs.writeFile(filename, content, "utf8");

    // 設定自動刪除文件（5分鐘後）
    setTimeout(async () => {
      try {
        await fs.unlink(filename);
        console.log(`臨時報告文件已自動刪除: ${filename}`);
      } catch (err) {
        console.error("刪除臨時文件失敗:", err);
      }
    }, 5 * 60 * 1000);

    return filename;
  } catch (error) {
    console.error("生成報告時發生錯誤:", error);
    throw error;
  }
};

const QuizRecord = mongoose.model("QuizRecord", quizRecordSchema);
module.exports = QuizRecord;
