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

// 保留原有的 generateReport 方法
quizRecordSchema.methods.generateReport = async function (
  modelName = "農業知識測驗系統"
) {
  // ... (保持原有的 generateReport 實現不變)
};

const QuizRecord = mongoose.model("QuizRecord", quizRecordSchema);
module.exports = QuizRecord;
