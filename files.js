const fs = require('fs').promises;
const Cron = require('cron');
const FileModel = require('./models/file');
const Token = require('./token');

const Key = Symbol.for('portal.files.js');
if (!global[Key])
    global[Key] = Cron.job('* 0 */1 * * *', Clean, null, true);

/*
* Records file to database and returns
* a token that can be used to retrieve
* its path later.
*/
async function Register(FileObject) {
    const Filename = FileObject.path.substr(-32);
    const ClientToken = new Token();

    FileModel.create({
        file: Filename,
        token_hash: await ClientToken.hash
    });

    return ClientToken.hex;
}

/*
* Returns the absolute path of the file corresponding
* to the file token given
*/
async function Path(FileToken) {
    const ClientToken = new Token(FileToken);
    const FileObject = await FileModel.findOne({
        token_hash: await ClientToken.hash
    }).select('file');

    if (!FileObject)
        throw Error('Missing file');

    return FileObject.path;
}

/*
* Deletes a file using its name or path and removes
* it from the database
*/
async function Delete(Filename) {
    const FileObject = await FileModel.findOneAndDelete({
        file: Filename.substr(-32)
    });

    fs.unlink(FileObject.path);
}

// Deletes all registered files older than 4 hours
async function Clean() {
    const Oldest = await FileModel.findOne().sort('createdAt').select('-token_hash');

    if (!Oldest) return;

    console.log('OLDEST FILE', Oldest.createdAt);

    if (Date.now() - Oldest.createdAt.getTime() > 4 * 60 * 60 * 1000) {
        await FileModel.deleteOne({ _id: Oldest._id });
        await fs.unlink(Oldest.path);

        console.log('EXPIRED UPLOADED FILE', Oldest.path);

        /*
        * Call Clean() again to check if there are any
        * younger files that have also expired.
        */
        Clean();
    }
}

module.exports = { Register, Path, Delete };
