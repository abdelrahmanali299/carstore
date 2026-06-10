const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const { User } = require('../models/user.model');

// ================================
// JWT STRATEGY
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
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
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
          let user = await User.findOne({ where: { googleId: profile.id } });
          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await User.findOne({ where: { email } });
              if (user) await user.update({ googleId: profile.id });
            }
            if (!user) {
              user = await User.create({
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                avatar: profile.photos?.[0]?.value || null,
                isEmailVerified: true,
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
} else {
  console.warn('⚠️  Google OAuth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
}

// ================================
// FACEBOOK OAUTH STRATEGY
// ================================
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ where: { facebookId: profile.id } });
          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await User.findOne({ where: { email } });
              if (user) await user.update({ facebookId: profile.id });
            }
            if (!user) {
              user = await User.create({
                facebookId: profile.id,
                email: profile.emails?.[0]?.value || null,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                avatar: profile.photos?.[0]?.value || null,
                isEmailVerified: !!profile.emails?.[0]?.value,
                authProvider: 'facebook',
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
} else {
  console.warn('⚠️  Facebook OAuth disabled: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not set');
}

module.exports = passport;
