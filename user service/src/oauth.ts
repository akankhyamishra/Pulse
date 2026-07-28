import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { User } from "./model.js";

const BASE_URL = process.env.SERVER_URL || "http://localhost:5000";

// ── Google ────────────────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  `${BASE_URL}/api/v1/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error("No email from Google"), undefined);

        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name:     profile.displayName || "Google User",
            email,
            password: Math.random().toString(36) + Math.random().toString(36), // unusable random password
          });
        }
        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

// ── Facebook ──────────────────────────────────────────────────────────────────
passport.use(
  new FacebookStrategy(
    {
      clientID:     process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL:  `${BASE_URL}/api/v1/auth/facebook/callback`,
      profileFields: ["id", "emails", "displayName"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error("No email from Facebook"), undefined);

        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name:     profile.displayName || "Facebook User",
            email,
            password: Math.random().toString(36) + Math.random().toString(36),
          });
        }
        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

export default passport;
