const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const UserPushToken = sequelize.define('user_push_tokens', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  device_token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  platform: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'user_push_tokens'
});

// Establish relationship
User.hasMany(UserPushToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserPushToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = UserPushToken;
