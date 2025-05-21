// const express = require("express");
// const router = express.Router();
// const passport = require("passport");
// const Test = require("../models/test");
// const Question = require("../models/question");
// const Teacher = require("../models/teacher");
// const Student = require("../models/student");
// const Response = require("../models/response");
// const XLSX = require("xlsx");
// const multer = require("multer");

// function isTeacher(req, res, next) {
//   if (req.isAuthenticated() && req.user.constructor.modelName === "Teacher") {
//     return next();
//   }
//   res.redirect("/teacherlogin");
// }

// router.get("/teacherlogin", (req, res) => {
//   res.render("teacherlogin.ejs");
// });

// router.post(
//   "/teacherlogin",
//   passport.authenticate("teacher-local", {
//     failureRedirect: "/teacherlogin",
//   }),
//   (req, res) => {
//     res.redirect("/teacher");
//   }
// );

// router.get("/teacher", isTeacher, (req, res) => {
//   res.render("teacher.ejs", { username: req.user.username });
// });

// // Updated route for creating a test (GET)
// router.get("/teacher/tests/create", isTeacher, async (req, res) => {
//   const students = await Student.find({});
//   res.render("createTestTeacher.ejs", { students, user: req.user });
// });

// // Updated route for creating a test (POST)
// router.post("/teacher/tests", isTeacher, async (req, res) => {
//   const { testName, eligibleStudents, hours, minutes, seconds } = req.body;
//   const test = new Test({
//     testName,
//     assignedTeacher: req.user._id, // Automatically set to current teacher
//     eligibleStudents: eligibleStudents || [],
//     duration: {
//       hours: parseInt(hours) || 0,
//       minutes: parseInt(minutes) || 0,
//       seconds: parseInt(seconds) || 0,
//     },
//   });
//   await test.save();
//   res.redirect("/my-tests?message=Test created successfully");
// });

// // My-tests route (unchanged)
// router.get("/my-tests", isTeacher, async (req, res) => {
//   const tests = await Test.find({ assignedTeacher: req.user._id }).populate(
//     "assignedTeacher",
//     "username"
//   );
//   res.render("myTests.ejs", { tests, user: req.user });
// });

// // Delete test route (unchanged)
// router.post("/tests/:testId/delete", isTeacher, async (req, res) => {
//   try {
//     const testId = req.params.testId;
//     const test = await Test.findById(testId);
//     if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
//       return res.status(403).send("Unauthorized");
//     }
//     await Question.deleteMany({ testId: testId });
//     await Response.deleteMany({ testId: testId });
//     await Test.findByIdAndDelete(testId);
//     res.redirect("/my-tests?message=Test deleted successfully");
//   } catch (err) {
//     console.error("Error deleting test:", err);
//     res.status(500).send("Something went wrong while deleting the test");
//   }
// });

// router.get("/tests/:testId/add-question", isTeacher, async (req, res) => {
//   const test = await Test.findById(req.params.testId);
//   if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
//     return res.status(403).send("Unauthorized");
//   }
//   res.render("addQuestions.ejs", { test, user: req.user });
// });

// router.post("/tests/:testId/add-question", isTeacher, async (req, res) => {
//   try {
//     const test = await Test.findById(req.params.testId);
//     if (!test || test.assignedTeacher.toString() !== req.user._id.toString()) {
//       return res.status(403).send("Unauthorized");
//     }
//     const { questions } = req.body;
//     if (!questions || !Array.isArray(questions)) {
//       return res.status(400).send("Invalid questions data");
//     }
//     const newQuestions = [];
//     for (const q of questions) {
//       if (q.questionText && q.type) {
//         const questionData = {
//           testId: test._id,
//           questionText: q.questionText,
//           type: q.type,
//         };
//         if (q.type === "multiple-choice") {
//           questionData.options = q.options || [];
//           questionData.correctAnswer =
//             q.correctAnswer !== undefined
//               ? parseInt(q.correctAnswer)
//               : undefined;
//         } else if (q.type === "coding") {
//           questionData.testCases = parseTestCases(
//             q.testCasesInput,
//             q.testCasesOutput
//           );
//         }
//         const question = new Question(questionData);
//         const savedQuestion = await question.save();
//         newQuestions.push(savedQuestion._id);
//       }
//     }
//     res.redirect("/my-tests");
//   } catch (err) {
//     console.error("Error adding questions:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// function parseTestCases(input, output) {
//   if (!input || !output) return [];
//   const inputLines = input.trim().split("\n");
//   const outputLines = output.trim().split("\n");
//   const count = parseInt(inputLines[0]) || 0;
//   return inputLines.slice(1).map((inputLine, i) => ({
//     input: inputLine.trim(),
//     expectedOutput: outputLines[i] ? outputLines[i].trim() : "",
//   }));
// }

// router.get("/bulk-students", isTeacher, (req, res) => {
//   res.render("bulkStudents.ejs");
// });

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype.includes("spreadsheet") ||
//       file.mimetype.includes("excel")
//     ) {
//       cb(null, true);
//     } else {
//       cb(
//         new Error(
//           "Invalid file type. Please upload an Excel file (.xlsx or .xls)."
//         )
//       );
//     }
//   },
// }).single("studentsFile");

// router.post("/bulk-students", isTeacher, upload, async (req, res) => {
//   try {
//     if (!req.file) {
//       return res
//         .status(400)
//         .send("No file uploaded. Please select an Excel file.");
//     }
//     const workbook = XLSX.read(req.file.buffer, {
//       type: "buffer",
//       cellDates: true,
//     });
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     if (!sheet) {
//       return res.status(400).send("No data found in the uploaded Excel file.");
//     }
//     const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
//     const studentsData = [];
//     for (let i = 1; i < rawData.length; i++) {
//       const row = rawData[i];
//       const username = row[0];
//       const email = row[1];
//       const fullName = row[2];
//       if (row.every((cell) => cell === "" || cell === undefined)) {
//         break;
//       }
//       if (!username || username === "") {
//         continue;
//       }
//       studentsData.push({
//         username: String(username).trim(),
//         email: email ? String(email).trim() : "",
//         fullName: fullName ? String(fullName).trim() : "",
//       });
//     }
//     let successCount = 0;
//     let errorMessages = [];
//     const savePromises = studentsData.map(async (studentData) => {
//       try {
//         const student = new Student({
//           username: studentData.username,
//           email: studentData.email,
//           fullName: studentData.fullName,
//         });
//         await student.setPassword(studentData.username);
//         await student.save();
//         successCount++;
//       } catch (err) {
//         if (err.code === 11000) {
//           errorMessages.push(
//             `Duplicate username or email: ${studentData.username} / ${studentData.email}`
//           );
//         } else {
//           errorMessages.push(
//             `Error saving ${studentData.username}: ${err.message}`
//           );
//         }
//       }
//     });
//     await Promise.all(savePromises);
//     const responseMessage = `Uploaded ${successCount} students successfully.${
//       errorMessages.length > 0 ? " Errors: " + errorMessages.join("; ") : ""
//     }`;
//     res.redirect(`/teacher?message=${encodeURIComponent(responseMessage)}`);
//   } catch (err) {
//     console.error("Error uploading students:", err);
//     res
//       .status(500)
//       .send(`Something went wrong during file upload: ${err.message}`);
//   }
// });

// router.get("/teacher/results", isTeacher, async (req, res) => {
//   try {
//     const tests = await Test.find({ assignedTeacher: req.user._id });
//     const testIds = tests.map((test) => test._id);
//     const responses = await Response.find({ testId: { $in: testIds } })
//       .populate("studentId")
//       .populate("testId");
//     res.render("teacherResults.ejs", { responses });
//   } catch (err) {
//     console.error("Error fetching teacher results:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// // Add after existing imports
// router.get("/teacher/results/:responseId", isTeacher, async (req, res) => {
//   try {
//     const response = await Response.findById(req.params.responseId)
//       .populate("testId")
//       .populate("studentId")
//       .populate({
//         path: "answers.questionId",
//         model: "Question",
//       });
//     if (
//       !response ||
//       response.testId.assignedTeacher.toString() !== req.user._id.toString()
//     ) {
//       return res.status(403).send("Unauthorized");
//     }
//     res.render("responseDetails.ejs", { response, userType: "teacher" });
//   } catch (err) {
//     console.error("Error fetching response details:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// // Modify /teacher/results route to include responseId in the card link
// router.get("/teacher/results", isTeacher, async (req, res) => {
//   try {
//     const tests = await Test.find({ assignedTeacher: req.user._id });
//     const testIds = tests.map((test) => test._id);
//     const responses = await Response.find({ testId: { $in: testIds } })
//       .populate("studentId")
//       .populate("testId");
//     res.render("teacherResults.ejs", { responses });
//   } catch (err) {
//     console.error("Error fetching teacher results:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// // Add teacher profile routes
// router.get("/teacher/profile", isTeacher, (req, res) => {
//   res.render("teacherProfile.ejs", {
//     username: req.user.username,
//     email: req.user.email || "",
//     fullName: req.user.fullName || "",
//   });
// });

// router.post("/teacher/profile", isTeacher, async (req, res) => {
//   try {
//     const { fullName, email, currentPassword, newPassword } = req.body;
//     const teacher = await Teacher.findById(req.user._id);
//     if (!teacher) {
//       return res.status(404).send("Teacher not found");
//     }

//     // Update fullName and email if provided
//     teacher.fullName = fullName || teacher.fullName;
//     teacher.email = email || teacher.email;

//     // Handle password change if both currentPassword and newPassword are provided
//     if (currentPassword && newPassword) {
//       const isMatch = await teacher.authenticate(currentPassword);
//       if (!isMatch.user) {
//         return res.status(401).send("Current password is incorrect");
//       }
//       await teacher.setPassword(newPassword);
//     } else if (
//       (currentPassword && !newPassword) ||
//       (!currentPassword && newPassword)
//     ) {
//       return res
//         .status(400)
//         .send("Both current and new passwords are required to change password");
//     }

//     await teacher.save();
//     res.redirect("/teacher/profile?message=Profile updated successfully");
//   } catch (err) {
//     console.error("Error updating profile:", err);
//     res.status(500).send("Something went wrong while updating the profile");
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("multer");
const controller = require("../controller/teacher");

function isTeacher(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Teacher") {
    return next();
  }
  res.redirect("/teacherlogin");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("excel")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Please upload an Excel file."));
    }
  },
}).single("studentsFile");

// Auth routes
router.get("/teacherlogin", controller.renderLogin);
router.post(
  "/teacherlogin",
  passport.authenticate("teacher-local", {
    failureRedirect: "/teacherlogin",
  }),
  controller.loginSuccess
);

// Dashboard
router.get("/teacher", isTeacher, controller.dashboard);

// Test routes
router.get("/teacher/tests/create", isTeacher, controller.renderCreateTest);
router.post("/teacher/tests", isTeacher, controller.createTest);
router.get("/my-tests", isTeacher, controller.listTests);
router.post("/tests/:testId/delete", isTeacher, controller.deleteTest);
router.get(
  "/tests/:testId/add-question",
  isTeacher,
  controller.renderAddQuestion
);
router.post("/tests/:testId/add-question", isTeacher, controller.addQuestions);

// Bulk upload
router.get("/bulk-students", isTeacher, controller.renderBulkUpload);
router.post("/bulk-students", isTeacher, upload, controller.bulkUpload);

// Results
router.get("/teacher/results", isTeacher, controller.getResults);
router.get(
  "/teacher/results/:responseId",
  isTeacher,
  controller.getResponseDetail
);

// Profile
router.get("/teacher/profile", isTeacher, controller.getProfile);
router.post("/teacher/profile", isTeacher, controller.updateProfile);

module.exports = router;
