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

const Chat = require("../models/chat");
const { GeminiLLM } = require("../utils/gemini"); // Wrapper for Gemini API

// Show chat UI
router.get("/student/ai-assist",isStudent, async (req, res) => {
  const chats = await Chat.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.render("chat", { user: req.user, chats });
});

router.post("/student/ai-assist", isStudent, async (req, res) => {
  const { message } = req.body;

  try {
    const result = await GeminiLLM.ask(req.user._id, "Student", message);
    // Check if responseText exists
    if (!result || !result.responseText) {
      return res
        .status(500)
        .json({ error: "AI Assistant failed to generate a response." });
    }

    // Return the responseText and messages
    res.json({ response: result.responseText, chat: result.messages });
  } catch (err) {
    console.error("AI Chat error:", err);
    res.status(500).json({ error: "AI Assistant failed." });
  }
});

router.delete("/student/ai-assist/clear", isStudent, async (req, res) => {
  try {
    await GeminiLLM.clearChat(req.user._id, "Student");
    res.json({ success: true, message: "Chat cleared." });
  } catch (err) {
    console.error("Clear Chat Error:", err);
    res.status(500).json({ error: "Failed to clear chat." });
  }
});

module.exports = router;
