import { Router } from 'express';
import passport from 'passport';
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ================= LOCAL AUTHENTICATION =================
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
// Add to authRoutes.js
// router.post('/link-provider', authenticate, userController.linkProvider);
// ================= GOOGLE OAUTH =================
router.get('/google', AuthController.initiateGoogleAuth);
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login' 
  }),
  AuthController.handleGoogleCallback
);

// ================= ACCOUNT LINKING =================
router.post('/link/google', authenticate, AuthController.linkGoogleAccount);

// ================= PROTECTED ROUTES =================
router.get('/me', authenticate, AuthController.getMe);
router.put('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

export default router;