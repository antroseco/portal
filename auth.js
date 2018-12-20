const bcrypt = require('bcrypt');

function Serialize(User, done) {
    done(null, User.id);
};

async function Deserialize(CredentialStore, Id, done) {
    try {
        const User = await CredentialStore.Get(Id);

        done(null, User)
    } catch (Err) {
        console.log(Err);
        done(Err)
    }
};

async function Strategy(CredentialStore, Username, Password, done) {
    try {
        const User = await CredentialStore.Query(Username);

        if (User && await bcrypt.compare(Password, User.password))
            done(null, User)
        else
            done(null, false)
    } catch (Err) {
        console.log(Err);
        done(Err);
    }
};

module.exports = { Serialize, Deserialize, Strategy };
