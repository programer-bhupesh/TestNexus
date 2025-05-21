// const mongoose = require("mongoose");

// const testSchema = new mongoose.Schema({
//   testName: { type: String, required: true,unique:true },
//   assignedTeacher: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Teacher",
//     required: true,
//   },
//   eligibleStudents: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Student",
//     },
//   ],
// });

// // Define virtual 'questions' field for reverse population
// testSchema.virtual("questions", {
//   ref: "Question", // The model to populate from
//   localField: "_id", // The field in Test that matches
//   foreignField: "testId", // The field in Question that references Test
// });

// // Ensure virtuals are included in toJSON and toObject
// testSchema.set("toObject", { virtuals: true });
// testSchema.set("toJSON", { virtuals: true });

// module.exports = mongoose.model("Test", testSchema);


const mongoose = require("mongoose");

const testSchema = new mongoose.Schema({
  testName: { type: String, required: true, unique: true },
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
  duration: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
  },
});

testSchema.virtual("questions", {
  ref: "Question",
  localField: "_id",
  foreignField: "testId",
});

testSchema.set("toObject", { virtuals: true });
testSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Test", testSchema);