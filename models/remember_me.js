const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    hash: {
        type: Buffer,
        required: true
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

module.exports = Mongoose.model('remember_me', Schema);
