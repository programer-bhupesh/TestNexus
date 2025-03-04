const mongoose = require("mongoose");

const testSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  eligibleStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
});

// Define virtual 'questions' field for reverse population
testSchema.virtual("questions", {
  ref: "Question", // The model to populate from
  localField: "_id", // The field in Test that matches
  foreignField: "testId", // The field in Question that references Test
});

// Ensure virtuals are included in toJSON and toObject
testSchema.set("toObject", { virtuals: true });
testSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Test", testSchema);