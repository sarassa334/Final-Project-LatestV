import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import UserModel from "../models/userModel.js";

// Serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialization
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await UserModel.findByEmail(email);
        if (!user) return done(null, false, { message: "Invalid credentials" });

        const isMatch = await UserModel.verifyPassword(password, user.password_hash);
        if (!isMatch) return done(null, false, { message: "Invalid credentials" });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Google Strategy (Updated)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const avatar = profile.photos[0]?.value;
        const oauthId = profile.id;

        let user = await UserModel.findByOAuthId(oauthId, "google");

        if (!user) {
          const existingUser = await UserModel.findByEmail(email);
          
          if (existingUser) {
            user = await UserModel.linkOAuthAccount(existingUser.id, {
              provider: "google",
              providerId: oauthId,
              email: email
            });
          } else {
            user = await UserModel.create({
              email,
              name,
              oauth_provider: "google",
              oauth_id: oauthId,
              avatar,
              password: null,
            });
          }
        }

        done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        done(error, null);
      }
    }
  )
);

export default passport;