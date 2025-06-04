import express from "express";
import AdminController from "../controllers/adminController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Instructor Management
router.post("/instructors", isAdmin, AdminController.createInstructor);
router.put("/instructors/:userId/approve", isAdmin, AdminController.approveInstructor);

// Course Management
router.get("/courses/pending", isAdmin, AdminController.getPendingCourses);
router.put("/courses/:courseId/approve", isAdmin, AdminController.approveCourse);

// User Management
router.get("/users", isAdmin, AdminController.getAllUsers);
router.put("/users/:userId/deactivate", isAdmin, AdminController.deactivateUser);

export default router;