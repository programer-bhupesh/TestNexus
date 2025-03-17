const express = require("express");
const router = express.Router();
const passport = require("passport");
const Test = require("../models/test");
const Question = require("../models/question");
const Teacher = require("../models/teacher");
const Student = require("../models/student");
const Admin = require("../models/admin");
const Response = require("../models/response");
const XLSX = require("xlsx");
const multer = require("multer");

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Admin") {
    return next();
  }
  res.redirect("/adminlogin");
}

router.get("/adminlogin", (req, res) => {
  res.render("adminlogin.ejs");
});

router.post(
  "/adminlogin",
  passport.authenticate("admin-local", {
    failureRedirect: "/adminlogin",
  }),
  (req, res) => {
    res.redirect("/admin");
  }
);

router.get("/admin", isAdmin, (req, res) => {
  res.render("admin.ejs", { username: req.user.username });
});

router.get("/addteacher", isAdmin, (req, res) => {
  res.render("addteacher.ejs");
});

router.post("/addteacher", isAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    const teacher = new Teacher({ fullName, username, email });
    await Teacher.register(teacher, password);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding teacher:", err);
    res.redirect("/addteacher");
  }
});

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

router.get("/addadmin", isAdmin, (req, res) => {
  res.render("addadmin.ejs");
});

router.post("/addadmin", isAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    const admin = new Admin({ fullName, username, email });
    await Admin.register(admin, password);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding admin:", err);
    res.redirect("/addadmin");
  }
});

router.get("/tests", isAdmin, async (req, res) => {
  const tests = await Test.find({}).populate("assignedTeacher", "username");
  res.render("adminTests.ejs", { tests, user: req.user });
});

router.get("/tests/create", isAdmin, async (req, res) => {
  const teachers = await Teacher.find({});
  const students = await Student.find({});
  res.render("createTest.ejs", { teachers, students });
});

router.post("/tests", isAdmin, async (req, res) => {
  const { testName, assignedTeacher, eligibleStudents } = req.body;
  const test = new Test({
    testName,
    assignedTeacher,
    eligibleStudents: eligibleStudents || [],
  });
  await test.save();
  res.redirect("/admin");
});

// Delete test route
router.post("/tests/:testId/delete", isAdmin, async (req, res) => {
  try {
    const testId = req.params.testId;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).send("Test not found");
    }

    // Delete related questions and responses
    await Question.deleteMany({ testId: testId });
    await Response.deleteMany({ testId: testId });
    // Delete the test
    await Test.findByIdAndDelete(testId);

    res.redirect("/tests?message=Test deleted successfully");
  } catch (err) {
    console.error("Error deleting test:", err);
    res.status(500).send("Something went wrong while deleting the test");
  }
});

router.get("/tests/:testId/questions/add", isAdmin, async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).send("Test not found");
  res.render("addQuestions.ejs", { test, user: req.user });
});

router.post("/tests/:testId/questions/add", isAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).send("Test not found");

    console.log("Request body:", req.body); // Debug: Check incoming data
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).send("Invalid questions data");
    }

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
        console.log("Saved question:", savedQuestion); // Debug: Confirm save
        newQuestions.push(savedQuestion._id);
      }
    }

    // No need to update test.questions since it's virtual; questions are linked via testId
    res.redirect("/tests");
  } catch (err) {
    console.error("Error adding questions:", err);
    res.status(500).send("Something went wrong!");
  }
});

function parseTestCases(input, output) {
  if (!input || !output) return [];
  const inputLines = input.trim().split("\n");
  const outputLines = output.trim().split("\n");
  const count = parseInt(inputLines[0]) || 0;
  return inputLines.slice(1).map((inputLine, i) => ({
    input: inputLine.trim(),
    expectedOutput: outputLines[i] ? outputLines[i].trim() : "",
  }));
}

router.get("/bulk-students", isAdmin, (req, res) => {
  res.render("bulkStudents.ejs");
});

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
      cb(
        new Error(
          "Invalid file type. Please upload an Excel file (.xlsx or .xls)."
        )
      );
    }
  },
}).single("studentsFile");

router.post("/bulk-students", isAdmin, upload, async (req, res) => {
  try {
    console.log("Received file:", req.file);

    if (!req.file) {
      return res
        .status(400)
        .send("No file uploaded. Please select an Excel file.");
    }

    const file = req.file;
    console.log("File details:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    let workbook;
    try {
      workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    } catch (parseErr) {
      console.error("Error parsing Excel file:", parseErr);
      return res.status(400).send("Invalid or corrupted Excel file.");
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).send("No data found in the uploaded Excel file.");
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    console.log("Raw data (all rows):", rawData);

    const studentsData = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const username = row[0]; // Column A
      const email = row[1]; // Column B
      const fullName = row[2]; // Column C

      if (row.every((cell) => cell === "" || cell === undefined)) {
        break;
      }

      if (!username || username === "") {
        console.log(`Skipping row ${i + 1}: Missing username`);
        continue;
      }

      studentsData.push({
        username: String(username).trim(),
        email: email ? String(email).trim() : "",
        fullName: fullName ? String(fullName).trim() : "",
      });
    }

    console.log("Parsed students data (all):", studentsData);
    console.log("Total students parsed:", studentsData.length);

    if (studentsData.length === 0) {
      return res
        .status(400)
        .send("No valid student data found in the Excel file.");
    }

    let successCount = 0;
    let errorMessages = [];
    const savePromises = studentsData.map(async (studentData, index) => {
      try {
        const student = new Student({
          username: studentData.username,
          email: studentData.email,
          fullName: studentData.fullName,
        });
        await student.setPassword(studentData.username);
        await student.save();
        successCount++;
        console.log(`Saved student ${index + 1}: ${studentData.username}`);
      } catch (err) {
        if (err.code === 11000) {
          errorMessages.push(
            `Duplicate username or email: ${studentData.username} / ${studentData.email}`
          );
          console.log(
            `Duplicate error at row ${index + 1}: ${studentData.username}`
          );
        } else {
          errorMessages.push(
            `Error saving ${studentData.username}: ${err.message}`
          );
          console.error(`Save error at row ${index + 1}:`, err);
        }
      }
    });

    await Promise.all(savePromises);

    const responseMessage = `Uploaded ${successCount} students successfully.${
      errorMessages.length > 0 ? " Errors: " + errorMessages.join("; ") : ""
    }`;
    console.log("Response message:", responseMessage);
    res.redirect(`/admin?message=${encodeURIComponent(responseMessage)}`);
  } catch (err) {
    console.error("Error uploading students:", err);
    res
      .status(500)
      .send(`Something went wrong during file upload: ${err.message}`);
  }
});

router.get("/bulk-teachers", isAdmin, (req, res) => {
  res.render("bulkTeachers.ejs");
});

const uploadteachers = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("excel")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Please upload an Excel file (.xlsx or .xls)."
        )
      );
    }
  },
}).single("teachersFile");

router.post("/bulk-teachers", isAdmin, uploadteachers, async (req, res) => {
  try {
    console.log("Received file:", req.file);

    if (!req.file) {
      return res
        .status(400)
        .send("No file uploaded. Please select an Excel file.");
    }

    const file = req.file;
    console.log("File details:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    let workbook;
    try {
      workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    } catch (parseErr) {
      console.error("Error parsing Excel file:", parseErr);
      return res.status(400).send("Invalid or corrupted Excel file.");
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).send("No data found in the uploaded Excel file.");
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    console.log("Raw data (all rows):", rawData);

    const teachersData = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const username = row[0]; // Column A
      const email = row[1]; // Column B
      const fullName = row[2]; // Column C

      if (row.every((cell) => cell === "" || cell === undefined)) {
        break;
      }

      if (!username || username === "") {
        console.log(`Skipping row ${i + 1}: Missing username`);
        continue;
      }

      teachersData.push({
        username: String(username).trim(),
        email: email ? String(email).trim() : "",
        fullName: fullName ? String(fullName).trim() : "",
      });
    }

    console.log("Parsed teachers data (all):", teachersData);
    console.log("Total teachers parsed:", teachersData.length);

    if (teachersData.length === 0) {
      return res
        .status(400)
        .send("No valid teacher data found in the Excel file.");
    }

    let successCount = 0;
    let errorMessages = [];
    const savePromises = teachersData.map(async (teacherData, index) => {
      try {
        const teacher = new Teacher({
          username: teacherData.username,
          email: teacherData.email,
          fullName: teacherData.fullName,
        });
        await teacher.setPassword(teacherData.username);
        await teacher.save();
        successCount++;
        console.log(`Saved teacher ${index + 1}: ${teacherData.username}`);
      } catch (err) {
        if (err.code === 11000) {
          errorMessages.push(
            `Duplicate username or email: ${teacherData.username} / ${teacherData.email}`
          );
          console.log(
            `Duplicate error at row ${index + 1}: ${teacherData.username}`
          );
        } else {
          errorMessages.push(
            `Error saving ${teacherData.username}: ${err.message}`
          );
          console.error(`Save error at row ${index + 1}:`, err);
        }
      }
    });

    await Promise.all(savePromises);

    const responseMessage = `Uploaded ${successCount} teachers successfully.${
      errorMessages.length > 0 ? " Errors: " + errorMessages.join("; ") : ""
    }`;
    console.log("Response message:", responseMessage);
    res.redirect(`/admin?message=${encodeURIComponent(responseMessage)}`);
  } catch (err) {
    console.error("Error uploading teachers:", err);
    res
      .status(500)
      .send(`Something went wrong during file upload: ${err.message}`);
  }
});

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

// New routes for viewing and deleting students and teachers
router.get("/total-students", isAdmin, async (req, res) => {
  try {
    const students = await Student.find({});
    res.render("totalStudents.ejs", { students });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.post("/students/:studentId/delete", isAdmin, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).send("Student not found");
    }

    // Delete related responses
    await Response.deleteMany({ studentId: studentId });
    await Student.findByIdAndDelete(studentId);

    res.redirect("/total-students?message=Student deleted successfully");
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).send("Something went wrong while deleting the student");
  }
});

router.get("/total-teachers", isAdmin, async (req, res) => {
  try {
    const teachers = await Teacher.find({});
    res.render("totalTeachers.ejs", { teachers });
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.post("/teachers/:teacherId/delete", isAdmin, async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).send("Teacher not found");
    }

    // Delete related tests, questions, and responses
    const tests = await Test.find({ assignedTeacher: teacherId });
    const testIds = tests.map((test) => test._id);
    await Question.deleteMany({ testId: { $in: testIds } });
    await Response.deleteMany({ testId: { $in: testIds } });
    await Test.deleteMany({ assignedTeacher: teacherId });
    await Teacher.findByIdAndDelete(teacherId);

    res.redirect("/total-teachers?message=Teacher deleted successfully");
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).send("Something went wrong while deleting the teacher");
  }
});

// New routes for updating students and teachers
router.get("/students/:studentId/update", isAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).send("Student not found");
    res.render("updateStudent.ejs", { student });
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.post("/students/:studentId/update", isAdmin, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { email, fullName, password } = req.body;
    const student = await Student.findById(studentId);

    if (!student) return res.status(404).send("Student not found");

    student.email = email || student.email;
    student.fullName = fullName || student.fullName;
    if (password) await student.setPassword(password);

    await student.save();
    res.redirect("/total-students?message=Student updated successfully");
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).send("Something went wrong while updating the student");
  }
});

router.get("/teachers/:teacherId/update", isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) return res.status(404).send("Teacher not found");
    res.render("updateTeacher.ejs", { teacher });
  } catch (err) {
    console.error("Error fetching teacher:", err);
    res.status(500).send("Something went wrong!");
  }
});

router.post("/teachers/:teacherId/update", isAdmin, async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const { email, fullName, password } = req.body;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) return res.status(404).send("Teacher not found");

    teacher.email = email || teacher.email;
    teacher.fullName = fullName || teacher.fullName;
    if (password) await teacher.setPassword(password);

    await teacher.save();
    res.redirect("/total-teachers?message=Teacher updated successfully");
  } catch (err) {
    console.error("Error updating teacher:", err);
    res.status(500).send("Something went wrong while updating the teacher");
  }
});

module.exports = router;
