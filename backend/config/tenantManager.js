const { Sequelize, DataTypes } = require('sequelize');
const { Client } = require('pg');
require('dotenv').config();

const connectionCache = {};

// Helper to define models on any sequelize instance dynamically
function defineTenantModels(sequelizeInstance) {
  const Session = sequelizeInstance.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'New Chat Session'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true
  });

  const Message = sequelizeInstance.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sender: {
      type: DataTypes.ENUM('user', 'assistant'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    timestamps: true
  });

    const Connection = sequelizeInstance.define('Connection', {
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'SYNCING', 'ERROR'),
      defaultValue: 'NOT_CONNECTED'
    },
    lastSync: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  const OAuthToken = sequelizeInstance.define('OAuthToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expiry: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  const MCPServer = sequelizeInstance.define('MCPServer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    transport: {
      type: DataTypes.ENUM('sse', 'stdio'),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true
    },
    args: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'ERROR', 'CONNECTING', 'INACTIVE'),
      defaultValue: 'INACTIVE'
    }
  });

  const Tool = sequelizeInstance.define('Tool', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    serverType: {
      type: DataTypes.ENUM('native', 'mcp'),
      allowNull: false
    },
    serverId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    inputSchema: {
      type: DataTypes.JSON,
      allowNull: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  const Permission = sequelizeInstance.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    toolName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    scope: {
      type: DataTypes.STRING,
      allowNull: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  const ToolExecutionLog = sequelizeInstance.define('ToolExecutionLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    toolName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    arguments: {
      type: DataTypes.JSON,
      allowNull: true
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
      defaultValue: 'PENDING'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retries: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    timestamps: true
  });

  const ScheduledTask = sequelizeInstance.define('ScheduledTask', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cronExpression: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'RUNNING'),
      defaultValue: 'ACTIVE'
    },
    nextRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastRun: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  const Memory = sequelizeInstance.define('Memory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general'
    }
  });

  const AgentSession = sequelizeInstance.define('AgentSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    round: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    intermediateSteps: {
      type: DataTypes.JSON,
      allowNull: true
    }
  });

  const PhoneCall = sequelizeInstance.define('PhoneCall', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    contactName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('INCOMING', 'OUTGOING', 'MISSED'),
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  const CalendarEvent = sequelizeInstance.define('CalendarEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  // Define Associations
  Session.hasMany(Message, {
    foreignKey: 'sessionId',
    as: 'messages',
    onDelete: 'CASCADE'
  });
  
  Message.belongsTo(Session, {
    foreignKey: 'sessionId',
    as: 'session'
  });

  Session.hasMany(AgentSession, {
    foreignKey: 'sessionId',
    as: 'agentSessions',
    onDelete: 'CASCADE'
  });

  AgentSession.belongsTo(Session, {
    foreignKey: 'sessionId',
    as: 'session'
  });

  MCPServer.hasMany(Tool, {
    foreignKey: 'serverId',
    as: 'tools',
    onDelete: 'CASCADE'
  });

  Tool.belongsTo(MCPServer, {
    foreignKey: 'serverId',
    as: 'server'
  });

  return { 
    Session, 
    Message, 
    Connection, 
    OAuthToken, 
    MCPServer, 
    Tool, 
    Permission, 
    ToolExecutionLog, 
    ScheduledTask, 
    Memory, 
    AgentSession, 
    PhoneCall, 
    CalendarEvent 
  };
}

// 1. Create a new database for a user
async function createTenantDatabase(userId) {
  const sanitizedUser = userId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dbName = `user_db_${sanitizedUser}`;
  
  // Connect to default 'postgres' database
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres',
  });

  try {
    await client.connect();
    
    // Check if database exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`[TenantManager] Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[TenantManager] Database "${dbName}" created successfully.`);
    } else {
      console.log(`[TenantManager] Database "${dbName}" already exists.`);
    }
    
    // Connect to the new database and sync tables
    const tenantSequelize = new Sequelize(
      dbName,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );

    defineTenantModels(tenantSequelize);
    await tenantSequelize.sync();
    
    // Enable pgvector and add embedding / automation columns
    try {
      await tenantSequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
      await tenantSequelize.query('ALTER TABLE "Memories" DROP COLUMN IF EXISTS "embedding";');
      await tenantSequelize.query('ALTER TABLE "Memories" ADD COLUMN IF NOT EXISTS "embedding" vector(3072);');
      await tenantSequelize.query('ALTER TABLE "ScheduledTasks" ADD COLUMN IF NOT EXISTS "prompt" TEXT;');
      await tenantSequelize.query('ALTER TABLE "ScheduledTasks" ADD COLUMN IF NOT EXISTS "lastRun" TIMESTAMP WITH TIME ZONE;');
      console.log(`[TenantManager] Migrated schema for database "${dbName}" successfully.`);
    } catch (migrateErr) {
      console.error(`[TenantManager] Migration error for database "${dbName}":`, migrateErr.message);
    }

    await tenantSequelize.close();
    return dbName;
  } catch (err) {
    console.error(`[TenantManager] Error creating database for user ${userId}:`, err);
    throw err;
  } finally {
    await client.end();
  }
}

// 2. Get Sequelize Connection and Models for a user
function getTenantConnection(userId) {
  const sanitizedUser = userId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dbName = `user_db_${sanitizedUser}`;
  
  if (connectionCache[dbName]) {
    return connectionCache[dbName];
  }

  const sequelizeInstance = new Sequelize(
    dbName,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

  const models = defineTenantModels(sequelizeInstance);

  connectionCache[dbName] = {
    sequelize: sequelizeInstance,
    models
  };

  return connectionCache[dbName];
}

module.exports = {
  createTenantDatabase,
  getTenantConnection
};
