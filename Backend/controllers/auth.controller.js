import User from "../models/user.model.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../utils/validation.js";

const AuthController = {
  async register(req, res, next) {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      const { email, password, name } = value;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) throw new Error("Email already in use");

      const newUser = await User.create({ email, password, name });
      const token = User.generateToken(newUser.id);

      res.status(201).json({
        success: true,
        token: token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
