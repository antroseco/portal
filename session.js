const SessionModel = require('./models/session');

const Store = {
    get: async Key => {
        const { session } = await SessionModel.findOne({
            key: Key
        }).select('session') || {};

        return session;
    },
    set: async (Key, session, _, Options) => {
        /*
        * Because we have set renew to true,
        * the set function will be periodically
        * called to update the expiry date,
        * even if the session hasn't been updated.
        */
        const Doc = Options.changed ? { session } : {};

        await SessionModel.updateOne({ key: Key }, Doc, {
            upsert: true,
            setDefaultsOnInsert: true
        });
    },
    destroy: async Key => {
        await SessionModel.deleteOne({ key: Key });
    }
};

// See https://github.com/koajs/session/issues/113
async function RegenerateId(ctx) {
    const Old = ctx.session;

    const SessionSymbol = Object.getOwnPropertySymbols(ctx)[0];
    const Session = ctx[SessionSymbol];
    await Session.remove();
    await Session.initFromExternal();

    ctx.session = Old;
}

module.exports = { Store, RegenerateId };
