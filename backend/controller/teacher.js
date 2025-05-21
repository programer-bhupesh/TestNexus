const Test = require("../models/test");
const Question = require("../models/question");
const Teacher = require("../models/teacher");
const Student = require("../models/student");
const Response = require("../models/response");
const XLSX = require("xlsx");

function parseTestCases(input, output) {
  if (!input || !output) return [];
  const inputLines = input.trim().split("\n");
  const outputLines = output.trim().split("\n");
  return inputLines.slice(1).map((inputLine, i) => ({
    input: inputLine.trim(),
    expectedOutput: outputLines[i] ? outputLines[i].trim() : "",
  }));
}

module.exports = {
  renderLogin: (req, res) => res.render("teacherlogin.ejs"),

  loginSuccess: (req, res) => res.redirect("/teacher"),

  dashboard: (req, res) =>
    res.render("teacher.ejs", { username: req.user.username }),

  renderCreateTest: async (req, res) => {
    const students = await Student.find({});
    res.render("createTestTeacher.ejs", { students, user: req.user });
  },

  createTest: async (req, res) => {
    const { testName, eligibleStudents, hours, minutes, seconds } = req.body;
    const test = new Test({
      testName,
      assignedTeacher: req.user._id,
      eligibleStudents: eligibleStudents || [],
      duration: {
        hours: parseInt(hours) || 0,
        minutes: parseInt(minutes) || 0,
        seconds: parseInt(seconds) || 0,
      },
    });
    await test.save();
    res.redirect("/my-tests?message=Test created successfully");
  },

  listTests: async (req, res) => {
    const tests = await Test.find({ assignedTeacher: req.user._id }).populate(
      "assignedTeacher",
      "username"
    );
    res.render("myTests.ejs", { tests, user: req.user });
  },

  deleteTest: async (req, res) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (
        !test ||
        test.assignedTeacher.toString() !== req.user._id.toString()
      ) {
        return res.status(403).send("Unauthorized");
      }
      await Question.deleteMany({ testId: test._id });
      await Response.deleteMany({ testId: test._id });
      await Test.findByIdAndDelete(test._id);
      res.redirect("/my-tests?message=Test deleted successfully");
    } catch (err) {
      console.error("Error deleting test:", err);
      res.status(500).send("Something went wrong while deleting the test");
    }
  },

  renderAddQuestion: async (req, res) => {
    const test = await Test.findById(req.params.testId);
    if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }
    res.render("addQuestions.ejs", { test, user: req.user });
  },

  addQuestions: async (req, res) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (
        !test ||
        test.assignedTeacher.toString() !== req.user._id.toString()
      ) {
        return res.status(403).send("Unauthorized");
      }

      const { questions } = req.body;
      if (!questions || !Array.isArray(questions))
        return res.status(400).send("Invalid questions data");

      const newQuestions = [];

      for (const q of questions) {
        if (q.questionText && q.type) {
          const questionData = {
            testId: test._id,
            questionText: q.questionText,
            type: q.type,
          };

          if (q.type === "multiple-choice") {
            questionData.options = q.options || [];
            questionData.correctAnswer =
              q.correctAnswer !== undefined
                ? parseInt(q.correctAnswer)
                : undefined;
          } else if (q.type === "coding") {
            questionData.testCases = parseTestCases(
              q.testCasesInput,
              q.testCasesOutput
            );
          }

          const question = new Question(questionData);
          const savedQuestion = await question.save();
          newQuestions.push(savedQuestion._id);
        }
      }

      res.redirect("/my-tests");
    } catch (err) {
      console.error("Error adding questions:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  renderBulkUpload: (req, res) => res.render("bulkStudents.ejs"),

  bulkUpload: async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .send("No file uploaded. Please select an Excel file.");

      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet)
        return res
          .status(400)
          .send("No data found in the uploaded Excel file.");

      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });
      const studentsData = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const username = row[0];
        const email = row[1];
        const fullName = row[2];

        if (row.every((cell) => cell === "" || cell === undefined)) break;
        if (!username) continue;

        studentsData.push({
          username: username.trim(),
          email: email?.trim() || "",
          fullName: fullName?.trim() || "",
        });
      }

      let successCount = 0;
      let errorMessages = [];

      const savePromises = studentsData.map(async (studentData) => {
        try {
          const student = new Student(studentData);
          await student.setPassword(studentData.username);
          await student.save();
          successCount++;
        } catch (err) {
          if (err.code === 11000) {
            errorMessages.push(
              `Duplicate username or email: ${studentData.username} / ${studentData.email}`
            );
          } else {
            errorMessages.push(
              `Error saving ${studentData.username}: ${err.message}`
            );
          }
        }
      });

      await Promise.all(savePromises);

      const responseMessage = `Uploaded ${successCount} students successfully.${
        errorMessages.length ? " Errors: " + errorMessages.join("; ") : ""
      }`;
      res.redirect(`/teacher?message=${encodeURIComponent(responseMessage)}`);
    } catch (err) {
      console.error("Error uploading students:", err);
      res
        .status(500)
        .send(`Something went wrong during file upload: ${err.message}`);
    }
  },

  getResults: async (req, res) => {
    try {
      const tests = await Test.find({ assignedTeacher: req.user._id });
      const responses = await Response.find({
        testId: { $in: tests.map((t) => t._id) },
      })
        .populate("studentId")
        .populate("testId");
      res.render("teacherResults.ejs", { responses });
    } catch (err) {
      console.error("Error fetching teacher results:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  getResponseDetail: async (req, res) => {
    try {
      const response = await Response.findById(req.params.responseId)
        .populate("testId")
        .populate("studentId")
        .populate({ path: "answers.questionId", model: "Question" });

      if (
        !response ||
        response.testId.assignedTeacher.toString() !== req.user._id.toString()
      ) {
        return res.status(403).send("Unauthorized");
      }
      res.render("responseDetails.ejs", { response, userType: "teacher" });
    } catch (err) {
      console.error("Error fetching response details:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  getProfile: (req, res) => {
    res.render("teacherProfile.ejs", {
      username: req.user.username,
      email: req.user.email || "",
      fullName: req.user.fullName || "",
    });
  },

  updateProfile: async (req, res) => {
    try {
      const { fullName, email, currentPassword, newPassword } = req.body;
      const teacher = await Teacher.findById(req.user._id);
      if (!teacher) return res.status(404).send("Teacher not found");

      teacher.fullName = fullName || teacher.fullName;
      teacher.email = email || teacher.email;

      if (currentPassword && newPassword) {
        const isMatch = await teacher.authenticate(currentPassword);
        if (!isMatch.user)
          return res.status(401).send("Current password is incorrect");
        await teacher.setPassword(newPassword);
      } else if (currentPassword || newPassword) {
        return res
          .status(400)
          .send(
            "Both current and new passwords are required to change password"
          );
      }

      await teacher.save();
      res.redirect("/teacher/profile?message=Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).send("Something went wrong while updating the profile");
    }
  },
};
