import UserModel from "../models/userModel.js";
import passport from "passport";
import { OAuth2Client } from "google-auth-library";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../utils/validation.js";

const AuthController = {
  // ================= REGISTRATION =================
  async register(req, res, next) {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      const { email, password, name } = value;

      // Check for existing user
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) throw new Error("Email already in use");

      // Create user
      const user = await UserModel.create({
        email,
        name,
        password,
        oauth_provider: null,
        oauth_id: null,
      });

      // Generate JWT token
      const token = UserModel.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set auth cookie
      this.setAuthCookie(res, token);

      // Respond with success
      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= LOGIN =================
  async login(req, res, next) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      const { email, password } = value;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) throw new Error("Invalid email or password");

      // Check password (skip for OAuth-only users)
      if (user.password_hash) {
        const isValid = await UserModel.verifyPassword(
          password,
          user.password_hash
        );
        if (!isValid) throw new Error("Invalid email or password");
      } else {
        throw new Error("Please login using your OAuth provider");
      }

      // Generate token
      const token = UserModel.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set auth cookie
      this.setAuthCookie(res, token);

      // Return response
      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= GOOGLE OAUTH =================
  initiateGoogleAuth(req, res) {
    const authenticator = passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      prompt: "select_account",
      accessType: "offline", // Added for refresh tokens
    });
    authenticator(req, res);
  },

  async handleGoogleCallback(req, res, next) {
    passport.authenticate(
      "google",
      {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/login?error=authentication_failed`,
      },
      async (err, user, info) => {
        try {
          if (err || !user) {
            console.error("Google Auth Error:", err || info);
            return res.redirect(
              `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
                err?.message || "Google authentication failed"
              )}`
            );
          }

          // Generate token
          const token = UserModel.generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
          });

          // Set auth cookie
          this.setAuthCookie(res, token);

          // Successful authentication
          res.redirect(
            `${process.env.CLIENT_URL}/oauth-success?token=${token}&userId=${user.id}`
          );
        } catch (error) {
          console.error("Google Callback Error:", error);
          res.redirect(
            `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
              "Authentication error. Please try again."
            )}`
          );
        }
      }
    )(req, res, next);
  },

  // ================= ACCOUNT LINKING =================
  async linkGoogleAccount(req, res, next) {
    try {
      const { token: googleToken } = req.body;
      if (!googleToken) throw new Error("Google token is required");

      // Verify Google token
      const googleUser = await this.verifyGoogleToken(googleToken);
      if (!googleUser) throw new Error("Invalid Google token");

      // Link to existing account
      const updatedUser = await UserModel.linkOAuthAccount(req.user.id, {
        provider: "google",
        providerId: googleUser.sub,
        email: googleUser.email,
      });

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          oauthProvider: updatedUser.oauth_provider,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= USER PROFILE =================
  async getMe(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) throw new Error("User not found");
      if (!user.is_active) throw new Error("User account is inactive");

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          oauthProvider: user.oauth_provider,
          createdAt: user.created_at,
          isActive: user.is_active,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= PASSWORD MANAGEMENT =================
  async changePassword(req, res, next) {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) throw new Error(error.details[0].message);

      const { currentPassword, newPassword } = value;
      const user = await UserModel.findById(req.user.id);

      // Verify current password (skip for OAuth-only users)
      if (user.password_hash) {
        const isMatch = await UserModel.verifyPassword(
          currentPassword,
          user.password_hash
        );
        if (!isMatch) throw new Error("Current password is incorrect");
      } else {
        throw new Error("Please set a password first");
      }

      // Update password
      await UserModel.updatePassword(user.id, newPassword);

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= LOGOUT =================
  async logout(req, res, next) {
    try {
      // Clear session if using sessions
      if (req.session) {
        req.session.destroy();
      }

      // Clear cookies
      res.clearCookie("token");
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // ================= HELPER METHODS =================
  setAuthCookie(res, token) {
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
  },

  async verifyGoogleToken(token) {
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error) {
      console.error("Google Token Verification Error:", error);
      return null;
    }
  },
};

export default AuthController;
