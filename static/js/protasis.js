document.addEventListener('DOMContentLoaded', () => {
    for (const Select of document.getElementsByTagName('select'))
        Select.selectedIndex = -1;
});
