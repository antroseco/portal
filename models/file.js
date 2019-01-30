const Mongoose = require('mongoose');
const Os = require('os');
const Path = require('path');

const Schema = new Mongoose.Schema({
    file: {
        type: String,
        required: true,
        minlength: 32,
        maxlength: 32
    },
    token_hash: {
        type: Buffer,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Mongoose.now
    }
});

Schema.virtual('path').get(function () {
    return Path.join(Os.tmpdir(), 'upload_' + this.file);
});

module.exports = Mongoose.model('file', Schema);
