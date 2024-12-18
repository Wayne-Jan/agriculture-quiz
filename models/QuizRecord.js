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
  category: {
    // 添加类别字段
    type: String,
    required: true,
    enum: ["agriculture", "veterinary"],
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
      category: String, // 添加每个答案的类别信息
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

// 计算百分比方法
quizRecordSchema.methods.getPercentage = function () {
  return ((this.score / this.totalQuestions) * 100).toFixed(2);
};

// 添加获取 AI 模型比较数据的方法
quizRecordSchema.methods.getAIComparison = async function () {
  try {
    const aiDataPath = path.join(
      __dirname,
      "..",
      "data",
      "quizzes",
      "ai_models",
      "ai_image.json"
    );
    const aiData = JSON.parse(await fs.readFile(aiDataPath, "utf8"));

    if (this.category === "agriculture") {
      // 解析农业主题，例如: "水稻病害" => { crop: "rice", type: "disease" }
      const topicMappings = {
        水稻病害: { crop: "rice", type: "disease" },
        水稻害蟲: { crop: "rice", type: "pest" },
        水稻營養障礙: { crop: "rice", type: "nutrition" },
        茶樹病害: { crop: "tea", type: "disease" },
        茶樹害蟲: { crop: "tea", type: "pest" },
        茶樹營養障礙: { crop: "tea", type: "nutrition" },
        葡萄病害: { crop: "grape", type: "disease" },
        葡萄害蟲: { crop: "grape", type: "pest" },
        葡萄營養障礙: { crop: "grape", type: "nutrition" },
      };

      const mapping = topicMappings[this.topic];
      if (mapping && aiData.agriculture[mapping.crop]?.[mapping.type]) {
        return aiData.agriculture[mapping.crop][mapping.type];
      }
    } else if (this.category === "veterinary") {
      // 解析兽医主题
      const topicMappings = {
        獸醫病理學: "pathology",
        獸醫實驗診斷學: "diagnostic",
        獸醫普通疾病學: "general",
        獸醫傳染病學: "infectious",
        獸醫公共衛生學: "public_health",
      };

      const mappedTopic = topicMappings[this.topic];
      if (mappedTopic && aiData.veterinary[mappedTopic]) {
        return aiData.veterinary[mappedTopic];
      }
    }
    return [];
  } catch (error) {
    console.error("获取 AI 比较数据失败:", error);
    return [];
  }
};

// 计算统计数据的静态方法
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

// 计算主题统计的静态方法
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
            category: "$category", // 添加类别信息
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

// 生成报告的方法
quizRecordSchema.methods.generateReport = async function (
  modelName = "農業知識測驗系統"
) {
  // 添加 AI 比较数据到报告中
  const aiComparison = await this.getAIComparison();
  const percentage = this.getPercentage();

  return {
    modelName,
    topic: this.topic,
    category: this.category,
    score: this.score,
    totalQuestions: this.totalQuestions,
    percentage: percentage,
    aiComparison,
    completedAt: this.completedAt,
    timeSpent: this.timeSpent,
  };
};

const QuizRecord = mongoose.model("QuizRecord", quizRecordSchema);
module.exports = QuizRecord;
