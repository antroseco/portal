function ClearAlerts() {
    for (const Alert of document.getElementsByClassName('alert'))
        Alert.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    const Login = document.querySelector('form.form-signin');
    const Register = document.querySelector('form.form-register');
    const Reset = document.querySelector('form.form-reset');

    document.getElementById('login').addEventListener('click', () => {
        Login.classList.remove('d-none');
        Register.classList.add('d-none');
        Reset.classList.add('d-none');

        ClearAlerts();
    });
    document.getElementById('register').addEventListener('click', () => {
        Login.classList.add('d-none');
        Register.classList.remove('d-none');
        Reset.classList.add('d-none');

        ClearAlerts();
    });

    document.getElementById('reset').addEventListener('click', e => {
        e.preventDefault();

        Login.classList.add('d-none');
        Register.classList.add('d-none');
        Reset.classList.remove('d-none');

        ClearAlerts();
    });
})
