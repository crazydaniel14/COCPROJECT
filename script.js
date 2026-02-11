console.log("Loaded script.js – v1");

/* =========================
   CONFIG
   ========================= */
const API_BASE = 
    "https://script.google.com/macros/s/AKfycbwdK5Ynu-8_noqHwHXv5p0629SxDinFPr1crkiX4tL2yl5HDpTXLjx7ij2EkBk25Li3VA/exec"
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
   IMAGE MATCHING
   ========================= */
const HERO_NAMES = [
  "Archer Queen",
  "Barbarian King",
  "Grand Warden",
  "Minion Prince",
  "Royal Champion"
];

// Map of available images with level ranges
const IMAGE_MAP = {
  "Air Bomb": ["Lvl 11"],"Archer Tower": ["Lvl 21"],"Blacksmith": ["Lvl 9"],"Bomb": ["Lvl 11&12", "Lvl 13&14"],"Builder Hut": ["Level 7&8&9"],"Dark Elixir Drill": ["Lvl 10", "Lvl 11"],
  "Dark Elixir Storage": ["Lvl 12"],"Elixir Collector": ["Lvl 17"],"Elixir Storage": ["Lvl 18"],"Giant Bomb": ["Lvl 7&8", "Lvl 9&10"],"Gold Mine": ["Lvl 17"],"Gold Storage": ["Lvl 18"],
  "Monolith": ["Lvl 2"],"Hidden Tesla": ["Lvl 16"],"Mortar": ["Lvl 17"],"Scattershot": ["Lvl 6&7&8"],"Seeking Air Mine": ["Lvl 5&6"],"Spring Trap": ["Lvl 7&8", "Lvl 9&10"],
  "Town Hall": ["Lvl 18"],"Wizard Tower": ["Lvl 17"],"Workshop": ["Lvl 8"],"X-Bow": ["Lvl 12&13&14"]
};

function getUpgradeImage(upgradeName) {
  const basePath = "Images/Upgrades/";
  
  // 1. Check if it's a hero (ignore level)
  for (const hero of HERO_NAMES) {
    if (upgradeName.includes(hero)) {
      return basePath + hero + ".png";
    }
  }
  
  // 2. Extract base name and level number
  // Example: "Mortar #3 Lvl 17" → baseName: "Mortar", level: 17
  const match = upgradeName.match(/^(.+?)\s*(?:#\d+)?\s+(?:Level|Lvl)\s+(\d+)/i);
  
  if (!match) {
    return basePath + "PH.png";
  }
  
  const baseName = match[1].trim();
  const levelNum = parseInt(match[2]);
  
  // 3. Check if we have this building in our map
  if (!IMAGE_MAP[baseName]) {
    return basePath + "PH.png";
  }
  
  // 4. Find matching image (exact or range)
  for (const levelStr of IMAGE_MAP[baseName]) {
    // Check for exact match first
    if (levelStr === `Lvl ${levelNum}` || levelStr === `Level ${levelNum}`) {
      return basePath + baseName + " " + levelStr + ".png";
    }
    
    // Check for range match (e.g., "Lvl 7&8" or "Level 7&8&9")
    if (levelStr.includes("&")) {
      const levels = levelStr.match(/\d+/g).map(Number);
      if (levels.includes(levelNum)) {
        return basePath + baseName + " " + levelStr + ".png";
      }
    }
  }
  
  // 5. No match found
  return basePath + "PH.png";
}

/* =========================
   GLOBAL STATE
   ========================= */
let currentWorkData = null;
let todaysBoostInfo = null;
let isRefreshing = false;
let boostPlanData = [];
let currentBoostIndex = 0;
let expandedBuilder = null;
let openBuilders = []; // max 2 builders open at once
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
const match = details.builder.toString().match(/(\d+)/);
wrapper.dataset.builder = match ? match[1] : "";

  wrapper.innerHTML = `
    <div class="builder-details-header"></div>
    <div class="upgrade-headers">
      <span>Future Upgrades</span>
      <span>Duration</span>
      <span>Start and End dates</span>
    </div>

    <div class="upgrade-list">
      ${details.upgrades.map(upg => {
        const imgSrc = getUpgradeImage(upg.upgrade);
        return `
          <div class="upgrade-item"
               data-builder="${upg.builder}"
               data-row="${upg.row}">
            <div class="upgrade-name">
              <img src="${imgSrc}" 
                   class="upgrade-icon" 
                   alt="${upg.upgrade}"
                   onerror="this.src='Images/Upgrades/PH.png'" />
              <span>${upg.upgrade}</span>
            </div>
            <div class="upgrade-duration">${upg.duration}</div>
            <div class="upgrade-time">
              <span>${upg.start}</span>
              <span>→</span>
              <span>${upg.end}</span>
            </div>
          </div>
        `;
      }).join("")}
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
    
    // Get upgrade images for current and next
    const currentUpgradeImg = getUpgradeImage(row[1]);
    const nextUpgradeImg = getUpgradeImage(row[4]);

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
      <img src="${currentUpgradeImg}" 
           class="current-upgrade-icon" 
           alt="${row[1]}"
           onerror="this.src='Images/Upgrades/PH.png'" />
      <div class="builder-text">
        <div class="builder-name">BUILDER ${builderNumber}</div>
        <div class="builder-upgrade">${row[1]}</div>
        <div class="builder-time-left">${row[3]}</div>
        <div class="builder-finish">
          Finishes: ${formatFinishTime(row[2])}
        </div>
        <div class="builder-next">
          ▶ Next: ${row[4]}
        </div>
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
    e.stopPropagation();
     
    // Prevent double-apply
    if (todaysBoostInfo?.status === "APPLIED") return;

    if (!confirm("Apply today's boost?")) return;

    try {
      await fetch(APPLY_TODAYS_BOOST);

      // 🔥 IMMEDIATE UI STATE UPDATE
      if (todaysBoostInfo) {
        todaysBoostInfo.status = "APPLIED";
      }

      await refreshDashboard(); // backend sync
    } catch (err) {
      console.error("Failed to apply today's boost", err);
      alert("Failed to apply today's boost.");
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

document.addEventListener("click", async e => {
  const card = e.target.closest(".builder-card");
  if (!card) return;

  const builder = card.dataset.builder;
  if (!builder) return;

  const container = document.getElementById("builders-container");

  // 🔁 CASE 1: Builder already open → CLOSE it
  if (openBuilders.includes(builder)) {
    openBuilders = openBuilders.filter(b => b !== builder);

    card.classList.remove("expanded");
    container
    .querySelectorAll(`.builder-details[data-builder="${builder}"]`)
    .forEach(el => el.remove());
    return;
  }

  // 🔓 CASE 2: Opening a new builder

  // If already 2 open → close the oldest
  if (openBuilders.length === 2) {
    const oldest = openBuilders.shift();

    document
      .querySelector(`.builder-card[data-builder="${oldest}"]`)
      ?.classList.remove("expanded");

    container
      .querySelectorAll(`.builder-details[data-builder="${oldest}"]`)
      .forEach(el => el.remove());
  }

  // Open this builder
  openBuilders.push(builder);
  card.classList.add("expanded");

  const builderDetails = await fetchBuilderDetails(builder);
  const detailsEl = renderBuilderDetails(builderDetails);
  card.after(detailsEl);
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
