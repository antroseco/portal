const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    session_hash: {
        type: Buffer
    },
    csrf: {
        type: String,
        required: true,
        minlength: 32,
        maxlength: 32
    },
    user: {
        type: Mongoose.Schema.Types.ObjectId
    },
    createdAt: {
        type: Date,
        required: true,
        default: Mongoose.now
    }
});

Schema.index({ createdAt: 1 }, { expires: '2 hours' });

module.exports = Mongoose.model('session', Schema);
