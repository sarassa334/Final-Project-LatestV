import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";

// Serialization (for sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialization (for sessions)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (email/password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (email, password, done) => {
      try {
        // 1. Find user by email
        const user = await UserModel.findByEmail(email);
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // 2. Check if password matches
        const isMatch = await UserModel.verifyPassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // 3. Return user without password
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        done(null, userWithoutPassword);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // 1. Extract essential profile information
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const avatar = profile.photos[0]?.value;
        const oauthId = profile.id;

        // 2. Check if user exists via Google ID
        let user = await UserModel.findByOAuthId(oauthId, "google");

        if (!user) {
          // 3a. Check if email exists (for account merging)
          const existingUser = await UserModel.findByEmail(email);

          if (existingUser) {
            // Merge accounts (link Google to existing account)
            user = await UserModel.updateOAuthInfo(existingUser.id, {
              oauth_provider: "google",
              oauth_id: oauthId,
              avatar: avatar,
            });
          } else {
            // 3b. Create new OAuth user
            user = await UserModel.create({
              email,
              name,
              oauth_provider: "google",
              oauth_id: oauthId,
              avatar,
              password: null, // No password for OAuth users
            });
          }
        }

        // 4. Return user data
        const userResponse = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          oauth_provider: user.oauth_provider,
        };

        done(null, userResponse);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
