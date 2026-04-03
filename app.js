const STORAGE_KEY = "vardiya_format_v4";
const DEFAULT_PERSONNEL = [
  { id: "p1", gender: "E", name: "Erhan", type: "gececi", leaveMode: "none" },
  { id: "p2", gender: "K", name: "Deniz", type: "sef", leaveMode: "none" },
  { id: "p3", gender: "E", name: "Atilla", type: "normal", leaveMode: "telafi" },
  { id: "p4", gender: "K", name: "Canel", type: "normal", leaveMode: "telafi" },
  { id: "p5", gender: "K", name: "Cevriye", type: "normal", leaveMode: "telafi" },
  { id: "p6", gender: "K", name: "Dilara", type: "normal", leaveMode: "telafi" },
  { id: "p7", gender: "K", name: "Funda", type: "normal", leaveMode: "telafi" },
  { id: "p8", gender: "K", name: "Nurten", type: "normal", leaveMode: "telafi" },
  { id: "p9", gender: "E", name: "Uğur", type: "normal", leaveMode: "telafi" },
  { id: "p10", gender: "K", name: "Raziye", type: "normal", leaveMode: "telafi" },
  { id: "p11", gender: "K", name: "Habibe", type: "normal", leaveMode: "telafi" },
  { id: "p12", gender: "K", name: "Beyhan", type: "normal", leaveMode: "weekend_only" },
  { id: "p13", gender: "E", name: "Mehmet Balcı", type: "yedek_gececi", leaveMode: "weekend_only" },
  { id: "p14", gender: "E", name: "Mehmet Ünlü", type: "normal", leaveMode: "weekend_only" },
  { id: "p15", gender: "E", name: "Serkan", type: "normal", leaveMode: "weekend_only" },
  { id: "p16", gender: "K", name: "Tuğba", type: "normal", leaveMode: "weekend_only" }
];

const yearEl = document.getElementById("year");
const monthEl = document.getElementById("month");
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
const printTitleEl = document.getElementById("printTitle");
const printPersonHoursEl = document.getElementById("printPersonHours");
const printCalendarBodyEl = document.getElementById("printCalendarBody");
const focusBarEl = document.getElementById("focusBar");
const focusTextEl = document.getElementById("focusText");
const clearFocusBtn = document.getElementById("clearFocusBtn");

let state = { year: 0, month: 0, personnel: [] };
let editingId = null;
let selectedPersonName = null;

const LEAVE_MODE_LABELS = {
  telafi: "Donusum + 2 Telafi",
  weekend_only: "2 Haftada 1 Hafta Sonu",
  none: "Izin Kullanma"
};

const PERSON_TYPE_LABELS = {
  normal: "Normal",
  sef: "Sef",
  gececi: "Gececi",
  yedek_gececi: "Yedek Gececi"
};

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
  return LEAVE_MODE_LABELS[mode] || LEAVE_MODE_LABELS.telafi;
}

function labelForPersonType(type) {
  return PERSON_TYPE_LABELS[type] || type;
}

function saveState() {
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  state.year = safe.year;
  state.month = safe.month;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const now = new Date();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state = { year: now.getFullYear(), month: now.getMonth() + 1, personnel: DEFAULT_PERSONNEL.slice() };
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
          leaveMode: person.leaveMode || "telafi"
        }))
      };
    } catch (err) {
      state = { year: now.getFullYear(), month: now.getMonth() + 1, personnel: DEFAULT_PERSONNEL.slice() };
    }
  }
  yearEl.value = state.year;
  monthEl.value = state.month;
}

function findById(id) {
  return state.personnel.find((p) => p.id === id);
}

function renderPersonnelTable() {
  personTableBody.innerHTML = state.personnel.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.gender === "E" ? "Erkek" : "Kadin"}</td>
      <td>${p.name}</td>
      <td>${p.type}</td>
      <td>${labelForLeaveMode(p.leaveMode)}</td>
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
  const names = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
  return names[day] || "";
}

function buildNightPlan(days, y, m, gececiName, yedekName) {
  const cAssignments = {};
  const forcedOff = {};
  if (!gececiName) return { cAssignments, forcedOff };

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(y, m - 1, day);
    const cyclePosition = ((getDaySerial(date) % 8) + 8) % 8;
    const isNightOff = cyclePosition === 6 || cyclePosition === 7;

    if (isNightOff) {
      cAssignments[day] = yedekName || "Eksik";
      forcedOff[day] = forcedOff[day] || [];
      forcedOff[day].push(gececiName);

      if (yedekName && cyclePosition === 7 && day + 1 <= days) {
        forcedOff[day + 1] = forcedOff[day + 1] || [];
        forcedOff[day + 1].push(yedekName);
      }
    } else {
      cAssignments[day] = gececiName;
    }
  }

  return { cAssignments, forcedOff };
}

function addOffDay(targetMap, day, name) {
  if (day < 1) return;
  targetMap[day] = targetMap[day] || [];
  if (!targetMap[day].includes(name)) targetMap[day].push(name);
}

function getComparableAssignmentGroup(person) {
  if (person?.type === "normal" && (person.leaveMode === "telafi" || person.leaveMode === "weekend_only")) {
    return `${person.type}:${person.leaveMode}`;
  }
  return null;
}

function buildWeekendSchedules(personnel, days, y, m) {
  const weekendOff = {};
  const telafiOff = {};
  const eligible = getStableSortedPersonnel(
    personnel.filter((person) => person.type === "normal" || person.type === "yedek_gececi")
  );
  const groupPhaseIndex = {};
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m - 1, days);
  const firstRelevantWeekStart = startOfWeek(monthStart);
  const lastRelevantWeekStart = startOfWeek(monthEnd);

  eligible.forEach((person) => {
    if (person.leaveMode === "none") return;
    const groupKey = `${person.type}:${person.leaveMode}`;
    const phase = (groupPhaseIndex[groupKey] || 0) % 2;
    groupPhaseIndex[groupKey] = (groupPhaseIndex[groupKey] || 0) + 1;

    for (let weekStart = new Date(firstRelevantWeekStart); weekStart <= lastRelevantWeekStart; weekStart.setDate(weekStart.getDate() + 7)) {
      const monday = new Date(weekStart);
      const tuesday = new Date(weekStart);
      tuesday.setDate(tuesday.getDate() + 1);
      const saturday = new Date(weekStart);
      saturday.setDate(saturday.getDate() + 5);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      const weekendOffWeek = getWeekSerial(weekStart) % 2 === phase;

      if (person.leaveMode === "telafi") {
        if (weekendOffWeek) {
          if (saturday.getMonth() === m - 1 && saturday.getFullYear() === y) addOffDay(weekendOff, saturday.getDate(), person.name);
          if (sunday.getMonth() === m - 1 && sunday.getFullYear() === y) addOffDay(weekendOff, sunday.getDate(), person.name);
        } else {
          if (monday.getMonth() === m - 1 && monday.getFullYear() === y) addOffDay(telafiOff, monday.getDate(), person.name);
          if (tuesday.getMonth() === m - 1 && tuesday.getFullYear() === y) addOffDay(telafiOff, tuesday.getDate(), person.name);
        }
      }

      if (person.leaveMode === "weekend_only" && weekendOffWeek) {
        if (saturday.getMonth() === m - 1 && saturday.getFullYear() === y) addOffDay(weekendOff, saturday.getDate(), person.name);
        if (sunday.getMonth() === m - 1 && sunday.getFullYear() === y) addOffDay(weekendOff, sunday.getDate(), person.name);
      }
    }
  });

  return { weekendOff, telafiOff };
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
    ? { minA: 2, maxA: 4, minB: 2, maxB: 4 }
    : { minA: 6, maxA: 8, minB: 3, maxB: 7 };
}

function sortCandidates(names, side, stats, personIndex, weekSerial, isWeekend, personnelMap) {
  const uniqueNames = Array.from(new Set(names));
  return uniqueNames.sort((left, right) => {
    const leftPerson = personnelMap[left];
    const rightPerson = personnelMap[right];
    const leftPrefA = leftPerson && (leftPerson.type === "yedek_gececi" || (leftPerson.type === "normal" && ((personIndex[left] + weekSerial) % 2 === 0)));
    const rightPrefA = rightPerson && (rightPerson.type === "yedek_gececi" || (rightPerson.type === "normal" && ((personIndex[right] + weekSerial) % 2 === 0)));
    const leftPreferred = side === "A" ? leftPrefA : !leftPrefA;
    const rightPreferred = side === "A" ? rightPrefA : !rightPrefA;
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

function getWeeklySide(weeklySideMap, weekKey, name) {
  return weeklySideMap[`${weekKey}|${name}`] || null;
}

function setWeeklySide(weeklySideMap, weekKey, name, side) {
  if (!name || name === "Eksik") return;
  weeklySideMap[`${weekKey}|${name}`] = side;
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
  const comparableGroups = {};

  Object.values(personnelMap).forEach((person) => {
    const key = getComparableAssignmentGroup(person);
    if (!key) return;
    comparableGroups[key] = comparableGroups[key] || [];
    comparableGroups[key].push(person.name);
  });

  Object.values(comparableGroups).forEach((groupNames) => {
    if (groupNames.length < 2) return;

    const workCount = Object.fromEntries(groupNames.map((name) => [name, 0]));
    dailyPlans.forEach((plan) => {
      groupNames.forEach((name) => {
        if (plan.aPeople.includes(name) || plan.bPeople.includes(name)) workCount[name] += 1;
      });
    });

    let changed = true;
    while (changed) {
      changed = false;
      const ordered = groupNames.slice().sort((left, right) => workCount[right] - workCount[left] || left.localeCompare(right, "tr"));
      const maxWork = workCount[ordered[0]];
      const minWork = workCount[ordered[ordered.length - 1]];
      if (maxWork - minWork <= 1) break;

      for (let i = 0; i < ordered.length && !changed; i += 1) {
        const overName = ordered[i];
        if (workCount[overName] <= minWork) continue;

        for (let j = ordered.length - 1; j >= 0 && !changed; j -= 1) {
          const underName = ordered[j];
          if (workCount[overName] - workCount[underName] <= 1) continue;

          for (let p = 0; p < dailyPlans.length && !changed; p += 1) {
            const plan = dailyPlans[p];
            const side = getPlanSideForPerson(plan, overName);
            if (!side) continue;
            if (!plan.offList.includes(underName)) continue;
            const underWeeklySide = getWeeklySideFromPlans(dailyPlans, plan.weekKey, underName);
            if (underWeeklySide && underWeeklySide !== side) continue;

            if (side === "A") replacePerson(plan.aPeople, overName, underName);
            else replacePerson(plan.bPeople, overName, underName);

            plan.offList = plan.offList.filter((name) => name !== underName);
            if (!plan.offList.includes(overName)) plan.offList.push(overName);
            workCount[overName] -= 1;
            workCount[underName] += 1;
            changed = true;
          }

          for (let p = 0; p < dailyPlans.length && !changed; p += 1) {
            const plan = dailyPlans[p];
            if (!plan.offList.includes(underName)) continue;

            const preferredSide = getWeeklySideFromPlans(dailyPlans, plan.weekKey, underName);
            const candidateSides = preferredSide ? [preferredSide] : ["A", "B"];

            for (let s = 0; s < candidateSides.length && !changed; s += 1) {
              const side = candidateSides[s];
              const assignedList = side === "A" ? plan.aPeople : plan.bPeople;

              for (let a = 0; a < assignedList.length && !changed; a += 1) {
                const assignedName = assignedList[a];
                if (!assignedName || assignedName === "Eksik") continue;
                if (groupNames.includes(assignedName)) continue;

                const assignedPerson = personnelMap[assignedName];
                if (!assignedPerson || assignedPerson.type === "sef" || assignedPerson.type === "gececi") continue;

                const assignedWeeklySide = getWeeklySideFromPlans(dailyPlans, plan.weekKey, assignedName);
                if (assignedWeeklySide && assignedWeeklySide !== side) continue;
                if ((workCount[underName] + 1) > maxWork) continue;

                replacePerson(assignedList, assignedName, underName);
                plan.offList = plan.offList.filter((name) => name !== underName);
                if (!plan.offList.includes(assignedName)) plan.offList.push(assignedName);
                workCount[underName] += 1;
                changed = true;
              }
            }
          }
        }
      }
    }
  });
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
    printTitleEl.textContent = "Vardiya Takvimi - " + String(safe.month).padStart(2, "0") + "." + safe.year;
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderNameList(names, focusedName, mode) {
  if (!names.length) return "-";
  return names.map((name) => {
    if (name === focusedName) {
      return '<span class="focus-name' + (mode === "off" ? " off" : "") + '">' + escapeHtml(name) + "</span>";
    }
    return escapeHtml(name);
  }).join(", ");
}

function renderAll() {
  renderPersonnelTable();
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  yearEl.value = safe.year;
  monthEl.value = safe.month;

  const personnel = state.personnel.slice();
  const stablePersonnel = getStableSortedPersonnel(personnel);
  const totalPersonnel = personnel.length;
  const maleCount = personnel.filter((p) => p.gender === "E").length;
  const femaleCount = personnel.filter((p) => p.gender === "K").length;
  const sef = personnel.find((p) => p.type === "sef");
  const gececi = personnel.find((p) => p.type === "gececi");
  const yedek = personnel.find((p) => p.type === "yedek_gececi");
  const allNames = personnel.map((p) => p.name);
  if (selectedPersonName && !allNames.includes(selectedPersonName)) selectedPersonName = null;
  const personIndex = Object.fromEntries(stablePersonnel.map((person, i) => [person.name, i]));
  const personnelMap = Object.fromEntries(personnel.map((person) => [person.name, person]));
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
  const { cAssignments, forcedOff: nightRecoveryOff } = buildNightPlan(days, y, m, gececi.name, yedek.name);
  const { weekendOff, telafiOff } = buildWeekendSchedules(personnel, days, y, m);
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
  const dailyPlans = [];

  for (let i = 0; i < lead; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendarEl.appendChild(empty);
  }

  for (let d = 1; d <= days; d += 1) {
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const weekKey = getWeekKey(date);
    const weekSerial = getWeekSerial(date);
    const { minA, maxA, minB, maxB } = getShiftBounds(isWeekend);
    const cNeed = 1;
    const cPerson = cAssignments[d] || "Eksik";
    const hardOffSet = new Set(nightRecoveryOff[d] || []);
    const softOffSet = new Set(isWeekend ? (weekendOff[d] || []) : (telafiOff[d] || []));
    const leaveSet = new Set([...hardOffSet, ...softOffSet]);
    if (isWeekend && sef) leaveSet.add(sef.name);
    if (!isWeekend && cPerson === yedek.name) leaveSet.delete(yedek.name);
    if (cPerson) leaveSet.delete(cPerson);

    const used = new Set();
    const availableNames = allNames.filter((name) => !leaveSet.has(name) && name !== cPerson);
    const workerNames = availableNames.filter((name) => !sef || name !== sef.name);
    const aCandidates = workerNames.filter((name) => {
      const lockedSide = getWeeklySide(weeklySideMap, weekKey, name);
      return !lockedSide || lockedSide === "A";
    });
    const bCandidates = workerNames.filter((name) => {
      const lockedSide = getWeeklySide(weeklySideMap, weekKey, name);
      return !lockedSide || lockedSide === "B";
    });
    const sortedA = sortCandidates(aCandidates, "A", personStats, personIndex, weekSerial, isWeekend, personnelMap);
    const sortedB = sortCandidates(bCandidates, "B", personStats, personIndex, weekSerial, isWeekend, personnelMap);

    let aPeople = [];
    let bPeople = [];

    if (cPerson && cPerson !== "Eksik") used.add(cPerson);
    if (!isWeekend && sef) {
      used.add(sef.name);
      aPeople.push(sef.name);
      setWeeklySide(weeklySideMap, weekKey, sef.name, "A");
    }

    while (aPeople.length < minA) {
      const next = pickNextCandidate(sortedA, used);
      if (!next) break;
      aPeople.push(next);
      setWeeklySide(weeklySideMap, weekKey, next, "A");
    }

    while (bPeople.length < minB) {
      const next = pickNextCandidate(sortedB, used);
      if (!next) break;
      bPeople.push(next);
      setWeeklySide(weeklySideMap, weekKey, next, "B");
    }

    while (used.size < availableNames.length + (cPerson && cPerson !== "Eksik" ? 1 : 0)) {
      let side = "A";
      if (aPeople.length > bPeople.length) side = "B";
      else if (bPeople.length > aPeople.length) side = "A";

      let next = pickNextCandidate(side === "A" ? sortedA : sortedB, used);
      if (!next) {
        side = side === "A" ? "B" : "A";
        next = pickNextCandidate(side === "A" ? sortedA : sortedB, used);
      }
      if (!next) break;

      if (side === "A") {
        aPeople.push(next);
        setWeeklySide(weeklySideMap, weekKey, next, "A");
      } else {
        bPeople.push(next);
        setWeeklySide(weeklySideMap, weekKey, next, "B");
      }
    }

    while (aPeople.length < minA) aPeople.push("Eksik");
    while (bPeople.length < minB) bPeople.push("Eksik");

    const assignedNames = new Set([...aPeople, ...bPeople, cPerson].filter((name) => name && name !== "Eksik"));
    const offList = allNames.filter((name) => !assignedNames.has(name));

    dailyPlans.push({
      d,
      day,
      isWeekend,
      weekKey,
      aPeople: aPeople.slice(),
      bPeople: bPeople.slice(),
      cPerson,
      offList: offList.slice()
    });
  }

  for (let i = 0; i < lead; i += 1) {
    printWeekCells.push('<td class="' + (i >= 5 ? "weekend-cell" : "") + '"><div class="day empty"></div></td>');
  }

  dailyPlans.forEach((plan) => {
    const assignedNames = new Set([...plan.aPeople, ...plan.bPeople, plan.cPerson].filter((name) => name && name !== "Eksik"));
    totalA += plan.aPeople.filter((name) => name !== "Eksik").length;
    totalB += plan.bPeople.filter((name) => name !== "Eksik").length;
    totalC += 1;
    totalOff += plan.offList.length;
    if (plan.isWeekend) weekendCount += 1;

    assignedNames.forEach((name) => {
      if (personHours[name] !== undefined) personHours[name] += 8;
      if (personDayStatus[name]) personDayStatus[name].push("work");
      personStats[name].work += 1;
      if (plan.isWeekend) personStats[name].weekendWork += 1;
    });
    plan.offList.forEach((name) => {
      if (personOffDays[name] !== undefined) personOffDays[name] += 1;
      if (personDayStatus[name]) personDayStatus[name].push("off");
      personStats[name].off += 1;
      if (plan.isWeekend) personStats[name].weekendOff += 1;
    });
    plan.aPeople.forEach((name) => {
      if (name !== "Eksik") personStats[name].a += 1;
    });
    plan.bPeople.forEach((name) => {
      if (name !== "Eksik") personStats[name].b += 1;
    });
    if (plan.cPerson !== "Eksik" && personStats[plan.cPerson]) personStats[plan.cPerson].c += 1;

    const card = document.createElement("div");
    card.className = "day";
    if (plan.isWeekend) card.classList.add("weekend-day");
    if (selectedPersonName) {
      if (assignedNames.has(selectedPersonName)) card.classList.add("focus-work");
      else if (plan.offList.includes(selectedPersonName)) card.classList.add("focus-off");
      else card.classList.add("filtered-out");
    }
    card.innerHTML = [
      '<div class="d">' + plan.d + '</div>',
      '<div class="row a">A (08-16): ' + plan.aPeople.filter((name) => name !== "Eksik").length + ' kisi</div>',
      '<div class="names">A: ' + renderNameList(plan.aPeople, selectedPersonName, "work") + '</div>',
      '<div class="row b">B (16-00): ' + plan.bPeople.filter((name) => name !== "Eksik").length + ' kisi</div>',
      '<div class="names">B: ' + renderNameList(plan.bPeople, selectedPersonName, "work") + '</div>',
      '<div class="row c">C (00-08): 1 kisi</div>',
      '<div class="names">C: ' + renderNameList([plan.cPerson], selectedPersonName, "work") + '</div>',
      '<div class="row off">Izinliler: ' + plan.offList.length + '</div>',
      '<div class="names">Izinliler: ' + renderNameList(plan.offList, selectedPersonName, "off") + '</div>'
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

savePersonBtn.addEventListener("click", upsertPerson);
personToggleBtn.addEventListener("click", () => {
  personSectionBody.classList.toggle("collapsed");
});
rulesToggleBtn.addEventListener("click", () => {
  rulesSectionBody.classList.toggle("collapsed");
});
exportBtn.addEventListener("click", exportToExcel);
pdfBtn.addEventListener("click", exportToPdf);
clearFocusBtn.addEventListener("click", clearSelectedPerson);

[yearEl, monthEl].forEach((el) => {
  el.addEventListener("change", () => {
    saveState();
    renderAll();
  });
});

loadState();
renderAll();
