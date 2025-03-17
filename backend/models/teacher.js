const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const teacherSchema = new mongoose.Schema({
  fullName: { type: String, default: "" },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
});

teacherSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Teacher", teacherSchema);
