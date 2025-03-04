const express = require("express");
const router = express.Router();
const passport = require("passport");
const Teacher = require("../models/teacher");
const Student = require("../models/student");
const Test = require("../models/test");
const Question = require("../models/question");
const Response = require("../models/response");

// Middleware to check if user is authenticated as an admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Admin") {
    return next();
  }
  res.redirect("/adminlogin");
}

// Render admin login page
router.get("/adminlogin", (req, res) => {
  res.render("adminlogin.ejs");
});

// Handle admin login POST request
router.post(
  "/adminlogin",
  passport.authenticate("admin-local", {
    failureRedirect: "/adminlogin",
  }),
  (req, res) => {
    console.log("Authenticated admin:", req.user);
    res.redirect("/admin");
  }
);

// Render admin dashboard (protected)
router.get("/admin", isAdmin, (req, res) => {
  res.render("admin.ejs", { username: req.user.username });
});

// Add Teacher (admin only)
router.get("/addteacher", isAdmin, (req, res) => {
  res.render("addteacher.ejs");
});

router.post("/addteacher", isAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const teacher = new Teacher({ username, email });
    await Teacher.register(teacher, password);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding teacher:", err);
    res.redirect("/addteacher");
  }
});

// Add Student (admin only)
router.get("/addstudent", isAdmin, (req, res) => {
  res.render("addstudent.ejs");
});

router.post("/addstudent", isAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const student = new Student({ username, email });
    await Student.register(student, password);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding student:", err);
    res.redirect("/addstudent");
  }
});

// Render add admin form (protected)
router.get("/addadmin", isAdmin, (req, res) => {
  res.render("addadmin.ejs");
});

// Handle add admin POST request (protected)
router.post("/addadmin", isAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const admin = new Admin({ username, email });
    await Admin.register(admin, password); // Hashes password and saves admin
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding admin:", err);
    res.redirect("/addadmin");
  }
});

// Render create test form
router.get("/tests/create", isAdmin, async (req, res) => {
  const teachers = await Teacher.find({});
  const students = await Student.find({});
  res.render("createTest.ejs", { teachers, students });
});

// Create a test with multiple students
router.post("/tests", isAdmin, async (req, res) => {
  const { testName, assignedTeacher, eligibleStudents } = req.body;
  const test = new Test({
    testName,
    assignedTeacher,
    eligibleStudents: eligibleStudents || [], // Handle multiple students
  });
  await test.save();
  res.redirect("/admin");
});

// View all tests
router.get("/tests", isAdmin, async (req, res) => {
  const tests = await Test.find({});
  res.render("adminTests.ejs", { tests });
});

// Add question to a test - GET route for form
router.get("/tests/:testId/add-question", isAdmin, async (req, res) => {
  const test = await Test.findById(req.params.testId);
  res.render("addQuestion.ejs", { test });
});

// Add question to a test - POST route to save question
router.post("/tests/:testId/questions", isAdmin, async (req, res) => {
  const { type, questionText, options, correctAnswer, language, testCases } =
    req.body;
  const question = new Question({
    testId: req.params.testId,
    type,
    questionText,
  });

  if (type === "multiple-choice") {
    question.options = options.split(",").map((opt) => opt.trim());
    question.correctAnswer = parseInt(correctAnswer);
  } else if (type === "coding") {
    question.language = language;
    question.testCases = JSON.parse(testCases);
  }

  await question.save();
  res.redirect("/tests");
});

// View all test results
router.get("/admin/results", isAdmin, async (req, res) => {
  try {
    const responses = await Response.find({})
      .populate("studentId")
      .populate("testId");
    res.render("adminResults.ejs", { responses });
  } catch (err) {
    console.error("Error fetching admin results:", err);
    res.status(500).send("Something went wrong!");
  }
});

module.exports = router;