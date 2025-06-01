if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const MONGO_URL = process.env.MONGOURL1;
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const cors = require("cors");
const fetch = require("node-fetch");
const multer = require("multer");
const MongoStore = require("connect-mongo");

const adminRouter = require("./backend/routes/admin");
const teacherRouter = require("./backend/routes/teacher");
const studentRouter = require("./backend/routes/student");

const Admin = require("./backend/models/admin");
const Teacher = require("./backend/models/teacher");
const Student = require("./backend/models/student");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "frontend", "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "frontend", "public")));
app.use(express.json());
app.use(cors());

app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use("admin-local", new LocalStrategy(Admin.authenticate()));
passport.use("teacher-local", new LocalStrategy(Teacher.authenticate()));
passport.use("student-local", new LocalStrategy(Student.authenticate()));

passport.serializeUser((user, done) => {
  done(null, { id: user._id, type: user.constructor.modelName });
});

passport.deserializeUser((data, done) => {
  let Model;
  switch (data.type) {
    case "Admin":
      Model = Admin;
      break;
    case "Teacher":
      Model = Teacher;
      break;
    case "Student":
      Model = Student;
      break;
    default:
      return done(new Error("Invalid user type"));
  }
  Model.findById(data.id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Database connection error:", err));

app.post("/execute", async (req, res) => {
  try {
    const { script, language, versionIndex, stdin } = req.body;
    const payload = {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script,
      language,
      versionIndex,
      stdin,
    };

    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "JDoodle execution failed");
    }
    res.json(data);
  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({ error: "Error executing code: " + error.message });
  }
});

app.use(adminRouter);
app.use(teacherRouter);
app.use(studentRouter);

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/forgetpwd", (req, res) => {
  res.render("forgetpwd.ejs");
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send("File size exceeds the 10MB limit.");
    }
    return res.status(400).send(`File upload error: ${err.message}`);
  }
  res.status(500).send("Something went wrong!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});