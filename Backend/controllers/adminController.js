import { query } from "../config/db.js";
import UserModel from "../models/userModel.js";
import CourseModel from "../models/courseModel.js";

const AdminController = {
  // ================= INSTRUCTOR MANAGEMENT =================
  async createInstructor(req, res, next) {
    try {
      const { email, name, password } = req.body;

      // Validate input
      if (!email || !name || !password) {
        throw new Error("Email, name, and password are required");
      }

      // Create instructor (bypasses normal registration role restrictions)
      const instructor = await UserModel.create({
        email,
        name,
        password,
        role: "instructor",
        is_active: true
      });

      res.status(201).json({
        success: true,
        user: {
          id: instructor.id,
          email: instructor.email,
          role: instructor.role
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async approveInstructor(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) throw new Error("User not found");

      // Update role and approval status
      await query(
        `UPDATE users 
         SET role = 'instructor', 
             is_approved = true 
         WHERE id = $1`,
        [userId]
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  // ================= COURSE MANAGEMENT =================
  async approveCourse(req, res, next) {
    try {
      const { courseId } = req.params;
      
      const course = await CourseModel.findById(courseId);
      if (!course) throw new Error("Course not found");

      await query(
        `UPDATE courses SET status = 'published' WHERE id = $1`,
        [courseId]
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  async getPendingCourses(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT * FROM courses WHERE status = 'pending'`
      );
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  // ================= USER MANAGEMENT =================
  async getAllUsers(req, res, next) {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let sql = `SELECT id, email, name, role, is_active, created_at FROM users`;
      const params = [];
      
      if (role) {
        sql += ` WHERE role = $1`;
        params.push(role);
      }

      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const { rows } = await query(sql, params);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async deactivateUser(req, res, next) {
    try {
      const { userId } = req.params;
      await UserModel.setActiveStatus(userId, false);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
};

export default AdminController;