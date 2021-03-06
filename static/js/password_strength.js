function PasswordStrength() {
    if (!zxcvbn) return;

    const Progress = document.querySelector('div.progress');
    const Bar = document.querySelector('div.progress-bar');
    const Span = Progress.querySelector('span');
    const Password = document.getElementById('newPassword1');
    const Email = document.getElementById('registerEmail');

    if (Password.value)
        Progress.classList.remove('d-none');
    else
        Progress.classList.add('d-none');

    let Dictionary = ['ethniki', 'froura', 'portal', 'psifiaki', 'platforma'];
    if (Email)
        Dictionary.push(Email.value);

    const { score, feedback } = zxcvbn(Password.value.substring(0, 32), Dictionary);

    const Widths = ['w-0', 'w-25', 'w-50', 'w-75', 'w-100'];
    const Colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];
    const Strength = ['Πολύ Αδύναμος', 'Αδύναμος', 'Μέτριος', 'Καλός', 'Πολύ Καλός'];

    Bar.classList.remove(...Widths);
    Bar.classList.remove(...Colors);
    Bar.classList.add(Colors[score], Widths[score]);

    Span.textContent = Strength[score];

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
    const Password1 = document.getElementById('newPassword1');
    const Password2 = document.getElementById('newPassword2');
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

    if (Email)
        Email.addEventListener('input', PasswordStrength);
});
