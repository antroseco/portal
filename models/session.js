const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    session: {
        type: Object,
        required: true
    },
    updatedAt: {
        type: Date,
        required: true,
        default: Mongoose.now
    }
});

Schema.index({ updatedAt: 1 }, { expires: '20 minutes' });
Schema.index({ key: 'hashed' });

module.exports = Mongoose.model('session', Schema);
