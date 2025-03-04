// backend/models/question.js
// const mongoose = require("mongoose");

// const questionSchema = new mongoose.Schema({
//   testId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Test",
//     required: true,
//   },
//   type: {
//     type: String,
//     enum: ["multiple-choice", "coding"],
//     required: true,
//   },
//   questionText: { type: String, required: true },
//   options: [{ type: String }], // For multiple-choice: exactly 4 options
//   correctAnswer: { type: Number, min: 0, max: 3 }, // Index of correct option
//   language: { type: String }, // For coding: e.g., "javascript", "python", etc.
//   testCases: [
//     {
//       input: String,
//       expectedOutput: String,
//     },
//   ], // For coding: test cases to run
// });

// module.exports = mongoose.model("Question", questionSchema);


// const mongoose = require("mongoose");

// const questionSchema = new mongoose.Schema({
//   testId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Test",
//     required: true,
//   },
//   type: {
//     type: String,
//     enum: ["multiple-choice", "coding"],
//     required: true,
//   },
//   questionText: { type: String, required: true },
//   options: [{ type: String }], // For multiple-choice
//   correctAnswer: { type: Number }, // Index of correct option
//   language: { type: String }, // For coding
//   testCases: [
//     {
//       input: String,
//       expectedOutput: String,
//     },
//   ],
// });

// module.exports = mongoose.model("Question", questionSchema);

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