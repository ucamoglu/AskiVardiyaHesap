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
  { id: "p13", gender: "E", name: "Mehmet Balcı", type: "yedek_gececi", leaveMode: "none" },
  { id: "p14", gender: "E", name: "Mehmet Ünlü", type: "normal", leaveMode: "weekend_only" },
  { id: "p15", gender: "E", name: "Serkan", type: "normal", leaveMode: "weekend_only" },
  { id: "p16", gender: "K", name: "Tuğba", type: "normal", leaveMode: "weekend_only" }
];

const yearEl = document.getElementById("year");
const monthEl = document.getElementById("month");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
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
const exportBtn = document.getElementById("exportBtn");
const exportTable = document.getElementById("exportTable");
const exportTableBody = document.getElementById("exportTableBody");

let state = { year: 0, month: 0, personnel: [] };
let editingId = null;

const LEAVE_MODE_LABELS = {
  telafi: "Donusum + 2 Telafi",
  weekend_only: "2 Haftada 1 Hafta Sonu",
  none: "Izin Kullanma"
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

function rotateList(list, offset) {
  if (!list.length) return [];
  const n = ((offset % list.length) + list.length) % list.length;
  return list.slice(n).concat(list.slice(0, n));
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function labelForLeaveMode(mode) {
  return LEAVE_MODE_LABELS[mode] || LEAVE_MODE_LABELS.telafi;
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

function buildNightPlan(days, gececiName, yedekName) {
  const cAssignments = {};
  const forcedOff = {};
  if (!gececiName) return { cAssignments, forcedOff };

  let day = 1;
  while (day <= days) {
    for (let i = 0; i < 6 && day <= days; i += 1, day += 1) {
      cAssignments[day] = gececiName;
    }

    const offStart = day;
    for (let i = 0; i < 2 && day <= days; i += 1, day += 1) {
      cAssignments[day] = yedekName || "Eksik";
    }

    if (yedekName && offStart <= days && offStart + 2 <= days) {
      forcedOff[offStart + 2] = forcedOff[offStart + 2] || [];
      forcedOff[offStart + 2].push(yedekName);
    }
  }

  return { cAssignments, forcedOff };
}

function buildWeekendSchedules(personnel, days, y, m) {
  const weekendOff = {};
  const telafiOff = {};
  const eligible = personnel.filter((person) => person.type === "normal" || person.type === "yedek_gececi");

  eligible.forEach((person, index) => {
    if (person.leaveMode === "none") return;
    const phase = index % 2;

    for (let d = 1; d <= days; d += 1) {
      const date = new Date(y, m - 1, d);
      if (date.getDay() !== 6) continue;

      const sunday = d + 1 <= days && new Date(y, m - 1, d + 1).getDay() === 0 ? d + 1 : null;
      const weekendIndex = Math.floor((d - 1) / 7);
      const offWeekend = weekendIndex % 2 === phase;

      if (person.leaveMode === "telafi") {
        if (offWeekend) {
          weekendOff[d] = weekendOff[d] || [];
          weekendOff[d].push(person.name);
          if (sunday) {
            weekendOff[sunday] = weekendOff[sunday] || [];
            weekendOff[sunday].push(person.name);
          }
        } else {
          const monday = d - 5;
          const tuesday = d - 4;
          if (monday >= 1) {
            telafiOff[monday] = telafiOff[monday] || [];
            telafiOff[monday].push(person.name);
          }
          if (tuesday >= 1) {
            telafiOff[tuesday] = telafiOff[tuesday] || [];
            telafiOff[tuesday].push(person.name);
          }
        }
      }

      if (person.leaveMode === "weekend_only" && offWeekend) {
        weekendOff[d] = weekendOff[d] || [];
        weekendOff[d].push(person.name);
        if (sunday) {
          weekendOff[sunday] = weekendOff[sunday] || [];
          weekendOff[sunday].push(person.name);
        }
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

function renderAll() {
  renderPersonnelTable();
  const safe = sanitizeYearMonth(yearEl.value, monthEl.value);
  yearEl.value = safe.year;
  monthEl.value = safe.month;

  const personnel = state.personnel.slice();
  const totalPersonnel = personnel.length;
  const maleCount = personnel.filter((p) => p.gender === "E").length;
  const femaleCount = personnel.filter((p) => p.gender === "K").length;
  const sef = personnel.find((p) => p.type === "sef");
  const gececi = personnel.find((p) => p.type === "gececi");
  const yedek = personnel.find((p) => p.type === "yedek_gececi");
  const normalPeople = personnel.filter((p) => p.type === "normal");
  const allNames = personnel.map((p) => p.name);
  const personIndex = Object.fromEntries(allNames.map((name, i) => [name, i]));

  const warnings = [];
  if (!sef) warnings.push("Tam 1 sef tanimlamalisin.");
  if (!gececi) warnings.push("1 gececi tanimlamalisin.");
  if (!yedek) warnings.push("1 yedek gececi tanimlamalisin.");
  if (totalPersonnel < 16) warnings.push("Personel sayisi yeni hedefler icin dusuk kalabilir.");

  renderWarnings(warnings);
  calendarEl.innerHTML = "";
  personHoursEl.innerHTML = "";
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
  const { cAssignments, forcedOff: nightRecoveryOff } = buildNightPlan(days, gececi.name, yedek.name);
  const { weekendOff, telafiOff } = buildWeekendSchedules(personnel, days, y, m);
  const personHours = Object.fromEntries(allNames.map((name) => [name, 0]));

  let totalA = 0;
  let totalB = 0;
  let totalC = 0;
  let totalOff = 0;
  let weekendCount = 0;

  for (let i = 0; i < lead; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendarEl.appendChild(empty);
  }

  for (let d = 1; d <= days; d += 1) {
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const weekIndex = Math.floor((d - 1) / 7);
    const aNeed = isWeekend ? 3 : 8;
    const bNeed = isWeekend ? 3 : 7;
    const cNeed = 1;
    const cPerson = cAssignments[d] || "Eksik";
    const offSet = new Set([...(nightRecoveryOff[d] || []), ...(isWeekend ? (weekendOff[d] || []) : (telafiOff[d] || []))]);

    if (isWeekend && sef) offSet.add(sef.name);
    if (!isWeekend && cPerson === yedek.name) {
      offSet.delete(yedek.name);
    }
    if (cPerson) offSet.delete(cPerson);

    const used = new Set();
    if (cPerson && cPerson !== "Eksik") used.add(cPerson);

    const weekdayA = [];
    const weekdayB = [];
    const alternates = rotateList(normalPeople.map((p) => p.name), weekIndex);

    alternates.forEach((name, idx) => {
      const person = personnel.find((p) => p.name === name);
      if (!person || offSet.has(name) || name === cPerson) return;
      if (person.type === "yedek_gececi") {
        weekdayA.push(name);
        return;
      }
      if (idx % 2 === 0) weekdayA.push(name);
      else weekdayB.push(name);
    });

    const others = personnel
      .filter((p) => p.type !== "gececi" && p.type !== "normal")
      .map((p) => p.name)
      .filter((name) => !offSet.has(name) && name !== cPerson);

    let aPeople = [];
    let bPeople = [];

    if (!isWeekend && sef) {
      used.add(sef.name);
      aPeople.push(sef.name);
    }

    aPeople = aPeople.concat(takeFromPool(weekdayA, aNeed - aPeople.length, used));
    aPeople = aPeople.concat(takeFromPool(others, aNeed - aPeople.length, used));
    bPeople = bPeople.concat(takeFromPool(weekdayB, bNeed, used));
    bPeople = bPeople.concat(takeFromPool(weekdayA, bNeed - bPeople.length, used));
    bPeople = bPeople.concat(takeFromPool(others, bNeed - bPeople.length, used));

    while (aPeople.length < aNeed) aPeople.push("Eksik");
    while (bPeople.length < bNeed) bPeople.push("Eksik");

    const assignedNames = new Set([...aPeople, ...bPeople, cPerson].filter((name) => name && name !== "Eksik"));
    const offList = allNames.filter((name) => !assignedNames.has(name));

    totalA += aNeed;
    totalB += bNeed;
    totalC += cNeed;
    totalOff += offList.length;
    if (isWeekend) weekendCount += 1;

    assignedNames.forEach((name) => {
      if (personHours[name] !== undefined) personHours[name] += 8;
    });

    const card = document.createElement("div");
    card.className = "day";
    card.innerHTML = [
      '<div class="d">' + d + '</div>',
      '<div class="row a">A (08-16): ' + aNeed + ' kisi</div>',
      '<div class="names">A: ' + aPeople.join(", ") + '</div>',
      '<div class="row b">B (16-00): ' + bNeed + ' kisi</div>',
      '<div class="names">B: ' + bPeople.join(", ") + '</div>',
      '<div class="row c">C (00-08): ' + cNeed + ' kisi</div>',
      '<div class="names">C: ' + cPerson + '</div>',
      '<div class="row off">Izinliler: ' + offList.length + '</div>',
      '<div class="names">Izinliler: ' + (offList.length ? offList.join(", ") : "-") + '</div>'
    ].join("");
    calendarEl.appendChild(card);

    const row = document.createElement("tr");
    row.innerHTML = [
      "<td>" + String(d).padStart(2, "0") + "." + String(m).padStart(2, "0") + "." + y + "</td>",
      "<td>" + dayNameTr(day) + "</td>",
      "<td>" + aPeople.join(", ") + "</td>",
      "<td>" + bPeople.join(", ") + "</td>",
      "<td>" + cPerson + "</td>",
      "<td>" + (offList.length ? offList.join(", ") : "-") + "</td>"
    ].join("");
    exportTableBody.appendChild(row);
  }

  const totalPersonHours = (totalA + totalB + totalC) * 8;
  statsEl.innerHTML = [
    '<div class="pill">Toplam Personel: ' + totalPersonnel + '</div>',
    '<div class="pill">Erkek: ' + maleCount + '</div>',
    '<div class="pill">Kadin: ' + femaleCount + '</div>',
    '<div class="pill">A Toplam Gorev: ' + totalA + '</div>',
    '<div class="pill">B Toplam Gorev: ' + totalB + '</div>',
    '<div class="pill">C Toplam Gorev: ' + totalC + '</div>',
    '<div class="pill">Toplam Izinli: ' + totalOff + '</div>',
    '<div class="pill">Hafta Sonu Gunu: ' + weekendCount + '</div>',
    '<div class="pill">Toplam Adam/Saat: ' + totalPersonHours + '</div>'
  ].join("");

  personHoursEl.innerHTML = allNames.map((name) =>
    '<div class="pill">' + name + " = Toplam Saat = " + personHours[name] + "</div>"
  ).join("");
}

savePersonBtn.addEventListener("click", upsertPerson);
personToggleBtn.addEventListener("click", () => {
  personSectionBody.classList.toggle("collapsed");
});
exportBtn.addEventListener("click", exportToExcel);
runBtn.addEventListener("click", () => {
  saveState();
  renderAll();
});

[yearEl, monthEl].forEach((el) => {
  el.addEventListener("change", () => {
    saveState();
    renderAll();
  });
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  editingId = null;
  loadState();
  renderAll();
});

loadState();
renderAll();
