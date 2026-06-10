import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config.js';
import { prisma } from '../db.js';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (_accessToken, _refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google profile has no email'));
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: profile.displayName, googleId: profile.id },
      update: { name: profile.displayName, googleId: profile.id }
    });
    return done(null, user);
  }));
}

export { passport };
