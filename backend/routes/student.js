const express = require("express");
const passport = require("passport");
const controller = require("../controller/student");
const router = express.Router();
const { isStudent } = require("../middlewares/middleware");


router.get("/studentlogin", controller.renderLogin);

router.post(
  "/studentlogin",
  passport.authenticate("student-local", { failureRedirect: "/studentlogin" }),
  controller.loginHandler
);

router.get("/student", isStudent, controller.dashboard);

router.get("/eligible-tests", isStudent, controller.eligibleTests);

router.get("/tests/:testId", isStudent, controller.takeTest);

router.post(
  "/tests/:testId/submit",
  isStudent,
  controller.submitTest
);

router.get("/student/results", isStudent, controller.viewResults);

router.get(
  "/student/results/:responseId",
  isStudent,
  controller.responseDetails
);

router.get("/student/profile", isStudent, controller.renderProfile);

router.post("/student/profile", isStudent, controller.updateProfile);

router.get(
  "/student/settings",
  isStudent,
  controller.renderSettings
);

router.post("/student/settings", isStudent, controller.saveSettings);

module.exports = router;
