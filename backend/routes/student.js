// const express = require("express");
// const router = express.Router();
// const passport = require("passport");
// const Test = require("../models/test");
// const Question = require("../models/question");
// const Response = require("../models/response");
// const Student = require("../models/student");
// const fetch = require("node-fetch");

// function isStudent(req, res, next) {
//   if (req.isAuthenticated() && req.user.constructor.modelName === "Student") {
//     return next();
//   }
//   res.redirect("/studentlogin");
// }

// router.get("/studentlogin", (req, res) => {
//   res.render("studentlogin.ejs");
// });

// router.post(
//   "/studentlogin",
//   passport.authenticate("student-local", {
//     failureRedirect: "/studentlogin",
//   }),
//   (req, res) => {
//     console.log("Authenticated student:", req.user);
//     res.redirect("/student");
//   }
// );

// router.get("/student", isStudent, (req, res) => {
//   res.render("student.ejs", { username: req.user.username });
// });

// router.get("/eligible-tests", isStudent, async (req, res) => {
//   const tests = await Test.find({ eligibleStudents: req.user._id });
//   res.render("eligibleTests.ejs", { tests });
// });

// router.get("/tests/:testId", isStudent, async (req, res) => {
//   try {
//     const test = await Test.findById(req.params.testId).populate("questions");
//     if (!test) {
//       return res.status(404).send("Test not found");
//     }
//     if (
//       !test.eligibleStudents.some(
//         (id) => id.toString() === req.user._id.toString()
//       )
//     ) {
//       return res.status(403).send("Unauthorized");
//     }
//     const testPlain = test.toObject();
//     res.render("takeTest.ejs", { test: testPlain });
//   } catch (err) {
//     console.error("Error fetching test:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// async function executeCode({ code, stdin, language }) {
//   const clientId = process.env.JDOODLE_CLIENT_ID;
//   const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
//   const apiUrl = "http://localhost:8080/execute";

//   const payload = {
//     clientId,
//     clientSecret,
//     script: code,
//     language: language === "javascript" ? "nodejs" : language,
//     versionIndex: "0",
//     stdin,
//   };

//   try {
//     const response = await fetch(apiUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const data = await response.json();
//     if (data.error || data.statusCode !== 200) {
//       throw new Error(data.error || "JDoodle execution failed");
//     }
//     return data;
//   } catch (error) {
//     console.error("JDoodle execution error:", error);
//     throw error;
//   }
// }

// router.post("/tests/:testId/submit", isStudent, async (req, res) => {
//   try {
//     const test = await Test.findById(req.params.testId).populate("questions");
//     if (!test) return res.status(404).send("Test not found");
//     if (
//       !test.eligibleStudents.some(
//         (id) => id.toString() === req.user._id.toString()
//       )
//     ) {
//       return res.status(403).send("Unauthorized");
//     }
//     const { answers, languages } = req.body;
//     const response = new Response({
//       studentId: req.user._id,
//       testId: test._id,
//       answers: [],
//       totalScore: 0,
//     });

//     for (const question of test.questions) {
//       const answer = answers[question._id];
//       let score = 0;
//       if (question.type === "multiple-choice") {
//         const isCorrect = parseInt(answer) === question.correctAnswer;
//         score = isCorrect ? 1 : 0;
//         response.answers.push({
//           questionId: question._id,
//           answer,
//           outputs: [],
//           score,
//         });
//       } else if (question.type === "coding") {
//         const language = languages[question._id];
//         const outputs = [];
//         let allTestCasesPassed = true;

//         const t = question.testCases.length;
//         const combinedInput = `${t}\n${question.testCases
//           .map((tc) => tc.input)
//           .join("\n")}`;
//         const expectedOutputs = question.testCases.map(
//           (tc) => tc.expectedOutput
//         );

//         let modifiedCode = answer;
//         if (language === "cpp" && !answer.includes("\n")) {
//           modifiedCode = answer.replace(/cout<<a\+b;/g, "cout<<a+b<<endl;");
//         }

//         try {
//           const result = await executeCode({
//             code: modifiedCode,
//             stdin: combinedInput,
//             language,
//           });
//           const actualOutput = result.output ? result.output.trim() : "";
//           const actualOutputLines = actualOutput
//             .split("\n")
//             .map((line) => line.trim())
//             .filter((line) => line !== "");

//           if (actualOutputLines.length !== expectedOutputs.length) {
//             allTestCasesPassed = false;
//           }

//           for (let i = 0; i < question.testCases.length; i++) {
//             const expected = expectedOutputs[i];
//             const actual =
//               i < actualOutputLines.length ? actualOutputLines[i] : "";
//             const isCorrect = actual === expected;

//             outputs.push({
//               testCaseIndex: i,
//               output: actual || "No output",
//               isCorrect,
//             });
//             if (!isCorrect) allTestCasesPassed = false;
//           }
//         } catch (e) {
//           for (let i = 0; i < question.testCases.length; i++) {
//             outputs.push({
//               testCaseIndex: i,
//               output: `Error: ${e.message}`,
//               isCorrect: false,
//             });
//           }
//           allTestCasesPassed = false;
//         }

//         score = allTestCasesPassed ? 1 : 0;
//         response.answers.push({
//           questionId: question._id,
//           answer,
//           language,
//           outputs,
//           score,
//         });
//       }
//       response.totalScore += score;
//     }
//     await response.save();
//     res.redirect("/student/results");
//   } catch (err) {
//     console.error("Error submitting test:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// router.get("/student/results", isStudent, async (req, res) => {
//   try {
//     const responses = await Response.find({ studentId: req.user._id }).populate(
//       "testId"
//     );
//     const validResponses = responses.filter(
//       (response) => response.testId !== null
//     );
//     res.render("studentResults.ejs", { responses: validResponses });
//   } catch (err) {
//     console.error("Error fetching results:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// router.get("/student/profile", isStudent, (req, res) => {
//   res.render("studentProfile.ejs", {
//     username: req.user.username,
//     email: req.user.email || "",
//     fullName: req.user.fullName || "",
//   });
// });

// router.post("/student/profile", isStudent, async (req, res) => {
//   try {
//     const { fullName, email, currentPassword, newPassword } = req.body;
//     const student = await Student.findById(req.user._id);
//     if (!student) {
//       return res.status(404).send("Student not found");
//     }

//     // Update fullName and email if provided
//     student.fullName = fullName || student.fullName;
//     student.email = email || student.email;

//     // Handle password change if both currentPassword and newPassword are provided
//     if (currentPassword && newPassword) {
//       // Verify current password
//       const isMatch = await student.authenticate(currentPassword);
//       if (!isMatch.user) {
//         return res.status(401).send("Current password is incorrect");
//       }
//       // Set new password
//       await student.setPassword(newPassword);
//     } else if (
//       (currentPassword && !newPassword) ||
//       (!currentPassword && newPassword)
//     ) {
//       return res
//         .status(400)
//         .send("Both current and new passwords are required to change password");
//     }

//     await student.save();
//     res.redirect("/student/profile?message=Profile updated successfully");
//   } catch (err) {
//     console.error("Error updating profile:", err);
//     res.status(500).send("Something went wrong while updating the profile");
//   }
// });

// router.get("/student/settings", isStudent, (req, res) => {
//   res.render("studentSettings.ejs", { username: req.user.username });
// });

// router.post("/student/settings", isStudent, async (req, res) => {
//   // No settings to update currently, redirect back
//   res.redirect("/student/settings");
// });

// // Add after existing imports
// router.get("/student/results/:responseId", isStudent, async (req, res) => {
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
//       response.studentId._id.toString() !== req.user._id.toString()
//     ) {
//       return res.status(403).send("Unauthorized");
//     }
//     res.render("responseDetails.ejs", { response, userType: "student" });
//   } catch (err) {
//     console.error("Error fetching response details:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// // Modify /student/results route to include responseId in the card link
// router.get("/student/results", isStudent, async (req, res) => {
//   try {
//     const responses = await Response.find({ studentId: req.user._id }).populate(
//       "testId"
//     );
//     const validResponses = responses.filter(
//       (response) => response.testId !== null
//     );
//     res.render("studentResults.ejs", { responses: validResponses });
//   } catch (err) {
//     console.error("Error fetching results:", err);
//     res.status(500).send("Something went wrong!");
//   }
// });

// module.exports = router;


const express = require("express");
const passport = require("passport");
const controller = require("../controller/student");

const router = express.Router();

router.get("/studentlogin", controller.renderLogin);

router.post(
  "/studentlogin",
  passport.authenticate("student-local", { failureRedirect: "/studentlogin" }),
  controller.loginHandler
);

router.get("/student", controller.isStudent, controller.dashboard);

router.get("/eligible-tests", controller.isStudent, controller.eligibleTests);

router.get("/tests/:testId", controller.isStudent, controller.takeTest);

router.post(
  "/tests/:testId/submit",
  controller.isStudent,
  controller.submitTest
);

router.get("/student/results", controller.isStudent, controller.viewResults);

router.get(
  "/student/results/:responseId",
  controller.isStudent,
  controller.responseDetails
);

router.get("/student/profile", controller.isStudent, controller.renderProfile);

router.post("/student/profile", controller.isStudent, controller.updateProfile);

router.get(
  "/student/settings",
  controller.isStudent,
  controller.renderSettings
);

router.post("/student/settings", controller.isStudent, controller.saveSettings);

module.exports = router;
