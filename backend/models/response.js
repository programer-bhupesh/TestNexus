const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true,
  },
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
      answer: String, // Multiple-choice: option index; Coding: code
      language:String,
      outputs: [
        {
          testCaseIndex: Number,
          output: String,
          isCorrect: Boolean,
        },
      ], // For coding: output per test case
      score: Number, // Score for this question (e.g., 1 if correct, 0 if incorrect)
    },
  ],
  totalScore: Number, // Total score for the test
});

module.exports = mongoose.model("Response", responseSchema);