import { Router } from 'express';
import passport from 'passport';
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Local Auth
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  AuthController.handleGoogleCallback
);

// Account Management
router.get('/me', authenticate, AuthController.getMe);
router.put('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

export default router;