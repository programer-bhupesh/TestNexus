const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("multer");
const adminController = require("../controller/admin");

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === "Admin") {
    return next();
  }
  res.redirect("/adminlogin");
}

function createExcelUploader(fieldName) {
  return multer({
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
  }).single(fieldName);
}

const upload = createExcelUploader("studentsFile");
const uploadteachers = createExcelUploader("teacherFile");

router.get("/adminlogin", adminController.getAdminLogin);
router.post(
  "/adminlogin",
  passport.authenticate("admin-local", {
    failureRedirect: "/adminlogin",
  }),
  adminController.postAdminLogin
);
router.get("/admin", isAdmin, adminController.getAdminDashboard);
router.get("/addteacher", isAdmin, adminController.getAddTeacher);
router.post("/addteacher", isAdmin, adminController.postAddTeacher);
router.get("/addstudent", isAdmin, adminController.getAddStudent);
router.post("/addstudent", isAdmin, adminController.postAddStudent);
router.get("/addadmin", isAdmin, adminController.getAddAdmin);
router.post("/addadmin", isAdmin, adminController.postAddAdmin);
router.get("/tests", isAdmin, adminController.getTests);
router.get("/tests/create", isAdmin, adminController.getCreateTest);
router.post("/tests", isAdmin, adminController.postCreateTest);
router.post("/tests/:testId/delete", isAdmin, adminController.deleteTest);
router.get(
  "/tests/:testId/questions/add",
  isAdmin,
  adminController.getAddQuestions
);
router.post(
  "/tests/:testId/questions/add",
  isAdmin,
  adminController.postAddQuestions
);
router.get("/bulk-students", isAdmin, adminController.getBulkStudents);
router.post(
  "/bulk-students",
  isAdmin,
  upload,
  adminController.postBulkStudents
);
router.get("/bulk-teachers", isAdmin, adminController.getBulkTeachers);
router.post(
  "/bulk-teachers",
  isAdmin,
  uploadteachers,
  adminController.postBulkTeachers
);
router.get("/admin/results", isAdmin, adminController.getAdminResults);
router.get(
  "/admin/results/:responseId",
  isAdmin,
  adminController.getResponseDetails
);
router.get("/total-students", isAdmin, adminController.getTotalStudents);
router.post(
  "/students/:studentId/delete",
  isAdmin,
  adminController.deleteStudent
);
router.get("/total-teachers", isAdmin, adminController.getTotalTeachers);
router.post(
  "/teachers/:teacherId/delete",
  isAdmin,
  adminController.deleteTeacher
);
router.get(
  "/students/:studentId/update",
  isAdmin,
  adminController.getUpdateStudent
);
router.post(
  "/students/:studentId/update",
  isAdmin,
  adminController.postUpdateStudent
);
router.get(
  "/teachers/:teacherId/update",
  isAdmin,
  adminController.getUpdateTeacher
);
router.post(
  "/teachers/:teacherId/update",
  isAdmin,
  adminController.postUpdateTeacher
);

module.exports = router;