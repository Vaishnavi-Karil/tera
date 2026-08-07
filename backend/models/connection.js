const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Connection = sequelize.define('Connection', {
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'SYNCING', 'ERROR'),
    defaultValue: 'NOT_CONNECTED'
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Connection;