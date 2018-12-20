const fs = require('fs').promises;

class JsonStore {
    constructor(Path) {
        this.path = Path;
        this.data = this.Load();
    }

    // Reads file and constructs the internal representation (Map)
    async Load() {
        try {
            const Contents = await fs.readFile(this.path, 'utf8');

            const Json = JSON.parse(Contents);
            return new Map(Json);
        } catch (error) {
            console.log(`Missing or corrupt credentials file ${this.path}\n${error}`);
            return new Map();
        }
    }

    // Serializes the internal representation (Map) to JSON and writes it
    async Save() {
        const Contents = JSON.stringify([...await this.data]);
        return fs.writeFile(this.path, Contents, 'utf8');
    }

    async Has(Id) {
        const data = await this.data;

        return data.has(Id);
    }

    // Embed the Id into the User object returned
    async Get(Id) {
        const data = await this.data;

        let Response = data.get(Id);

        // User does not exist (TODO: Invalid cookie)
        if (Response == undefined)
            throw Error(`User ${Id} does not exist`);

        Response.id = Id;

        return Response;
    }

    /*
    * User object should include the following fields:
    * string email      User's primary email address
    * string password   Password hashed using bcrypt
    * string onoma      User's name
    * string epitheto   User's surname
    * string kinito     User's phone number
    */
    async Set(Id, User) {
        const data = await this.data;

        return data.set(Id, User);
    }

    async Add(User) {
        //if (this.Query(User.email)) {
        //    throw new Error(`User ${User.email} already exists`);
        //}

        const data = await this.data;

        let Max = 0;
        for (const Id of data.keys()) {
            if (Id > Max) {
                Max = Id;
            }
        }

        const Id = Max + 1;
        this.Set(Id, User);

        await this.Save();

        return Id;
    }

    // Return User with matching email address
    async Query(Email) {
        if (typeof Email === 'string') {
            const Data = await this.data;

            for (const [Id, User] of Data.entries()) {
                if (User.email === Email) {
                    User.id = Id;

                    return User;
                }
            }
        }

        return null;
    }
}

module.exports = JsonStore;
