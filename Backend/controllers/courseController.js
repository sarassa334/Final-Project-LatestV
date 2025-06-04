import CourseModel from "../models/courseModel.js";

const CourseController = {
  // Create a new course (Instructor only)
  async create(req, res) {
    try {
      // Validation
      if (!req.body.title) {
        return res.status(400).json({ error: "Course title is required" });
      }
      if (!req.user?.id) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.user.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can create courses" });
      }

      const course = await CourseModel.create({
        title: req.body.title,
        description: req.body.description || "",
        instructor_id: req.user.id,
        category_id: req.body.category_id || null,
        price: req.body.price || 0.00,
        thumbnail_url: req.body.thumbnail_url || null
      });

      res.status(201).json(course);
    } catch (error) {
      console.error("Course creation error:", error);
      res.status(500).json({
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Get single course details
  async getCourse(req, res) {
    try {
      const course = await CourseModel.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error in getCourse:", error);
      res.status(500).json({
        error: "Failed to fetch course",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Get all courses with filtering
  async getAllCourses(req, res) {
    try {
      const filters = {
        status: req.query.status || null,
        category_id: req.query.category_id || null,
        instructor_id: req.query.instructor_id || null,
        is_published: req.query.is_published ? 
          req.query.is_published === 'true' : null,
        is_approved: req.query.is_approved ? 
          req.query.is_approved === 'true' : null
      };

      const courses = await CourseModel.findAll(filters);
      res.json(courses);
    } catch (error) {
      console.error("Error in getAllCourses:", error);
      res.status(500).json({
        error: "Failed to fetch courses",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Update course (Instructor only)
  async updateCourse(req, res) {
    try {
      // Validate user is the course instructor
      const isInstructor = await CourseModel.isInstructor(
        req.params.id, 
        req.user.id
      );
      
      if (!isInstructor && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Only course instructor or admin can update this course" 
        });
      }

      const updatedCourse = await CourseModel.update(req.params.id, {
        title: req.body.title,
        description: req.body.description,
        category_id: req.body.category_id,
        price: req.body.price,
        thumbnail_url: req.body.thumbnail_url,
        status: req.body.status,
        is_published: req.body.is_published,
        is_approved: req.body.is_approved
      });

      if (!updatedCourse) {
        return res.status(404).json({ error: "Course not found" });
      }

      res.json(updatedCourse);
    } catch (error) {
      console.error("Error in updateCourse:", error);
      res.status(500).json({
        error: "Failed to update course",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Delete course (Instructor/Admin)
  async deleteCourse(req, res) {
    try {
      // For instructors, verify they own the course
      if (req.user.role === 'instructor') {
        const isInstructor = await CourseModel.isInstructor(
          req.params.id, 
          req.user.id
        );
        if (!isInstructor) {
          return res.status(403).json({ 
            error: "You can only delete your own courses" 
          });
        }
      }

      const deletedCourse = await CourseModel.delete(req.params.id);
      if (!deletedCourse) {
        return res.status(404).json({ error: "Course not found" });
      }

      res.json({ 
        message: "Course deleted successfully",
        course: deletedCourse 
      });
    } catch (error) {
      console.error("Error in deleteCourse:", error);
      res.status(500).json({
        error: "Failed to delete course",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Approve course (Admin only)
  async approveCourse(req, res) {
    try {
      const course = await CourseModel.update(req.params.id, {
        is_approved: true,
        status: 'published'
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      res.json({
        message: "Course approved and published successfully",
        course
      });
    } catch (error) {
      console.error("Error in approveCourse:", error);
      res.status(500).json({
        error: "Failed to approve course",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Toggle publish status (Instructor only)
  async togglePublishStatus(req, res) {
    try {
      const course = await CourseModel.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Verify instructor owns the course
      const isInstructor = await CourseModel.isInstructor(
        req.params.id, 
        req.user.id
      );
      
      if (!isInstructor) {
        return res.status(403).json({ 
          error: "You can only publish your own courses" 
        });
      }

      const updatedCourse = await CourseModel.update(req.params.id, {
        is_published: !course.is_published,
        status: !course.is_published ? 'pending' : 'draft'
      });

      res.json({
        message: `Course ${updatedCourse.is_published ? 'published' : 'unpublished'} successfully`,
        course: updatedCourse
      });
    } catch (error) {
      console.error("Error in togglePublishStatus:", error);
      res.status(500).json({
        error: "Failed to toggle publish status",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  },

  // Get courses by instructor
  async getInstructorCourses(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.user.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can access this endpoint" });
      }

      const courses = await CourseModel.findAll({
        instructor_id: req.user.id
      });

      res.json(courses);
    } catch (error) {
      console.error("Error in getInstructorCourses:", error);
      res.status(500).json({
        error: "Failed to fetch instructor courses",
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  }
};

export default CourseController;