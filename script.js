console.log("Loaded script.js – CLEAN STABLE BUILD");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec";

const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";
const TODAYS_BOOST_ENDPOINT = API_BASE + "?action=todays_boost";
const BOOST_PLAN_ENDPOINT = API_BASE + "?action=boost_plan";

/* =========================
   GLOBAL STATE (SINGLE SOURCE)
   ========================= */
let currentWorkData = null;
let todaysBoostInfo = null;
let isRefreshing = false;

/* =========================
   UTIL
   ========================= */
function updateLastRefreshed() {
  const el = document.getElementById("lastRefreshed");
  if (!el) return;

  el.textContent =
    "Last refreshed: " +
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
}

/* =========================
   LOADERS (DATA ONLY)
   ========================= */
async function loadCurrentWorkTable() {
  const res = await fetch(TABLE_ENDPOINT);
  const data = await res.json();
  currentWorkData = data;
}

async function loadTodaysBoost() {
  const res = await fetch(TODAYS_BOOST_ENDPOINT);
  const data = await res.json();

  if (data && data.builder && data.status) {
    todaysBoostInfo = {
      builder: data.builder.toString().replace(/[^0-9]/g, ""),
      status: data.status
    };
  } else {
    todaysBoostInfo = null;
  }

  // Remove intrusive UI if present
  const box = document.getElementById("todaysBoost");
  if (box) box.innerHTML = "";
}

async function loadBoostPlan() {
  try {
    const res = await fetch(BOOST_PLAN_ENDPOINT);
    const data = await res.json();
    const table = document.getElementById("boost-plan-table");
    if (!table) return;

    table.innerHTML = "";
    data.table.forEach((row, i) => {
      const tr = document.createElement("tr");
      row.forEach(cell => {
        const el = document.createElement(i === 0 ? "th" : "td");
        el.textContent = cell;
        tr.appendChild(el);
      });
      table.appendChild(tr);
    });
  } catch (e) {
    console.error("Boost plan failed", e);
  }
}

//Helper*
function formatFinishTime(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return "-";

  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).replace(",", " at");
}


/* =========================
   RENDER BUILDER CARDS
   ========================= */
function renderBuilderCards() {
  if (!currentWorkData) return;

  const container = document.getElementById("builders-container");
  if (!container) return;

  container.innerHTML = "";

  // Find earliest finish
  let earliestFinish = Infinity;
  for (let i = 1; i < currentWorkData.length; i++) {
    const t = new Date(currentWorkData[i][2]).getTime();
    if (!isNaN(t) && t < earliestFinish) earliestFinish = t;
  }

  for (let i = 1; i < currentWorkData.length; i++) {
    const row = currentWorkData[i];
    const builderNumber = row[0].toString().replace(/[^0-9]/g, "");
    const finishTimeMs = new Date(row[2]).getTime();

    let badgeHTML = "";
    if (
      todaysBoostInfo &&
      todaysBoostInfo.builder === builderNumber
    ) {
      const img =
        todaysBoostInfo.status === "FORCED"
          ? "Images/Builder Apprentice Forced.png"
          : "Images/Builder Apprentice Safe.png";

    badgeHTML = `
    <img
    src="${img}"
    class="apprentice-badge clickable-boost"
    title="Apply Today’s Boost"
    data-apply-boost="true"
    />
    `;


    const card = document.createElement("div");
    card.className = "builder-card";

    if (finishTimeMs === earliestFinish) {
      card.classList.add("next-finish");
    }

    card.innerHTML = `
      ${badgeHTML}
      <img src="Images/Builder.png" class="builder-character" />
      <div class="builder-text">
        <div class="builder-name">BUILDER ${builderNumber}</div>
        <div class="builder-upgrade">${row[1]}</div>
        <div class="builder-time-left">${row[3]}</div>
        <div class="builder-finish">Finishes: ${formatFinishTime(row[2])}</div>
        <div class="builder-next">▶ Next: ${row[4]}</div>
      </div>
    `;

    container.appendChild(card);
  }
}

/* =========================
   ORCHESTRATOR (THE BOSS)
   ========================= */
async function refreshDashboard() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    await fetch(REFRESH_ENDPOINT);

    await Promise.all([
      loadCurrentWorkTable(),
      loadTodaysBoost()
    ]);

    renderBuilderCards();
    loadBoostPlan();
    updateLastRefreshed();
  } catch (err) {
    console.error("Dashboard refresh failed", err);
  } finally {
    isRefreshing = false;
  }
}

/* =========================
   AUTO REFRESH
   ========================= */
function startAutoRefresh() {
  setInterval(refreshDashboard, 45 * 1000);
}

/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  await refreshDashboard();
  startAutoRefresh();
});
