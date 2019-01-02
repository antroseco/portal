function ClearAlerts() {
    for (const Alert of document.getElementsByClassName('alert'))
        Alert.remove();
}

function PasswordStrength() {
    if (!zxcvbn) return;

    const Progress = document.querySelector('div.progress');
    const Bar = document.querySelector('div.progress-bar');
    const Password = document.getElementById('registerPassword');

    if (Password.value)
        Progress.classList.remove('d-none');
    else
        Progress.classList.add('d-none');

    const Email = document.getElementById('registerEmail');
    const { score, feedback } = zxcvbn(Password.value.substring(0, 32),
        [Email.value, 'ethniki', 'froura', 'portal', 'psifiaki', 'platforma']);

    const Widths = ['w-0', 'w-25', 'w-50', 'w-75', 'w-100'];
    const Colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];

    Bar.classList.remove(...Widths);
    Bar.classList.remove(...Colors);
    Bar.classList.add(Colors[score], Widths[score]);

    if (score < 3) {
        if (feedback.warning)
            Password.setCustomValidity(feedback.warning);
        else if (feedback.suggestions)
            Password.setCustomValidity(feedback.suggestions.join('. '));
        else
            Password.setCustomValidity('Password is too weak');
    } else
        Password.setCustomValidity('');
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
    const Email = document.getElementById('registerEmail');

    const CheckPasswords = () => {
        if (Password1.value !== Password2.value)
            Password2.setCustomValidity('Passwords must match');
        else
            Password2.setCustomValidity('');
    }

    Password1.addEventListener('input', CheckPasswords);
    Password2.addEventListener('input', CheckPasswords);

    Password1.addEventListener('input', PasswordStrength);
    Email.addEventListener('input', PasswordStrength);
})
