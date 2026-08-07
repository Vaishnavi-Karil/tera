const sequelize = require('../config/database');
const Session = require('./session');
const Message = require('./message');
const Connection = require('./connection');
const PhoneCall = require('./phoneCall');
const CalendarEvent = require('./calendarEvent');
const User = require('./user');

// Define associations
Session.hasMany(Message, {
  foreignKey: 'sessionId',
  as: 'messages',
  onDelete: 'CASCADE'
});

Message.belongsTo(Session, {
  foreignKey: 'sessionId',
  as: 'session'
});

module.exports = {
  sequelize,
  Session,
  Message,
  Connection,
  PhoneCall,
  CalendarEvent,
  User
};

