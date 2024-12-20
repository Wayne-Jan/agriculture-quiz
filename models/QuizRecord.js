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
  quizFormat: {
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
      imagePath: String,
      userAnswerText: String,
      correctAnswerText: String,
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

// 添加靜態方法來計算統計數據
quizRecordSchema.statics.getStatistics = async function () {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        avgScore: {
          $avg: {
            $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100],
          },
        },
      },
    },
  ]);
  return result[0] || { totalRecords: 0, avgScore: 0 };
};

// 添加靜態方法來計算主題統計
quizRecordSchema.statics.getTopicStatistics = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: "$topic",
        totalAttempts: { $sum: 1 },
        avgScore: {
          $avg: {
            $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100],
          },
        },
        records: {
          $push: {
            userId: "$user",
            score: {
              $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100],
            },
            completedAt: "$completedAt",
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "records.userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
  ]);
};

quizRecordSchema.methods.generateReport = async function (
  modelName = "農業知識測驗系統"
) {
  // 將毫秒轉換為秒
  const timeInSeconds = (this.timeSpent / 1000).toFixed(2);

  // 計算正確率
  const accuracy = ((this.score / this.totalQuestions) * 100).toFixed(2);

  // 設定時間格式
  const formattedDate = new Date(this.completedAt).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 生成標題和基本資訊
  let report = `${modelName} - 測驗記錄\n`;
  report += `================================================\n`;
  report += `測驗主題：${this.topic}\n`;
  report += `測驗時間：${formattedDate}\n`;
  report += `作答時間：${timeInSeconds} 秒\n`;
  report += `總題數：${this.totalQuestions}\n`;
  report += `正確題數：${this.score}\n`;
  report += `正確率：${accuracy}%\n`;
  report += `題目形式：${this.quizFormat === "image" ? "圖片題" : "文字題"}\n`;
  report += `================================================\n\n`;

  // 添加答題詳情
  report += `答題詳情：\n`;
  this.answers.forEach((answer, index) => {
    report += `\n問題 ${index + 1}：${answer.question}\n`;

    // 如果是圖片題，添加圖片路徑資訊
    if (this.quizFormat === "image" && answer.imagePath) {
      report += `圖片位置：${answer.imagePath}\n`;
    }

    report += `您的答案：${answer.userAnswerText || answer.userAnswer}\n`;
    report += `正確答案：${answer.correctAnswerText || answer.correctAnswer}\n`;
    report += `結果：${answer.isCorrect ? "正確" : "錯誤"}\n`;
    report += `------------------------------------------------\n`;
  });

  // 添加結語
  report += `\n總評：\n`;
  if (accuracy >= 90) {
    report += `表現優異！您對${this.topic}有很好的掌握。\n`;
  } else if (accuracy >= 70) {
    report += `表現良好！您對${this.topic}有不錯的理解。\n`;
  } else if (accuracy >= 60) {
    report += `表現尚可，建議多加練習${this.topic}相關題目。\n`;
  } else {
    report += `需要加強，建議重新複習${this.topic}的相關知識。\n`;
  }

  // 添加完成時間
  report += `\n報告生成時間：${new Date().toLocaleString("zh-TW")}\n`;

  return report;
};

const QuizRecord = mongoose.model("QuizRecord", quizRecordSchema);
module.exports = QuizRecord;
