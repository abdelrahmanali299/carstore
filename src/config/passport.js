const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User } = require('../models/user.model');

// ================================
// JWT STRATEGY (Protected routes)
// ================================
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findByPk(payload.id, {
          attributes: { exclude: ['password'] },
        });
        if (!user) return done(null, false);
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// ================================
// GOOGLE OAUTH STRATEGY
// ================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with Google ID
        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          // Check if email already registered
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ where: { email } });
            if (user) {
              // Link Google account to existing user
              await user.update({ googleId: profile.id });
            }
          }

          if (!user) {
            // Create new user
            user = await User.create({
              googleId: profile.id,
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              avatar: profile.photos?.[0]?.value || null,
              isEmailVerified: true, // Google emails are verified
              authProvider: 'google',
            });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);


module.exports = passport;
