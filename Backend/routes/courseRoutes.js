import express from "express";
import CourseController from "../controllers/courseController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { isInstructor, isAdmin } from "../middleware/roleMiddleware.js";
import { validateCourseInput } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public routes
router.get('/', CourseController.getAllCourses);
router.get('/:id', CourseController.getCourse);

// Protected routes (require authentication)
router.use(authenticate);

// Instructor-only routes
router.post('/', 
  isInstructor, 
  validateCourseInput, 
  CourseController.create
);

router.put('/:id', 
  isInstructor, 
  validateCourseInput, 
  CourseController.updateCourse
);

// Instructor or Admin routes
router.delete('/:id', 
  (req, res, next) => {
    // Allow both instructors and admins
    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: "Forbidden" });
  },
  CourseController.deleteCourse
);

// Admin-only approval routes
router.patch('/:id/approve', 
  isAdmin,
  CourseController.approveCourse
);

router.patch('/:id/publish', 
  isInstructor,
  CourseController.togglePublishStatus
);

export default router;