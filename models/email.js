const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    sending: {
        type: Boolean,
        required: true,
        default: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    html: {
        type: String,
        required: true
    },
    attachments: [{
        filename: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true
        }
    }]
});

module.exports = Mongoose.model('email', Schema);
