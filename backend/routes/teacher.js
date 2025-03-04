const express = require("express");
const router = express.Router();
const passport = require("passport");
const Test = require("../models/test");
const Question = require("../models/question");
const Response = require("../models/response");

// Middleware to check if user is authenticated as a teacher
function isTeacher(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Teacher") {
    return next();
  }
  res.redirect("/teacherlogin");
}

// Render teacher login page
router.get("/teacherlogin", (req, res) => {
  res.render("teacherlogin.ejs");
});

// Handle teacher login POST request
router.post(
  "/teacherlogin",
  passport.authenticate("teacher-local", {
    failureRedirect: "/teacherlogin",
  }),
  (req, res) => {
    console.log("Authenticated teacher:", req.user);
    res.redirect("/teacher");
  }
);

// Render teacher dashboard (protected)
router.get("/teacher", isTeacher, (req, res) => {
  res.render("teacher.ejs", { username: req.user.username });
});

// List assigned tests
router.get("/my-tests", isTeacher, async (req, res) => {
  const tests = await Test.find({ assignedTeacher: req.user._id });
  res.render("myTests.ejs", { tests });
});

// Render add question form
router.get("/tests/:testId/add-question", isTeacher, async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
    return res.status(403).send("Unauthorized");
  }
  res.render("addQuestion.ejs", { test });
});

// Add a question
router.post("/tests/:testId/questions", isTeacher, async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
    return res.status(403).send("Unauthorized");
  }
  const { type, questionText, options, correctAnswer, language, testCases } =
    req.body;
  const question = new Question({ testId: test._id, type, questionText });

  if (type === "multiple-choice") {
    question.options = options.split(",").map((opt) => opt.trim());
    if (question.options.length !== 4) {
      return res
        .status(400)
        .send("Multiple-choice questions must have exactly 4 options");
    }
    question.correctAnswer = parseInt(correctAnswer);
  } else if (type === "coding") {
    question.language = language; // e.g., "javascript", "python"
    question.testCases = JSON.parse(testCases); // Expecting JSON string
  }
  await question.save();
  res.redirect("/teacher/my-tests");
});

// View results of assigned tests
router.get("/teacher/results", isTeacher, async (req, res) => {
  try {
    const tests = await Test.find({ assignedTeacher: req.user._id });
    const testIds = tests.map((test) => test._id);
    const responses = await Response.find({ testId: { $in: testIds } })
      .populate("studentId")
      .populate("testId");
    res.render("teacherResults.ejs", { responses });
  } catch (err) {
    console.error("Error fetching teacher results:", err);
    res.status(500).send("Something went wrong!");
  }
});

module.exports = router;