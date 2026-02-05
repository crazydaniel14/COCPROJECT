console.log("Loaded script.js – CLEAN STABLE BUILD 2");

/* =========================
   CONFIG
   ========================= */
const API_BASE = 
   "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec"
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
const BUILDER_DETAILS_ENDPOINT = API_BASE + "?action=builder_details&builder=";

/* =========================
   GLOBAL STATE
   ========================= */
let isBuilderOpening = false;
let currentWorkData = null;
let todaysBoostInfo = null;
let isRefreshing = false;
let boostPlanData = [];
let currentBoostIndex = 0;
let expandedBuilder = null;
let pinnedBuilders = []; // holds builder numbers as strings

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
  try {
    const res = await fetch(BOOST_PLAN_ENDPOINT);
    const data = await res.json();

    if (!data?.table || data.table.length <= 1) {
      boostPlanData = [];
      return;
    }

    // Remove header row
    const rows = data.table.slice(1);

    boostPlanData = rows.map((row, index) => {
    const boostDate = row[0];
    const builderRaw = row[2];   // "Builder_6"
    const newFinish = row[4];
    const mode = row[5];

    return {
    day: index === 0 ? "TODAY" : boostDate,
    hasBoost: true,
    builder: builderRaw.replace("_", " "), // ← FIX
    newFinishTime: newFinish,
    mode
    };
    });

    currentBoostIndex = 0;
    renderBoostFocusCard();

  } catch (e) {
    console.error("Boost plan failed", e);
  }
}

/* =========================
   RENDER BOOST FOCUS CARD
   ========================= */
function renderBoostFocusCard() {
  if (!boostPlanData.length) return;

  const day = boostPlanData[currentBoostIndex];

  const dayEl = document.querySelector(".boost-day");
  const statusEl = document.querySelector(".boost-status");
  const builderEl = document.querySelector(".boost-builder");
  const extraEl = document.querySelector(".boost-extra");
  const finishEl = document.getElementById("boostFinishTime");
  const modeEl = document.getElementById("boostMode");

  if (!dayEl) return;

  dayEl.textContent = day.day;

  if (day.hasBoost) {
    statusEl.textContent = "Boost Planned For";
    statusEl.classList.add("boost-active");

    builderEl.textContent = day.builder;
    builderEl.style.display = "block";

    extraEl.style.display = "block";
    finishEl.textContent = day.newFinishTime;

    modeEl.textContent = day.mode;
    modeEl.className = "boost-mode " + day.mode.toLowerCase();
  } else {
    statusEl.textContent = "No Boost";
    statusEl.classList.remove("boost-active");

    builderEl.style.display = "none";
    extraEl.style.display = "none";
  }

  document.getElementById("boostPrev").disabled =
    currentBoostIndex === 0;

  document.getElementById("boostNext").disabled =
    currentBoostIndex === boostPlanData.length - 1;
}

/* =========================
   RENDER BUILDER CARDS
   ========================= */

async function fetchBuilderDetails(builderNumber) {
  const res = await fetch(
    BUILDER_DETAILS_ENDPOINT + "Builder_" + builderNumber
  );
  return await res.json();
}

function renderBuilderDetails(details) {
  const wrapper = document.createElement("div");
  wrapper.className = "builder-details";
  wrapper.dataset.builder = details.builder;

  wrapper.innerHTML = `
    <div class="builder-details-header">
      <label class="pin-builder">
        <input type="checkbox" />
        <span>Pin this builder</span>
      </label>
    </div>

    <div class="upgrade-headers">
      <span>Upgrade</span>
      <span>Duration</span>
      <span>Start → End</span>
    </div>

    <div class="upgrade-list">
      ${details.upgrades.map(upg => `
        <div class="upgrade-item"
             data-builder="${upg.builder}"
             data-row="${upg.row}">
          <div class="upgrade-name">${upg.upgrade}</div>
          <div class="upgrade-duration">${upg.duration}</div>
          <div class="upgrade-time">
            <span>${upg.start}</span>
            <span>→</span>
            <span>${upg.end}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  return wrapper;
}

function renderBuilderCards() {
  if (!currentWorkData) return;

  const container = document.getElementById("builders-container");
  // Remove existing details before opening another
  if (!container) return;
  // ✅ Do not re-render cards if they already exist
  if (container.children.length > 0) return;

   
  // 1️⃣ Find earliest finish time
  let earliestFinish = Infinity;
  for (let i = 1; i < currentWorkData.length; i++) {
    const t = new Date(currentWorkData[i][2]).getTime();
    if (!isNaN(t) && t < earliestFinish) {
      earliestFinish = t;
    }
  }

  // 2️⃣ Render builder cards
  for (let i = 1; i < currentWorkData.length; i++) {
    const row = currentWorkData[i];
    const builderNumber = row[0].toString().match(/(\d+)/)?.[1];
    const finishMs = new Date(row[2]).getTime();

    let badgeHTML = "";

    if (
      todaysBoostInfo &&
      builderNumber &&
      todaysBoostInfo.builder === builderNumber
    ) {
      let img;
      switch (todaysBoostInfo.status) {
        case "FORCED":
          img = "Images/Builder Apprentice Forced.png";
          break;
        case "APPLIED":
          img = "Images/Builder Apprentice applied.png";
          break;
        default:
          img = "Images/Builder Apprentice Safe.png";
      }

      badgeHTML = `
        <img
          src="${img}"
          class="apprentice-badge"
          data-apply-boost="true"
        />
      `;
    }

    const card = document.createElement("div");
    card.className = "builder-card";
    card.dataset.builder = builderNumber;

    if (finishMs === earliestFinish) {
      card.classList.add("next-finish");
    }

    card.innerHTML = `
      ${badgeHTML}
      <img 
        src="Images/Builder ${builderNumber}.png" 
        class="builder-character" 
        alt="Builder ${builderNumber}"
      />
      <div class="builder-text">
        <div class="builder-name">BUILDER ${builderNumber}</div>
        <div class="builder-upgrade">${row[1]}</div>
        <div class="builder-time-left">${row[3]}</div>
        <div class="builder-finish">
          Finishes: ${formatFinishTime(row[2])}
        </div>
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
    await loadBoostPlan();
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

    // Prevent double-apply
    if (todaysBoostInfo?.status === "APPLIED") return;

    if (!confirm("Apply today’s boost?")) return;

    try {
      await fetch(APPLY_TODAYS_BOOST);

      // 🔥 IMMEDIATE UI STATE UPDATE
      if (todaysBoostInfo) {
        todaysBoostInfo.status = "APPLIED";
      }

      await refreshDashboard(); // backend sync
    } catch (err) {
      console.error("Failed to apply today’s boost", err);
      alert("Failed to apply today’s boost.");
    }
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

function wireBuilderPotionModal() {
  const modal = document.getElementById("builderPotionModal");
  const openBtn = document.getElementById("builderPotionBtn");
  const cancelBtn = document.getElementById("cancelPotionBtn");
  const previewBtn = document.getElementById("previewPotionBtn");
  const confirmBtn = document.getElementById("confirmPotionBtn");
  const countInput = document.getElementById("potionCount");
  const previewBox = document.getElementById("builderPotionPreview");

  if (!modal || !openBtn) {
    console.warn("Builder Potion modal elements not found");
    return;
  }

  // Open modal
  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    previewBox.innerHTML = "";
    confirmBtn.disabled = true;
  });

  // Cancel
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Preview
  previewBtn.addEventListener("click", async () => {
    const times = Number(countInput.value);
    if (!times || times <= 0) {
      alert("Please enter a valid number.");
      return;
    }

    previewBox.innerHTML = "Loading preview…";

    try {
      const res = await fetch(
        `${API_BASE}?action=preview_builder_potion&times=${times}`
      );
      const data = await res.json();

      let html = `<strong>Applying ${times} potion(s):</strong><br><br>`;
      data.preview.forEach(row => {
        html += `
          ${row.builder}:<br>
          ${new Date(row.oldTime).toLocaleString()} →
          ${new Date(row.newTime).toLocaleString()}<br><br>
        `;
      });

      previewBox.innerHTML = html;
      confirmBtn.disabled = false;
    } catch (err) {
      console.error(err);
      previewBox.innerHTML = "Failed to load preview.";
    }
  });

  // Confirm
  confirmBtn.addEventListener("click", async () => {
    const times = Number(countInput.value);
    confirmBtn.disabled = true;
    previewBox.innerHTML = "Applying…";

    try {
      await fetch(
        `${API_BASE}?action=apply_builder_potion&times=${times}`
      );
      modal.classList.add("hidden");
      await refreshDashboard();
    } catch (err) {
      console.error(err);
      previewBox.innerHTML = "Failed to apply potion.";
    }
  });
}

function wireBuilderSnackModal() {
  const btn = document.getElementById("oneHourBoostBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // Point modal to Builder Snack backend actions
    currentPreviewAction = "preview_one_hour_boost";
    currentApplyAction = "apply_one_hour_boost";

    // Reset modal UI
    const previewBox = document.getElementById("builderSnackPreview");
    const confirmBtn = document.getElementById("confirmSnackBtn");

    if (previewBox) previewBox.innerHTML = "";
    if (confirmBtn) confirmBtn.disabled = true;

    // Make sure input is enabled (multiple times allowed)
    const input = document.getElementById("SnackCount");
    if (input) {
      input.disabled = false;
      input.value = 1;
    }

    // Open the SAME modal
    document
      .getElementById("builderSnackModal")
      .classList.remove("hidden");
  });
}

function wireBoostFocusNavigation() {
  document.getElementById("boostPrev")?.addEventListener("click", () => {
    if (currentBoostIndex > 0) {
      currentBoostIndex--;
      renderBoostFocusCard();
    }
  });

  document.getElementById("boostNext")?.addEventListener("click", () => {
    if (currentBoostIndex < boostPlanData.length - 1) {
      currentBoostIndex++;
      renderBoostFocusCard();
    }
  });
}

document.addEventListener("change", e => {
  if (!e.target.matches(".pin-builder input")) return;

  const details = e.target.closest(".builder-details");
  if (!details) return;

  const builder = details.dataset.builder;

  if (e.target.checked) {
    if (!pinnedBuilders.includes(builder)) {
      pinnedBuilders.push(builder);
    }
  } else {
    pinnedBuilders = pinnedBuilders.filter(b => b !== builder);
  }

  console.log("Pinned builders:", pinnedBuilders);
});

document.addEventListener("click", async e => {
  const card = e.target.closest(".builder-card");
  if (!card) return;
  if (e.target.matches("input[type='checkbox']")) return;
  // 🚫 BLOCK SPAM CLICKS
  if (isBuilderOpening) return;
  isBuilderOpening = true;

  const builder = card.dataset.builder;
  if (!builder) return;

  const container = document.getElementById("builders-container");

  // Collapse if clicking the same builder
  if (expandedBuilder === builder) {
  expandedBuilder = null;
  card.classList.remove("expanded");
  container.querySelectorAll(".builder-details").forEach(el => el.remove());
  isBuilderOpening = false; // 🔓 unlock clicks
  return;
  }

  // Collapse others
  container.querySelectorAll(".builder-details").forEach(el => el.remove());
  container.querySelectorAll(".builder-card.expanded")
    .forEach(c => c.classList.remove("expanded"));

  // Expand clicked builder
  expandedBuilder = builder;
  card.classList.add("expanded");

try {
  const builderDetails = await fetchBuilderDetails(builder);
  const detailsEl = renderBuilderDetails(builderDetails);
  card.after(detailsEl);
} finally {
  isBuilderOpening = false; // 🔓 always unlock
}
});
/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {

  await refreshDashboard();
  startAutoRefresh();
  wireApprenticeBoost();
  wireBoostSimulation();
  wireBuilderPotionModal();
  wireBuilderSnackModal();
  wireBoostFocusNavigation();
});
