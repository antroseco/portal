const Mongoose = require('mongoose');
const Schema = require('./token-schema');

Schema.index({ createdAt: 1 }, { expires: '7 days' });

module.exports = Mongoose.model('login-token', Schema);
