const NodeMailer = require('nodemailer');
const Util = require('util');
const EmailModel = require('./models/email');
const Files = require('./files');
const ms = require('ms');

class Queue {
    constructor(Options) {
        this.mx = NodeMailer.createTransport(Options);
        this._send = Util.promisify(this.mx.sendMail).bind(this.mx);

        /*
        * This class is only constructed on startup,
        * so if any emails are still marked as sending
        * it means that the server closed while they were
        * being sent. We can't know if they were delivered,
        * so mark them as unsent and retry just in case.
        */
        EmailModel.updateMany({ sending: true }, { sending: false },
            () => this.Check());
    }

    async Push(MailOptions) {
        let Mail = undefined;

        try {
            Mail = await EmailModel.create(MailOptions);

            await this.Send(Mail.toObject());

            await EmailModel.deleteOne({ _id: Mail._id });
        } catch (Err) {
            console.log('SENDMAIL ERROR', Err);

            if (Mail) {
                await Mail.updateOne({ sending: false });
                this.Interval = true;
            }
        }
    }

    async Send(Mail) {
        const Info = await this._send(Mail);

        console.log(`Message sent: ${Info.messageId}`);
        console.log(`Preview URL: ${NodeMailer.getTestMessageUrl(Info)}`);

        // Delete attachments from disk
        Mail.attachments = Mail.attachments || [];
        for (const Attachment of Mail.attachments) {
            console.log('SENDMAIL DELETING', Attachment.path);
            Files.Delete(Attachment.path);
        }
    }

    async Check() {
        let Mail = undefined;

        try {
            Mail = await EmailModel.findOneAndUpdate({ sending: false },
                { sending: true });

            if (Mail) {
                await this.Send(Mail.toObject());
                await EmailModel.deleteOne({ _id: Mail._id });
            } else {
                this.Interval = false;
            }
        } catch (Err) {
            console.log('CHECKMAIL ERROR', Err, Mail ? Mail : null);

            if (Mail) {
                console.log('CHECK MAIL FAILED, REVERTING');

                await Mail.updateOne({ sending: false });
                this.Interval = true;
            }
        }
    }

    set Interval(Value) {
        if (Value && !this.Interval) {
            console.log('STARTING MQ INTERVAL');

            this._interval = setInterval(() => {
                if (this.mx.isIdle())
                    this.Check();
            }, ms('10 s'));
        } else if (!Value) {
            console.log('STOPPING MQ INTERVAL');

            clearInterval(this._interval);
            this._interval = undefined;
        }
    }

    get Interval() {
        return this._interval != undefined;
    }
}

module.exports = Queue;
