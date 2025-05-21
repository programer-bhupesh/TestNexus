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
