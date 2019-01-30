const fs = require('fs');
const fsP = fs.promises;

class Directory {
    constructor(Path) {
        this.files = this.Resolve(Path);

        fs.watch(Path, {
            persistent: false,
            recursive: true
        }, (EventType, Filename) => {
            console.log('GOT EVENT IN', Path, EventType, Filename);

            // Debounce events
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() =>
                this.files = this.Resolve(Path), 64);
        });
    }

    /*
    * Returns an array of all files in a
    * directory, sorted by name.
    */
    async Resolve(Path) {
        console.log('RESOLVING', Path);

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
}

module.exports = Directory;
