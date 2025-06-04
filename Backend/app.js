import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';
import './config/db.js';
import passport from './config/passport.js';
import session from 'express-session';
import cookieParser from 'cookie-parser';

const app = express();

// ================= Security & Parsing Middleware =====================
app.use(helmet());

// Body parser (MUST come before routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies and session (should come before passport and routes)
app.use(cookieParser());
// Session configuration (updated)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax', // Changed from 'strict' for OAuth to work
  },
}));

// CORS (after body parsers but before routes)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Passport initialization (after session middleware)
app.use(passport.initialize());
app.use(passport.session());

// ================= Routes =====================
// IMPORTANT: All routes should be grouped together after all middleware
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // Moved down here

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// ================= Error Handling =====================
app.use(notFound);
app.use(errorHandler);

export default app;