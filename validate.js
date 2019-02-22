class ValidationError extends Error {
    constructor(...Parameters) {
        super(...Parameters);

        if (Error.captureStackTrace)
            Error.captureStackTrace(this, ValidationError);
    }
}

const OS = ['ΠΖ', 'ΤΘ', 'ΠΒ', 'ΜΧ', 'ΔΒ', 'ΤΧ', 'ΥΠ', 'ΕΜ', 'ΥΓ', 'ΝΟΜ', 'ΠΑ', 'ΠΝ'];

const Vathmos = ['Αντγος', 'Υπγος', 'Ταξχος', 'Σχης', 'Ανχης', 'Τχης', 'Λγός',
    'Υπλγός', 'Ανθλγός', 'Ανθστής Α', 'Ανθστής Β', 'Ανθστής Γ', 'Αλχίας',
    'Επχίας', 'Λχίας', 'Δνέας'];

const Epilogi = ['Α', 'Β'];

function ValidateArray(x, Constraints) {
    const Value = Constraints[x];
    if (Value === undefined)
        throw Error('Malformed POST request: ValidateArray');
    return Value;
}

function ValidateNumber(x, Min, Max) {
    // Remove leading 0s; JSON is allergic
    let i = 0;
    while (i < x.length && x[i] === '0')
        ++i;
    if (x.length == i)
        return 0;
    else
        x = x.substring(i);

    const n = JSON.parse(x);
    if (!Number.isInteger(n) || n < Min || n > Max)
        throw Error('Malformed POST request: ValidateNumber');
    // Use Math.floor() to remove trailing 0s (e.g. from 3.00)
    return Math.floor(x);
}

function ValidateBoolean(x) {
    if (x === 'nai')
        return 'Ναι';
    if (x === 'oxi')
        return 'Όχι';
    throw Error('Malformed POST request: ValidateBoolean');
}

function ValidateText(x, Length) {
    if (typeof x !== 'string' || x.length > Length)
        throw new ValidationError('Το κείμενο που εισάγατε είναι πολύ μακρύ');

    return x.trim();
}

function ValidateDate(x, Min, Max) {
    const Regex = /^((19)|(20))([0-9]{2})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])$/;

    if (Regex.test(x)) {
        if (Min && Max) {
            const Time = new Date(x).getTime();

            if (Time >= Min.getTime() && Time <= Max.getTime())
                return x;
        } else {
            return x;
        }
    }

    throw Error('Malformed POST request: ValidateDate');
}

function PhoneCommon(Phone) {
    if (typeof Phone !== 'string')
        throw Error('Malformed POST request: ValidatePhone');

    // Trim whitespace
    Phone = Phone.replace(/\s/g, '');
    // Normalise the international call prefix
    Phone = Phone.replace(/^\+/, '00');

    return Phone;
}

function ValidateKinito(Phone) {
    Phone = PhoneCommon(Phone);

    const CyRegex = /^(?:00357)?9\d{7}$/;
    const GrRegex = /^(?:0030)?6\d{9}$/;

    if (!CyRegex.test(Phone) && !GrRegex.test(Phone))
        throw new ValidationError('Το κινητό που εισάγατε έχει λάθος μορφή');

    return Phone;
}

function ValidateStathero(Phone) {
    Phone = PhoneCommon(Phone);

    const CyRegex = /^(?:00357)?2\d{7}$/;
    const GrRegex = /^(?:0030)?2\d{9}$/;

    if (!CyRegex.test(Phone) && !GrRegex.test(Phone))
        throw new ValidationError('Το σταθερό που εισάγατε έχει λάθος μορφή');

    return Phone;
}

function ValidateFileToken(x) {
    const Regex = /^(?:[0-9]|[a-z]){32}$/;

    if (Regex.test(x))
        return x;
    else
        throw Error('Malformed POST request: ValidateFileToken');
}

function ValidateFilename(x) {
    if (typeof x !== 'string')
        throw Error('Malformed POST request: ValidateFilename');

    return x.substring(0, 100).trim();
}

function ValidateCheckbox(x) {
    return x === 'on';
}

function ValidateEmail(Email) {
    const Regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/;

    if (typeof Email === 'string' && Email.length <= 320) {
        Email = Email.trim().toLowerCase();

        if (Regex.test(Email))
            return Email;
    }

    throw new ValidationError('Το email που εισάγατε έχει λάθος μορφή');
}

function ValidatePassword(Password) {
    if (typeof Password === 'string' && Password.length >= 8 && Password.length <= 72)
        return Password;

    throw new ValidationError('Ο κωδικός σας πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
}

function ValidateName(Name) {
    const Regex = /^[\wα-ωάέόώίύή ,.'-]{1,32}$/i;

    if (Regex.test(Name))
        return Name.trim();

    throw new ValidationError('Το ονοματεπώνυμο δεν πρέπει να περιέχει ειδικούς χαρακτήρες');
}

function ValidateAM(AM) {
    const Regex = /^[0-9]{3,5}$/;

    if (Regex.test(AM)) {
        const n = parseInt(AM);

        if (n > 99 && n < 100000)
            return n;
    }

    throw new ValidationError('Άκυρο ΑΜ');
}

function ValidateOTP(OTP) {
    const Regex = /^[0-9]{6}$/;

    if (Regex.test(OTP))
        return OTP;

    throw new ValidationError('Άκυρο OTP');
}

function ValidateRecoveryCode(RecCode) {
    const Regex = /^[\da-f]{32}$/;

    if (Regex.test(RecCode))
        return RecCode;

    throw new ValidationError('Άκυρο OTP');
}

module.exports = {
    Array: ValidateArray,
    Number: ValidateNumber,
    Boolean: ValidateBoolean,
    Text: ValidateText,
    Date: ValidateDate,
    Kinito: ValidateKinito,
    Stathero: ValidateStathero,
    FileToken: ValidateFileToken,
    Filename: ValidateFilename,
    Checkbox: ValidateCheckbox,
    Email: ValidateEmail,
    Password: ValidatePassword,
    Name: ValidateName,
    AM: ValidateAM,
    OTP: ValidateOTP,
    RecoveryCode: ValidateRecoveryCode,
    Error: ValidationError,
    Common: { OS, Vathmos, Epilogi }
}
