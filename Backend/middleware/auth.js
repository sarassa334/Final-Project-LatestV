import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";

export const authenticate = async (req, res, next) => {
  try {
    // 1. First check session
    if (req.session.authenticate && req.session.userId) {
      const user = await UserModel.findById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // 2. Check for token in multiple locations
    const token = 
      req.cookies.token || 
      req.header('Authorization')?.replace('Bearer ', '') || 
      req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        solutions: [
          "Include a valid JWT token in cookies",
          "Or add Authorization header: 'Bearer <token>'",
          "Or pass token as URL parameter: ?token=<your_token>"
        ]
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User account not found",
        solution: "Try logging in again"
      });
    }

    // 4. Renew session
    req.session.userId = user.id;
    req.session.authenticate = true;
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);
    
    const response = {
      success: false,
      error: "Authentication failed"
    };

    if (error.name === 'JsonWebTokenError') {
      response.details = "Invalid token format";
      response.solution = "Get a new token by logging in";
    } else if (error.name === 'TokenExpiredError') {
      response.details = "Token expired";
      response.solution = "Refresh your token by logging in again";
    }

    res.status(401).json(response);
  }
};

export const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new Error("User not authenticated");
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          requiredRoles: roles,
          yourRole: req.user.role,
          solution: "Contact admin for access"
        });
      }
      
      next();
    } catch (error) {
      error.statusCode = 403;
      next(error);
    }
  };
};