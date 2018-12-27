const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    token: {
        type: String,
        required: true,
        minlength: 32,
        maxlength: 32
    },
    user: {
        type: Mongoose.Schema.Types.ObjectId,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Mongoose.now
    }
});

Schema.index({ createdAt: 1 }, { expires: '7 days' });

module.exports = Mongoose.model('login-token', Schema);
