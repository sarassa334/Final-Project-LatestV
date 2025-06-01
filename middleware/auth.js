import jwt from "jsonwebtoken"; // For decoding/verifying JWTs
import UserModel from "../models/userModel.js"; // To fetch users from the database using their ID after decoding the token

export const authenticate = async (req, res, next) => {
  try {
    //check out session first

    if (req.session.authenticate && req.session.userId) {
      const user = await UserModel.findById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // const authHeader = req.headers['authorization'];
    // const token = authHeader?.split(' ')[1];
    //change from where to cookie

    const token = req.cookies.token; //was cookie

    if (!token) {
      // Simple check: if the token doesn’t exist in the cookies, reject the request
      throw new Error("Authentication token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the Token
    const user = await UserModel.findById(decoded.id); // Find User by ID

    if (!user) {
      // User Not Found? Throw an Error // Even if the token is valid, the user might’ve been deleted. So always check that the user exists.
      throw new Error("User not found");
    }

    //renew session
    req.session.userId = user.id;
    req.session.authenticate = true;

    req.user = user; // You’re setting req.user, so now any route using this middleware (e.g. /me) can use req.user safely.
    next();
  } catch (error) {
    error.statusCode = 401;
    next(error);
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      const error = new Error("Unauthorized access");
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};
