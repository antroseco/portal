const Mongoose = require('mongoose');

module.exports = new Mongoose.Schema({
    hash: {
        type: String,
        required: true,
        minlength: 64,
        maxlength: 64
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
