const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const Chat = require("../models/chat");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

exports.GeminiLLM = {
  ask: async (userId, userModel, message) => {
    try {
      let chat = await Chat.findOne({ userId, userModel });

      if (!chat) {
        chat = new Chat({ userId, userModel, messages: [] });
      }

      // Add user's message
      chat.messages.push({ from: "user", text: message });

      // Convert history to Gemini-compatible format
      const formattedHistory = chat.messages.map((m) => ({
        role: m.from === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-002",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const result = await model.generateContent({
        contents: formattedHistory,
      });

      // Extract the response text from the result
      let responseText = "No response from Gemini.";
      if (
        result &&
        result.response &&
        result.response.candidates &&
        result.response.candidates.length > 0 &&
        result.response.candidates[0].content &&
        result.response.candidates[0].content.parts &&
        result.response.candidates[0].content.parts.length > 0
      ) {
        responseText = result.response.candidates[0].content.parts
          .map((part) => part.text)
          .join("");
      }

      // Add AI response
      chat.messages.push({ from: "ai", text: responseText });
      chat.messages.push({ from: "user", text: message, timestamp: new Date() });

      await chat.save();

      return { responseText, messages: chat.messages };
    } catch (error) {
      console.error("Gemini SDK Error:", error.message || error);
      return {
        responseText: "Something went wrong with Gemini.",
        messages: [],
      };
    }
  },

  clearChat: async (userId, userModel) => {
    await Chat.deleteOne({ userId, userModel });
  },
};
