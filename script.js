console.log("Loaded script.js – CLEAN STABLE BUILD FINAL");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec";

const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";
const TODAYS_BOOST_ENDPOINT = API_BASE + "?action=todays_boost";
const BOOST_PLAN_ENDPOINT = API_BASE + "?action=boost_plan";

/* Builder / Pass actions */
const APPLY_TODAYS_BOOST = API_BASE + "?action=apply_todays_boost";
const RUN_BOOST_SIM = API_BASE + "?action=run_boost_simulation";
const BUILDER_POTION = API_BASE + "?action=apply_builder_potion";
const BUILDER_SNACK = API_BASE + "?action=apply_one_hour_boost";
const BATTLE_PASS = API_BASE + "?action=apply_battle_pass";

/* =========================
   GLOBAL STATE
   ========================= */
let currentWorkData = null;
let todaysBoostInfo = null;
let isRefreshing = false;

/* =========================
   HELPERS
   ========================= */
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
async function loadCurrentWork() {
  const res = await fetch(TABLE_ENDPOINT);
  currentWorkData = await res.json();
}

async function loadTodaysBoost() {
  const res = await fetch(TODAYS_BOOST_ENDPOINT);
  const data = await res.json();

  if (data?.builder && data?.status) {
    todaysBoostInfo = {
      builder: data.builder.toString().match(/(\d+)/)?.[1] || null,
      status: data.status
    };
  } else {
    todaysBoostInfo = null;
  }

  const box = document.getElementById("todaysBoost");
  if (box) box.innerHTML = "";
}

async function loadBoostPlan() {
  const table = document.getElementById("boost-plan-table");
  if (!table) return;

  try {
    const res = await fetch(BOOST_PLAN_ENDPOINT);
    const data = await res.json();
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

/* =========================
   RENDER BUILDER CARDS
   ========================= */
function renderBuilderCards() {
  if (!currentWorkData) return;

  const container = document.getElementById("builders-container");
  if (!container) return;
  container.innerHTML = "";

  let earliestFinish = Infinity;
  for (let i = 1; i < currentWorkData.length; i++) {
    const t = new Date(currentWorkData[i][2]).getTime();
    if (!isNaN(t) && t < earliestFinish) earliestFinish = t;
  }

  for (let i = 1; i < currentWorkData.length; i++) {
    const row = currentWorkData[i];
    const builderNumber = row[0].toString().match(/(\d+)/)?.[1] || null;
    const finishMs = new Date(row[2]).getTime();

    let badgeHTML = "";

    if (
      todaysBoostInfo &&
      builderNumber &&
      todaysBoostInfo.builder === builderNumber
    ) {
      let img = "Images/Builder Apprentice Safe.png";

      if (todaysBoostInfo.status === "FORCED") {
        img = "Images/Builder Apprentice Forced.png";
      } else if (todaysBoostInfo.status === "APPLIED") {
        img = "Images/Builder Apprentice Applied.png";
      }

      badgeHTML = `
        <img
          src="${img}"
          class="apprentice-badge ${
            todaysBoostInfo.status === "APPLIED" ? "" : "clickable-boost"
          }"
          data-apply-boost="true"
          title="Apply Today’s Boost"
        />
      `;
    }

    const card = document.createElement("div");
    card.className = "builder-card";
    if (finishMs === earliestFinish) card.classList.add("next-finish");

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
   ORCHESTRATOR
   ========================= */
async function refreshDashboard() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    await fetch(REFRESH_ENDPOINT);
    await Promise.all([loadCurrentWork(), loadTodaysBoost()]);
    renderBuilderCards();
    loadBoostPlan();
    updateLastRefreshed();
  } catch (e) {
    console.error("Refresh failed", e);
  } finally {
    isRefreshing = false;
  }
}

/* =========================
   INTERACTIONS
   ========================= */
function wireApprenticeBoost() {
  document.addEventListener("click", async e => {
    const badge = e.target.closest("[data-apply-boost]");
    if (!badge) return;
    if (todaysBoostInfo?.status === "APPLIED") return;
    if (!confirm("Apply today’s boost?")) return;

    await fetch(APPLY_TODAYS_BOOST);
    await refreshDashboard();
  });
}

function wireImageButtons() {
  document.getElementById("builderPotionBtn")?.addEventListener("click", async () => {
    await fetch(BUILDER_POTION);
    refreshDashboard();
  });

  document.getElementById("oneHourBoostBtn")?.addEventListener("click", async () => {
    await fetch(BUILDER_SNACK);
    refreshDashboard();
  });

  document.getElementById("battlePassBtn")?.addEventListener("click", async () => {
    await fetch(BATTLE_PASS);
    refreshDashboard();
  });
}

function wireBoostSimulation() {
  const btn = document.getElementById("runBoostSimBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Running…";
    await fetch(RUN_BOOST_SIM);
    await refreshDashboard();
    btn.textContent = "Run Boost Simulation";
    btn.disabled = false;
  });
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
  wireApprenticeBoost();
  wireImageButtons();
  wireBoostSimulation();
  wireBuilderPotionModal();
});
