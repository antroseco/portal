const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        select: false
    },
    onoma: {
        type: String,
        required: true,
        trim: true
    },
    epitheto: {
        type: String,
        required: true,
        trim: true
    },
    kinito: {
        type: String,
        required: true,
        trim: true
    },
    anakoinosis: [Boolean]
});

Schema.virtual('onomateponymo').get(function () {
    return `${this.onoma} ${this.epitheto}`;
});

Schema.virtual('session_hash').get(function () {
    return this._session;
}).set(function (Hash) {
    this._session = Hash;
});

module.exports = Mongoose.model('User', Schema);
