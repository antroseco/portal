function ClearAlerts() {
    for (const Alert of document.getElementsByClassName('alert'))
        Alert.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    const Login = document.querySelector('form.form-signin');
    const Register = document.querySelector('form.form-register');

    document.getElementById('login').addEventListener('click', () => {
        Login.classList.remove('d-none');
        Register.classList.add('d-none');

        ClearAlerts();
    });
    document.getElementById('register').addEventListener('click', () => {
        Login.classList.add('d-none');
        Register.classList.remove('d-none');

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
