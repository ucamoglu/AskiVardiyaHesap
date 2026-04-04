const STORAGE_KEY = "vardiya_format_v4";
const DEFAULT_PERSONNEL = [
  { id: "p1", gender: "E", name: "Erhan İNCEGÜNEŞ", type: "gececi", leaveMode: "none" },
  { id: "p2", gender: "K", name: "Deniz ÇELİK", type: "sef", leaveMode: "none" },
  { id: "p3", gender: "E", name: "Atilla GİRGİN", type: "normal", leaveMode: "telafi" },
  { id: "p4", gender: "K", name: "Canel DUMLUPINAR", type: "normal", leaveMode: "telafi" },
  { id: "p5", gender: "K", name: "Cevriye UYGURLU", type: "normal", leaveMode: "telafi" },
  { id: "p6", gender: "K", name: "Dilara ERTEK", type: "normal", leaveMode: "telafi" },
  { id: "p7", gender: "K", name: "Funda CANTİMUR", type: "normal", leaveMode: "telafi" },
  { id: "p8", gender: "K", name: "Nurten AKTAR", type: "normal", leaveMode: "telafi" },
  { id: "p9", gender: "E", name: "Uğur SAYAN", type: "normal", leaveMode: "telafi" },
  { id: "p10", gender: "K", name: "Raziye DALKIRAN", type: "normal", leaveMode: "telafi" },
  { id: "p11", gender: "K", name: "Habibe SARIKAYA", type: "normal", leaveMode: "weekend_only" },
  { id: "p12", gender: "K", name: "Beyhan ÇELİK", type: "normal", leaveMode: "weekend_only" },
  { id: "p13", gender: "E", name: "Mehmet BALCI", type: "yedek_gececi", leaveMode: "weekend_only" },
  { id: "p14", gender: "E", name: "Mehmet ÜNLÜ", type: "normal", leaveMode: "weekend_only" },
  { id: "p15", gender: "E", name: "Serkan ÇİTE", type: "normal", leaveMode: "weekend_only" },
  { id: "p16", gender: "K", name: "Tuğba KARACA", type: "normal", leaveMode: "weekend_only" }
];

const DEFAULT_PERSONNEL_BY_ID = Object.fromEntries(DEFAULT_PERSONNEL.map((person) => [person.id, person]));

const yearEl = document.getElementById("year");
const monthEl = document.getElementById("month");
const yearDownBtn = document.getElementById("yearDown");
const yearUpBtn = document.getElementById("yearUp");
const monthDownBtn = document.getElementById("monthDown");
const monthUpBtn = document.getElementById("monthUp");
const leaveModeFilterEl = document.getElementById("leaveModeFilter");
const calendarEl = document.getElementById("calendar");
const statsEl = document.getElementById("stats");
const warningsEl = document.getElementById("warnings");
const personHoursEl = document.getElementById("personHours");
const genderEl = document.getElementById("gender");
const fullNameEl = document.getElementById("fullName");
const personTypeEl = document.getElementById("personType");
const leaveModeEl = document.getElementById("leaveMode");
const savePersonBtn = document.getElementById("savePersonBtn");
const personTableBody = document.getElementById("personTableBody");
const personToggleBtn = document.getElementById("personToggleBtn");
const personSectionBody = document.getElementById("personSectionBody");
const rulesToggleBtn = document.getElementById("rulesToggleBtn");
const rulesSectionBody = document.getElementById("rulesSectionBody");
const exportBtn = document.getElementById("exportBtn");
const pdfBtn = document.getElementById("pdfBtn");
const exportTable = document.getElementById("exportTable");
const exportTableBody = document.getElementById("exportTableBody");
const screenTitleEl = document.getElementById("screenTitle");
const printTitleEl = document.getElementById("printTitle");
const printPersonHoursEl = document.getElementById("printPersonHours");
const printCalendarBodyEl = document.getElementById("printCalendarBody");
const focusBarEl = document.getElementById("focusBar");
const focusTextEl = document.getElementById("focusText");
const clearFocusBtn = document.getElementById("clearFocusBtn");

let state = { year: 0, month: 0, personnel: [] };
let editingId = null;
let selectedPersonName = null;

function getDefaultState() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    personnel: DEFAULT_PERSONNEL.slice()
  };
}

const LEAVE_MODE_RULES = {
  telafi: {
    label: "Donusum + 2 Telafi",
    equalizeNormal: true
  },
  weekend_only: {
    label: "2 Haftada 1 Hafta Sonu",
    equalizeNormal: true
  },
  none: {
    label: "Izin Kullanma",
    equalizeNormal: false
  }
};

const PERSON_TYPE_LABELS = {
  normal: "Normal",
  sef: "Sef",
  gececi: "Gececi",
  yedek_gececi: "Yedek Gececi"
};

const PLAN_REFERENCE_START = new Date(2026, 2, 1);
PLAN_REFERENCE_START.setHours(0, 0, 0, 0);
const TELAFI_REFERENCE_WEEK_START = new Date(2026, 2, 30);
TELAFI_REFERENCE_WEEK_START.setHours(0, 0, 0, 0);

function monthDayCount(y, m) {
  return new Date(y, m, 0).getDate();
}

function sanitizeYearMonth(yearValue, monthValue) {
  const now = new Date();
  const yy = Number(yearValue);
  const mm = Number(monthValue);
  const year = Number.isFinite(yy) && yy >= 2020 && yy <= 2100 ? yy : now.getFullYear();
  const month = Number.isFinite(mm) && mm >= 1 && mm <= 12 ? mm : now.getMonth() + 1;
  return { year, month };
}

function mondayFirstIndex(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function startOfWeek(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  weekStart.setDate(weekStart.getDate() - mondayFirstIndex(weekStart));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function formatLocalDateKey(date) {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isSameMonth(date, year, month) {
  return date.getFullYear() === year && (date.getMonth() + 1) === month;
}

function getPlanningRange(year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, monthDayCount(year, month));
  const planningStart = monthStart < PLAN_REFERENCE_START
    ? new Date(monthStart)
    : new Date(PLAN_REFERENCE_START);
  planningStart.setHours(0, 0, 0, 0);
  monthEnd.setHours(0, 0, 0, 0);
  return { planningStart, monthEnd };
}

function getWeekKey(date) {
  return formatLocalDateKey(startOfWeek(date));
}

function getWeekSerial(date) {
  return Math.floor(startOfWeek(date).getTime() / (7 * 24 * 60 * 60 * 1000));
}

function getDaySerial(date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / (24 * 60 * 60 * 1000));
}

function getStableOrderValue(person) {
  if (!person?.id) return Number.MAX_SAFE_INTEGER;
  const simpleIdMatch = /^p(\d+)$/.exec(person.id);
  if (simpleIdMatch) return Number(simpleIdMatch[1]);
  const generatedIdMatch = /^p_(\d+)_\d+$/.exec(person.id);
  if (generatedIdMatch) return Number(generatedIdMatch[1]);
  return Number.MAX_SAFE_INTEGER;
}

function getStableSortedPersonnel(personnel) {
  return personnel.slice().sort((left, right) => {
    const leftOrder = getStableOrderValue(left);
    const rightOrder = getStableOrderValue(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name, "tr");
  });
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function labelForLeaveMode(mode) {
  return (LEAVE_MODE_RULES[mode] || LEAVE_MODE_RULES.telafi).label;
}

function labelForPersonType(type) {
  return PERSON_TYPE_LABELS[type] || type;
}

function shouldReplaceStoredName(currentName, defaultName) {
  if (!currentName) return true;
  if (currentName === defaultName) return false;
  const normalizedCurrent = currentName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedDefault = defaultName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const currentParts = normalizedCurrent.split(/\s+/).filter(Boolean);
  const defaultParts = normalizedDefault.split(/\s+/).filter(Boolean);
  if (currentParts.length >= defaultParts.length) return false;
  return defaultParts.slice(0, currentParts.length).join(" ") === currentParts.join(" ");
}

function saveState() {
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  state.year = safe.year;
  state.month = safe.month;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state = getDefaultState();
  } else {
    try {
      const parsed = JSON.parse(raw);
      const safe = sanitizeYearMonth(parsed.year, parsed.month);
      const personnel = Array.isArray(parsed.personnel) && parsed.personnel.length
        ? parsed.personnel
        : DEFAULT_PERSONNEL.slice();
      state = {
        year: safe.year,
        month: safe.month,
        personnel: personnel.map((person) => ({
          ...person,
          name: shouldReplaceStoredName(person.name, DEFAULT_PERSONNEL_BY_ID[person.id]?.name || person.name)
            ? (DEFAULT_PERSONNEL_BY_ID[person.id]?.name || person.name)
            : person.name,
          leaveMode: person.id === "p11"
            ? "weekend_only"
            : (person.leaveMode || "telafi")
        }))
      };
    } catch (err) {
      state = getDefaultState();
    }
  }
  if (yearEl) yearEl.value = String(state.year);
  if (monthEl) monthEl.value = String(state.month);
  if (leaveModeFilterEl && !leaveModeFilterEl.value) leaveModeFilterEl.value = "all";
}

function findById(id) {
  return state.personnel.find((p) => p.id === id);
}

function renderPersonnelTable() {
  if (!personTableBody) return;
  personTableBody.innerHTML = state.personnel.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.gender === "E" ? "Erkek" : "Kadin"}</td>
      <td>${p.name}</td>
      <td>
        <button class="mini-btn mini-edit" type="button" data-edit="${p.id}">Duzenle</button>
        <button class="mini-btn mini-del" type="button" data-del="${p.id}">Sil</button>
      </td>
    </tr>
  `).join("");

  personTableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const person = findById(btn.getAttribute("data-edit"));
      if (!person) return;
      editingId = person.id;
      genderEl.value = person.gender;
      fullNameEl.value = person.name;
      personTypeEl.value = person.type;
      leaveModeEl.value = person.leaveMode || "telafi";
    });
  });

  personTableBody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      state.personnel = state.personnel.filter((p) => p.id !== id);
      if (editingId === id) editingId = null;
      saveState();
      renderAll();
    });
  });
}

function upsertPerson() {
  const name = normalizeName(fullNameEl.value);
  const gender = genderEl.value;
  const type = personTypeEl.value;
  const leaveMode = leaveModeEl.value;
  if (!name) return;

  const duplicate = state.personnel.find((p) =>
    p.name.toLowerCase() === name.toLowerCase() && p.id !== editingId
  );
  if (duplicate) return;

  if (editingId) {
    const person = findById(editingId);
    if (person) {
      person.name = name;
      person.gender = gender;
      person.type = type;
      person.leaveMode = leaveMode;
    }
  } else {
    state.personnel.push({
      id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name,
      gender,
      type,
      leaveMode
    });
  }

  editingId = null;
  fullNameEl.value = "";
  genderEl.value = "E";
  personTypeEl.value = "normal";
  leaveModeEl.value = "telafi";
  saveState();
  renderAll();
}

function dayNameTr(day) {
  const names = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return names[day] || "";
}

function monthNameTr(month) {
  const names = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık"
  ];
  return names[month - 1] || "";
}

function buildInstitutionTitleHtml(year, month) {
  return [
    "AYDIN BÜYÜKŞEHİR BELEDİYESİ",
    "SU VE KANALİZASYON İDARESİ GENEL MÜDÜRLÜĞÜ",
    "BİLGİ İŞLEM DAİRESİ BAŞKANLIĞI",
    'ÇAĞRI MERKEZİ <span class="title-period print-title-period">' + monthNameTr(month).toLocaleUpperCase("tr-TR") + " " + year + "</span> DÖNEMİ VARDİYA ÇİZELGESİ"
  ].join("<br>");
}

function getOfficialHolidayLabel(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const fixedHolidays = {
    [`${y}-01-01`]: "Yılbaşı",
    [`${y}-04-23`]: "23 Nisan",
    [`${y}-05-01`]: "1 Mayıs",
    [`${y}-05-19`]: "19 Mayıs",
    [`${y}-07-15`]: "15 Temmuz",
    [`${y}-08-30`]: "30 Ağustos",
    [`${y}-10-28`]: "29 Ekim Arifesi",
    [`${y}-10-29`]: "29 Ekim"
  };

  if (fixedHolidays[key]) return fixedHolidays[key];

  const movable2026 = {
    "2026-03-19": "Ramazan Arifesi",
    "2026-03-20": "Ramazan Bayramı",
    "2026-03-21": "Ramazan Bayramı",
    "2026-03-22": "Ramazan Bayramı",
    "2026-05-26": "Kurban Arifesi",
    "2026-05-27": "Kurban Bayramı",
    "2026-05-28": "Kurban Bayramı",
    "2026-05-29": "Kurban Bayramı",
    "2026-05-30": "Kurban Bayramı"
  };

  return movable2026[key] || "";
}

function buildNightPlan(startDate, endDate, gececiName, yedekName) {
  const cAssignments = {};
  const forcedOff = {};
  const yedekNightDates = [];
  if (!gececiName) return { cAssignments, forcedOff, yedekNightDates };

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const cyclePosition = ((getDaySerial(date) % 8) + 8) % 8;
    const isNightOff = cyclePosition === 6 || cyclePosition === 7;
    const dateKey = formatLocalDateKey(date);

    if (isNightOff) {
      cAssignments[dateKey] = yedekName || "Eksik";
      if (yedekName) yedekNightDates.push(dateKey);
      forcedOff[dateKey] = forcedOff[dateKey] || [];
      forcedOff[dateKey].push(gececiName);
    } else {
      cAssignments[dateKey] = gececiName;
    }
  }

  return { cAssignments, forcedOff, yedekNightDates };
}

function addOffDay(targetMap, date, name) {
  const dateKey = typeof date === "string" ? date : formatLocalDateKey(date);
  targetMap[dateKey] = targetMap[dateKey] || [];
  if (!targetMap[dateKey].includes(name)) targetMap[dateKey].push(name);
}

function removeOffDay(targetMap, date, name) {
  const dateKey = typeof date === "string" ? date : formatLocalDateKey(date);
  if (!targetMap[dateKey]) return;
  targetMap[dateKey] = targetMap[dateKey].filter((item) => item !== name);
  if (!targetMap[dateKey].length) delete targetMap[dateKey];
}

function hasOffDay(targetMap, date, name) {
  const dateKey = typeof date === "string" ? date : formatLocalDateKey(date);
  return (targetMap[dateKey] || []).includes(name);
}

function findNextAvailableExtraOffDate(startDate, endDate, yedekName, cAssignments, weekendOff, extraOff) {
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateKey = formatLocalDateKey(date);
    if (cAssignments[dateKey] === yedekName) continue;
    if (hasOffDay(weekendOff, dateKey, yedekName)) continue;
    if (hasOffDay(extraOff, dateKey, yedekName)) continue;
    return new Date(date);
  }
  return null;
}

function buildYedekGececiExtraOff(startDate, endDate, yedekName, cAssignments, weekendOff) {
  const extraOff = {};
  if (!yedekName) return extraOff;

  let pendingNightCount = 0;

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateKey = formatLocalDateKey(date);
    const workedNight = cAssignments[dateKey] === yedekName;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const lostPlannedWeekendOff = isWeekend && workedNight && hasOffDay(weekendOff, dateKey, yedekName);

    if (lostPlannedWeekendOff) {
      removeOffDay(weekendOff, dateKey, yedekName);
      const shiftedOffDate = findNextAvailableExtraOffDate(
        new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        endDate,
        yedekName,
        cAssignments,
        weekendOff,
        extraOff
      );
      if (shiftedOffDate) addOffDay(extraOff, shiftedOffDate, yedekName);
    }

    if (!workedNight) continue;

    pendingNightCount += 1;
    if (pendingNightCount < 2) continue;

    const rewardDate = findNextAvailableExtraOffDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      endDate,
      yedekName,
      cAssignments,
      weekendOff,
      extraOff
    );
    if (rewardDate) addOffDay(extraOff, rewardDate, yedekName);
    pendingNightCount = 0;
  }

  return extraOff;
}

function getComparableAssignmentGroup(person) {
  const modeRule = person ? LEAVE_MODE_RULES[person.leaveMode] : null;
  if (person?.type === "normal" && modeRule?.equalizeNormal) {
    return `${person.type}:${person.leaveMode}`;
  }
  return null;
}

function buildWeekendSchedules(personnel, startDate, endDate) {
  const weekendOff = {};
  const telafiWeekNeeds = {};

  const eligible = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" || person.type === "yedek_gececi")
  );
  const telafiPeople = eligible.filter((person) => person.leaveMode === "telafi");
  const weekendOnlyPeople = eligible.filter((person) => person.leaveMode === "weekend_only");

  const firstRelevantWeekStart = startOfWeek(PLAN_REFERENCE_START);
  const lastRelevantWeekStart = startOfWeek(endDate);
  const telafiGroupMap = buildTelafiGroupMap(personnel);

  telafiPeople.forEach((person) => {
    const phase = telafiGroupMap[person.name] || 0;
    let blockIndex = 0;
    for (let weekStart = new Date(startOfWeek(TELAFI_REFERENCE_WEEK_START)); weekStart <= lastRelevantWeekStart; weekStart.setDate(weekStart.getDate() + 7), blockIndex += 1) {
      const isWeekendOffWeek = (blockIndex + phase) % 2 === 0;
      const saturday = new Date(weekStart);
      saturday.setDate(saturday.getDate() + 5);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      const weekKey = formatLocalDateKey(weekStart);

      if (isWeekendOffWeek) {
        telafiWeekNeeds[weekKey] = telafiWeekNeeds[weekKey] || {};
        telafiWeekNeeds[weekKey][person.name] = 2;
        if (saturday >= startDate && saturday <= endDate) addOffDay(weekendOff, saturday, person.name);
        if (sunday >= startDate && sunday <= endDate) addOffDay(weekendOff, sunday, person.name);
      }
    }
  });

  weekendOnlyPeople.forEach((person, index) => {
    const phase = index % 2;
    let blockIndex = 0;
    for (let weekStart = new Date(firstRelevantWeekStart); weekStart <= lastRelevantWeekStart; weekStart.setDate(weekStart.getDate() + 7), blockIndex += 1) {
      const weekendOffWeek = (blockIndex % 2) === phase;
      if (!weekendOffWeek) continue;
      const saturday = new Date(weekStart);
      saturday.setDate(saturday.getDate() + 5);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      if (saturday >= startDate && saturday <= endDate) addOffDay(weekendOff, saturday, person.name);
      if (sunday >= startDate && sunday <= endDate) addOffDay(weekendOff, sunday, person.name);
    }
  });

  return { weekendOff, telafiWeekNeeds };
}

function takeFromPool(pool, count, used) {
  const picked = [];
  for (let i = 0; i < pool.length && picked.length < count; i += 1) {
    const name = pool[i];
    if (used.has(name)) continue;
    used.add(name);
    picked.push(name);
  }
  return picked;
}

function appendUnique(list, items) {
  items.forEach((item) => {
    if (!list.includes(item)) list.push(item);
  });
}

function getShiftBounds(isWeekend) {
  return isWeekend
    ? { minA: 3, maxA: null, minB: 3, maxB: null }
    : { minA: 7, maxA: 8, minB: 3, maxB: 7 };
}

function buildTelafiGroupMap(personnel) {
  const telafiPeople = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" && person.leaveMode === "telafi")
  );
  const splitIndex = Math.ceil(telafiPeople.length / 2);
  const groupMap = {};

  telafiPeople.forEach((person, index) => {
    groupMap[person.name] = index < splitIndex ? 0 : 1;
  });

  return groupMap;
}

function buildTelafiSideMap(personnel, startDate, endDate, weekendOff) {
  const telafiPeople = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" && person.leaveMode === "telafi")
  );
  const sideMap = {};
  const telafiGroupMap = buildTelafiGroupMap(personnel);
  const currentSideByPerson = {};

  telafiPeople.forEach((person) => {
    currentSideByPerson[person.name] = (telafiGroupMap[person.name] || 0) === 0 ? "A" : "B";
  });

  for (let weekStart = new Date(startOfWeek(startDate)); weekStart <= endDate; weekStart.setDate(weekStart.getDate() + 7)) {
    const saturday = new Date(weekStart);
    saturday.setDate(saturday.getDate() + 5);
    const sunday = new Date(saturday);
    sunday.setDate(sunday.getDate() + 1);
    const saturdayOff = new Set(weekendOff[formatLocalDateKey(saturday)] || []);
    const sundayOff = new Set(weekendOff[formatLocalDateKey(sunday)] || []);
    const weekKey = formatLocalDateKey(weekStart);

    telafiPeople.forEach((person) => {
      const hasWeekendOff = saturdayOff.has(person.name) || sundayOff.has(person.name);
      sideMap[`${weekKey}|${person.name}`] = currentSideByPerson[person.name] || "A";
      if (hasWeekendOff) {
        currentSideByPerson[person.name] = currentSideByPerson[person.name] === "A" ? "B" : "A";
      }
    });
  }

  return sideMap;
}

function getPreferredSide(person, lastWorkedWeekSide, name, weekKey, weekendOnlySideMap, telafiSideMap) {
  if (!person) return null;
  if (person.type === "sef" || person.type === "yedek_gececi") return "A";
  if (person.type !== "normal") return null;
  if (person.leaveMode === "telafi") {
    return telafiSideMap?.[`${weekKey}|${name}`] || "A";
  }
  if (person.leaveMode === "weekend_only") {
    return weekendOnlySideMap?.[`${weekKey}|${name}`] || "A";
  }
  const weekStart = typeof weekKey === "string" ? new Date(weekKey) : startOfWeek(weekKey);
  const referenceWeekStart = startOfWeek(PLAN_REFERENCE_START);
  const weekSerial = Math.floor((weekStart.getTime() - referenceWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const stableOrder = getStableOrderValue(person);
  return ((weekSerial + stableOrder) % 2 === 0) ? "A" : "B";
}

function matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, side, weekKey, weekendOnlySideMap, telafiSideMap) {
  const preferredSide = getPreferredSide(personnelMap[name], lastWorkedWeekSide, name, weekKey, weekendOnlySideMap, telafiSideMap);
  return !preferredSide || preferredSide === side;
}

function hasStrictWeeklySide(person) {
  return person?.type === "normal" && (person?.leaveMode === "weekend_only" || person?.leaveMode === "telafi");
}

function sortCandidates(names, side, stats, lastWorkedWeekSide, isWeekend, personnelMap, weekKey, weekendOnlySideMap, telafiSideMap) {
  const uniqueNames = Array.from(new Set(names));
  return uniqueNames.sort((left, right) => {
    const leftPerson = personnelMap[left];
    const rightPerson = personnelMap[right];
    const leftPreferredSide = getPreferredSide(leftPerson, lastWorkedWeekSide, left, weekKey, weekendOnlySideMap, telafiSideMap);
    const rightPreferredSide = getPreferredSide(rightPerson, lastWorkedWeekSide, right, weekKey, weekendOnlySideMap, telafiSideMap);
    const leftPreferred = leftPreferredSide ? leftPreferredSide === side : false;
    const rightPreferred = rightPreferredSide ? rightPreferredSide === side : false;
    if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;

    const leftGroup = getComparableAssignmentGroup(leftPerson);
    const rightGroup = getComparableAssignmentGroup(rightPerson);
    if (leftGroup && rightGroup && leftGroup === rightGroup) {
      if (stats[left].work !== stats[right].work) return stats[left].work - stats[right].work;
      if (stats[left].off !== stats[right].off) return stats[right].off - stats[left].off;
    }

    const leftSideCount = side === "A" ? stats[left].a : stats[left].b;
    const rightSideCount = side === "A" ? stats[right].a : stats[right].b;
    if (leftSideCount !== rightSideCount) return leftSideCount - rightSideCount;
    if (stats[left].work !== stats[right].work) return stats[left].work - stats[right].work;
    if (isWeekend && stats[left].weekendWork !== stats[right].weekendWork) {
      return stats[left].weekendWork - stats[right].weekendWork;
    }
    if (stats[left].off !== stats[right].off) return stats[right].off - stats[left].off;
    return left.localeCompare(right, "tr");
  });
}

function pickNextCandidate(candidates, used) {
  for (let i = 0; i < candidates.length; i += 1) {
    const name = candidates[i];
    if (used.has(name)) continue;
    used.add(name);
    return name;
  }
  return null;
}

function pickFallbackCandidate(names, used) {
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    if (used.has(name) || name === "Eksik") continue;
    used.add(name);
    return name;
  }
  return null;
}

function pickCandidateForWeekendBalance(preferredCandidates, fallbackNames, used) {
  const preferred = pickNextCandidate(preferredCandidates, used);
  if (preferred) return preferred;
  return pickFallbackCandidate(fallbackNames, used);
}

function getWeeklySide(weeklySideMap, weekKey, name) {
  return weeklySideMap[`${weekKey}|${name}`] || null;
}

function setWeeklySide(weeklySideMap, weekKey, name, side) {
  if (!name || name === "Eksik") return;
  weeklySideMap[`${weekKey}|${name}`] = side;
}

function getRemainingWeekdaysInWeek(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return 0;
  return 6 - day;
}

function getRemainingTelafiAvailability(currentDate, personName, cAssignments, nightRecoveryOff) {
  let availableDays = 0;
  for (let date = new Date(currentDate); date.getDay() !== 6; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    const dateKey = formatLocalDateKey(date);
    if ((nightRecoveryOff[dateKey] || []).includes(personName)) continue;
    if (cAssignments[dateKey] === personName) continue;
    availableDays += 1;
  }
  return availableDays;
}

function getRemainingTelafiAvailabilityInMonth(currentDate, personName, cAssignments, nightRecoveryOff) {
  let availableDays = 0;
  const targetMonth = currentDate.getMonth();
  for (let date = new Date(currentDate); date.getMonth() === targetMonth; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    const dateKey = formatLocalDateKey(date);
    if ((nightRecoveryOff[dateKey] || []).includes(personName)) continue;
    if (cAssignments[dateKey] === personName) continue;
    availableDays += 1;
  }
  return availableDays;
}

function getWeekdayOffsetFromWeekStart(date) {
  const weekStart = startOfWeek(date);
  return Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
}

function buildTelafiWeekdayPairMap(personnel) {
  const telafiPeople = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" && person.leaveMode === "telafi")
  );
  const pairSlots = [
    [0, 1], // Pazartesi-Sali
    [3, 4]  // Persembe-Cuma
  ];
  const pairMap = {};
  telafiPeople.forEach((person, index) => {
    const groupIndex = Math.floor(index / 2);
    pairMap[person.name] = pairSlots[groupIndex % pairSlots.length];
  });
  return pairMap;
}

function buildWeekendOnlySideMap(personnel, startDate, endDate, weekendOff) {
  const weekendOnlyPeople = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" && person.leaveMode === "weekend_only")
  );
  const sideMap = {};
  const currentSideByPerson = {};

  weekendOnlyPeople.forEach((person, index) => {
    currentSideByPerson[person.name] = index % 2 === 0 ? "A" : "B";
  });

  for (let weekStart = new Date(startOfWeek(startDate)); weekStart <= endDate; weekStart.setDate(weekStart.getDate() + 7)) {
    const saturday = new Date(weekStart);
    saturday.setDate(saturday.getDate() + 5);
    const sunday = new Date(saturday);
    sunday.setDate(sunday.getDate() + 1);
    const saturdayOff = new Set(weekendOff[formatLocalDateKey(saturday)] || []);
    const sundayOff = new Set(weekendOff[formatLocalDateKey(sunday)] || []);
    const weekKey = formatLocalDateKey(weekStart);

    weekendOnlyPeople.forEach((person) => {
      const hasWeekendOff = saturdayOff.has(person.name) || sundayOff.has(person.name);
      sideMap[`${weekKey}|${person.name}`] = currentSideByPerson[person.name] || "A";
      if (hasWeekendOff) {
        currentSideByPerson[person.name] = currentSideByPerson[person.name] === "A" ? "B" : "A";
      }
    });
  }

  return sideMap;
}

function rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, name, side) {
  if (!name || name === "Eksik") return;
  const person = personnelMap[name];
  if (!person || person.type !== "normal") return;
  lastWorkedWeekSide[name] = side;
}

function getPlanSideForPerson(plan, name) {
  if (plan.aPeople.includes(name)) return "A";
  if (plan.bPeople.includes(name)) return "B";
  return null;
}

function getWeeklySideFromPlans(plans, weekKey, name) {
  for (let i = 0; i < plans.length; i += 1) {
    if (plans[i].weekKey !== weekKey) continue;
    const side = getPlanSideForPerson(plans[i], name);
    if (side) return side;
  }
  return null;
}

function replacePerson(list, fromName, toName) {
  const index = list.indexOf(fromName);
  if (index >= 0) list[index] = toName;
}

function rebalanceComparableGroups(dailyPlans, personnelMap) {
  return dailyPlans;
}

function renderWarnings(warnings) {
  warningsEl.innerHTML = warnings.map((w) => `<div class="warning">${w}</div>`).join("");
}

function exportToExcel() {
  if (!exportTableBody.innerHTML.trim()) return;
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  const filename = "vardiya_" + safe.year + "_" + String(safe.month).padStart(2, "0") + ".xls";
  const html = [
    "<html>",
    "<head>",
    '<meta charset="UTF-8">',
    "</head>",
    "<body>",
    exportTable.outerHTML,
    "</body>",
    "</html>"
  ].join("");
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPdf() {
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  if (printTitleEl) {
    printTitleEl.innerHTML = buildInstitutionTitleHtml(safe.year, safe.month);
  }
  window.print();
}

function setSelectedPerson(name) {
  selectedPersonName = selectedPersonName === name ? null : name;
  renderAll();
}

function clearSelectedPerson() {
  selectedPersonName = null;
  renderAll();
}

function adjustYearMonth(deltaYear, deltaMonth) {
  const safe = sanitizeYearMonth(yearEl?.value, monthEl?.value);
  const date = new Date(safe.year, safe.month - 1, 1);
  date.setFullYear(date.getFullYear() + deltaYear);
  date.setMonth(date.getMonth() + deltaMonth);
  if (yearEl) yearEl.value = date.getFullYear();
  if (monthEl) monthEl.value = date.getMonth() + 1;
  saveState();
  renderAll();
}

function ensureBootstrapDefaults() {
  const safe = sanitizeYearMonth(yearEl?.value, monthEl?.value);
  if (yearEl && !yearEl.value) yearEl.value = String(safe.year);
  if (monthEl && !monthEl.value) monthEl.value = String(safe.month);
  if (leaveModeFilterEl && !leaveModeFilterEl.value) leaveModeFilterEl.value = "all";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getVisibleNamesForFilter(personnel, leaveModeFilter) {
  if (!leaveModeFilter || leaveModeFilter === "all") return new Set(personnel.map((person) => person.name));
  return new Set(
    personnel
      .filter((person) => person.leaveMode === leaveModeFilter)
      .map((person) => person.name)
  );
}

function renderNameList(names, focusedName, mode) {
  if (!names.length) return "-";
  return names.map((name) => {
    const content = name === focusedName
      ? '<span class="focus-name' + (mode === "off" ? " off" : "") + '">' + escapeHtml(name) + "</span>"
      : escapeHtml(name);
    return '<span class="name-line">' + content + "</span>";
  }).join("");
}

function normalizeWeekRowHeights() {
  const cards = Array.from(calendarEl.children);
  const sectionClasses = ["a-names", "b-names", "c-names", "off-names"];

  sectionClasses.forEach((sectionClass) => {
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const section = card.querySelector("." + sectionClass);
      if (section) section.style.minHeight = "";
    });
  });

  for (let i = 0; i < cards.length; i += 7) {
    const weekCards = cards.slice(i, i + 7);
    sectionClasses.forEach((sectionClass) => {
      let maxHeight = 0;
      const sections = weekCards.map((card) => {
        if (!(card instanceof HTMLElement)) return null;
        return card.querySelector("." + sectionClass);
      }).filter(Boolean);

      sections.forEach((section) => {
        maxHeight = Math.max(maxHeight, section.offsetHeight);
      });

      sections.forEach((section) => {
        section.style.minHeight = maxHeight ? maxHeight + "px" : "";
      });
    });
  }
}

function renderAll() {
  renderPersonnelTable();
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  yearEl.value = safe.year;
  monthEl.value = safe.month;
  if (screenTitleEl) screenTitleEl.innerHTML = buildInstitutionTitleHtml(safe.year, safe.month);

  const personnel = state.personnel.slice();
  const leaveModeFilter = leaveModeFilterEl?.value || "all";
  const totalPersonnel = personnel.length;
  const maleCount = personnel.filter((p) => p.gender === "E").length;
  const femaleCount = personnel.filter((p) => p.gender === "K").length;
  const sef = personnel.find((p) => p.type === "sef");
  const gececi = personnel.find((p) => p.type === "gececi");
  const yedek = personnel.find((p) => p.type === "yedek_gececi");
  const allNames = personnel.map((p) => p.name);
  const visibleNames = getVisibleNamesForFilter(personnel, leaveModeFilter);
  const filterHasSelection = leaveModeFilter !== "all";
  if (selectedPersonName && !allNames.includes(selectedPersonName)) selectedPersonName = null;
  const personnelMap = Object.fromEntries(personnel.map((person) => [person.name, person]));
  const telafiWeekdayPairMap = buildTelafiWeekdayPairMap(personnel);
  const warnings = [];
  if (!sef) warnings.push("Tam 1 sef tanimlamalisin.");
  if (!gececi) warnings.push("1 gececi tanimlamalisin.");
  if (!yedek) warnings.push("1 yedek gececi tanimlamalisin.");
  if (totalPersonnel < 16) warnings.push("Personel sayisi yeni hedefler icin dusuk kalabilir.");

  renderWarnings(warnings);
  calendarEl.innerHTML = "";
  personHoursEl.innerHTML = "";
  if (printPersonHoursEl) printPersonHoursEl.innerHTML = "";
  if (printCalendarBodyEl) printCalendarBodyEl.innerHTML = "";
  exportTableBody.innerHTML = "";
  statsEl.innerHTML = [
    '<div class="pill">Toplam Personel: ' + totalPersonnel + '</div>',
    '<div class="pill">Erkek: ' + maleCount + '</div>',
    '<div class="pill">Kadin: ' + femaleCount + '</div>'
  ].join("");

  if (warnings.length) return;

  const y = safe.year;
  const m = safe.month;
  const days = monthDayCount(y, m);
  const first = new Date(y, m - 1, 1);
  const lead = mondayFirstIndex(first);
  const { planningStart, monthEnd } = getPlanningRange(y, m);
  const { cAssignments, forcedOff: nightRecoveryOff } = buildNightPlan(planningStart, monthEnd, gececi.name, yedek.name);
  const { weekendOff, telafiWeekNeeds } = buildWeekendSchedules(personnel, planningStart, monthEnd);
  const yedekExtraOff = buildYedekGececiExtraOff(planningStart, monthEnd, yedek.name, cAssignments, weekendOff);
  const telafiSideMap = buildTelafiSideMap(personnel, planningStart, monthEnd, weekendOff);
  const weekendOnlySideMap = buildWeekendOnlySideMap(personnel, planningStart, monthEnd, weekendOff);
  const telafiRemainingByWeek = Object.fromEntries(
    Object.entries(telafiWeekNeeds).map(([weekKey, people]) => [weekKey, { ...people }])
  );
  const personHours = Object.fromEntries(allNames.map((name) => [name, 0]));
  const personOffDays = Object.fromEntries(allNames.map((name) => [name, 0]));
  const personDayStatus = Object.fromEntries(allNames.map((name) => [name, []]));
  const personStats = Object.fromEntries(allNames.map((name) => [name, {
    work: 0,
    off: 0,
    a: 0,
    b: 0,
    c: 0,
    weekendWork: 0,
    weekendOff: 0
  }]));

  let totalA = 0;
  let totalB = 0;
  let totalC = 0;
  let totalOff = 0;
  let weekendCount = 0;
  const printWeekCells = [];
  const weeklySideMap = {};
  const lastWorkedWeekSide = {};
  const dailyPlans = [];

  for (let i = 0; i < lead; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendarEl.appendChild(empty);
  }

  for (let date = new Date(planningStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
    const planDate = new Date(date);
    const d = planDate.getDate();
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const holidayLabel = getOfficialHolidayLabel(date);
    const weekKey = getWeekKey(date);
    const dateKey = formatLocalDateKey(date);
    const { minA, maxA, minB, maxB } = getShiftBounds(isWeekend);
    const cPerson = cAssignments[dateKey] || "Eksik";
    const hardOffSet = new Set(nightRecoveryOff[dateKey] || []);
    let scheduledTelafi = [];
    if (!isWeekend) {
      const telafiWeekState = telafiRemainingByWeek[weekKey] || {};
      const weekdayOffset = getWeekdayOffsetFromWeekStart(date);
      const baseAvailableNames = allNames.filter((name) => !hardOffSet.has(name) && name !== cPerson);
      let slack = Math.max(0, baseAvailableNames.length - (minA + minB));
      const telafiCandidates = Object.keys(telafiWeekState)
        .filter((name) => telafiWeekState[name] > 0 && !hardOffSet.has(name) && name !== cPerson)
        .sort((left, right) => {
          const leftPrimaryToday = (telafiWeekdayPairMap[left] || []).includes(weekdayOffset);
          const rightPrimaryToday = (telafiWeekdayPairMap[right] || []).includes(weekdayOffset);
          const leftMonthEndMustTake = telafiWeekState[left] >= getRemainingTelafiAvailabilityInMonth(date, left, cAssignments, nightRecoveryOff);
          const rightMonthEndMustTake = telafiWeekState[right] >= getRemainingTelafiAvailabilityInMonth(date, right, cAssignments, nightRecoveryOff);
          if (leftMonthEndMustTake !== rightMonthEndMustTake) return leftMonthEndMustTake ? -1 : 1;
          const leftMustTake = telafiWeekState[left] >= getRemainingTelafiAvailability(date, left, cAssignments, nightRecoveryOff);
          const rightMustTake = telafiWeekState[right] >= getRemainingTelafiAvailability(date, right, cAssignments, nightRecoveryOff);
          if (leftMustTake !== rightMustTake) return leftMustTake ? -1 : 1;
          if (leftPrimaryToday !== rightPrimaryToday) return leftPrimaryToday ? -1 : 1;
          if (telafiWeekState[left] !== telafiWeekState[right]) return telafiWeekState[right] - telafiWeekState[left];
          if (personStats[left].off !== personStats[right].off) return personStats[left].off - personStats[right].off;
          return left.localeCompare(right, "tr");
        });

      telafiCandidates.forEach((name) => {
        const primaryToday = (telafiWeekdayPairMap[name] || []).includes(weekdayOffset);
        const monthEndMustTake = telafiWeekState[name] >= getRemainingTelafiAvailabilityInMonth(date, name, cAssignments, nightRecoveryOff);
        const mustTake = telafiWeekState[name] >= getRemainingTelafiAvailability(date, name, cAssignments, nightRecoveryOff);
        if (!monthEndMustTake && !mustTake && !primaryToday) return;
        if (!monthEndMustTake && !mustTake && slack <= 0) return;
        scheduledTelafi.push(name);
        telafiWeekState[name] -= 1;
        if (!monthEndMustTake && !mustTake) slack -= 1;
      });
    }
    const softOffSet = new Set([
      ...(isWeekend ? (weekendOff[dateKey] || []) : scheduledTelafi),
      ...(yedekExtraOff[dateKey] || [])
    ]);
    const leaveSet = new Set([...hardOffSet, ...softOffSet]);
    if (isWeekend && sef) leaveSet.add(sef.name);
    if (!isWeekend && cPerson === yedek.name) leaveSet.delete(yedek.name);
    if (cPerson) leaveSet.delete(cPerson);

    const used = new Set();
    const availableNames = allNames.filter((name) => !leaveSet.has(name) && name !== cPerson);
    const workerNames = availableNames.filter((name) => !sef || name !== sef.name);
    const aCandidates = workerNames.filter((name) => {
      const person = personnelMap[name];
      const lockedSide = getWeeklySide(weeklySideMap, weekKey, name);
      if (lockedSide) return lockedSide === "A";
      if (isWeekend && person?.leaveMode === "weekend_only") {
        return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "A", weekKey, weekendOnlySideMap, telafiSideMap);
      }
      if (isWeekend) return true;
      if (hasStrictWeeklySide(person)) return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "A", weekKey, weekendOnlySideMap, telafiSideMap);
      return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "A", weekKey, weekendOnlySideMap, telafiSideMap);
    });
    const bCandidates = workerNames.filter((name) => {
      const person = personnelMap[name];
      const lockedSide = getWeeklySide(weeklySideMap, weekKey, name);
      if (lockedSide) return lockedSide === "B";
      if (isWeekend && person?.leaveMode === "weekend_only") {
        return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "B", weekKey, weekendOnlySideMap, telafiSideMap);
      }
      if (isWeekend) return true;
      if (hasStrictWeeklySide(person)) return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "B", weekKey, weekendOnlySideMap, telafiSideMap);
      return matchesPreferredSide(personnelMap, lastWorkedWeekSide, name, "B", weekKey, weekendOnlySideMap, telafiSideMap);
    });
    const sortedA = sortCandidates(aCandidates, "A", personStats, lastWorkedWeekSide, isWeekend, personnelMap, weekKey, weekendOnlySideMap, telafiSideMap);
    const sortedB = sortCandidates(bCandidates, "B", personStats, lastWorkedWeekSide, isWeekend, personnelMap, weekKey, weekendOnlySideMap, telafiSideMap);

    let aPeople = [];
    let bPeople = [];

    if (cPerson && cPerson !== "Eksik") used.add(cPerson);
    if (!isWeekend && sef) {
      used.add(sef.name);
      aPeople.push(sef.name);
      setWeeklySide(weeklySideMap, weekKey, sef.name, "A");
    }

    let fillAGuard = 0;
    while (aPeople.length < minA) {
      if (fillAGuard > allNames.length + 4) break;
      fillAGuard += 1;
      const next = pickNextCandidate(sortedA, used);
      if (!next) break;
      aPeople.push(next);
      if (!isWeekend) {
        setWeeklySide(weeklySideMap, weekKey, next, "A");
        rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "A");
      }
    }

    let fillBGuard = 0;
    while (bPeople.length < minB) {
      if (fillBGuard > allNames.length + 4) break;
      fillBGuard += 1;
      const next = pickNextCandidate(sortedB, used);
      if (!next) break;
      bPeople.push(next);
      if (!isWeekend) {
        setWeeklySide(weeklySideMap, weekKey, next, "B");
        rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "B");
      }
    }

    // Minimum kadroyu her zaman haftalik A/B kilidinin onune koy.
    const fallbackAPool = workerNames.slice();
    let fallbackAGuard = 0;
    while (aPeople.length < minA) {
      if (fallbackAGuard > allNames.length + 4) break;
      fallbackAGuard += 1;
      const fallback = pickFallbackCandidate(fallbackAPool, used);
      if (!fallback) break;
      const fallbackLockedSide = getWeeklySide(weeklySideMap, weekKey, fallback);
      const mustRespectWeekendSide = isWeekend && (fallbackLockedSide || personnelMap[fallback]?.leaveMode === "weekend_only");
      if ((!isWeekend || mustRespectWeekendSide) && hasStrictWeeklySide(personnelMap[fallback]) && !matchesPreferredSide(personnelMap, lastWorkedWeekSide, fallback, "A", weekKey, weekendOnlySideMap, telafiSideMap)) {
        used.delete(fallback);
        const poolIndex = fallbackAPool.indexOf(fallback);
        if (poolIndex >= 0) fallbackAPool.splice(poolIndex, 1);
        continue;
      }
      aPeople.push(fallback);
      if (!isWeekend) {
        setWeeklySide(weeklySideMap, weekKey, fallback, "A");
        rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, fallback, "A");
      }
    }

    const fallbackBPool = workerNames.slice();
    let fallbackBGuard = 0;
    while (bPeople.length < minB) {
      if (fallbackBGuard > allNames.length + 4) break;
      fallbackBGuard += 1;
      const fallback = pickFallbackCandidate(fallbackBPool, used);
      if (!fallback) break;
      const fallbackLockedSide = getWeeklySide(weeklySideMap, weekKey, fallback);
      const mustRespectWeekendSide = isWeekend && (fallbackLockedSide || personnelMap[fallback]?.leaveMode === "weekend_only");
      if ((!isWeekend || mustRespectWeekendSide) && hasStrictWeeklySide(personnelMap[fallback]) && !matchesPreferredSide(personnelMap, lastWorkedWeekSide, fallback, "B", weekKey, weekendOnlySideMap, telafiSideMap)) {
        used.delete(fallback);
        const poolIndex = fallbackBPool.indexOf(fallback);
        if (poolIndex >= 0) fallbackBPool.splice(poolIndex, 1);
        continue;
      }
      bPeople.push(fallback);
      if (!isWeekend) {
        setWeeklySide(weeklySideMap, weekKey, fallback, "B");
        rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, fallback, "B");
      }
    }

    const totalCapacity = maxA === null || maxB === null
      ? availableNames.length
      : (maxA + maxB);

    let capacityGuard = 0;
    while ((aPeople.length + bPeople.length) < totalCapacity) {
      if (capacityGuard > allNames.length * 4 + 10) break;
      capacityGuard += 1;
      let side = null;
      const aHasRoom = maxA === null || aPeople.length < maxA;
      const bHasRoom = maxB === null || bPeople.length < maxB;
      if (!aHasRoom && !bHasRoom) break;
      if (isWeekend) {
        if (aHasRoom && bHasRoom) side = aPeople.length <= bPeople.length ? "A" : "B";
        else if (aHasRoom) side = "A";
        else side = "B";
      } else if (aHasRoom && !bHasRoom) side = "A";
      else if (!aHasRoom && bHasRoom) side = "B";
      else if (
        (maxA === null ? aPeople.length : (aPeople.length / maxA)) <=
        (maxB === null ? bPeople.length : (bPeople.length / maxB))
      ) side = "A";
      else side = "B";

      let next = isWeekend
        ? pickCandidateForWeekendBalance(side === "A" ? sortedA : sortedB, workerNames, used)
        : pickNextCandidate(side === "A" ? sortedA : sortedB, used);
      if (!next) {
        const otherSide = side === "A" ? "B" : "A";
        const otherHasRoom = otherSide === "A"
          ? (maxA === null || aPeople.length < maxA)
          : (maxB === null || bPeople.length < maxB);
        if (otherHasRoom) {
          side = otherSide;
          next = isWeekend
            ? pickCandidateForWeekendBalance(side === "A" ? sortedA : sortedB, workerNames, used)
            : pickNextCandidate(side === "A" ? sortedA : sortedB, used);
        }
      }
      if (!next) break;
      const nextLockedSide = getWeeklySide(weeklySideMap, weekKey, next);
      const mustRespectWeekendSide = isWeekend && (nextLockedSide || personnelMap[next]?.leaveMode === "weekend_only");
      if ((!isWeekend || mustRespectWeekendSide) && hasStrictWeeklySide(personnelMap[next]) && !matchesPreferredSide(personnelMap, lastWorkedWeekSide, next, side, weekKey, weekendOnlySideMap, telafiSideMap)) {
        used.delete(next);
        const aIndex = sortedA.indexOf(next);
        if (aIndex >= 0) sortedA.splice(aIndex, 1);
        const bIndex = sortedB.indexOf(next);
        if (bIndex >= 0) sortedB.splice(bIndex, 1);
        continue;
      }

      if (side === "A") {
        aPeople.push(next);
        if (!isWeekend) {
          setWeeklySide(weeklySideMap, weekKey, next, "A");
          rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "A");
        }
      } else {
        bPeople.push(next);
        if (!isWeekend) {
          setWeeklySide(weeklySideMap, weekKey, next, "B");
          rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "B");
        }
      }
    }

    // Izinli olmayan kimse bos kalmasin: ya vardiyada olur ya da gercekten izinlidir.
    let remainingAvailable = availableNames.filter((name) => !used.has(name));
    let remainingGuard = 0;
    while (remainingAvailable.length) {
      if (remainingGuard > allNames.length * 2 + 4) break;
      remainingGuard += 1;
      const next = remainingAvailable.shift();
      if (!next) break;
      used.add(next);
      const person = personnelMap[next];

      const preferredSide = getPreferredSide(person, lastWorkedWeekSide, next, weekKey, weekendOnlySideMap, telafiSideMap);

      if (preferredSide === "A" || (!preferredSide && aPeople.length <= bPeople.length)) {
        aPeople.push(next);
        if (!isWeekend) {
          setWeeklySide(weeklySideMap, weekKey, next, "A");
          rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "A");
        }
      } else {
        bPeople.push(next);
        if (!isWeekend) {
          setWeeklySide(weeklySideMap, weekKey, next, "B");
          rememberWorkedWeekSide(lastWorkedWeekSide, personnelMap, next, "B");
        }
      }
    }

    while (aPeople.length < minA) aPeople.push("Eksik");
    while (bPeople.length < minB) bPeople.push("Eksik");

    const assignedNames = new Set([...aPeople, ...bPeople, cPerson].filter((name) => name && name !== "Eksik"));
    let plannedOffList = allNames.filter((name) => leaveSet.has(name) && !assignedNames.has(name));
    let extraOffList = [];
    let offList = plannedOffList.slice();

    if (isSameMonth(planDate, y, m)) {
      dailyPlans.push({
        d,
        day,
        isWeekend,
        holidayLabel,
        weekKey,
        aPeople: aPeople.slice(),
        bPeople: bPeople.slice(),
        cPerson,
        plannedOffList: plannedOffList.slice(),
        extraOffList: extraOffList.slice(),
        offList: offList.slice()
      });
    }

    assignedNames.forEach((name) => {
      personStats[name].work += 1;
      if (isWeekend) personStats[name].weekendWork += 1;
    });
    offList.forEach((name) => {
      personStats[name].off += 1;
      if (isWeekend) personStats[name].weekendOff += 1;
    });
    aPeople.forEach((name) => {
      if (name !== "Eksik") personStats[name].a += 1;
    });
    bPeople.forEach((name) => {
      if (name !== "Eksik") personStats[name].b += 1;
    });
    if (cPerson !== "Eksik" && personStats[cPerson]) personStats[cPerson].c += 1;
  }

  rebalanceComparableGroups(dailyPlans, personnelMap);

  for (let i = 0; i < lead; i += 1) {
    printWeekCells.push('<td class="' + (i >= 5 ? "weekend-cell" : "") + '"><div class="day empty"></div></td>');
  }

  dailyPlans.forEach((plan) => {
    const visibleAPeople = plan.aPeople.filter((name) => name !== "Eksik" && visibleNames.has(name));
    const visibleBPeople = plan.bPeople.filter((name) => name !== "Eksik" && visibleNames.has(name));
    const visibleCPeople = plan.cPerson !== "Eksik" && visibleNames.has(plan.cPerson) ? [plan.cPerson] : [];
    const visibleOffList = plan.offList.filter((name) => visibleNames.has(name));
    const assignedNames = new Set([...plan.aPeople, ...plan.bPeople, plan.cPerson].filter((name) => name && name !== "Eksik"));
    const visibleAssignedNames = new Set([...visibleAPeople, ...visibleBPeople, ...visibleCPeople]);
    totalA += plan.aPeople.filter((name) => name !== "Eksik").length;
    totalB += plan.bPeople.filter((name) => name !== "Eksik").length;
    totalC += 1;
    totalOff += plan.offList.length;
    if (plan.isWeekend) weekendCount += 1;

    assignedNames.forEach((name) => {
      if (personHours[name] !== undefined) personHours[name] += 8;
      if (personDayStatus[name]) personDayStatus[name].push("work");
    });
    plan.offList.forEach((name) => {
      if (personOffDays[name] !== undefined) personOffDays[name] += 1;
      if (personDayStatus[name]) personDayStatus[name].push("off");
    });

    const card = document.createElement("div");
    card.className = "day";
    if (plan.isWeekend) card.classList.add("weekend-day");
    const isEmptyForFilter = filterHasSelection && !visibleAPeople.length && !visibleBPeople.length && !visibleCPeople.length && !visibleOffList.length;
    if (selectedPersonName) {
      if (visibleAssignedNames.has(selectedPersonName)) card.classList.add("focus-work");
      else if (visibleOffList.includes(selectedPersonName)) card.classList.add("focus-off");
    } else if (isEmptyForFilter) {
      card.classList.add("filter-empty");
      card.innerHTML = [
        '<div class="d">' + plan.d + ' - ' + dayNameTr(plan.day) + '</div>',
        (plan.holidayLabel ? '<div class="holiday-note">' + escapeHtml(plan.holidayLabel) + '</div>' : ''),
        '<div class="filter-empty-note">-</div>'
      ].join("");
      calendarEl.appendChild(card);
      printWeekCells.push('<td class="' + (plan.isWeekend ? "weekend-cell" : "") + '">' + card.outerHTML + "</td>");
      return;
    }
      card.innerHTML = [
        '<div class="d">' + plan.d + ' - ' + dayNameTr(plan.day) + '</div>',
        (plan.holidayLabel ? '<div class="holiday-note">' + escapeHtml(plan.holidayLabel) + '</div>' : ''),
        '<div class="row a">A (08-16): ' + visibleAPeople.length + ' kisi</div>',
        '<div class="names a-names">' + renderNameList(visibleAPeople, selectedPersonName, "work") + '</div>',
        '<div class="row b">B (16-00): ' + visibleBPeople.length + ' kisi</div>',
        '<div class="names b-names">' + renderNameList(visibleBPeople, selectedPersonName, "work") + '</div>',
        '<div class="row c">C (00-08): ' + visibleCPeople.length + ' kisi</div>',
        '<div class="names c-names">' + renderNameList(visibleCPeople, selectedPersonName, "work") + '</div>',
        '<div class="row off">Izinliler: ' + visibleOffList.length + '</div>',
        '<div class="names off-names">' + renderNameList(visibleOffList, selectedPersonName, "off") + '</div>'
      ].join("");
    calendarEl.appendChild(card);
    printWeekCells.push('<td class="' + (plan.isWeekend ? "weekend-cell" : "") + '">' + card.outerHTML + "</td>");

    const row = document.createElement("tr");
    row.innerHTML = [
      "<td>" + String(plan.d).padStart(2, "0") + "." + String(m).padStart(2, "0") + "." + y + "</td>",
      "<td>" + dayNameTr(plan.day) + "</td>",
      "<td>" + plan.aPeople.join(", ") + "</td>",
      "<td>" + plan.bPeople.join(", ") + "</td>",
      "<td>" + plan.cPerson + "</td>",
      "<td>" + (plan.offList.length ? plan.offList.join(", ") : "-") + "</td>"
    ].join("");
    exportTableBody.appendChild(row);
  });

  if (printCalendarBodyEl) {
    const paddedCells = printWeekCells.slice();
    while (paddedCells.length % 7 !== 0) {
      const columnIndex = paddedCells.length % 7;
      paddedCells.push('<td class="' + (columnIndex >= 5 ? "weekend-cell" : "") + '"><div class="day empty"></div></td>');
    }

    const weekRows = [];
    for (let i = 0; i < paddedCells.length; i += 7) {
      weekRows.push("<tr>" + paddedCells.slice(i, i + 7).join("") + "</tr>");
    }
    printCalendarBodyEl.innerHTML = weekRows.join("");
  }

  normalizeWeekRowHeights();

  const totalPersonHours = (totalA + totalB + totalC) * 8;
  const totalAssignments = totalA + totalB + totalC;
  statsEl.innerHTML = [
    '<div class="pill">Toplam Personel: ' + totalPersonnel + '</div>',
    '<div class="pill">Kadin / Erkek: ' + femaleCount + ' / ' + maleCount + '</div>',
    '<div class="pill">Toplam Vardiya Gorevi: ' + totalAssignments + '</div>',
    '<div class="pill">Toplam Izin Gunu: ' + totalOff + '</div>',
    '<div class="pill">Toplam Mesai: ' + totalPersonHours + ' saat</div>'
  ].join("");

  const personHoursRows = allNames.map((name) => {
    const workedDays = personHours[name] / 8;
    const offDays = personOffDays[name];
    const person = personnelMap[name];
    const typeLabel = person ? labelForPersonType(person.type) : "-";
    const leaveLabel = person ? labelForLeaveMode(person.leaveMode) : "-";
    return [
      '<tr class="person-summary-row' + (selectedPersonName === name ? " active" : "") + '" data-person="' + name + '">',
      "<td>" + name + "</td>",
      "<td>" + typeLabel + "</td>",
      "<td>" + leaveLabel + "</td>",
      "<td>" + workedDays + "</td>",
      "<td>" + offDays + "</td>",
      "</tr>"
    ].join("");
  }).join("");

  personHoursEl.innerHTML = personHoursRows;
  if (printPersonHoursEl) printPersonHoursEl.innerHTML = personHoursRows;

  personHoursEl.querySelectorAll("[data-person]").forEach((row) => {
    row.addEventListener("click", () => {
      setSelectedPerson(row.getAttribute("data-person"));
    });
  });

  if (focusBarEl && focusTextEl) {
    if (selectedPersonName && personDayStatus[selectedPersonName]) {
      focusBarEl.classList.add("active");
      const workedDays = personDayStatus[selectedPersonName].filter((item) => item === "work").length;
      const offDays = personDayStatus[selectedPersonName].filter((item) => item === "off").length;
      focusTextEl.innerHTML = selectedPersonName + ' secili. <span>Calistigi gun: ' + workedDays + ' | Izinli gun: ' + offDays + '</span>';
    } else {
      focusBarEl.classList.remove("active");
      focusTextEl.textContent = "";
    }
  }
}

if (savePersonBtn) savePersonBtn.addEventListener("click", upsertPerson);
if (personToggleBtn && personSectionBody) {
  personToggleBtn.addEventListener("click", () => {
    personSectionBody.classList.toggle("collapsed");
  });
}
if (rulesToggleBtn && rulesSectionBody) {
  rulesToggleBtn.addEventListener("click", () => {
    rulesSectionBody.classList.toggle("collapsed");
  });
}
if (exportBtn) exportBtn.addEventListener("click", exportToExcel);
if (pdfBtn) pdfBtn.addEventListener("click", exportToPdf);
if (clearFocusBtn) clearFocusBtn.addEventListener("click", clearSelectedPerson);
if (yearDownBtn) yearDownBtn.addEventListener("click", () => adjustYearMonth(-1, 0));
if (yearUpBtn) yearUpBtn.addEventListener("click", () => adjustYearMonth(1, 0));
if (monthDownBtn) monthDownBtn.addEventListener("click", () => adjustYearMonth(0, -1));
if (monthUpBtn) monthUpBtn.addEventListener("click", () => adjustYearMonth(0, 1));

[yearEl, monthEl].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => {
    saveState();
    renderAll();
  });
});

if (leaveModeFilterEl) {
  leaveModeFilterEl.addEventListener("change", () => {
    renderAll();
  });
}

function bootstrapApp() {
  ensureBootstrapDefaults();
  try {
    loadState();
    ensureBootstrapDefaults();
    renderAll();
  } catch (err) {
    console.error("Uygulama varsayilan durumla yeniden baslatiliyor:", err);
    state = getDefaultState();
    if (yearEl) yearEl.value = String(state.year);
    if (monthEl) monthEl.value = String(state.month);
    if (leaveModeFilterEl) leaveModeFilterEl.value = "all";
    saveState();
    renderAll();
  }
}

bootstrapApp();
