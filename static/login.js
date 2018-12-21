function ClearAlerts() {
    for (const Alert of document.getElementsByClassName('alert'))
        Alert.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login').addEventListener('click', () => {
        document.querySelector('form.form-signin').style.removeProperty('display');
        document.querySelector('form.form-register').style.display = 'none';

        ClearAlerts();
    });
    document.getElementById('register').addEventListener('click', () => {
        document.querySelector('form.form-signin').style.display = 'none';
        document.querySelector('form.form-register').style.removeProperty('display');

        ClearAlerts();
    });

    const Password1 = document.getElementById('registerPassword');
    const Password2 = document.getElementById('registerPassword2');

    const CheckPasswords = () => {
        if (Password1.value !== Password2.value)
            Password2.setCustomValidity('Passwords must match');
        else
            Password2.setCustomValidity('');
    }

    Password1.addEventListener('input', CheckPasswords);
    Password2.addEventListener('input', CheckPasswords);
})
