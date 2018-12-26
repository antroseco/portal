const bcrypt = require('bcrypt');
const UserModel = require('./models/user');

function Serialize(User, done) {
    done(null, User._id);
};

async function Deserialize(Id, done) {
    try {
        const User = await UserModel.findById(Id).lean(false);

        done(null, User);
    } catch (Err) {
        console.log(Err);

        done(Err);
    }
};

async function Strategy(Username, Password, done) {
    try {
        const User = await UserModel.findOne({ email: Username },
            { password: true });

        if (User && await bcrypt.compare(Password, User.password)) {
            /*
            * We won't use the user object for anything else
            * so only provide the _id field to allow the
            * serialization of the user
            */
            done(null, { _id: User._id });
        }
        else {
            done(null, false);
        }
    } catch (Err) {
        console.log(Err);

        done(Err);
    }
};

module.exports = { Serialize, Deserialize, Strategy };
