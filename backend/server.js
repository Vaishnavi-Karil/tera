const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const connectionsRoutes = require('./routes/connectionsRoutes');
const mcpRoutes = require('./routes/mcpRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[Backend Request] ${req.method} ${req.url}`);
  next();
});

// Test DB Connection & Sync Models
sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL Connection has been established successfully.');
    // Sync all models (will create tables if they do not exist)
    return sequelize.sync();
  })
  .then(() => {
    console.log('Database synced successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Middleware for database-per-user isolation
const tenantMiddleware = require('./middleware/tenantMiddleware');

// Routes
app.use('/api/auth', authRoutes); // Auth registry bypasses tenant isolation
app.use('/api', tenantMiddleware, chatRoutes);
app.use('/api/connections', tenantMiddleware, connectionsRoutes);
app.use('/api/mcp', tenantMiddleware, mcpRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Tara AI Assistant Backend is running...');
});

// Start background automation scheduler
const { runAllTenantScheduledTasks } = require('./config/taskScheduler');
setInterval(() => {
  runAllTenantScheduledTasks();
}, 60 * 1000);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
});

server.on('close', () => {
  console.log('[SERVER CLOSED] The server has closed.');
});

