const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    verified_email: {
        type: Boolean,
        required: true,
        default: false
    },
    email_token_hash: Buffer,
    password: {
        type: String,
        required: true,
        trim: true,
        select: false
    },
    two_fa_secret: {
        type: String,
        minlength: 32,
        maxlength: 32
    },
    two_fa_enabled: {
        type: Boolean,
        required: true,
        default: false
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
    am: {
        type: Number,
        required: true,
        min: 1,
        max: 99999
    },
    anakoinosis: [Boolean]
});

Schema.virtual('onomateponymo').get(function () {
    return `${this.onoma} ${this.epitheto}`;
});

Schema.virtual('session').get(function () {
    return this._session;
}).set(function (Session) {
    this._session = Session;
});

module.exports = Mongoose.model('User', Schema);
