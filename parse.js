const KoaBody = require('koa-body');

const UrlEnc = KoaBody({
    multipart: false,
    urlencoded: true,
    text: false,
    json: false
});

const Multipart = KoaBody({
    multipart: true,
    urlencoded: false,
    text: false,
    json: false,
    formidable: {
        maxFileSize: 10 * 1024 * 1024
    }
});

const Json = KoaBody({
    multipart: false,
    urlencoded: false,
    text: false,
    json: true,
    jsonLimit: 128
});

module.exports = { UrlEnc, Multipart, Json };
