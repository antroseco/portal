const { SHA256 } = require('sha2');
const Util = require('util');
const Crypto = require('crypto');

const RandomBytes = Util.promisify(Crypto.randomBytes);

class Token {
    constructor(HexString) {
        if (HexString !== undefined) {
            const Regex = /^[\da-f]{32}$/;

            if (Regex.test(HexString))
                this._hex = HexString;
            else
                console.log('TOKEN: INVALID HEX STRING');
        }
    }

    get hex() {
        return (async () => {
            if (this._hex === undefined) {
                const Bytes = await RandomBytes(16);
                this._hex = Bytes.toString('hex');
            }

            return this._hex;
        })();
    }

    get hash() {
        return (async () => {
            if (this._hash === undefined) {
                this._hash = SHA256(await this.hex);
            }

            return this._hash;
        })();
    }
}

module.exports = Token;
