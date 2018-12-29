const Mongoose = require('mongoose');
const Schema = require('./token-schema');

Schema.index({ createdAt: 1 }, { expires: '4 hours' });

module.exports = Mongoose.model('csrf-token', Schema);
