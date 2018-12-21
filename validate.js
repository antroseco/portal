function ValidateCustom(x, Constraints) {
    const Value = Constraints.get(x);
    if (Value === undefined)
        throw Error('Malformed POST request: ValidateCustom');
    return Value;
}

function ValidateArray(x, Constraints) {
    const Value = Constraints[x];
    if (Value == undefined)
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
        throw Error('Malformed POST request: ValidateText');
    return x;
}

function ValidateDate(x) {
    const Regex = /^((19)|(20))([0-9]{2})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])$/;

    if (Regex.test(x))
        return x;
    else
        throw Error('Malformed POST request: ValidateDate');
}

function ValidatePhone(Phone) {
    if (typeof Phone !== 'string')
        throw Error('Malformed POST request: ValidatePhone');

    // Trim whitespace
    Phone = Phone.replace(/\s/g, '');
    // Normalise the international call prefix
    Phone = Phone.replace(/^\+/, '00');

    const CyRegex = /^(?:00357)?[2|9]\d{7}$/;
    const GrRegex = /^(?:0030)?[1-9]\d{9}$/;

    if (!CyRegex.test(Phone) && !GrRegex.test(Phone))
        throw Error('Malformed POST request: ValidatePhone')

    return Phone;
}

function ValidateFileToken(x) {
    const Regex = /^(?:[0-9]|[a-z]){32}$/;

    if (typeof x !== 'string' || !Regex.test(x))
        throw Error('Malformed POST request: ValidateFileToken');
    else
        return x;
}

function ValidateFilename(x) {
    if (typeof x !== 'string')
        throw Error('Malformed POST request: ValidateFilename');

    return x.substring(0, 100);
}

module.exports = {
    Custom: ValidateCustom,
    Array: ValidateArray,
    Number: ValidateNumber,
    Boolean: ValidateBoolean,
    Text: ValidateText,
    Date: ValidateDate,
    Phone: ValidatePhone,
    FileToken: ValidateFileToken,
    Filename: ValidateFilename
}
