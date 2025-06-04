export const validateCourseInput = (req, res, next) => {
    if (!req.body.title) {
      return res.status(400).json({ error: "Course title is required" });
    }
    if (req.body.price && isNaN(req.body.price)) {
      return res.status(400).json({ error: "Price must be a number" });
    }
    next();
  };