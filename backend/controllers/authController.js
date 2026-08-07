const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { createTenantDatabase } = require('../config/tenantManager');

const JWT_SECRET = process.env.JWT_SECRET || 'tera-assistant-secret-key-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Helper to generate JWT
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      dbName: user.dbName
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. Register
exports.register = async (req, res) => {
  try {
    const { email, password, name, interests } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash Password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Determine tenant database name
    const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dbName = `user_db_${sanitizedEmail}`;

    // Provision the database
    await createTenantDatabase(email);

    // Create central user
    const newUser = await User.create({
      email,
      passwordHash,
      name,
      interests,
      dbName
    });

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        interests: newUser.interests
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Check server logs.' });
  }
};

// 2. Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and Password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Check server logs.' });
  }
};

// 3. Google Sign-In / Login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    let payload;
    if (client) {
      // Production path: verify real Google credential token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } else {
      // Fallback/Dev path: decode token without verification if client is not configured
      console.warn('[Auth] Google Client ID not set, decoding token headers as fallback (development only)');
      if (credential.startsWith('mock_')) {
        const mockName = credential.replace('mock_', '');
        payload = {
          email: `${mockName.toLowerCase()}@mockgoogle.com`,
          name: mockName,
          sub: `mock_google_id_${mockName.toLowerCase()}`
        };
      } else {
        // Decode standard JWT format
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString()
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        payload = JSON.parse(jsonPayload);
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google credential token payload' });
    }

    const { email, name, sub: googleId } = payload;

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Automatically register user if they don't exist
      const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dbName = `user_db_${sanitizedEmail}`;

      // Provision database
      await createTenantDatabase(email);

      user = await User.create({
        email,
        googleId,
        name: name || 'Google User',
        dbName
      });
    } else if (!user.googleId) {
      // If user registered with email previously, link Google ID
      await user.update({ googleId });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests
      }
    });
  } catch (error) {
    console.error('Google Login error:', error);
    res.status(500).json({ error: 'Google Login failed. Check server logs.' });
  }
};

// 4. Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, interests } = req.body;
    
    // Check if user info was attached by middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Unauthorized profile update' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User registry record not found' });
    }

    await user.update({
      name: name || user.name,
      interests: interests !== undefined ? interests : user.interests
    });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
};

