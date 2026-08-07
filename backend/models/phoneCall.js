const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PhoneCall = sequelize.define('PhoneCall', {
  personName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // duration in seconds
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('INCOMING', 'OUTGOING', 'MISSED', 'REJECTED'),
    defaultValue: 'INCOMING'
  }
});

module.exports = PhoneCall;