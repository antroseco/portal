document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login').addEventListener('click', () => {
        document.querySelector('form.form-signin').classList.add('active');
        document.querySelector('form.form-register').classList.remove('active');

        for (const Alert of document.getElementsByClassName('alert'))
            Alert.remove();
    });
    document.getElementById('register').addEventListener('click', () => {
        document.querySelector('form.form-signin').classList.remove('active');
        document.querySelector('form.form-register').classList.add('active');

        for (const Alert of document.getElementsByClassName('alert'))
            Alert.remove();
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
