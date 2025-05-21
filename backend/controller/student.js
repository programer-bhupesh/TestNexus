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
}

module.exports = {
  isStudent,

  renderLogin: (req, res) => res.render("studentlogin.ejs"),

  loginHandler: (req, res) => {
    console.log("Authenticated student:", req.user);
    res.redirect("/student");
  },

  dashboard: (req, res) => {
    res.render("student.ejs", { username: req.user.username });
  },

  eligibleTests: async (req, res) => {
    const tests = await Test.find({ eligibleStudents: req.user._id });
    res.render("eligibleTests.ejs", { tests });
  },

  takeTest: async (req, res) => {
    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) return res.status(404).send("Test not found");

    const eligible = test.eligibleStudents.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!eligible) return res.status(403).send("Unauthorized");

    res.render("takeTest.ejs", { test: test.toObject() });
  },

  submitTest: async (req, res) => {
    const test = await Test.findById(req.params.testId).populate("questions");
    if (!test) return res.status(404).send("Test not found");

    const eligible = test.eligibleStudents.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!eligible) return res.status(403).send("Unauthorized");

    const { answers = {}, languages = {} } = req.body; // default to empty objects to avoid undefined
    const response = new Response({
      studentId: req.user._id,
      testId: test._id,
      answers: [],
      totalScore: 0,
    });

    for (const question of test.questions) {
      // Safely get answer or default to empty string if blank or missing
      const answer =
        answers[question._id] !== undefined && answers[question._id] !== null
          ? answers[question._id]
          : "";

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
        const language = languages[question._id] || "";
        const outputs = [];
        let allTestCasesPassed = true;

        const combinedInput = `${
          question.testCases.length
        }\n${question.testCases.map((tc) => tc.input).join("\n")}`;
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

          const actualOutputLines = (result.output || "")
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line);

          if (actualOutputLines.length !== expectedOutputs.length)
            allTestCasesPassed = false;

          for (let i = 0; i < question.testCases.length; i++) {
            const expected = expectedOutputs[i];
            const actual = actualOutputLines[i] || "";
            const isCorrect = actual === expected;

            outputs.push({
              testCaseIndex: i,
              output: actual || "No output",
              isCorrect,
            });
            if (!isCorrect) allTestCasesPassed = false;
          }
        } catch (e) {
          question.testCases.forEach((_, i) =>
            outputs.push({
              testCaseIndex: i,
              output: `Error: ${e.message}`,
              isCorrect: false,
            })
          );
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
  },

  viewResults: async (req, res) => {
    const responses = await Response.find({ studentId: req.user._id }).populate(
      "testId"
    );
    res.render("studentResults.ejs", {
      responses: responses.filter((r) => r.testId),
    });
  },

  responseDetails: async (req, res) => {
    const response = await Response.findById(req.params.responseId)
      .populate("testId")
      .populate("studentId")
      .populate({ path: "answers.questionId", model: "Question" });

    if (
      !response ||
      response.studentId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).send("Unauthorized");
    }

    res.render("responseDetails.ejs", { response, userType: "student" });
  },

  renderProfile: (req, res) => {
    res.render("studentProfile.ejs", {
      username: req.user.username,
      email: req.user.email || "",
      fullName: req.user.fullName || "",
    });
  },

  updateProfile: async (req, res) => {
    const { fullName, email, currentPassword, newPassword } = req.body;
    const student = await Student.findById(req.user._id);
    if (!student) return res.status(404).send("Student not found");

    student.fullName = fullName || student.fullName;
    student.email = email || student.email;

    if (currentPassword && newPassword) {
      const isMatch = await student.authenticate(currentPassword);
      if (!isMatch.user)
        return res.status(401).send("Current password is incorrect");

      await student.setPassword(newPassword);
    } else if (currentPassword || newPassword) {
      return res
        .status(400)
        .send("Both current and new passwords are required to change password");
    }

    await student.save();
    res.redirect("/student/profile?message=Profile updated successfully");
  },

  renderSettings: (req, res) => {
    res.render("studentSettings.ejs", { username: req.user.username });
  },

  saveSettings: (req, res) => {
    res.redirect("/student/settings");
  },
};
