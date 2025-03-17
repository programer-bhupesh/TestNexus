const express = require("express");
const router = express.Router();
const passport = require("passport");
const Test = require("../models/test");
const Question = require("../models/question");
const Response = require("../models/response");
const Student = require("../models/student");
const fetch = require("node-fetch");

function isStudent(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Student") {
    return next();
  }
  res.redirect("/studentlogin");
}

router.get("/studentlogin", (req, res) => {
  res.render("studentlogin.ejs");
});

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

router.get("/student", isStudent, (req, res) => {
  res.render("student.ejs", { username: req.user.username });
});

router.get("/eligible-tests", isStudent, async (req, res) => {
  const tests = await Test.find({ eligibleStudents: req.user._id });
  res.render("eligibleTests.ejs", { tests });
});

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
    const testPlain = test.toObject();
    res.render("takeTest.ejs", { test: testPlain });
  } catch (err) {
    console.error("Error fetching test:", err);
    res.status(500).send("Something went wrong!");
  }
});

async function executeCode({ code, stdin, language }) {
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
  const apiUrl = "http://localhost:8080/execute";

  const payload = {
    clientId,
    clientSecret,
    script: code,
    language: language === "javascript" ? "nodejs" : language,
    versionIndex: "0",
    stdin,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.error || data.statusCode !== 200) {
      throw new Error(data.error || "JDoodle execution failed");
    }
    return data;
  } catch (error) {
    console.error("JDoodle execution error:", error);
    throw error;
  }
}

router.post("/tests/:testId/submit", isStudent, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) return res.status(404).send("Test not found");
    if (
      !test.eligibleStudents.some(
        (id) => id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).send("Unauthorized");
    }
    const { answers, languages } = req.body;
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
        score = isCorrect ? 1 : 0;
        response.answers.push({
          questionId: question._id,
          answer,
          outputs: [],
          score,
        });
      } else if (question.type === "coding") {
        const language = languages[question._id];
        const outputs = [];
        let allTestCasesPassed = true;

        const t = question.testCases.length;
        const combinedInput = `${t}\n${question.testCases
          .map((tc) => tc.input)
          .join("\n")}`;
        const expectedOutputs = question.testCases.map(
          (tc) => tc.expectedOutput
        );

        let modifiedCode = answer;
        if (language === "cpp" && !answer.includes("\n")) {
          modifiedCode = answer.replace(/cout<<a\+b;/g, "cout<<a+b<<endl;");
        }

        try {
          const result = await executeCode({
            code: modifiedCode,
            stdin: combinedInput,
            language,
          });
          const actualOutput = result.output ? result.output.trim() : "";
          const actualOutputLines = actualOutput
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== "");

          if (actualOutputLines.length !== expectedOutputs.length) {
            allTestCasesPassed = false;
          }

          for (let i = 0; i < question.testCases.length; i++) {
            const expected = expectedOutputs[i];
            const actual =
              i < actualOutputLines.length ? actualOutputLines[i] : "";
            const isCorrect = actual === expected;

            outputs.push({
              testCaseIndex: i,
              output: actual || "No output",
              isCorrect,
            });
            if (!isCorrect) allTestCasesPassed = false;
          }
        } catch (e) {
          for (let i = 0; i < question.testCases.length; i++) {
            outputs.push({
              testCaseIndex: i,
              output: `Error: ${e.message}`,
              isCorrect: false,
            });
          }
          allTestCasesPassed = false;
        }

        score = allTestCasesPassed ? 1 : 0;
        response.answers.push({
          questionId: question._id,
          answer,
          language,
          outputs,
          score,
        });
      }
      response.totalScore += score;
    }
    await response.save();
    res.redirect("/student/results");
  } catch (err) {
    console.error("Error submitting test:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.get("/student/results", isStudent, async (req, res) => {
  try {
    const responses = await Response.find({ studentId: req.user._id }).populate(
      "testId"
    );
    const validResponses = responses.filter(
      (response) => response.testId !== null
    );
    res.render("studentResults.ejs", { responses: validResponses });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.get("/student/profile", isStudent, (req, res) => {
  res.render("studentProfile.ejs", {
    username: req.user.username,
    email: req.user.email || "",
    fullName: req.user.fullName || "",
  });
});

router.post("/student/profile", isStudent, async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const student = await Student.findById(req.user._id);
    if (!student) {
      return res.status(404).send("Student not found");
    }
    student.fullName = fullName || student.fullName;
    student.email = email || student.email;
    await student.save();
    res.redirect("/student/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.get("/student/settings", isStudent, (req, res) => {
  res.render("studentSettings.ejs", { username: req.user.username });
});

router.post("/student/settings", isStudent, async (req, res) => {
  // No settings to update currently, redirect back
  res.redirect("/student/settings");
});

module.exports = router;
