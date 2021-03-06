const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    session: {
        type: Object,
        required: true
    }
}, { timestamps: true });

Schema.index({ updatedAt: 1 }, { expires: '20 minutes' });
Schema.index({ createdAt: 1 }, { expires: '4 hours' });
Schema.index({ key: 'hashed' });

module.exports = Mongoose.model('session', Schema);
