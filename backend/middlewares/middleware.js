const Admin = require("../models/admin");
const Teacher=require("../models/teacher");
const Student = require("../models/student");

const isAdmin = async (req, res, next) => {
  try {
    const adminId = req.cookies.adminId;
    if (!adminId) {
      return res.redirect("/adminlogin"); // Fixed redirect
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      res.clearCookie("adminId");
      return res.redirect("/adminlogin");
    }

    req.user = admin;
    next();
  } catch (err) {
    console.error("isAdminAuth error:", err);
    return res.redirect("/adminlogin");
  }
};

const isTeacher = async (req, res, next) => {
  try {
    const teacherId = req.cookies.teacherId;
    if (!teacherId) {
      return res.redirect("/teacherlogin");
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      res.clearCookie("teacherId");
      return res.redirect("/teacherlogin");
    }

    req.user = teacher;
    next();
  } catch (err) {
    console.error("isTeacherAuth error:", err);
    return res.redirect("/teacherlogin");
  }
};
const isStudent = async (req, res, next) => {
  try {
    const studentId = req.cookies.studentId;
    if (!studentId) {
      return res.redirect("/studentlogin"); // Redirect if no cookie
    }

    const student = await Student.findById(studentId);
    if (!student) {
      res.clearCookie("studentId"); // Clear invalid cookie
      return res.redirect("/studentlogin");
    }

    req.user = student; // Attach student to request
    next();
  } catch (err) {
    console.error("isStudentAuth error:", err);
    return res.redirect("/studentlogin");
  }
};

module.exports = {
  isAdmin,
  isTeacher,
  isStudent,
};