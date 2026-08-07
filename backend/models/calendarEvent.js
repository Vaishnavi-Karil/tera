const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CalendarEvent = sequelize.define('CalendarEvent', {
  platform: {
    type: DataTypes.STRING, // e.g., 'google', 'microsoft'
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  attendees: {
    type: DataTypes.JSONB, // Array of emails or names
    defaultValue: []
  }
});

module.exports = CalendarEvent;