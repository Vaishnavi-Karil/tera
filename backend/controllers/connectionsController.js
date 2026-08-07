const getModels = (req) => req.models || require('../models');

// 1. Get status of all connections
exports.getConnectionsStatus = async (req, res) => {
  try {
    const { Connection } = getModels(req);
    const connections = await Connection.findAll();
    
    // Default structure
    const status = {
      google: { linked: false, loading: false },
      meta: { linked: false, loading: false },
      phone: { linked: false, loading: false },
      microsoft: { linked: false, loading: false },
      linkedin: { linked: false, loading: false },
      youtube: { linked: false, loading: false },
      github: { linked: false, loading: false }
    };

    connections.forEach(conn => {
      if (status[conn.platform]) {
        status[conn.platform].linked = conn.status === 'CONNECTED' || conn.status === 'SYNCING';
        status[conn.platform].status = conn.status;
        status[conn.platform].lastSync = conn.lastSync;
      }
    });

    return res.json(status);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to retrieve connections' });
  }
};

// 2. Initiate OAuth flow (or Bridge Setup)
exports.initiateLink = async (req, res) => {
  const { platform } = req.params;
  let authUrl = '';
  
  if (platform === 'google') {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' ');
    
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID || 'MISSING'}&redirect_uri=http://localhost:5000/api/connections/callback/google&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
  } else if (platform === 'github') {
    authUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID || 'MISSING'}&redirect_uri=http://localhost:5000/api/connections/callback/github&scope=repo%20user`;
  } else if (platform === 'microsoft') {
    authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=MISSING&response_type=code&redirect_uri=http://localhost:5000/api/connections/callback/microsoft&scope=Notes.Read Calendars.Read';
  } else if (platform === 'meta') {
    authUrl = 'https://www.facebook.com/v18.0/dialog/oauth?client_id=MISSING&redirect_uri=http://localhost:5000/api/connections/callback/meta';
  } else if (platform === 'linkedin') {
    authUrl = 'https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=MISSING&redirect_uri=http://localhost:5000/api/connections/callback/linkedin&scope=w_member_social%20r_liteprofileemail';
  } else if (platform === 'youtube') {
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID || 'MISSING'}&redirect_uri=http://localhost:5000/api/connections/callback/youtube&response_type=code&scope=https://www.googleapis.com/auth/youtube.force-ssl`;
  } else if (platform === 'phone') {
    return res.json({ 
      method: 'BRIDGE_APP',
      message: 'Please install the Tera Android Bridge app and scan the QR code to sync call logs.',
      qrData: 'tera-sync-token-12345'
    });
  } else {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  // Update DB to show we connected (development mode auto-connects with simulated fallback)
  const { Connection, OAuthToken } = getModels(req);
  await Connection.upsert({
    platform,
    status: 'CONNECTED',
    lastSync: new Date()
  });
  await OAuthToken.upsert({
    platform,
    accessToken: 'mock-access-token-simulated',
    refreshToken: 'mock-refresh-token-simulated',
    expiry: new Date(Date.now() + 3600 * 1000)
  });

  return res.json({ method: 'OAUTH_REDIRECT', authUrl });
};

// 3. OAuth Callback handler
exports.handleCallback = async (req, res) => {
  const { platform } = req.params;
  const { code, error } = req.query;
  const { Connection, OAuthToken } = getModels(req);

  if (error) {
    await Connection.upsert({ platform, status: 'ERROR' });
    return res.redirect('http://localhost:5173?error=oauth_failed');
  }

  let accessToken = 'scaffold-access-token-replace-with-real';
  let refreshToken = 'scaffold-refresh-token-replace-with-real';
  let expiry = new Date(Date.now() + 3600 * 1000);

  // Exchange code for tokens if developer keys are configured
  if (code && code !== 'mock-code') {
    try {
      if (platform === 'github') {
        const exchangeRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID || 'MISSING',
            client_secret: process.env.GITHUB_CLIENT_SECRET || 'MISSING',
            code,
            redirect_uri: 'http://localhost:5000/api/connections/callback/github'
          })
        });
        if (exchangeRes.ok) {
          const tokenData = await exchangeRes.json();
          accessToken = tokenData.access_token || accessToken;
          refreshToken = tokenData.refresh_token || refreshToken;
        }
      } else if (platform === 'google' || platform === 'youtube') {
        const exchangeRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || 'MISSING',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || 'MISSING',
            redirect_uri: `http://localhost:5000/api/connections/callback/${platform}`,
            grant_type: 'authorization_code'
          })
        });
        if (exchangeRes.ok) {
          const tokenData = await exchangeRes.json();
          accessToken = tokenData.access_token || accessToken;
          refreshToken = tokenData.refresh_token || refreshToken;
          if (tokenData.expires_in) {
            expiry = new Date(Date.now() + tokenData.expires_in * 1000);
          }
        }
      }
    } catch (err) {
      console.error(`[OAuth Callback] Token exchange failed for ${platform}:`, err.message);
    }
  }
  
  // Save tokens securely in the database
  await Connection.upsert({
    platform,
    status: 'CONNECTED',
    lastSync: new Date()
  });
  await OAuthToken.upsert({
    platform,
    accessToken,
    refreshToken,
    expiry
  });

  // Redirect back to frontend
  return res.redirect('http://localhost:5173?link_success=' + platform);
};