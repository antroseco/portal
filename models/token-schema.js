const Mongoose = require('mongoose');

module.exports = new Mongoose.Schema({
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
