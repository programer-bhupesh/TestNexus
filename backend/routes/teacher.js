const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("multer");
const controller = require("../controller/teacher");
const { isTeacher } = require("../middlewares/middleware");

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
