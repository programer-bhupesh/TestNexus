const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
});

teacherSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Teacher", teacherSchema);
