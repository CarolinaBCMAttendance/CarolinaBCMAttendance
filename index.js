// Classes/sections.
const today = new Date();
const currentDay = today.getDay();
let daysToSubtract = (currentDay - 2 + 7) % 7;
if (daysToSubtract === 0) {
    daysToSubtract = 7;
}
const lastTuesday = new Date(today);
lastTuesday.setDate(today.getDate() - daysToSubtract);
const yyyy = lastTuesday.getFullYear();
const mm = String(lastTuesday.getMonth() + 1).padStart(2, '0');
const dd = String(lastTuesday.getDate()).padStart(2, '0');
const DATE = `${yyyy}-${mm}-${dd}`;
const PROMPT_CLASS = document.querySelector(".page-layout_prompt");
const SUBMIT_BUTTON = document.querySelector(".submit_button");
const MEMBERS_CLASS = document.querySelector(".page-layout_members");
const TABLE_CLASS = document.querySelector(".page-layout_table");
const FOOTER_CLASS = document.querySelector(".page-layout_footer");
// Like an enum to represent each state.
const SiteStatus = {
    GROUPS: 0,
    TIMES: 1,
    MEMBERS: 2,
};
// Global state of site variable.
let state  = SiteStatus.GROUPS;
// Global user search parameter.
let search = "";
// Input variables.
let selected_group = "";
let selected_time  = "";
let selected_members = [];
const DOMAIN = 'http://99.138.66.35:3001/api/v1/bcm';
const RECORD_URL = `${DOMAIN}/record`;
const STUDENT_URL = `${DOMAIN}/`;
const GROUP_URL = `${DOMAIN}/groups`;
async function getReq(url) {
    const options = {method: 'GET'};
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

// Assign table values.
const GROUPS = await getReq(GROUP_URL);
const PEOPLE = await getReq(STUDENT_URL);
const SESSIONS = [
    { time: "7:30" },
    { time: "9:30" },
];
// Clears the screen.
function revert(just_table = false) {
    if (!just_table) {
        PROMPT_CLASS.replaceChildren();
    }
    TABLE_CLASS.replaceChildren();
}
// Renders the prompt for the user.
function renderPrompt(top, bottom) {
    const big_prompt   = document.createElement("h1");
    const small_prompt = document.createElement("h2");
    big_prompt.textContent   = top;
    small_prompt.textContent = bottom;
    PROMPT_CLASS.append(big_prompt, small_prompt);
    const searchBar = document.createElement("input");
    searchBar.type  = "text";
    searchBar.value = search;
    switch(state) {
    case SiteStatus.GROUPS:
        searchBar.placeholder =
            "Type a group leaders' name";
        SUBMIT_BUTTON.style.display = "none";
        break;
    case SiteStatus.MEMBERS:
        SUBMIT_BUTTON.style.display = "";
        searchBar.placeholder = "Type a member's name";
        break;
    default:
        searchBar.placeholder = "";
    }
    PROMPT_CLASS.appendChild(SUBMIT_BUTTON);
    // Hide search bar on the time-selection screen.
    if (state !== SiteStatus.TIMES) {
        PROMPT_CLASS.appendChild(searchBar);
    }
}
// Gets the visible label for a row.
function getRowText(row) {
    if (typeof row.name !== "undefined") {
        return row.name;
    }
    if (typeof row.time !== "undefined") {
        return row.time;
    }
    return "";
}
// Renders the table with filtering.
function renderTable() {
    let ROWS = [];
    switch (state) {
    case SiteStatus.GROUPS:
        ROWS = GROUPS;
        break;
    case SiteStatus.TIMES:
        ROWS = SESSIONS;
        break;
    case SiteStatus.MEMBERS:
        ROWS = PEOPLE;
        break;
    default:
        ROWS = [];
        break;
    }
    const tableBody = document.createElement("tbody");
    const normalizedSearch = search.trim().toLowerCase();
    ROWS
        .filter((row) => {
            if (state === SiteStatus.TIMES) {
                return true;
            }
            const rowText = getRowText(row).toLowerCase();
            return rowText.includes(normalizedSearch);
        })
        .forEach((row) => {
            const tr   =
                  document.createElement("tr");
            const cell =
                  document.createElement("th");
            cell.textContent = getRowText(row);
            tr.appendChild(cell);
            tableBody.appendChild(tr);
        });
    TABLE_CLASS.appendChild(tableBody);
}

function renderMembers() {
    MEMBERS_CLASS.replaceChildren();
    const tableBody = document.createElement("tbody");
    selected_members.forEach((row) => {
        const tr = document.createElement("tr");
        const cell = document.createElement("th");
        cell.style = "background: green;";
        cell.textContent = row;
        tr.appendChild(cell);
        tableBody.appendChild(tr);
    });

    MEMBERS_CLASS.appendChild(tableBody);
}

// Render site again.
function changeState(newState = state) {
    state  = newState;
    search = "";
    revert();
    switch (state) {
    case SiteStatus.GROUPS:
        renderPrompt(
            "Select Your Group",
            "Start typing"
        );
        renderTable();
        
        break;
    case SiteStatus.TIMES:
        renderPrompt(
            "Select Your Time",
            "Choose a session"
        );
        renderTable();
        break;
    case SiteStatus.MEMBERS:
        renderPrompt(
            "Select Your Group Members",
            "Search below"
        );
        renderTable();
        break;
    default:
        changeState(SiteStatus.GROUPS);
        break;
    }
}
// Initial render.
changeState();
// Event listening.
PROMPT_CLASS.addEventListener("input", (event) => {
    const searchBar = event.target.closest("input");
    if (!searchBar) {
        return;
    }
    search = searchBar.value;
    revert(true);
    renderTable();
});

TABLE_CLASS.addEventListener("click", (event) => {
    const cell = event.target.closest("th");
    if (!cell) return;

    const value = cell.textContent;

    switch (state) {
    case SiteStatus.GROUPS:
        selected_group = value;
        changeState(SiteStatus.TIMES);
        break;

    case SiteStatus.TIMES:
        selected_time = value;
        changeState(SiteStatus.MEMBERS);
        break;

    case SiteStatus.MEMBERS:
        selected_members.push(value);
        renderMembers();
        break;
    }
});

MEMBERS_CLASS.addEventListener("click", (event) => {
    const cell = event.target.closest("th");
    if (!cell) return;
    const value = cell.textContent;
    selected_members = selected_members
        .filter((member) => member !== value);
    renderMembers();
});

SUBMIT_BUTTON.addEventListener("click", async () => {
    const names = selected_members.join(",");
    console.log(DATE);
    console.log(selected_group);
    console.log(names);
    console.log();
    const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
        date: DATE,
        group_name: selected_group,
        names: names
        })
    }
    try {
        const response = await fetch(RECORD_URL, options);
        const data = await response;
        console.log(data);
    } catch (error) {
        console.error(error);
    }
    // location.reload();
});

FOOTER_CLASS.addEventListener("click", () => {
    selected_group = "";
    selected_time = "";
    selected_members = [];
    changeState(SiteStatus.GROUPS);
});
