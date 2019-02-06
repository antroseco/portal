document.addEventListener('DOMContentLoaded', () => {
    new QRious({
        element: document.querySelector('canvas'),
        value: two_fa_uri,
        size: 200
    });
});
