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

async function Upload(event) {
    event.target.removeEventListener('change', Upload);
    event.target.addEventListener('click', e => e.preventDefault());

    const Id = event.target.id.substr(-1);
    const File = event.target.files[0];
    const Spinner = document.querySelector(`svg.fa-spinner[for="browse${Id}"]`);
    const Check = document.querySelector(`svg.fa-check[for="browse${Id}"]`);
    const Times = document.querySelector(`svg.fa-times[for="browse${Id}"]`);
    const Label = document.querySelector(`label.custom-file-label[for="browse${Id}"]`);
    const FileInput = document.getElementById(`file${Id}`);
    const FilenameInput = document.getElementById(`filename${Id}`);

    Check.style.display = 'none';
    Times.style.display = 'none';

    try {
        if (File.size > 10 * 1024 * 1024)
            throw Error('File too large');

        const Data = new FormData();
        Data.append('file', File);

        Label.textContent = File.name;
        Spinner.style.removeProperty('display');

        const Response = await fetch('/api/upload', {
            method: 'POST',
            body: Data,
            mode: 'same-origin',
            credentials: 'same-origin',
            redirect: 'error'
        });

        FileInput.value = await Response.text();
        FilenameInput.value = File.name;

        Check.style.removeProperty('display');
        Label.classList.add('done');
    } catch (Err) {
        console.log(Err);

        Times.style.removeProperty('display');
        event.target.addEventListener('change', Upload);
    } finally {
        Spinner.style.display = 'none';
    }
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

    document.getElementById('browse1').addEventListener('change', Upload);
    document.getElementById('browse2').addEventListener('change', Upload);
});
