import { BCM_CONFIG } from "./config.js";

const today = new Date();
const currentDay = today.getDay();
let daysToSubtract = (currentDay - 2 + 7) % 7;
if (daysToSubtract === 0) {
  daysToSubtract = 7;
}
const lastTuesday = new Date(today);
lastTuesday.setDate(today.getDate() - daysToSubtract);
const yyyy = lastTuesday.getFullYear();
const mm = String(lastTuesday.getMonth() + 1).padStart(2, "0");
const dd = String(lastTuesday.getDate()).padStart(2, "0");
const DATE = `${yyyy}-${mm}-${dd}`;

const PROMPT = document.querySelector(".page-layout_prompt");
const SELECTED = document.querySelector(".page-layout_selected");
const CARDS = document.querySelector(".page-layout_cards");
const STATUS = document.querySelector(".page-layout_status");
const FOOTER = document.querySelector(".page-layout_footer");

function resolveApiBase() {
  const configured = String(BCM_CONFIG?.apiBaseUrl || "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return "/api/v1/bcm";
}

const API_BASE = resolveApiBase();
const SiteStatus = {
  CLASSES: 0,
  TIMES: 1,
  MEMBERS: 2,
};

let state = SiteStatus.CLASSES;
let search = "";
let selectedClass = null;
let selectedTime = "";
let selectedMembers = [];
let classPeople = [];

const SESSIONS = [{ time: "7:30" }, { time: "9:30" }];

async function getReq(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

const CLASSES = await getReq(`${API_BASE}/classes`);

function personLabel(person) {
  if (person.firstName && person.lastName) {
    return `${person.firstName} ${person.lastName}`;
  }
  return person.name || "";
}

function setStatus(message, isError = false) {
  STATUS.textContent = message || "";
  STATUS.classList.toggle("is-error", Boolean(isError));
}

function renderPrompt(top, bottom, { showSearch = true, showSubmit = false } = {}) {
  PROMPT.replaceChildren();

  const bigPrompt = document.createElement("h1");
  const smallPrompt = document.createElement("h2");
  bigPrompt.textContent = top;
  smallPrompt.textContent = bottom;
  PROMPT.append(bigPrompt, smallPrompt);

  if (showSubmit) {
    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.className = "submit_button";
    submitButton.textContent = "CHECK IN";
    submitButton.disabled = selectedMembers.length === 0;
    submitButton.addEventListener("click", submitAttendance);
    PROMPT.appendChild(submitButton);
  }

  if (showSearch) {
    const searchBar = document.createElement("input");
    searchBar.type = "search";
    searchBar.value = search;
    searchBar.placeholder =
      state === SiteStatus.CLASSES
        ? "Type a class name"
        : "Type a first or last name";
    searchBar.setAttribute("aria-label", "Filter list");
    PROMPT.appendChild(searchBar);
  }
}

function createCard({ title, subtitle = "", selected = false, dataset = {} }) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `person-card${selected ? " is-selected" : ""}`;
  Object.entries(dataset).forEach(([key, value]) => {
    card.dataset[key] = value;
  });

  const titleEl = document.createElement("span");
  titleEl.className = "person-card_name";
  titleEl.textContent = title;
  card.appendChild(titleEl);

  if (subtitle) {
    const subtitleEl = document.createElement("span");
    subtitleEl.className = "person-card_meta";
    subtitleEl.textContent = subtitle;
    card.appendChild(subtitleEl);
  }

  return card;
}

function renderSelected() {
  SELECTED.replaceChildren();
  if (selectedMembers.length === 0) {
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = `Checking in (${selectedMembers.length})`;
  SELECTED.appendChild(heading);

  const list = document.createElement("div");
  list.className = "person-card-grid person-card-grid--selected";

  selectedMembers.forEach((member) => {
    const card = createCard({
      title: personLabel(member),
      subtitle: "Tap to remove",
      selected: true,
      dataset: { personId: member.id, action: "remove" },
    });
    list.appendChild(card);
  });

  SELECTED.appendChild(list);
}

function renderCards() {
  CARDS.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "person-card-grid";
  const normalizedSearch = search.trim().toLowerCase();

  if (state === SiteStatus.CLASSES) {
    CLASSES.filter((klass) =>
      klass.name.toLowerCase().includes(normalizedSearch)
    ).forEach((klass) => {
      const leaders = (klass.leaders || []).slice(0, 2).join(", ");
      grid.appendChild(
        createCard({
          title: klass.name,
          subtitle: leaders ? `Leaders: ${leaders}` : "BCM class",
          dataset: { classId: klass.id, action: "select-class" },
        })
      );
    });
  } else if (state === SiteStatus.TIMES) {
    SESSIONS.forEach((session) => {
      grid.appendChild(
        createCard({
          title: session.time,
          subtitle: "Meeting time",
          dataset: { time: session.time, action: "select-time" },
        })
      );
    });
  } else if (state === SiteStatus.MEMBERS) {
    classPeople
      .filter((person) => {
        const label = personLabel(person).toLowerCase();
        const first = (person.firstName || "").toLowerCase();
        const last = (person.lastName || "").toLowerCase();
        return (
          label.includes(normalizedSearch) ||
          first.includes(normalizedSearch) ||
          last.includes(normalizedSearch)
        );
      })
      .forEach((person) => {
        const alreadySelected = selectedMembers.some(
          (member) => member.id === person.id
        );
        if (alreadySelected) {
          return;
        }
        grid.appendChild(
          createCard({
            title: personLabel(person),
            subtitle: `${person.firstName} · ${person.lastName}`,
            dataset: { personId: person.id, action: "select-person" },
          })
        );
      });
  }

  CARDS.appendChild(grid);
}

async function loadClassPeople(classId) {
  const payload = await getReq(`${API_BASE}/classes/${classId}/people`);
  classPeople = payload.people || [];
}

async function changeState(newState = state) {
  state = newState;
  search = "";
  setStatus("");

  switch (state) {
    case SiteStatus.CLASSES:
      selectedClass = null;
      selectedTime = "";
      selectedMembers = [];
      classPeople = [];
      renderPrompt("Select Your Class", "Start typing a class name");
      renderSelected();
      renderCards();
      break;
    case SiteStatus.TIMES:
      renderPrompt("Select Your Time", "Choose a session", {
        showSearch: false,
      });
      renderSelected();
      renderCards();
      break;
    case SiteStatus.MEMBERS:
      renderPrompt("Select Attendees", "Tap a name card to check in", {
        showSubmit: true,
      });
      renderSelected();
      renderCards();
      break;
    default:
      changeState(SiteStatus.CLASSES);
  }
}

async function submitAttendance() {
  if (!selectedClass || selectedMembers.length === 0) {
    setStatus("Select at least one registered person.", true);
    return;
  }

  setStatus("Saving attendance…");

  try {
    const response = await fetch(`${API_BASE}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: DATE,
        classId: selectedClass.id,
        class_name: selectedClass.name,
        group_name: selectedClass.name,
        time: selectedTime,
        peopleIds: selectedMembers.map((member) => member.id),
        names: selectedMembers.map((member) => personLabel(member)),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to record attendance");
    }

    setStatus(
      `Checked in ${data.record.attendees.length} for ${selectedClass.name} (${selectedTime || "no time"}).`
    );
    selectedMembers = [];
    renderSelected();
    renderPrompt("Select Attendees", "Tap a name card to check in", {
      showSubmit: true,
    });
    renderCards();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Check-in failed.", true);
  }
}

PROMPT.addEventListener("input", (event) => {
  const searchBar = event.target.closest("input");
  if (!searchBar) {
    return;
  }
  search = searchBar.value;
  renderCards();
});

function handleCardClick(event) {
  const card = event.target.closest(".person-card");
  if (!card) {
    return;
  }

  const { action, classId, time, personId } = card.dataset;

  if (action === "select-class") {
    selectedClass = CLASSES.find((klass) => klass.id === classId) || null;
    if (!selectedClass) {
      setStatus("Class not found.", true);
      return;
    }
    changeState(SiteStatus.TIMES);
    return;
  }

  if (action === "select-time") {
    selectedTime = time;
    loadClassPeople(selectedClass.id)
      .then(() => changeState(SiteStatus.MEMBERS))
      .catch((error) => {
        console.error(error);
        setStatus("Could not load registered people for this class.", true);
      });
    return;
  }

  if (action === "select-person") {
    const person = classPeople.find((item) => item.id === personId);
    if (!person) {
      return;
    }
    if (!selectedMembers.some((member) => member.id === person.id)) {
      selectedMembers.push(person);
    }
    renderPrompt("Select Attendees", "Tap a name card to check in", {
      showSubmit: true,
    });
    renderSelected();
    renderCards();
    return;
  }

  if (action === "remove") {
    selectedMembers = selectedMembers.filter((member) => member.id !== personId);
    renderPrompt("Select Attendees", "Tap a name card to check in", {
      showSubmit: true,
    });
    renderSelected();
    renderCards();
  }
}

CARDS.addEventListener("click", handleCardClick);
SELECTED.addEventListener("click", handleCardClick);

FOOTER.addEventListener("click", (event) => {
  if (!event.target.closest(".back_button")) {
    return;
  }
  changeState(SiteStatus.CLASSES);
});

try {
  await changeState(SiteStatus.CLASSES);
} catch (error) {
  console.error(error);
  setStatus("Unable to load BCM classes. Is the API running?", true);
}
