const jwt = require('jsonwebtoken');
const { getTenantConnection, createTenantDatabase } = require('../config/tenantManager');

const createdDatabases = new Set();
const initPromises = new Map(); // Store initialization promises to prevent race conditions
const JWT_SECRET = process.env.JWT_SECRET || 'tera-assistant-secret-key-change-me';

module.exports = async (req, res, next) => {
  try {
    let tenantIdentifier = 'default';

    // 1. Try to read authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach decoded user object to request
        tenantIdentifier = decoded.email; // Use email as unique database identifier
      } catch (err) {
        return res.status(401).json({ error: 'Session expired or invalid token' });
      }
    } else {
      // 2. Fallback to legacy x-user-id header for development/CLI testing
      tenantIdentifier = req.headers['x-user-id'] || 'default';
    }
    
    const sanitizedUser = tenantIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dbName = `user_db_${sanitizedUser}`;

    // Ensure database exists before returning connection
    if (!createdDatabases.has(dbName)) {
      // Check if there is already an active initialization for this tenant
      if (initPromises.has(dbName)) {
        await initPromises.get(dbName);
      } else {
        const initPromise = (async () => {
          try {
            await createTenantDatabase(tenantIdentifier);
            createdDatabases.add(dbName);
          } catch (err) {
            console.error(`Failed to ensure tenant database for ${tenantIdentifier}:`, err);
            throw err;
          } finally {
            initPromises.delete(dbName);
          }
        })();
        
        initPromises.set(dbName, initPromise);
        await initPromise;
      }
    }

    const tenant = getTenantConnection(tenantIdentifier);
    req.models = tenant.models;
    req.sequelize = tenant.sequelize;
    req.userId = tenantIdentifier;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Tenant initialization error' });
  }
};

