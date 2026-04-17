const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');

// Mobile-specific Google OAuth Strategy
passport.use('mobile-google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/mobile/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Update tokens
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0].value,
      accessToken: accessToken,
      refreshToken: refreshToken,
      platform: 'mobile'
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Mobile Google OAuth routes
exports.mobileGoogleAuth = passport.authenticate('mobile-google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
  // For mobile apps, we might need different options
  prompt: 'consent' // Force consent screen for mobile
});

exports.mobileGoogleAuthCallback = (req, res, next) => {
  passport.authenticate('mobile-google', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Mobile authentication failed', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Mobile authentication failed' });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Mobile login failed', error: err.message });
      }
      
      // Return mobile-specific response
      res.json({
        message: 'Mobile authentication successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          platform: 'mobile'
        }
      });
    });
  })(req, res, next);
};

// Mobile token exchange (for native mobile apps)
exports.mobileTokenExchange = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    // Exchange code for tokens
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'postmessage' // For mobile apps
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info with access token
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    oauth2Client.setCredentials(tokens);
    
    const { data } = await oauth2.userinfo.get();
    
    // Find or create user
    let user = await User.findOne({ googleId: data.id });
    
    if (user) {
      user.accessToken = tokens.access_token;
      user.refreshToken = tokens.refresh_token;
      user.lastLogin = new Date();
      await user.save();
    } else {
      user = new User({
        googleId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        platform: 'mobile'
      });
      await user.save();
    }

    res.json({
      message: 'Mobile token exchange successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken
      }
    });

  } catch (error) {
    console.error('Mobile token exchange error:', error);
    res.status(500).json({ 
      message: 'Mobile token exchange failed', 
      error: error.message 
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user tokens in database
    const user = await User.findOne({ refreshToken: refreshToken });
    if (user) {
      user.accessToken = credentials.access_token;
      if (credentials.refresh_token) {
        user.refreshToken = credentials.refresh_token;
      }
      await user.save();
    }

    res.json({
      message: 'Token refreshed successfully',
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      message: 'Token refresh failed', 
      error: error.message 
    });
  }
};
