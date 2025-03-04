if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const MONGO_URL = process.env.MONGOURL;
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const adminRouter = require("./backend/routes/admin");
const teacherRouter = require("./backend/routes/teacher");
const studentRouter = require("./backend/routes/student");

const Admin = require("./backend/models/admin");
const Teacher = require("./backend/models/teacher");
const Student = require("./backend/models/student");

// Application Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "frontend", "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "frontend", "public")));

// Session Configuration
app.use(
  session({
    secret: "yourSecretKey", // Replace with a secure key in production
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  })
);

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// Define Passport strategies for each user type
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));
passport.use("teacher-local", new LocalStrategy(Teacher.authenticate()));
passport.use("student-local", new LocalStrategy(Student.authenticate()));

// Serialize user with type information
passport.serializeUser((user, done) => {
  done(null, { id: user._id, type: user.constructor.modelName });
});

// Deserialize user based on type
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

// Database Connection
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Database connection error:", err));

// Routes
app.use(adminRouter);
app.use(teacherRouter);
app.use(studentRouter);

// Home Page
app.get("/", (req, res) => {
  res.render("index.ejs");
});

// General Routes
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

// Error Handling
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).send("Something went wrong!");
});

// Server Startup
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
