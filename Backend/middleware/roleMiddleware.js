// roleMiddleware.js
export const isInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      code: "UNAUTHORIZED"
    });
  }
  
  if (req.user.role !== "instructor") {
    return res.status(403).json({
      error: "Instructor access required",
      code: "FORBIDDEN",
      currentRole: req.user.role,
      requiredRole: "instructor",
      userId: req.user.id
    });
  }

  // Additional check for approved instructors if needed
  if (req.user.is_approved === false) {
    return res.status(403).json({
      error: "Instructor account not yet approved",
      code: "ACCOUNT_PENDING_APPROVAL"
    });
  }

  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      code: "UNAUTHORIZED"
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
      code: "FORBIDDEN",
      currentRole: req.user.role,
      requiredRole: "admin",
      userId: req.user.id
    });
  }

  next();
};

export const isInstructorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      code: "UNAUTHORIZED"
    });
  }

  if (!["instructor", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Instructor or admin access required",
      code: "FORBIDDEN",
      currentRole: req.user.role,
      requiredRoles: ["instructor", "admin"],
      userId: req.user.id
    });
  }

  // Additional check for instructors
  if (req.user.role === "instructor" && req.user.is_approved === false) {
    return res.status(403).json({
      error: "Instructor account not yet approved",
      code: "ACCOUNT_PENDING_APPROVAL"
    });
  }

  next();
};

export const isCourseOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Not authenticated",
        code: "UNAUTHORIZED"
      });
    }

    // Admins can bypass ownership check
    if (req.user.role === "admin") {
      return next();
    }

    // For instructors, verify course ownership
    if (req.user.role === "instructor") {
      const isOwner = await CourseModel.isInstructor(
        req.params.id, 
        req.user.id
      );
      
      if (!isOwner) {
        return res.status(403).json({
          error: "You don't own this course",
          code: "NOT_COURSE_OWNER"
        });
      }
      
      return next();
    }

    // Reject all other roles
    return res.status(403).json({
      error: "Instructor or admin access required",
      code: "FORBIDDEN"
    });

  } catch (error) {
    console.error("Course ownership check error:", error);
    return res.status(500).json({
      error: "Failed to verify course ownership",
      code: "SERVER_ERROR"
    });
  }
};