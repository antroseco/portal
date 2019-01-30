function Expand() {
    const CardBody = this.parentElement.parentElement;
    const Desc = CardBody.querySelector('p[data-desc]');
    const Full = CardBody.querySelector('p[data-full]');

    Desc.classList.add('d-none');
    Full.classList.remove('d-none');

    this.querySelector('svg').setAttribute('data-icon', 'chevron-up');
    this.previousElementSibling.querySelector('svg').setAttribute('data-icon', 'envelope-open');
    this.addEventListener('click', Contract, { once: true });

    const Card = CardBody.parentElement;
    if (Card.classList.contains('unread')) {
        Card.classList.remove('unread');

        fetch('/api/anakoinosis/read', {
            method: 'PUT',
            body: Card.id,
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

    this.querySelector('svg').setAttribute('data-icon', 'chevron-down');
    this.addEventListener('click', Expand, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    for (const ExpandButton of document.querySelectorAll('button.btn-outline-primary'))
        ExpandButton.addEventListener('click', Expand, { once: true });
});
