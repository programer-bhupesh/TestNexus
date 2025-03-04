const express = require("express");
const router = express.Router();
const passport = require("passport");
const Test = require("../models/test");
const Question = require("../models/question");
const Response = require("../models/response");
const vm = require("vm");

// Middleware to check if user is authenticated as a student
function isStudent(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Student") {
    return next();
  }
  res.redirect("/studentlogin");
}

// Render student login page
router.get("/studentlogin", (req, res) => {
  res.render("studentlogin.ejs");
});

// Handle student login POST request
router.post(
  "/studentlogin",
  passport.authenticate("student-local", {
    failureRedirect: "/studentlogin",
  }),
  (req, res) => {
    console.log("Authenticated student:", req.user);
    res.redirect("/student");
  }
);

// Render student dashboard (protected)
router.get("/student", isStudent, (req, res) => {
  res.render("student.ejs", { username: req.user.username });
});

// List eligible tests
router.get("/eligible-tests", isStudent, async (req, res) => {
  const tests = await Test.find({ eligibleStudents: req.user._id });
  res.render("eligibleTests.ejs", { tests });
});

// Render test page
router.get("/tests/:testId", isStudent, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) {
      return res.status(404).send("Test not found");
    }
    if (
      !test.eligibleStudents.some(
        (id) => id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).send("Unauthorized");
    }
    res.render("takeTest.ejs", { test });
  } catch (err) {
    console.error("Error fetching test:", err);
    res.status(500).send("Something went wrong!");
  }
});

// Submit test answers with automatic evaluation
router.post("/tests/:testId/submit", isStudent, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) {
      return res.status(404).send("Test not found");
    }
    if (
      !test.eligibleStudents.some(
        (id) => id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).send("Unauthorized");
    }
    const { answers } = req.body; // Object with questionId as keys and answers as values
    const response = new Response({
      studentId: req.user._id,
      testId: test._id,
      answers: [],
      totalScore: 0,
    });

    for (const question of test.questions) {
      const answer = answers[question._id];
      let score = 0;
      if (question.type === "multiple-choice") {
        const isCorrect = parseInt(answer) === question.correctAnswer;
        score = isCorrect ? 1 : 0; // 1 point for correct answer
        response.answers.push({
          questionId: question._id,
          answer,
          outputs: [],
          score,
        });
      } else if (question.type === "coding") {
        const outputs = [];
        let allTestCasesPassed = true;
        if (question.language === "javascript") {
          for (let i = 0; i < question.testCases.length; i++) {
            const { input, expectedOutput } = question.testCases[i];
            try {
              const script = new vm.Script(`function run(input) { ${answer} }`);
              const context = vm.createContext({ input });
              script.runInContext(context);
              const output = context.run(input).toString();
              const isCorrect = output === expectedOutput;
              outputs.push({
                testCaseIndex: i,
                output,
                isCorrect,
              });
              if (!isCorrect) allTestCasesPassed = false;
            } catch (e) {
              outputs.push({
                testCaseIndex: i,
                output: `Error: ${e.message}`,
                isCorrect: false,
              });
              allTestCasesPassed = false;
            }
          }
          score = allTestCasesPassed ? 1 : 0; // 1 point if all test cases pass
        } else {
          outputs.push({
            testCaseIndex: 0,
            output: "Not executed",
            isCorrect: false,
          });
          score = 0;
        }
        response.answers.push({
          questionId: question._id,
          answer,
          outputs,
          score,
        });
      }
      response.totalScore += score;
    }
    console.log("Creating response with testId:", test._id);
    await response.save();
    res.redirect("/student/results"); // Redirect to results page after submission
  } catch (err) {
    console.error("Error submitting test:", err);
    res.status(500).send("Something went wrong!");
  }
});

// View student's own test results
router.get("/student/results", isStudent, async (req, res) => {
  try {
    const responses = await Response.find({ studentId: req.user._id }).populate(
      "testId"
    );
    const validResponses = responses.filter(
      (response) => response.testId !== null
    );
    console.log("Valid responses:", validResponses);
    res.render("studentResults.ejs", { responses: validResponses });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).send("Something went wrong!");
  }
});

module.exports = router;