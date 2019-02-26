const fs = require('fs');
const fsP = fs.promises;
const log = require('./log');

class Directory {
    constructor(Path) {
        this.files = this.Resolve(Path);

        fs.watch(Path, {
            persistent: false,
            recursive: true
        }, () => {
            // Debounce events
            clearTimeout(this.timeout);

            this.timeout = setTimeout(() => {
                this.files = this.Resolve(Path)
                this.filtered = undefined;
            }, 64);
        });
    }

    /*
    * Returns an array of all files in a
    * directory, sorted by name.
    */
    async Resolve(Path) {
        log.info('Resolve', 'Reading directory', Path);

        const Dir = await fsP.readdir(Path, {
            withFileTypes: true
        });

        return Dir.filter(Dirent => Dirent.isFile())
            .map(Dirent => Dirent.name).sort();
    }

    /*
    * Returns the last n files.
    * If n is 0, then all files are returned.
    */
    async Get(n = 0) {
        const Files = await this.files;
        return Files.slice(-n).reverse();
    }

    async _internal_min_max(Index) {
        const Regex = /\d+/;

        if (!this.filtered)
            this.filtered = (await this.files).filter(Value => Regex.test(Value));

        const [Filename] = this.filtered.slice(Index);
        return Filename.match(Regex)[0];
    }

    get min() {
        return this._internal_min_max(0);
    }

    get max() {
        return this._internal_min_max(-1);
    }
}

module.exports = Directory;
