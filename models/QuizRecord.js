// models/QuizRecord.js
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

// 添加一個方法來計算百分比
quizRecordSchema.methods.getPercentage = function () {
  return ((this.score / this.totalQuestions) * 100).toFixed(2);
};

// 修改生成報告方法，使用臨時目錄
quizRecordSchema.methods.generateReport = async function (
  modelName = "農業知識測驗系統"
) {
  const tempDir = os.tmpdir(); // 使用系統臨時目錄
  const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
  const filename = path.join(tempDir, `quiz-record-${timestamp}.txt`);

  let content = `No.1 Model: ${modelName}, Correct: ${this.score} / ${
    this.totalQuestions
  }, Accuracy: ${this.getPercentage()}%, Time: ${this.timeSpent.toFixed(
    2
  )} seconds\n`;

  this.answers.forEach((answer, index) => {
    content += `Question ${index + 1}, AI answer: ${answer.userAnswer}, True: ${
      answer.correctAnswer
    }, ${answer.isCorrect ? "correct" : "incorrect"}, Topic: ${answer.topic}\n`;
  });

  try {
    await fs.writeFile(filename, content, "utf8");

    // 設定自動刪除文件的定時器（例如 5 分鐘後）
    setTimeout(async () => {
      try {
        await fs.unlink(filename);
        console.log(`已自動刪除臨時文件: ${filename}`);
      } catch (err) {
        console.error("刪除臨時文件失敗:", err);
      }
    }, 5 * 60 * 1000); // 5分鐘後刪除

    return filename;
  } catch (error) {
    console.error("生成報告時發生錯誤:", error);
    throw error;
  }
};

const QuizRecord = mongoose.model("QuizRecord", quizRecordSchema);

module.exports = QuizRecord;
