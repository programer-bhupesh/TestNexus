const Test = require("../models/test");
const Question = require("../models/question");
const Teacher = require("../models/teacher");
const Student = require("../models/student");
const Admin = require("../models/admin");
const Response = require("../models/response");
const XLSX = require("xlsx");

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

const adminController = {
  getAdminLogin:async (req, res) => {
    try {
      const adminId = req.cookies.adminId;
  
      if (adminId) {
        const admin = await Admin.findById(adminId);
        if (admin) {
          return res.redirect("/admin"); // Already logged in → redirect to dashboard
        } else {
          res.clearCookie("adminId"); // Cleanup invalid cookie
        }
      }
      res.render("adminlogin.ejs"); // Render login page if not logged in
    } catch (err) {
      console.error("Error in getAdminLogin:", err);
      res.render("adminlogin.ejs", { error: "Something went wrong." });
    }
  },

  postAdminLogin: async (req, res) => {
    // Set cookie after successful login
    res.cookie("adminId", req.user._id.toString(), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/admin");
  },

  getAdminDashboard: (req, res) => {
    res.render("admin.ejs", { username: req.user.username });
  },

  getAddTeacher: (req, res) => {
    res.render("addteacher.ejs");
  },

  postAddTeacher: async (req, res) => {
    try {
      const { username, email, password, fullName } = req.body;
      const teacher = new Teacher({ fullName, username, email });
      await Teacher.register(teacher, password);
      res.redirect("/admin");
    } catch (err) {
      console.error("Error adding teacher:", err);
      res.redirect("/addteacher");
    }
  },

  getAddStudent: (req, res) => {
    res.render("addstudent.ejs");
  },

  postAddStudent: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const student = new Student({ username, email });
      await Student.register(student, password);
      res.redirect("/admin");
    } catch (err) {
      console.error("Error adding student:", err);
      res.redirect("/addstudent");
    }
  },

  getAddAdmin: (req, res) => {
    res.render("addadmin.ejs");
  },

  postAddAdmin: async (req, res) => {
    try {
      const { username, email, password, fullName } = req.body;
      const admin = new Admin({ fullName, username, email });
      await Admin.register(admin, password);
      res.redirect("/admin");
    } catch (err) {
      console.error("Error adding admin:", err);
      res.redirect("/addadmin");
    }
  },

  getTests: async (req, res) => {
    const tests = await Test.find({}).populate("assignedTeacher", "username");
    res.render("adminTests.ejs", { tests, user: req.user });
  },

  getCreateTest: async (req, res) => {
    const teachers = await Teacher.find({});
    const students = await Student.find({});
    res.render("createTest.ejs", { teachers, students });
  },

  postCreateTest: async (req, res) => {
    const {
      testName,
      assignedTeacher,
      eligibleStudents,
      hours,
      minutes,
      seconds,
    } = req.body;
    const test = new Test({
      testName,
      assignedTeacher,
      eligibleStudents: eligibleStudents || [],
      duration: {
        hours: parseInt(hours) || 0,
        minutes: parseInt(minutes) || 0,
        seconds: parseInt(seconds) || 0,
      },
    });
    await test.save();
    res.redirect("/admin");
  },

  deleteTest: async (req, res) => {
    try {
      const testId = req.params.testId;
      const test = await Test.findById(testId);

      if (!test) {
        return res.status(404).send("Test not found");
      }

      await Question.deleteMany({ testId: testId });
      await Response.deleteMany({ testId: testId });
      await Test.findByIdAndDelete(testId);

      res.redirect("/tests?message=Test deleted successfully");
    } catch (err) {
      console.error("Error deleting test:", err);
      res.status(500).send("Something went wrong while deleting the test");
    }
  },

  getAddQuestions: async (req, res) => {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).send("Test not found");
    res.render("addQuestions.ejs", { test, user: req.user });
  },

  postAddQuestions: async (req, res) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) return res.status(404).send("Test not found");

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
          newQuestions.push(savedQuestion._id);
        }
      }

      res.redirect("/tests");
    } catch (err) {
      console.error("Error adding questions:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  getBulkStudents: (req, res) => {
    res.render("bulkStudents.ejs");
  },

  postBulkStudents: async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send("No file uploaded. Please select an Excel file.");
      }

      const file = req.file;
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
        return res
          .status(400)
          .send("No data found in the uploaded Excel file.");
      }

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
  },

  getBulkTeachers: (req, res) => {
    res.render("bulkTeachers.ejs");
  },

  postBulkTeachers: async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send("No file uploaded. Please select an Excel file.");
      }

      const file = req.file;
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
        return res
          .status(400)
          .send("No data found in the uploaded Excel file.");
      }

      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });
      const teachersData = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const username = row[0];
        const email = row[1];
        const fullName = row[2];

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
  },

  getAdminResults: async (req, res) => {
    try {
      const responses = await Response.find({})
        .populate("studentId")
        .populate("testId");
      res.render("adminResults.ejs", { responses });
    } catch (err) {
      console.error("Error fetching admin results:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  getResponseDetails: async (req, res) => {
    try {
      const response = await Response.findById(req.params.responseId)
        .populate("testId")
        .populate("studentId")
        .populate({
          path: "answers.questionId",
          model: "Question",
        });
      if (!response) {
        return res.status(404).send("Response not found");
      }
      res.render("responseDetails.ejs", { response, userType: "admin" });
    } catch (err) {
      console.error("Error fetching response details:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  getTotalStudents: async (req, res) => {
    try {
      const students = await Student.find({});
      res.render("totalStudents.ejs", { students });
    } catch (err) {
      console.error("Error fetching students:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  deleteStudent: async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).send("Student not found");
      }

      await Response.deleteMany({ studentId: studentId });
      await Student.findByIdAndDelete(studentId);

      res.redirect("/total-students?message=Student deleted successfully");
    } catch (err) {
      console.error("Error deleting student:", err);
      res.status(500).send("Something went wrong while deleting the student");
    }
  },

  getTotalTeachers: async (req, res) => {
    try {
      const teachers = await Teacher.find({});
      res.render("totalTeachers.ejs", { teachers });
    } catch (err) {
      console.error("Error fetching teachers:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  deleteTeacher: async (req, res) => {
    try {
      const teacherId = req.params.teacherId;
      const teacher = await Teacher.findById(teacherId);

      if (!teacher) {
        return res.status(404).send("Teacher not found");
      }

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
  },

  getUpdateStudent: async (req, res) => {
    try {
      const student = await Student.findById(req.params.studentId);
      if (!student) return res.status(404).send("Student not found");
      res.render("updateStudent.ejs", { student });
    } catch (err) {
      console.error("Error fetching student:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  postUpdateStudent: async (req, res) => {
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
  },

  getUpdateTeacher: async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.params.teacherId);
      if (!teacher) return res.status(404).send("Teacher not found");
      res.render("updateTeacher.ejs", { teacher });
    } catch (err) {
      console.error("Error fetching teacher:", err);
      res.status(500).send("Something went wrong!");
    }
  },

  postUpdateTeacher: async (req, res) => {
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
  },
};

module.exports = adminController;
