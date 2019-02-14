const Now = new Date();
Now.setDate(1);
const Today = new Date();

const Months = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος']

function GetFirstDay(date) {
    const Day = date.getDay();

    // Sunday is 0, but we want Monday to be 0
    return Day == 0 ? 6 : Day - 1;
}

function GetDaysInMonth(date) {
    const Temp = new Date(date.valueOf());
    Temp.setDate(32);

    /*
    * By setting the date to 32, the month overflows
    * so the next call to getDate() returns the date
    * of the next month. The value of this date depends
    * on the number of days in the previous month, e.g.
    * if this month is February (28 days) then the value
    * returned will be 4, i.e. 32 - 28 = 4.
    */
    return 32 - Temp.getDate();
}

function GenerateCalendar(Now) {
    const Year = Now.getFullYear();
    const Month = Now.getMonth();
    const Day = SameMonth(Now, Today) ? Today.getDate() : undefined;

    const Header = document.getElementById('calendar-month');
    const Body = document.querySelector('tbody');

    Header.textContent = `${Months[Month]} ${Year}`;

    const DaysInMonth = GetDaysInMonth(Now);
    const FirstDay = GetFirstDay(Now) - 1;

    for (let i = 0; i < 6; ++i) {
        const Row = document.createElement('tr');

        for (let j = 0; j < 7; ++j) {
            const CurrentDay = i * 7 + j - FirstDay;
            const Cell = document.createElement('td');

            let Content = '\xa0';
            if (CurrentDay > 0 && CurrentDay <= DaysInMonth)
                Content = i * 7 + j - FirstDay;

            const Data = document.createTextNode(Content);
            Cell.appendChild(Data);

            if (CurrentDay == Day)
                Cell.classList.add('today');

            Row.appendChild(Cell);
        }

        Body.appendChild(Row);
    }
}

function Clear() {
    const Body = document.querySelector('tbody');

    while (Body.hasChildNodes())
        Body.removeChild(Body.lastChild);
}

function ChangeMonth(Direction, e) {
    e.preventDefault();

    Clear();

    Now.setMonth(Now.getMonth() + Direction);
    GenerateCalendar(Now);
}

function SameMonth(a, b) {
    return a.getUTCFullYear() == b.getUTCFullYear()
        && a.getUTCMonth() == b.getUTCMonth();
}

document.addEventListener('DOMContentLoaded', () => {
    GenerateCalendar(Now);

    document.getElementById('cal-left').addEventListener('click', ChangeMonth.bind(this, -1));
    document.getElementById('cal-right').addEventListener('click', ChangeMonth.bind(this, 1));
});
