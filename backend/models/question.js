const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true,
  },
  type: {
    type: String,
    enum: ["multiple-choice", "coding"],
    required: true,
  },
  questionText: { type: String, required: true },
  options: [String], // For multiple-choice: array of options
  correctAnswer: Number, // Index of correct option for multiple-choice
  language: String, // For coding: programming language
  testCases: [
    {
      input: String,
      expectedOutput: String,
    },
  ], // For coding: test cases
});

module.exports = mongoose.model("Question", questionSchema);