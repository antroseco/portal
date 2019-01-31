function Expand() {
    const CardBody = this.parentElement.parentElement;
    const Desc = CardBody.querySelector('p[data-desc]');
    const Full = CardBody.querySelector('p[data-full]');

    Desc.classList.add('d-none');
    Full.classList.remove('d-none');

    this.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-up');
    this.previousElementSibling.querySelector('i').classList.replace('fa-envelope', 'fa-envelope-open');

    this.addEventListener('click', Contract, { once: true });

    const Card = CardBody.parentElement;
    if (Card.classList.contains('unread')) {
        Card.classList.remove('unread');

        fetch('/api/anakoinosis/read', {
            method: 'PUT',
            body: JSON.stringify({
                csrf: CsrfToken,
                id: Card.id
            }),
            headers: { 'Content-Type': 'application/json' },
            mode: 'same-origin',
            credentials: 'same-origin',
            redirect: 'error'
        });
    }
}

function Contract() {
    const CardBody = this.parentElement.parentElement;
    const Desc = CardBody.querySelector('p[data-desc]');
    const Full = CardBody.querySelector('p[data-full]');

    Desc.classList.remove('d-none');
    Full.classList.add('d-none');

    this.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');
    this.addEventListener('click', Expand, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    for (const ExpandButton of document.querySelectorAll('button.btn-outline-primary'))
        ExpandButton.addEventListener('click', Expand, { once: true });
});
