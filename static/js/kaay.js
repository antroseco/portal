function Enable(Id) {
    const Input = document.getElementById(Id);

    Input.setAttribute('required', '');
    Input.setAttribute('name', Id);
    Input.removeAttribute('disabled');
}

function Disable(Id) {
    const Input = document.getElementById(Id);

    Input.setAttribute('disabled', '');
    Input.removeAttribute('name');
    Input.removeAttribute('required');
}

function Clamp(x, Min, Max) {
    return Math.min(Math.max(x, Min), Max);
}

function PreventDefault(e) {
    e.preventDefault();
}

function GenerateAgeFields(event) {
    let Value = Clamp(event.target.value, 0, 12);

    // Count existing fields
    let Existing = 1;
    for (let i = 12; i > 1; --i) {
        if (document.getElementById(`ilikia${i}`) != null) {
            Existing = i;
            break;
        }
    }

    // Add missing fields
    for (let i = Existing + 1; i <= Value; ++i) {
        // TODO: Refactor to cache elements
        const Id = `ilikia${i}`;

        const Div = document.createElement('div');
        Div.classList.add('form-group', 'col-md-1');

        // Align second row
        if (i == 7)
            Div.classList.add('offset-md-6');

        const Label = document.createElement('label');
        Label.setAttribute('for', Id)

        const Input = document.createElement('input');
        Input.classList.add('form-control');
        Input.setAttribute('type', 'number');
        Input.setAttribute('name', Id);
        Input.setAttribute('min', 0);
        Input.setAttribute('max', 99);
        Input.setAttribute('required', '');
        Input.id = Id;

        const Text = document.createTextNode(String.fromCharCode(160));

        Label.appendChild(Text);

        // Second row doesn't need the top margin added by the label
        if (i <= 6)
            Div.appendChild(Label);

        Div.appendChild(Input);

        document.getElementById('ilikies').appendChild(Div);
    }

    // Toggle first (permanent) field
    if (Value == 0) {
        Value = 1;
        Disable('ilikia1');
    } else {
        Enable('ilikia1');
    }

    // Remove excess fields
    for (let i = Existing; i > Value; --i) {
        document.getElementById(`ilikia${i}`).parentNode.remove();
    }
}

function FilterRanks(event) {
    const Value = event.target.value;
    const Select = document.getElementById('vathmos');
    const Nodes = document.querySelectorAll('#vathmos > option');

    if (Value == 0) {
        // Αξκός
        for (let i = 0; i < 9; ++i) {
            Nodes[i].disabled = false;
            Nodes[i].style.removeProperty('display');
        }

        for (let i = 9; i < 16; ++i) {
            Nodes[i].disabled = true;
            Nodes[i].style.display = 'none';
        }

        if (Select.selectedIndex >= 9)
            Select.selectedIndex = -1;
    }
    else if (Value == 1) {
        // Ανθστής
        for (let i = 0; i < 9; ++i) {
            Nodes[i].disabled = true;
            Nodes[i].style.display = 'none';
        }

        for (let i = 9; i < 12; ++i) {
            Nodes[i].disabled = false;
            Nodes[i].style.removeProperty('display');
        }

        for (let i = 12; i < 16; ++i) {
            Nodes[i].disabled = true;
            Nodes[i].style.display = 'none';
        }

        if (Select.selectedIndex < 9 || Select.selectedIndex > 11)
            Select.selectedIndex = -1;
    } else if (Value == 2) {
        // Υπξκός
        for (let i = 0; i < 12; ++i) {
            Nodes[i].disabled = true;
            Nodes[i].style.display = 'none';
        }

        for (let i = 12; i < 16; ++i) {
            Nodes[i].disabled = false;
            Nodes[i].style.removeProperty('display');
        }

        if (Select.selectedIndex <= 11)
            Select.selectedIndex = -1;
    } else {
        // Απόστρατος
        for (const Node of Nodes) {
            Node.disabled = false;
            Node.style.display = '';
        }
    }
}

async function Upload() {
    const File = this.files[0];
    const Feedback = document.querySelector('small.invalid-feedback');

    if (File.size > 10 * 1024 * 1024) {
        Feedback.classList.remove('text-muted');
        this.value = null;
        this.addEventListener('change', Upload, { once: true });
        return;
    } else {
        Feedback.classList.add('text-muted');
    }

    this.addEventListener('click', PreventDefault);

    const Id = this.id.substr(-1);
    const Icon = document.querySelector(`i[for="browse${Id}"]`);
    const Label = document.querySelector(`label.custom-file-label[for="browse${Id}"]`);
    const FileInput = document.getElementById(`file${Id}`);
    const FilenameInput = document.getElementById(`filename${Id}`);
    const CsrfToken = document.getElementById('csrf');

    try {
        const Data = new FormData();
        Data.append('csrf', CsrfToken.value);
        Data.append('file', File);

        Label.textContent = File.name;
        Icon.classList.add('fa-spin', 'fa-spinner');
        Icon.classList.remove('d-none', 'fa-check', 'fa-times');

        const Response = await fetch('/api/upload', {
            method: 'POST',
            body: Data,
            mode: 'same-origin',
            credentials: 'same-origin',
            redirect: 'error'
        });

        if (!Response.ok)
            throw Error(Response.statusText);

        FileInput.value = await Response.text();
        FilenameInput.value = File.name;

        Icon.classList.replace('fa-spinner', 'fa-check');
        Label.classList.add('done');
    } catch (Err) {
        console.log(Err);

        Icon.classList.replace('fa-spinner', 'fa-times');
        this.addEventListener('change', Upload, { once: true });
        this.removeEventListener('click', PreventDefault);
    } finally {
        Icon.classList.remove('fa-spin');
    }
}

function Expand() {
    const For = this.getAttribute('data-for');
    const Next = this.getAttribute('data-next');

    // Check if we need to add an offset
    if (For == 'exoterikou' &&
        document.querySelector(`div[data-is="sira"][data-n="${Next}"]`).style.display == 'none')
        document.getElementById(`exoterikou${Next}year`).parentElement.classList.add('offset-md-6');
    // Or remove an offset
    else if (For == 'sira')
        document.getElementById(`exoterikou${Next}year`).parentElement.classList.remove('offset-md-6');

    for (const Div of document.querySelectorAll(`div[data-is="${For}"][data-n="${Next}"]`))
        Div.style.removeProperty('display');

    this.addEventListener('transitionend', () => this.remove());
    this.classList.add('fade-out');
}

document.addEventListener('DOMContentLoaded', () => {
    for (const Select of document.getElementsByTagName('select'))
        Select.selectedIndex = -1;

    document.getElementById('oikogeniaki').addEventListener('change', (event) => {
        if (event.target.value === '0') {
            Enable('sizigos');
            Enable('monadasizigou');
        } else {
            Disable('sizigos');
            Disable('monadasizigou');
        }
    });

    document.getElementById('proelevsi').addEventListener('change', (event) => {
        if (event.target.value === '1')
            Enable('imerominia');
        else
            Disable('imerominia');
    });

    document.getElementById('katigoria').addEventListener('change', FilterRanks);

    document.getElementById('arithmosteknon').addEventListener('change', GenerateAgeFields);

    document.getElementById('browse1').addEventListener('change', Upload, { once: true });
    document.getElementById('browse2').addEventListener('change', Upload, { once: true });

    for (const Button of document.querySelectorAll('button[data-for][data-next]'))
        Button.addEventListener('click', Expand, { once: true });
});
