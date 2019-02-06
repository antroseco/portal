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
                const Sha256 = Crypto.createHash('sha256');

                Sha256.update(await this.hex);
                this._hash = Sha256.digest();
            }

            return this._hash;
        })();
    }
}

module.exports = Token;
