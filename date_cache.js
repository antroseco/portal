const ms = require('ms');
const Key = Symbol.for('portal.date_cache.js');

if (!global[Key]) {
    global[Key] = new Map();

    setInterval(() => {
        global[Key].forEach((_, Key, This) =>
            This.set(Key, Calculate(Key)))
    }, ms('1 m'));
}

function Calculate(Offset) {
    const D = new Date();
    D.setUTCHours(0, 0, 0, 0);

    if (Offset)
        D.setUTCDate(D.getUTCDate() + Offset);

    return D;
}

function GetDate(Offset = 0) {
    if (global[Key].has(Offset)) {
        return global[Key].get(Offset);
    } else {
        const D = Calculate(Offset);
        global[Key].set(Offset, D);

        return D;
    }
}

function GetLocalString(Offset = 0) {
    return GetDate(Offset).toISOString().substring(0, 10);
}

module.exports = {
    Date: GetDate,
    LocalString: GetLocalString
};
