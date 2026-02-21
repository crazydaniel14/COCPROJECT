console.log("Loaded script.js – v6-all-fixes");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbzaxmuwpTD9cUzrz4e4k75caCpQrTjEDefs-B5nuEaqlFoMrBHjrhDun3Iy7kPkc9j2/exec";

function endpoint(action) {
  return `${API_BASE}?action=${action}&username=${window.COC_USERNAME}`;
}

const REFRESH_ENDPOINT      = API_BASE + "?action=refresh_sheet";
function TODAYS_BOOST_URL()       { return endpoint("todays_boost"); }
function BOOST_PLAN_URL()         { return endpoint("boost_plan"); }
function APPLY_TODAYS_BOOST_URL() { return endpoint("apply_todays_boost"); }
function SET_BOOST_BUILDER_URL(b) { return endpoint("set_todays_boost_builder") + "&builder=" + b; }

function BUILDER_SNACK_URL()  { return endpoint("apply_one_hour_boost"); }
function BATTLE_PASS_URL()    { return endpoint("apply_battle_pass"); }
function BUILDER_DETAILS_URL(builderName) { return endpoint("builder_details") + "&builder=" + builderName; }
function PAUSED_BUILDERS_URL() { return endpoint("get_paused_builders"); }

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

const IMAGE_MAP = {
  "Air Bomb": ["Lvl 11"],
  "Archer Tower": ["Lvl 21"],
  "Blacksmith": ["Lvl 9"],
  "Bomb": ["Lvl 11&12", "Lvl 13&14"],
  "Builder Hut": ["Level 7&8&9"],
  "Dark Elixir Drill": ["Lvl 10", "Lvl 11"],
  "Dark Elixir Storage": ["Lvl 12"],
  "Elixir Collector": ["Lvl 17"],
  "Elixir Storage": ["Lvl 18"],
  "Giant Bomb": ["Lvl 6", "Lvl 7&8", "Lvl 9&10"],
  "Gold Mine": ["Lvl 17"],
  "Gold Storage": ["Lvl 18"],
  "Hidden Tesla": ["Lvl 16"],
  "Monolith": ["Lvl 2&3&4"],
  "Mortar": ["Lvl 17"],
  "Scattershot": ["Lvl 6&7&8"],
  "Seeking Air Mine": ["Lvl 5&6"],
  "Spring Trap": ["Lvl 7&8", "Lvl 9&10"],
  "Town Hall": ["Lvl 18"],
  "Wizard Tower": ["Lvl 17"],
  "Workshop": ["Lvl 8"],
  "X-Bow": ["Lvl 12&13&14"]
};

function getUpgradeImage(upgradeName) {
  const basePath = "Images/Upgrades/";
  for (const hero of HERO_NAMES) {
    if (upgradeName.includes(hero)) return basePath + hero + ".png";
  }
  const match = upgradeName.match(/^(.+?)\s*(?:#\d+)?\s+(?:Level|Lvl)\s+(\d+)/i);
  if (!match) return basePath + "PH.png";
  const baseName = match[1].trim();
  const levelNum = parseInt(match[2]);
  if (!IMAGE_MAP[baseName]) return basePath + "PH.png";
  for (const levelStr of IMAGE_MAP[baseName]) {
    if (levelStr === `Lvl ${levelNum}` || levelStr === `Level ${levelNum}`)
      return basePath + baseName + " " + levelStr + ".png";
    if (levelStr.includes("&")) {
      const levels = levelStr.match(/\d+/g).map(Number);
      if (levels.includes(levelNum))
        return basePath + baseName + " " + levelStr + ".png";
    }
  }
  return basePath + "PH.png";
}

/* =========================
   GLOBAL STATE
   ========================= */
let currentWorkData = null;
let todaysBoostInfo = null;
let isRefreshing = false;
let reviewedTabs = new Set();
let finishedUpgradesData = null;
let boostPlanData = [];
let currentBoostIndex = 0;
let openBuilders = [];
let loadingBuilders = new Set();
let lastActiveStatusUpdate = 0;

/* =========================
   HELPERS
   ========================= */
function formatFinishTime(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return "-";
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  }).replace(",", " at");
}

function updateLastRefreshed() {
  const el = document.getElementById("lastRefreshed");
  if (!el) return;
  el.textContent = "Last refreshed: " + new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

/**
 * FIX #2: Robust date parsing for scheduledStart strings like "Feb 19 3:00 PM"
 * Apps Script Utilities.formatDate produces "MMM dd h:mm a" format.
 * We parse it properly with current year, falling back gracefully.
 */
function parseScheduledStart(scheduledStart) {
  if (!scheduledStart) return null;
  // Try appending current year first, then next year
  const currentYear = new Date().getFullYear();
  for (const year of [currentYear, currentYear + 1]) {
    const d = new Date(`${scheduledStart} ${year}`);
    if (!isNaN(d.getTime())) return d;
  }
  // Last resort: direct parse
  const d = new Date(scheduledStart);
  return isNaN(d.getTime()) ? null : d;
}

/* =========================
   SMART ACTIVE STATUS UPDATE
   ========================= */
async function updateActiveStatusSmart() {
  const now = Date.now();
  if (now - lastActiveStatusUpdate < 5 * 60 * 1000) return;
  try {
    await fetch(endpoint("update_active_status"));
    lastActiveStatusUpdate = now;
  } catch (e) { console.error("Failed to update Active? status:", e); }
}

/* =========================
   SOFT REFRESH
   ========================= */
async function softRefreshBuilderCards() {
  if (openBuilders.length > 0) {
    console.log("[Soft Refresh] Skipped - builder details open");
    return;
  }
  console.log("[Soft Refresh] Starting...");
  try {
    await loadCurrentWork();
    await loadTodaysBoost();
    await loadPausedBuilders();
    const container = document.getElementById("builders-container");
    if (container) {
      console.log("[Soft Refresh] Clearing and re-rendering cards");
      container.innerHTML = "";
      renderBuilderCards();
    }
  } catch (e) { console.error("Soft refresh failed:", e); }
}

/* =========================
   DATA LOADERS
   ========================= */
async function loadCurrentWork() {
  const res = await fetch(endpoint("current_work_table"));
  currentWorkData = await res.json();
}

async function loadTodaysBoost() {
  const res = await fetch(TODAYS_BOOST_URL());
  const data = await res.json();
  if (data?.builder && data?.status) {
    todaysBoostInfo = {
      builder: data.builder.toString().match(/(\d+)/)?.[1] || null,
      status: data.status
    };
  } else {
    todaysBoostInfo = null;
  }
}

async function loadPausedBuilders() {
  try {
    const res = await fetch(PAUSED_BUILDERS_URL());
    window._pausedBuilders = await res.json();
  } catch (e) {
    console.error("Failed to load paused builders:", e);
    window._pausedBuilders = {};
  }
}

async function loadBoostPlan() {
  try {
    const res = await fetch(BOOST_PLAN_URL());
    const data = await res.json();
    if (!data?.table || data.table.length <= 1) { boostPlanData = []; return; }
    boostPlanData = data.table.slice(1).map((row, i) => ({
      day: i === 0 ? "TODAY" : row[0],
      hasBoost: true,
      builder: row[2].replace("_", " "),
      newFinishTime: row[4],
      mode: row[5]
    }));
    currentBoostIndex = 0;
    renderBoostFocusCard();
  } catch (e) { console.error("Boost plan failed", e); }
}

async function refreshDashboard() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    updateActiveStatusSmart();
    await fetch(REFRESH_ENDPOINT);
    await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadPausedBuilders()]);
    // FIX #1: Always clear container before rendering to avoid stale state
    if (openBuilders.length === 0) {
      const container = document.getElementById("builders-container");
      if (container) container.innerHTML = "";
      renderBuilderCards();
    }
    await loadBoostPlan();
    updateLastRefreshed();
    // Check for finished upgrades on each refresh (has 2-min cooldown built in)
    checkForFinishedUpgrades();
  } catch (e) {
    console.error("Refresh failed", e);
  } finally {
    isRefreshing = false;
  }
}

/* =========================
   RENDER BOOST FOCUS CARD
   ========================= */
function renderBoostFocusCard() {
  if (!boostPlanData.length) return;
  const day       = boostPlanData[currentBoostIndex];
  const dayEl     = document.querySelector(".boost-day");
  const statusEl  = document.querySelector(".boost-status");
  const builderEl = document.querySelector(".boost-builder");
  const extraEl   = document.querySelector(".boost-extra");
  const finishEl  = document.getElementById("boostFinishTime");
  const modeEl    = document.getElementById("boostMode");
  const menuBtn   = document.getElementById("boostMenuBtn");
  const dropdown  = document.getElementById("boostBuilderDropdown");
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
    if (menuBtn && dropdown && day.day === "TODAY") {
      if (todaysBoostInfo?.status === "APPLIED") {
        menuBtn.style.opacity = "0.3";
        menuBtn.style.cursor = "not-allowed";
        menuBtn.disabled = true;
      } else {
        menuBtn.style.opacity = "1";
        menuBtn.style.cursor = "pointer";
        menuBtn.disabled = false;
        const currentBuilderNum = todaysBoostInfo?.builder;
        dropdown.querySelectorAll("[data-builder-select]").forEach(btn => {
          const n = btn.dataset.builderSelect.match(/(\d+)/)?.[1];
          btn.style.display = n === currentBuilderNum ? "none" : "block";
        });
      }
      menuBtn.style.display = "block";
    } else if (menuBtn) {
      menuBtn.style.display = "none";
    }
  } else {
    statusEl.textContent = "No Boost";
    statusEl.classList.remove("boost-active");
    builderEl.style.display = "none";
    extraEl.style.display = "none";
    if (menuBtn) menuBtn.style.display = "none";
  }
  document.getElementById("boostPrev").disabled = currentBoostIndex === 0;
  document.getElementById("boostNext").disabled = currentBoostIndex === boostPlanData.length - 1;
}

/* =========================
   BUILDER CARDS
   ========================= */
async function fetchBuilderDetails(builderNumber) {
  const res  = await fetch(endpoint("builder_details") + "&builder=Builder_" + builderNumber);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.builder) throw new Error("Unexpected response: " + JSON.stringify(data));
  return data;
}

function renderBuilderDetails(details) {
  const wrapper = document.createElement("div");
  wrapper.className = "builder-details";
  const match = details.builder.toString().match(/(\d+)/);
  wrapper.dataset.builder = match ? match[1] : "";
  const originalOrder = details.upgrades.map((_, i) => i);
  wrapper.innerHTML = `
    <div class="builder-details-header">
      <button class="builder-refresh-btn" title="Refresh builder data">🔄</button>
    </div>
    <div class="upgrade-headers">
      <span></span><span>Future Upgrades</span><span>Duration</span>
      <span>Start and End dates</span><span></span>
    </div>
    <div class="upgrade-list" data-original-order="${originalOrder.join(',')}">
      ${details.upgrades.map((upg, idx) => {
        const imgSrc = getUpgradeImage(upg.upgrade);
        const totalMinutes = upg.durationMinutes || 0;
        return `
          <div class="upgrade-item"
               data-builder="${upg.builder}" data-row="${upg.row}"
               data-index="${idx}" data-upgrade-name="${upg.upgrade}"
               data-duration-minutes="${totalMinutes}" draggable="true">
            <div class="drag-handle">⋮⋮</div>
            <div class="upgrade-name">
              <img src="${imgSrc}" class="upgrade-icon" alt="${upg.upgrade}"
                   onerror="this.src='Images/Upgrades/PH.png'" />
              <span>${upg.upgrade}</span>
            </div>
            <div class="upgrade-duration editable-duration" data-index="${idx}">${upg.duration}</div>
            <div class="upgrade-time">
              <span>${upg.start}</span><span>→</span><span>${upg.end}</span>
            </div>
            <div class="upgrade-controls">
              <button class="transfer-builder-btn"
                      data-upgrade-name="${upg.upgrade}"
                      data-current-builder="${upg.builder}"
                      data-row="${upg.row}"
                      title="Move to another builder">👤</button>
              <div class="drag-handle">⋮⋮</div>
            </div>
          </div>`;
      }).join("")}
    </div>
    <div class="save-order-container hidden">
      <button class="save-order-btn">Save Order</button>
      <button class="cancel-order-btn">Cancel</button>
    </div>`;
  setTimeout(() => {
    setupDragAndDrop(wrapper);
    setupDurationEditor(wrapper);
    setupBuilderTransfer(wrapper);
    setupBuilderRefresh(wrapper);
  }, 0);
  return wrapper;
}

function formatBoostTime(timeStr) {
  try {
    const d = new Date(timeStr + " 2026");
    if (isNaN(d)) return "";
    const month = d.getMonth() + 1;
    const day   = d.getDate();
    let hours   = d.getHours();
    const mins  = String(d.getMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${month}/${day} ${hours}:${mins}${ampm}`;
  } catch (e) { return ""; }
}

function getBoostFinishTimeForBuilder(builderNumber) {
  if (!boostPlanData || boostPlanData.length === 0) return null;
  // Return the FIRST (soonest/today's) boost for this builder, not the last
  for (const day of boostPlanData) {
    if (!day.hasBoost) continue;
    const boostBuilderNum = day.builder.match(/(\d+)/)?.[1];
    if (boostBuilderNum !== builderNumber) continue;
    return day.newFinishTime; // stop at first match
  }
  return null;
}

function renderSkeletonCards(count = 6) {
  const container = document.getElementById("builders-container");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "builder-card skeleton";
    card.innerHTML = `
      <div class="skeleton-character"></div>
      <div class="skeleton-icon"></div>
      <div class="skeleton-builder-text">
        <div class="skeleton-block" style="width:70%;height:14px;"></div>
        <div class="skeleton-block" style="width:90%;height:13px;"></div>
        <div class="skeleton-block" style="width:60%;height:22px;margin-top:4px;"></div>
        <div class="skeleton-block" style="width:80%;height:11px;"></div>
        <div class="skeleton-block" style="width:75%;height:11px;"></div>
      </div>`;
    container.appendChild(card);
  }
}

function renderBuilderCards() {
  console.log("[Render] renderBuilderCards called");
  if (!currentWorkData) { console.log("[Render] No currentWorkData"); return; }
  const container = document.getElementById("builders-container");
  if (!container) { console.log("[Render] No container found"); return; }
  console.log("[Render] Proceeding to render cards");

  let earliestFinish = Infinity;
  for (let i = 1; i < currentWorkData.length; i++) {
    const t = new Date(currentWorkData[i][2]).getTime();
    if (!isNaN(t) && t < earliestFinish) earliestFinish = t;
  }

  for (let i = 1; i < currentWorkData.length; i++) {
    const row               = currentWorkData[i];
    const builderNumber     = row[0].toString().match(/(\d+)/)?.[1];
    const finishMs          = new Date(row[2]).getTime();
    const currentUpgradeImg = getUpgradeImage(row[1]);

    const builderKey = `${window.COC_USERNAME}_Builder_${builderNumber}`;
    const pauseInfo  = window._pausedBuilders?.[builderKey];
    const isPaused   = pauseInfo?.paused === true;

    const card = document.createElement("div");
    card.className = "builder-card";
    card.dataset.builder = builderNumber;

    if (!isPaused && finishMs === earliestFinish) card.classList.add("next-finish");

    if (isPaused) {
      card.classList.add("paused");
      const pausedUpgradeImg = getUpgradeImage(pauseInfo.upgradeName || "");
      card.innerHTML = `
        <img src="Images/Builders/Builder ${builderNumber}.png"
             class="builder-character" alt="Builder ${builderNumber}" />
        <img src="${pausedUpgradeImg}" class="current-upgrade-icon"
             alt="${pauseInfo.upgradeName || ''}" onerror="this.src='Images/Upgrades/PH.png'" />
        <div class="builder-text">
          <div class="pause-badge">⏸️ Paused</div>
          <div class="builder-name">BUILDER ${builderNumber}</div>
          <div class="builder-upgrade">${pauseInfo.upgradeName || "Waiting to start"}</div>
          <button class="start-builder-btn"
                  data-builder="${builderNumber}"
                  data-upgrade="${pauseInfo.upgradeName || ''}"
                  data-duration="${pauseInfo.duration || ''}">
            ▶️ Start This Upgrade
          </button>
        </div>`;
    } else {
      let badgeHTML = "";
      if (todaysBoostInfo && builderNumber && todaysBoostInfo.builder === builderNumber) {
        let img;
        switch (todaysBoostInfo.status) {
          case "FORCED":  img = "Images/Badge/Builder Apprentice Forced.png";  break;
          case "APPLIED": img = "Images/Badge/Builder Apprentice applied.png"; break;
          default:        img = "Images/Badge/Builder Apprentice Safe.png";
        }
        badgeHTML = `<img src="${img}" class="apprentice-badge" data-apply-boost="true" />`;
      }
      const boostFinish = getBoostFinishTimeForBuilder(builderNumber, row[1]);
      const boostHTML   = boostFinish
        ? `<span class="boost-finish-indicator">${formatBoostTime(boostFinish)}</span>`
        : '';

      card.innerHTML = `
        ${badgeHTML}
        <img src="Images/Builders/Builder ${builderNumber}.png"
             class="builder-character" alt="Builder ${builderNumber}" />
        <img src="${currentUpgradeImg}" class="current-upgrade-icon"
             alt="${row[1]}" onerror="this.src='Images/Upgrades/PH.png'" />
        <div class="builder-text">
          <div class="builder-name">BUILDER ${builderNumber}${boostHTML}</div>
          <div class="builder-upgrade">${row[1]}</div>
          <div class="builder-time-left editable-card-duration"
               data-builder="Builder_${builderNumber}" data-upgrade="${row[1]}"
               data-row="2" title="Click to edit duration">${row[3]}</div>
          <div class="builder-finish">Finishes: ${formatFinishTime(row[2])}</div>
          <div class="builder-next">
            <img src="${getUpgradeImage(row[4])}" class="next-upgrade-icon"
                 alt="${row[4]}" onerror="this.src='Images/Upgrades/PH.png'" />
            ▶ Next: ${row[4]}
          </div>
        </div>`;
      const durationEl = card.querySelector('.editable-card-duration');
      if (durationEl) setupCardDurationEditor(durationEl);
    }

    container.appendChild(card);
  }

  wirePausedBuilderButtons();
}

/* =========================
   DURATION EDITING
   ========================= */
function setupCardDurationEditor(durationEl) {
  durationEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const builderName = durationEl.dataset.builder;
    const upgradeName = durationEl.dataset.upgrade;
    const timeText    = durationEl.textContent.trim();
    let match = timeText.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/)
             || timeText.match(/(\d+)\s*(?:d|days?)\s*(\d+)\s*(?:h|hr|hours?)\s*(\d+)\s*(?:m|min|minutes?)/i);
    if (!match) {
      const tm = timeText.match(/(\d+):(\d+)(?::(\d+))?/);
      if (tm) match = ['', '0', tm[1], tm[2]];
    }
    if (!match) { alert('Unable to parse current duration. Format should be like "3 d 14 hr 0 min"'); return; }
    const days = parseInt(match[1])||0, hours = parseInt(match[2])||0, mins = parseInt(match[3])||0;
    showDurationPicker(days, hours, mins, (nd, nh, nm) => {
      const newTotalMinutes = nd*24*60+nh*60+nm;
      const newDurationHr   = `${nd} d ${nh} hr ${nm} min`;
      if (confirm(`Change duration of "${upgradeName}" to ${newDurationHr}?`))
        updateCardDuration(builderName, newTotalMinutes, newDurationHr, durationEl);
    });
  });
}

async function updateCardDuration(builderName, newMinutes, newDurationHr, durationEl) {
  const originalText = durationEl.textContent;
  durationEl.textContent = 'Saving...';
  try {
    const res  = await fetch(`${API_BASE}?action=update_active_upgrade_time&username=${window.COC_USERNAME}&builder=${builderName}&remaining_minutes=${newMinutes}`);
    const data = await res.json();
    if (data.error) { alert('Failed to update: ' + data.error); durationEl.textContent = originalText; return; }
    durationEl.textContent = '✓ Saved!';
    suppressFinishedCheckFor(60 * 1000);
    setTimeout(async () => {
      const container = document.getElementById("builders-container");
      container.innerHTML = "";
      await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadPausedBuilders()]);
      renderBuilderCards();
    }, 800);
  } catch (err) {
    console.error('Update failed:', err);
    alert('Failed to update duration');
    durationEl.textContent = originalText;
  }
}

function setupDurationEditor(detailsWrapper) {
  detailsWrapper.querySelectorAll('.editable-duration').forEach(durationEl => {
    durationEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const upgradeItem    = durationEl.closest('.upgrade-item');
      const currentMinutes = parseInt(upgradeItem.dataset.durationMinutes);
      const upgradeName    = upgradeItem.dataset.upgradeName;
      const builderName    = upgradeItem.dataset.builder;
      const row            = upgradeItem.dataset.row;
      const d = Math.floor(currentMinutes/(24*60)),
            h = Math.floor((currentMinutes%(24*60))/60),
            m = currentMinutes%60;
      showDurationPicker(d, h, m, (nd, nh, nm) => {
        const newTotalMinutes = nd*24*60+nh*60+nm;
        const newDurationHr   = `${nd} d ${nh} hr ${nm} min`;
        if (confirm(`Change duration of "${upgradeName}" to ${newDurationHr}?`))
          updateUpgradeDuration(builderName, row, newTotalMinutes, newDurationHr, durationEl, detailsWrapper);
      });
    });
  });
}

function showDurationPicker(initialDays, initialHours, initialMins, callback) {
  const modal = document.createElement('div');
  modal.className = 'duration-picker-modal';
  modal.innerHTML = `
    <div class="duration-picker-content">
      <h3>Set Duration</h3>
      <div class="duration-inputs">
        <div class="duration-input-group">
          <label>Days</label>
          <div class="number-input-wrapper">
            <button class="number-btn number-up" data-input="days">+</button>
            <input type="number" id="picker-days" min="0" max="365" value="${initialDays}">
            <button class="number-btn number-down" data-input="days">−</button>
          </div>
        </div>
        <div class="duration-input-group">
          <label>Hours</label>
          <div class="number-input-wrapper">
            <button class="number-btn number-up" data-input="hours">+</button>
            <input type="number" id="picker-hours" min="0" max="23" value="${initialHours}">
            <button class="number-btn number-down" data-input="hours">−</button>
          </div>
        </div>
        <div class="duration-input-group">
          <label>Minutes</label>
          <div class="number-input-wrapper">
            <button class="number-btn number-up" data-input="mins">+</button>
            <input type="number" id="picker-mins" min="0" max="59" value="${initialMins}">
            <button class="number-btn number-down" data-input="mins">−</button>
          </div>
        </div>
      </div>
      <div class="duration-picker-actions">
        <button class="duration-confirm-btn">Confirm</button>
        <button class="duration-cancel-btn">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('picker-days')?.focus(), 100);
  modal.querySelectorAll('.number-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.getElementById(`picker-${btn.dataset.input}`);
      const isUp  = btn.classList.contains('number-up');
      const cur   = parseInt(input.value)||0;
      if (isUp  && cur < parseInt(input.max)) input.value = cur+1;
      if (!isUp && cur > parseInt(input.min)) input.value = cur-1;
    });
  });
  modal.querySelector('.duration-confirm-btn').addEventListener('click', () => {
    const d = parseInt(document.getElementById('picker-days').value)||0;
    const h = parseInt(document.getElementById('picker-hours').value)||0;
    const m = parseInt(document.getElementById('picker-mins').value)||0;
    modal.remove(); callback(d, h, m);
  });
  modal.querySelector('.duration-cancel-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function updateUpgradeDuration(builderName, row, newMinutes, newDurationHr, durationEl, detailsWrapper) {
  const originalText = durationEl.textContent;
  durationEl.textContent = 'Saving...';
  try {
    const res  = await fetch(`${API_BASE}?action=update_upgrade_duration&username=${window.COC_USERNAME}&builder=${builderName}&row=${row}&minutes=${newMinutes}&duration_hr=${encodeURIComponent(newDurationHr)}`);
    const data = await res.json();
    if (data.error) { alert('Failed to update: ' + data.error); durationEl.textContent = originalText; return; }
    durationEl.textContent = '✓ Saved!';
    setTimeout(() => {
      fetchBuilderDetails(detailsWrapper.dataset.builder).then(bd => {
        if (bd && bd.builder) { detailsWrapper.replaceWith(renderBuilderDetails(bd)); }
        else { console.error('Bad response from fetchBuilderDetails:', bd); alert('Failed to reload builder details.'); }
      });
    }, 800);
  } catch (err) {
    console.error('Update failed:', err);
    alert('Failed to update duration');
    durationEl.textContent = originalText;
  }
}

/* =========================
   BUILDER REFRESH
   ========================= */
function setupBuilderRefresh(detailsWrapper) {
  const refreshBtn = detailsWrapper.querySelector('.builder-refresh-btn');
  if (!refreshBtn) return;
  refreshBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const orig = refreshBtn.textContent;
    refreshBtn.textContent = '⟳'; refreshBtn.disabled = true; refreshBtn.classList.add('spinning');
    try {
      (async () => {
        try {
          const bd = await fetchBuilderDetails(detailsWrapper.dataset.builder);
          if (bd && bd.builder) { detailsWrapper.replaceWith(renderBuilderDetails(bd)); }
          else { console.error('Bad response from fetchBuilderDetails:', bd); alert('Failed to reload builder details.'); }
        } catch (e) { console.error('Refresh failed:', e); alert('Failed to reload builder: ' + e.message); }
      })();
    } catch (err) {
      refreshBtn.textContent = orig; refreshBtn.disabled = false; refreshBtn.classList.remove('spinning');
    }
  });
}

/* =========================
   BUILDER TRANSFER
   ========================= */
function setupBuilderTransfer(detailsWrapper) {
  detailsWrapper.querySelectorAll('.transfer-builder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { upgradeName, currentBuilder, row } = btn.dataset;
      showBuilderPicker(currentBuilder, (target) => {
        if (confirm(`Move "${upgradeName}" from ${currentBuilder} to ${target}?`))
          transferUpgradeToBuilder(upgradeName, currentBuilder, row, target, detailsWrapper);
      });
    });
  });
}

function showBuilderPicker(currentBuilder, callback) {
  const modal = document.createElement('div');
  modal.className = 'builder-picker-modal';
  const builders = ['Builder_1','Builder_2','Builder_3','Builder_4','Builder_5','Builder_6'].filter(b => b !== currentBuilder);
  modal.innerHTML = `
    <div class="builder-picker-content">
      <h3>Move to Builder</h3>
      <div class="builder-picker-grid">
        ${builders.map(b => {
          const n = b.match(/\d+/)[0];
          return `<button class="builder-picker-btn" data-builder="${b}">
            <img src="Images/Builders/Builder ${n}.png" alt="${b}" onerror="this.style.display='none'">
            <span>Builder ${n}</span></button>`;
        }).join('')}
      </div>
      <button class="builder-picker-cancel">Cancel</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('.builder-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => { modal.remove(); callback(btn.dataset.builder); });
  });
  modal.querySelector('.builder-picker-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function transferUpgradeToBuilder(upgradeName, fromBuilder, row, toBuilder, detailsWrapper) {
  try {
    const res  = await fetch(`${API_BASE}?action=transfer_upgrade&username=${window.COC_USERNAME}&upgrade=${encodeURIComponent(upgradeName)}&from_builder=${fromBuilder}&row=${row}&to_builder=${toBuilder}`);
    const data = await res.json();
    if (data.error) { alert('Failed to transfer: ' + data.error); return; }
    alert(`✓ Moved "${upgradeName}" to ${toBuilder}`);
    (async () => {
      try {
        const bd = await fetchBuilderDetails(detailsWrapper.dataset.builder);
        if (bd && bd.builder) { detailsWrapper.replaceWith(renderBuilderDetails(bd)); }
        else { console.error('Bad response from fetchBuilderDetails:', bd); alert('Failed to reload builder details.'); }
      } catch (e) { console.error('Refresh failed:', e); alert('Failed to reload builder: ' + e.message); }
    })();
  } catch (err) { console.error('Transfer failed:', err); alert('Failed to transfer upgrade'); }
}

/* =========================
   DRAG AND DROP
   ========================= */
function setupDragAndDrop(detailsWrapper) {
  const upgradeList   = detailsWrapper.querySelector('.upgrade-list');
  const items         = detailsWrapper.querySelectorAll('.upgrade-item');
  const saveBtn       = detailsWrapper.querySelector('.save-order-btn');
  const cancelBtn     = detailsWrapper.querySelector('.cancel-order-btn');
  const saveContainer = detailsWrapper.querySelector('.save-order-container');
  let draggedItem = null;
  let isDragging = false;

  const getOriginalOrder = () => Array.from(upgradeList.querySelectorAll('.upgrade-item'))
    .map(el => el.dataset.index)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .join(',');

  const originalOrder = getOriginalOrder();

  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
      checkIfOrderChanged();
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      const after = getDragAfterElement(upgradeList, e.clientY);
      after ? upgradeList.insertBefore(draggedItem, after) : upgradeList.appendChild(draggedItem);
    });

    item.querySelectorAll('.drag-handle').forEach(h => {
      h?.addEventListener('touchstart', e => {
        e.preventDefault();
        isDragging = true;
        draggedItem = item;
        item.classList.add('dragging');
      }, { passive: false });
      h?.addEventListener('touchmove', e => {
        if (!isDragging) return;
        e.preventDefault();
        const after = getDragAfterElement(upgradeList, e.touches[0].clientY);
        after ? upgradeList.insertBefore(draggedItem, after) : upgradeList.appendChild(draggedItem);
      }, { passive: false });
      h?.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        item.classList.remove('dragging');
        draggedItem = null;
        checkIfOrderChanged();
      });
    });
  });

  function getDragAfterElement(container, y) {
    return [...container.querySelectorAll('.upgrade-item:not(.dragging)')].reduce((closest, child) => {
      const offset = y - child.getBoundingClientRect().top - child.getBoundingClientRect().height / 2;
      return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function checkIfOrderChanged() {
    const currentItems = upgradeList.querySelectorAll('.upgrade-item');
    const currentOrder = Array.from(currentItems).map(i => i.dataset.index).join(',');
    if (currentOrder !== originalOrder) {
      saveContainer.classList.remove('hidden');
      currentItems.forEach(i => i.classList.add('unsaved'));
    } else {
      saveContainer.classList.add('hidden');
      currentItems.forEach(i => i.classList.remove('unsaved'));
    }
  }

  saveBtn?.addEventListener('click', async () => {
    const builderNum = detailsWrapper.dataset.builder;
    const currentItems = upgradeList.querySelectorAll('.upgrade-item');
    const newOrder = Array.from(currentItems).map(i => i.dataset.index).join(',');

    console.log("[SaveOrder] builder:", builderNum, "order:", newOrder, "username:", window.COC_USERNAME);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const url = `${API_BASE}?action=reorder_builder_upgrades&username=${encodeURIComponent(window.COC_USERNAME)}&builder=Builder_${builderNum}&order=${encodeURIComponent(newOrder)}`;
      console.log("[SaveOrder] Fetching:", url);
      const res  = await fetch(url, { redirect: 'follow' });
      const data = await res.json();
      console.log("[SaveOrder] Response:", data);

      if (data.error) {
        alert('Failed to save: ' + data.error);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Order';
        return;
      }

      saveBtn.textContent = '✓ Saved!';
      currentItems.forEach(i => i.classList.remove('unsaved'));
      saveContainer.classList.add('hidden');

      setTimeout(async () => {
        try {
          const bd = await fetchBuilderDetails(builderNum);
          if (bd && bd.builder) { detailsWrapper.replaceWith(renderBuilderDetails(bd)); }
          else { console.error('Bad response after reorder:', bd); }
        } catch(e) { console.error('Reload after reorder failed:', e); }
        saveBtn.textContent = 'Save Order';
        saveBtn.disabled = false;
      }, 1000);

    } catch (err) {
      console.error('Save order failed:', err);
      alert('Failed to save order: ' + err.message);
      saveBtn.textContent = 'Save Order';
      saveBtn.disabled = false;
    }
  });

  cancelBtn?.addEventListener('click', () => {
    fetchBuilderDetails(detailsWrapper.dataset.builder).then(bd => {
      if (bd && bd.builder) { detailsWrapper.replaceWith(renderBuilderDetails(bd)); }
      else { console.error('Cancel-reload: bad response', bd); }
    }).catch(e => console.error('Cancel-reload failed:', e));
  });
}

/* =========================
   EVENT WIRING
   ========================= */
function wireApprenticeBoost() {
  document.addEventListener("click", async e => {
    const badge = e.target.closest("[data-apply-boost]");
    if (!badge) return;
    e.stopPropagation(); e.preventDefault();
    if (todaysBoostInfo?.status === "APPLIED") return;
    if (!confirm("Apply today's boost?")) return;
    const card = badge.closest(".builder-card");
    const builderNumber = card?.dataset.builder;

    badge.style.opacity = "0.5";
    badge.style.filter  = "blur(1px)";
    const spinner = document.createElement("div");
    spinner.className = "boost-loading-spinner";
    spinner.innerHTML = "⟳";
    badge.parentElement.style.position = "relative";
    badge.parentElement.appendChild(spinner);

    try {
      const res  = await fetch(APPLY_TODAYS_BOOST_URL());
      const data = await res.json();

      spinner.remove();
      badge.style.opacity = "1";
      badge.style.filter  = "none";

      if (data.error) { alert("Boost failed: " + data.error); return; }

      // Lock status BEFORE any reloads — loadTodaysBoost reads from sheet which
      // may still show old status due to GAS execution lag (A11 not yet written)
      if (todaysBoostInfo) todaysBoostInfo.status = "APPLIED";
      else todaysBoostInfo = { status: "APPLIED", builder: builderNumber };

      badge.src = "Images/Badge/Builder Apprentice applied.png";

      // Reload work data for updated durations, but NOT loadTodaysBoost
      await loadCurrentWork();

      if (card && currentWorkData && builderNumber) {
        const bd = currentWorkData.find(r => r[0]?.toString().includes(builderNumber));
        if (bd) {
          const tl = card.querySelector(".builder-time-left");
          const ft = card.querySelector(".builder-finish");
          if (tl) tl.textContent = bd[3];
          if (ft) ft.textContent = "Finishes: " + formatFinishTime(bd[2]);
        }
      }

      await loadBoostPlan(); // OK — only reads plan rows, not status
      updateLastRefreshed();
      const container = document.getElementById("builders-container");
      container.innerHTML = "";
      renderBuilderCards();
    } catch (err) {
      console.error("Failed to apply today's boost", err);
      alert("Failed to apply today's boost.");
    }
  });
}

function wireImageButtons() {
  document.getElementById("oneHourBoostBtn")?.addEventListener("click", async () => { await fetch(BUILDER_SNACK_URL()); refreshDashboard(); });
  document.getElementById("battlePassBtn")?.addEventListener("click",  async () => { await fetch(BATTLE_PASS_URL());  refreshDashboard(); });
}

function wireBoostSimulation() {
  const btn = document.getElementById("runBoostSimBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Running…";
    try {
      await fetch(endpoint("run_boost_simulation"), { redirect: 'follow' });
      await refreshDashboard();
    } catch (e) { console.error("Boost sim failed:", e); }
    btn.textContent = "Run Boost Simulation"; btn.disabled = false;
  });
}

function wireBoostFocusNavigation() {
  document.getElementById("boostPrev")?.addEventListener("click", () => { if (currentBoostIndex > 0) { currentBoostIndex--; renderBoostFocusCard(); } });
  document.getElementById("boostNext")?.addEventListener("click", () => { if (currentBoostIndex < boostPlanData.length-1) { currentBoostIndex++; renderBoostFocusCard(); } });

  const menuBtn  = document.getElementById("boostMenuBtn");
  const dropdown = document.getElementById("boostBuilderDropdown");
  if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", e => { e.stopPropagation(); dropdown.classList.toggle("hidden"); });
    document.addEventListener("click", e => { if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) dropdown.classList.add("hidden"); });
    dropdown.addEventListener("click", async e => {
      const builderBtn = e.target.closest("[data-builder-select]");
      if (!builderBtn) return;
      const sel = builderBtn.dataset.builderSelect, num = sel.match(/(\d+)/)?.[1];
      const statusEl  = document.querySelector(".boost-status");
      const builderEl = document.querySelector(".boost-builder");
      const origStatus  = statusEl.textContent, origBuilder = builderEl.textContent;
      statusEl.textContent = "Updating..."; builderEl.textContent = `Changing to Builder ${num}`;
      dropdown.classList.add("hidden"); menuBtn.disabled = true;
      try {
        const res  = await fetch(SET_BOOST_BUILDER_URL(sel));
        const data = await res.json();
        if (data.error) { alert(data.error); statusEl.textContent = origStatus; builderEl.textContent = origBuilder; menuBtn.disabled = false; return; }
        statusEl.textContent = "Recalculating...";
        await fetch(endpoint("run_boost_simulation"), { redirect: 'follow' });
        if (todaysBoostInfo) todaysBoostInfo.builder = num;
        const container = document.getElementById("builders-container");
        container.innerHTML = "";
        await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadBoostPlan(), loadPausedBuilders()]);
        renderBuilderCards(); updateLastRefreshed();
        statusEl.textContent = "✓ Updated!";
        setTimeout(() => renderBoostFocusCard(), 1500);
      } catch (err) {
        console.error("Failed to change builder:", err); alert("Failed: " + err.message);
        statusEl.textContent = origStatus; builderEl.textContent = origBuilder;
      } finally { menuBtn.disabled = false; }
    });
  }
}

function wireBuilderCardClicks() {
  document.addEventListener("click", async e => {
    if (e.target.closest("[data-apply-boost]")) { e.stopPropagation(); e.preventDefault(); return; }
    if (e.target.closest(".start-builder-btn")) return;
    const card = e.target.closest(".builder-card");
    if (!card) return;
    const builder = card.dataset.builder;
    if (!builder || loadingBuilders.has(builder)) return;
    const container = document.getElementById("builders-container");
    if (openBuilders.includes(builder)) {
      openBuilders = openBuilders.filter(b => b !== builder);
      card.classList.remove("expanded");
      container.querySelectorAll(`.builder-details[data-builder="${builder}"]`).forEach(el => el.remove());
      return;
    }
    loadingBuilders.add(builder); card.classList.add("loading");
    if (openBuilders.length === 2) {
      const oldest = openBuilders.shift();
      document.querySelector(`.builder-card[data-builder="${oldest}"]`)?.classList.remove("expanded");
      container.querySelectorAll(`.builder-details[data-builder="${oldest}"]`).forEach(el => el.remove());
    }
    openBuilders.push(builder); card.classList.add("expanded");
    try {
      const details = await fetchBuilderDetails(builder);
      container.querySelectorAll(`.builder-details[data-builder="${builder}"]`).forEach(el => el.remove());
      card.after(renderBuilderDetails(details));
    } catch (err) {
      console.error("Failed to load builder details:", err);
      openBuilders = openBuilders.filter(b => b !== builder);
      card.classList.remove("expanded");
      const errDiv = document.createElement("div");
      errDiv.className = "builder-details-error";
      errDiv.dataset.builder = builder;
      errDiv.textContent = "⚠️ Could not load builder details: " + err.message;
      card.after(errDiv);
    } finally { loadingBuilders.delete(builder); card.classList.remove("loading"); }
  });
}

function startAutoRefresh() {
  setInterval(refreshDashboard, 45 * 1000);
  setInterval(softRefreshBuilderCards, 10 * 60 * 1000);
}

/* =========================
   LIVE COUNTDOWN
   Decrements displayed durations every 60s without hitting the API.
   Reads the finish time from currentWorkData and recalculates time left.
   ========================= */
function startLiveCountdown() {
  setInterval(() => {
    if (!currentWorkData) return;
    const now = Date.now();
    document.querySelectorAll(".builder-time-left[data-builder]").forEach(el => {
      const builderName = el.dataset.builder; // e.g. "Builder_1"
      const builderNum  = builderName.match(/(\d+)/)?.[1];
      if (!builderNum) return;

      // Find the matching row in currentWorkData (column 0 has builder name, col 2 has finish time)
      const row = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
      if (!row) return;

      const finishMs = new Date(row[2]).getTime();
      if (isNaN(finishMs)) return;

      const remainingMs = finishMs - now;
      if (remainingMs <= 0) {
        el.textContent = "0 d 0 hr 0 min";
        return;
      }

      const totalMins  = Math.floor(remainingMs / 60000);
      const days  = Math.floor(totalMins / (24 * 60));
      const hours = Math.floor((totalMins % (24 * 60)) / 60);
      const mins  = totalMins % 60;
      el.textContent = `${days} d ${hours} hr ${mins} min`;
    });
  }, 60 * 1000); // every 60 seconds
}

/* =========================
   UPGRADE CONFIRMATION MODAL
   ========================= */
let lastFinishedCheck = 0;
let suppressFinishedCheck = false;

async function checkForFinishedUpgrades(force = false) {
  // Suppress for 30s after a duration edit to avoid re-showing the modal
  // for upgrades that were just confirmed or whose timing just changed
  if (suppressFinishedCheck && !force) return;
  // Cooldown: don't re-check more than once every 2 minutes unless forced
  const now = Date.now();
  if (!force && now - lastFinishedCheck < 2 * 60 * 1000) return;
  lastFinishedCheck = now;

  try {
    const res  = await fetch(endpoint("check_finished_upgrades"));
    const data = await res.json();
    if (data.finishedUpgrades?.length > 0) {
      finishedUpgradesData = data.finishedUpgrades;
      showUpgradeConfirmationModal(data.finishedUpgrades);
    }
  } catch (e) { console.error("Failed to check finished upgrades:", e); }
}

function suppressFinishedCheckFor(ms) {
  suppressFinishedCheck = true;
  setTimeout(() => { suppressFinishedCheck = false; }, ms);
}

// autoConfirmSingleBuilder is intentionally removed.
// All confirmations now go through the modal regardless of builder count.

function showUpgradeConfirmationModal(upgrades) {
  reviewedTabs = new Set();
  document.querySelector('.upgrade-confirmation-modal-overlay')?.remove();
  // Always show the modal — never auto-confirm, even for a single builder.
  // The user must explicitly confirm start time or pause.
  const modal = document.createElement('div');
  modal.className = 'upgrade-confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="upgrade-confirmation-modal">
      <div class="ucm-header">
        <h3>⚠️ ${upgrades.length === 1 ? 'Upgrade Finished' : 'New Upgrades Started'}</h3>
        <span class="ucm-review-status">0 / ${upgrades.length} reviewed</span>
      </div>
      <div class="ucm-tabs">
        ${upgrades.map((b,i) => `
          <button class="ucm-tab ${i===0?'active':''}" data-builder="${b.builder}" data-index="${i}">
            ${b.builder.replace('_',' ')}
            <span class="ucm-check" style="display:none">✓</span>
          </button>`).join('')}
      </div>
      <div class="ucm-body">
        ${upgrades.map((b,i) => buildTabContent(b, i===0)).join('')}
      </div>
      <div class="ucm-footer">
        <button class="ucm-confirm-all" disabled>${upgrades.length === 1 ? 'Done — review above first' : 'Confirm All &nbsp;·&nbsp; Review all tabs first'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  wireConfirmationModal(modal, upgrades);
  updateAllPreviews(modal, upgrades);
}

function buildTabContent(builderData, isActive) {
  const b = builderData.builder, bLabel = b.replace('_',' '), active = builderData.nowActive;
  const m = active.totalDuration.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const prefillDays = m?m[1]:'0', prefillHours = m?m[2]:'0', prefillMins = m?m[3]:'0';
  const defaultDT = scheduledToDatetimeLocal(active.scheduledStart);
  return `
    <div class="ucm-tab-content ${isActive?'active':''}" data-builder="${b}">
      ${builderData.finished.map(f => `
        <div class="ucm-finished-row">✅ <strong>${f.upgradeName}</strong> finished &nbsp;·&nbsp; ${f.finishedTime}</div>
      `).join('')}
      ${builderData.finished.length > 1 ? `<div class="ucm-cascade-warn">⚠️ Multiple upgrades finished — if an earlier one didn't start, later ones couldn't have either.</div>` : ''}
      <div class="ucm-active-section">
        <div class="ucm-active-header">
          <img src="${getUpgradeImage(active.upgradeName)}" class="ucm-active-img"
               alt="${active.upgradeName}" onerror="this.src='Images/Upgrades/PH.png'">
          <div>
            <div class="ucm-active-name">${active.upgradeName}</div>
            <div class="ucm-active-sub">Scheduled start: ${active.scheduledStart}</div>
          </div>
        </div>
        <div class="ucm-section-label">What did you start?</div>
        <div class="ucm-choice-group">
          <label class="ucm-choice">
            <input type="radio" name="upgrade-choice-${b}" value="planned" checked>
            <span>Started as planned &nbsp;·&nbsp; ${active.upgradeName}</span>
          </label>
          <label class="ucm-choice">
            <input type="radio" name="upgrade-choice-${b}" value="different">
            <span>Started a different upgrade</span>
            <button class="ucm-show-queue" data-builder="${b}" style="display:none">Select from queue →</button>
          </label>
        </div>
        <div class="ucm-diff-selected" style="display:none">Selected: <strong class="ucm-diff-name"></strong></div>
        <div class="ucm-section-label">When did you start?</div>
        <div class="ucm-time-methods">
          <label class="ucm-time-method">
            <input type="radio" name="time-method-${b}" value="remaining" checked>
            <span>I know the time remaining right now</span>
          </label>
          <div class="ucm-remaining-inputs" data-for="${b}">
            <div class="ucm-spinner-group">
              <label>Days</label>
              <button class="ucm-spin ucm-spin-up" data-field="ucm-rd-${b}">+</button>
              <input type="number" id="ucm-rd-${b}" class="ucm-spin-input remaining-days"
                     data-builder="${b}" min="0" max="365" value="${prefillDays}">
              <button class="ucm-spin ucm-spin-dn" data-field="ucm-rd-${b}">−</button>
            </div>
            <div class="ucm-spinner-group">
              <label>Hours</label>
              <button class="ucm-spin ucm-spin-up" data-field="ucm-rh-${b}">+</button>
              <input type="number" id="ucm-rh-${b}" class="ucm-spin-input remaining-hours"
                     data-builder="${b}" min="0" max="23" value="${prefillHours}">
              <button class="ucm-spin ucm-spin-dn" data-field="ucm-rh-${b}">−</button>
            </div>
            <div class="ucm-spinner-group">
              <label>Mins</label>
              <button class="ucm-spin ucm-spin-up" data-field="ucm-rm-${b}">+</button>
              <input type="number" id="ucm-rm-${b}" class="ucm-spin-input remaining-mins"
                     data-builder="${b}" min="0" max="59" value="${prefillMins}">
              <button class="ucm-spin ucm-spin-dn" data-field="ucm-rm-${b}">−</button>
            </div>
          </div>
          <label class="ucm-time-method">
            <input type="radio" name="time-method-${b}" value="exact">
            <span>I remember the exact time</span>
          </label>
          <div class="ucm-exact-inputs" data-for="${b}" style="opacity:0.4;pointer-events:none">
            <input type="datetime-local" class="ucm-exact-dt" data-builder="${b}" value="${defaultDT}">
          </div>
        </div>
        <div class="ucm-preview">
          <div class="ucm-preview-row"><span class="ucm-preview-label">Start</span><strong class="ucm-preview-start">—</strong></div>
          <div class="ucm-preview-row"><span class="ucm-preview-label">Duration</span><strong>${active.totalDuration}</strong></div>
          <div class="ucm-preview-row"><span class="ucm-preview-label">End</span><strong class="ucm-preview-end">—</strong></div>
        </div>
        <div class="ucm-actions">
          <button class="ucm-pause-btn" data-builder="${b}">⏸️ Not Started — Pause ${bLabel}</button>
          <button class="ucm-confirm-btn" data-builder="${b}">Confirm ${bLabel}</button>
        </div>
      </div>
    </div>`;
}

function wireConfirmationModal(modal, upgrades) {
  modal.querySelectorAll('.ucm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.index);
      modal.querySelectorAll('.ucm-tab').forEach((t,i) => t.classList.toggle('active', i===idx));
      modal.querySelectorAll('.ucm-tab-content').forEach((c,i) => c.classList.toggle('active', i===idx));
      updateAllPreviews(modal, upgrades);
    });
  });
  modal.querySelectorAll('input[name^="time-method-"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const b = radio.name.replace('time-method-','');
      const tab      = modal.querySelector(`.ucm-tab-content[data-builder="${b}"]`);
      const exactDiv = tab.querySelector(`.ucm-exact-inputs[data-for="${b}"]`);
      const remDiv   = tab.querySelector(`.ucm-remaining-inputs[data-for="${b}"]`);
      const isExact  = radio.value === 'exact';
      exactDiv.style.opacity = isExact?'1':'0.4'; exactDiv.style.pointerEvents = isExact?'auto':'none';
      remDiv.style.opacity   = isExact?'0.4':'1'; remDiv.style.pointerEvents   = isExact?'none':'auto';
      updateAllPreviews(modal, upgrades);
    });
  });
  modal.querySelectorAll('.ucm-exact-dt').forEach(i => i.addEventListener('input', () => updateAllPreviews(modal, upgrades)));
  modal.querySelectorAll('.ucm-spin').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.field); if (!input) return;
      const isUp = btn.classList.contains('ucm-spin-up'), cur = parseInt(input.value)||0;
      if (isUp  && cur < parseInt(input.max)) input.value = cur+1;
      if (!isUp && cur > parseInt(input.min)) input.value = cur-1;
      updateAllPreviews(modal, upgrades);
    });
  });
  modal.querySelectorAll('.ucm-spin-input').forEach(i => i.addEventListener('input', () => updateAllPreviews(modal, upgrades)));
  modal.querySelectorAll('input[name^="upgrade-choice-"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const b   = radio.name.replace('upgrade-choice-','');
      const tab = modal.querySelector(`.ucm-tab-content[data-builder="${b}"]`);
      tab.querySelector('.ucm-show-queue').style.display = radio.value==='different'?'inline-block':'none';
      if (radio.value !== 'different') tab.querySelector('.ucm-diff-selected').style.display = 'none';
    });
  });
  modal.querySelectorAll('.ucm-show-queue').forEach(btn => btn.addEventListener('click', () => showUpgradeQueueModal(btn.dataset.builder, modal)));
  modal.querySelectorAll('.ucm-confirm-btn').forEach(btn => btn.addEventListener('click', () => handleBuilderConfirmation(btn, modal, upgrades)));
  modal.querySelectorAll('.ucm-pause-btn').forEach(btn => btn.addEventListener('click', () => handleBuilderPause(btn, modal, upgrades)));
  modal.querySelector('.ucm-confirm-all').addEventListener('click', async () => {
    modal.remove();
    const container = document.getElementById("builders-container");
    if (container) container.innerHTML = "";
    await new Promise(resolve => setTimeout(resolve, 500));
    refreshDashboard();
  });
}

function updateAllPreviews(modal, upgrades) {
  const activeTab = modal.querySelector('.ucm-tab-content.active');
  if (!activeTab) return;
  const b  = activeTab.dataset.builder;
  const bd = upgrades.find(u => u.builder === b);
  if (!bd) return;
  const m = bd.nowActive.totalDuration.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const totalMinutes = m ? parseInt(m[1])*24*60+parseInt(m[2])*60+parseInt(m[3]) : 0;
  const method = activeTab.querySelector(`input[name="time-method-${b}"]:checked`)?.value;
  let startTime, endTime;
  if (method === 'exact') {
    const val = activeTab.querySelector('.ucm-exact-dt')?.value;
    startTime = val ? new Date(val) : null;
    if (startTime && !isNaN(startTime)) endTime = new Date(startTime.getTime() + totalMinutes*60000);
  } else {
    const d = parseInt(activeTab.querySelector('.remaining-days')?.value)||0;
    const h = parseInt(activeTab.querySelector('.remaining-hours')?.value)||0;
    const mins = parseInt(activeTab.querySelector('.remaining-mins')?.value)||0;
    const rem = d*24*60+h*60+mins, now = new Date();
    startTime = new Date(now.getTime() - (totalMinutes-rem)*60000);
    endTime   = new Date(now.getTime() + rem*60000);
  }
  const fmt = d => (!d||isNaN(d)) ? '—' : d.toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true});
  activeTab.querySelector('.ucm-preview-start').textContent = fmt(startTime);
  activeTab.querySelector('.ucm-preview-end').textContent   = fmt(endTime);
}

function getStartTimeFromTab(tab, totalMinutes) {
  const b      = tab.dataset.builder;
  const method = tab.querySelector(`input[name="time-method-${b}"]:checked`)?.value;
  if (method === 'exact') {
    const val = tab.querySelector('.ucm-exact-dt')?.value;
    return val ? new Date(val) : null;
  }
  const d = parseInt(tab.querySelector('.remaining-days')?.value)||0;
  const h = parseInt(tab.querySelector('.remaining-hours')?.value)||0;
  const m = parseInt(tab.querySelector('.remaining-mins')?.value)||0;
  return new Date(Date.now() - (totalMinutes - (d*24*60+h*60+m))*60000);
}

async function handleBuilderConfirmation(btn, modal, upgrades) {
  const b   = btn.dataset.builder;
  const tab = modal.querySelector(`.ucm-tab-content[data-builder="${b}"]`);
  const bd  = upgrades.find(u => u.builder === b);
  if (!bd) return;
  const m = bd.nowActive.totalDuration.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const totalMinutes = m ? parseInt(m[1])*24*60+parseInt(m[2])*60+parseInt(m[3]) : 0;
  const choice = tab.querySelector(`input[name="upgrade-choice-${b}"]:checked`)?.value;
  let upgradeName = bd.nowActive.upgradeName, differentUpgrade = null;
  if (choice === 'different') {
    differentUpgrade = tab.querySelector('.ucm-diff-name')?.textContent?.trim();
    if (!differentUpgrade) { alert('Please select which upgrade you started'); return; }
  }
  const startTime = getStartTimeFromTab(tab, totalMinutes);
  if (!startTime || isNaN(startTime)) { alert('Please enter a valid start time'); return; }
  btn.disabled = true; btn.textContent = 'Confirming…';
  try {
    const params = new URLSearchParams({ action:'confirm_upgrade_start', username:window.COC_USERNAME, builder:b, upgradeName, startTime:startTime.toISOString(), confirmAction:choice==='different'?'different':'confirm', differentUpgrade:differentUpgrade||'' });
    const res  = await fetch(API_BASE + '?' + params.toString());
    const data = await res.json();
    if (data.error) { alert('Error: '+data.error); btn.disabled=false; btn.textContent=`Confirm ${b.replace('_',' ')}`; return; }
    markTabReviewed(b, modal, upgrades);
    btn.textContent = '✓ Confirmed'; btn.classList.add('ucm-btn-confirmed');
  } catch (err) {
    console.error('Confirmation failed:', err); alert('Failed to confirm upgrade');
    btn.disabled=false; btn.textContent=`Confirm ${b.replace('_',' ')}`;
  }
}

async function handleBuilderPause(btn, modal, upgrades) {
  const b = btn.dataset.builder, bLabel = b.replace('_',' ');
  if (!confirm(`Pause ${bLabel}? This means the upgrade has not started yet.`)) return;
  btn.disabled = true; btn.textContent = 'Pausing…';
  try {
    const params = new URLSearchParams({ action:'confirm_upgrade_start', username:window.COC_USERNAME, builder:b, upgradeName:'', startTime:'', confirmAction:'pause', differentUpgrade:'' });
    const res  = await fetch(API_BASE + '?' + params.toString());
    const data = await res.json();
    if (data.error) { alert('Error: '+data.error); btn.disabled=false; btn.textContent=`⏸️ Not Started — Pause ${bLabel}`; return; }
    markTabReviewed(b, modal, upgrades);
    btn.textContent = `⏸️ ${bLabel} Paused`; btn.classList.add('ucm-btn-paused');
  } catch (err) {
    console.error('Pause failed:', err); alert('Failed to pause builder');
    btn.disabled=false; btn.textContent=`⏸️ Not Started — Pause ${bLabel}`;
  }
}

function markTabReviewed(builder, modal, upgrades) {
  reviewedTabs.add(builder);
  modal.querySelector(`.ucm-tab[data-builder="${builder}"]`)?.querySelector('.ucm-check')?.removeAttribute('style');
  const s = modal.querySelector('.ucm-review-status');
  if (s) s.textContent = `${reviewedTabs.size} / ${upgrades.length} reviewed`;
  if (reviewedTabs.size === upgrades.length) {
    const ca = modal.querySelector('.ucm-confirm-all');
    ca.disabled = false;
    ca.textContent = upgrades.length === 1 ? 'Done ✓' : 'Confirm All ✓';
  }
}

async function showUpgradeQueueModal(builder, parentModal) {
  try {
    const res  = await fetch(endpoint("get_builder_queue") + `&builder=${builder}`);
    const data = await res.json();
    if (data.error) { alert('Error: '+data.error); return; }
    const qModal = document.createElement('div');
    qModal.className = 'ucm-queue-overlay';
    qModal.innerHTML = `
      <div class="ucm-queue-modal">
        <h3>Select Upgrade You Started</h3>
        <p class="ucm-queue-sub">${builder.replace('_',' ')} · Queued upgrades</p>
        <div class="ucm-queue-list">
          ${data.queue.length === 0
            ? '<p class="ucm-empty">No queued upgrades found.</p>'
            : data.queue.map((u,i) => `
              <label class="ucm-queue-item">
                <input type="radio" name="ucm-queue-pick" value="${u.upgradeName}" ${i===0?'checked':''}>
                <img src="${getUpgradeImage(u.upgradeName)}" class="ucm-queue-icon" onerror="this.src='Images/Upgrades/PH.png'">
                <div class="ucm-queue-info">
                  <span class="ucm-queue-name">${u.upgradeName}</span>
                  <span class="ucm-queue-dur">${u.duration}</span>
                </div>
              </label>`).join('')}
        </div>
        <div class="ucm-queue-actions">
          <button class="ucm-queue-cancel">Cancel</button>
          <button class="ucm-queue-select">Select</button>
        </div>
      </div>`;
    document.body.appendChild(qModal);
    qModal.querySelector('.ucm-queue-cancel').addEventListener('click', () => qModal.remove());
    qModal.querySelector('.ucm-queue-select').addEventListener('click', () => {
      const picked = qModal.querySelector('input[name="ucm-queue-pick"]:checked');
      if (picked) {
        const tab = parentModal.querySelector(`.ucm-tab-content[data-builder="${builder}"]`);
        tab.querySelector('.ucm-diff-name').textContent        = picked.value;
        tab.querySelector('.ucm-diff-selected').style.display = 'block';
      }
      qModal.remove();
    });
    qModal.addEventListener('click', e => { if (e.target === qModal) qModal.remove(); });
  } catch (err) { console.error('Failed to load queue:', err); alert('Failed to load upgrade queue'); }
}

function showStartPausedBuilderModal(builderNum, upgradeName, totalDuration) {
  const b = `Builder_${builderNum}`, bLabel = `Builder ${builderNum}`;
  const m = totalDuration?.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const prefillDays=m?m[1]:'0', prefillHours=m?m[2]:'0', prefillMins=m?m[3]:'0';
  const totalMinutes = parseInt(prefillDays)*24*60+parseInt(prefillHours)*60+parseInt(prefillMins);
  const modal = document.createElement('div');
  modal.className = 'ucm-queue-overlay';
  modal.innerHTML = `
    <div class="ucm-start-modal">
      <h3>▶️ Start ${bLabel}</h3>
      <div class="ucm-active-header" style="margin:16px 0">
        <img src="${getUpgradeImage(upgradeName)}" class="ucm-active-img" onerror="this.src='Images/Upgrades/PH.png'">
        <div>
          <div class="ucm-active-name">${upgradeName}</div>
          <div class="ucm-active-sub">Total duration: ${totalDuration}</div>
        </div>
      </div>
      <div class="ucm-section-label">When did you start?</div>
      <div class="ucm-time-methods">
        <label class="ucm-time-method">
          <input type="radio" name="sp-time-method" value="remaining" checked>
          <span>I know the time remaining right now</span>
        </label>
        <div class="ucm-remaining-inputs sp-rem-wrap">
          <div class="ucm-spinner-group">
            <label>Days</label>
            <button class="ucm-spin ucm-spin-up" data-field="sp-rd">+</button>
            <input type="number" id="sp-rd" class="ucm-spin-input" min="0" max="365" value="${prefillDays}">
            <button class="ucm-spin ucm-spin-dn" data-field="sp-rd">−</button>
          </div>
          <div class="ucm-spinner-group">
            <label>Hours</label>
            <button class="ucm-spin ucm-spin-up" data-field="sp-rh">+</button>
            <input type="number" id="sp-rh" class="ucm-spin-input" min="0" max="23" value="${prefillHours}">
            <button class="ucm-spin ucm-spin-dn" data-field="sp-rh">−</button>
          </div>
          <div class="ucm-spinner-group">
            <label>Mins</label>
            <button class="ucm-spin ucm-spin-up" data-field="sp-rm">+</button>
            <input type="number" id="sp-rm" class="ucm-spin-input" min="0" max="59" value="${prefillMins}">
            <button class="ucm-spin ucm-spin-dn" data-field="sp-rm">−</button>
          </div>
        </div>
        <label class="ucm-time-method">
          <input type="radio" name="sp-time-method" value="exact">
          <span>I remember the exact time</span>
        </label>
        <div class="sp-exact-wrap" style="opacity:0.4;pointer-events:none">
          <input type="datetime-local" class="ucm-exact-dt sp-exact-dt" value="${toDatetimeLocal(new Date())}">
        </div>
      </div>
      <div class="ucm-queue-actions" style="margin-top:20px">
        <button class="ucm-queue-cancel">Cancel</button>
        <button class="ucm-queue-select sp-start-btn">▶️ Start Now</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('input[name="sp-time-method"]').forEach(r => {
    r.addEventListener('change', () => {
      const isExact = r.value==='exact';
      modal.querySelector('.sp-exact-wrap').style.opacity       = isExact?'1':'0.4';
      modal.querySelector('.sp-exact-wrap').style.pointerEvents = isExact?'auto':'none';
      modal.querySelector('.sp-rem-wrap').style.opacity         = isExact?'0.4':'1';
      modal.querySelector('.sp-rem-wrap').style.pointerEvents   = isExact?'none':'auto';
    });
  });
  modal.querySelectorAll('.ucm-spin').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.field); if (!input) return;
      const isUp = btn.classList.contains('ucm-spin-up'), cur = parseInt(input.value)||0;
      if (isUp  && cur < parseInt(input.max)) input.value = cur+1;
      if (!isUp && cur > parseInt(input.min)) input.value = cur-1;
    });
  });
  modal.querySelector('.ucm-queue-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('.sp-start-btn').addEventListener('click', async () => {
    const method   = modal.querySelector('input[name="sp-time-method"]:checked')?.value;
    const startBtn = modal.querySelector('.sp-start-btn');
    startBtn.disabled = true; startBtn.textContent = 'Starting…';
    try {
      let params;
      if (method === 'exact') {
        const exactTime = new Date(modal.querySelector('.sp-exact-dt').value);
        if (!exactTime || isNaN(exactTime)) { alert('Please enter a valid start time'); startBtn.disabled=false; startBtn.textContent='▶️ Start Now'; return; }
        params = new URLSearchParams({ action:'start_paused_builder', username:window.COC_USERNAME, builder:b, method:'exact', startTime:exactTime.toISOString() });
      } else {
        const d = parseInt(document.getElementById('sp-rd').value)||0;
        const h = parseInt(document.getElementById('sp-rh').value)||0;
        const m = parseInt(document.getElementById('sp-rm').value)||0;
        params = new URLSearchParams({ action:'start_paused_builder', username:window.COC_USERNAME, builder:b, method:'remaining', remainingMinutes:String(d*24*60+h*60+m) });
      }
      const res  = await fetch(API_BASE + '?' + params.toString());
      const data = await res.json();
      if (data.error) { alert('Error: '+data.error); startBtn.disabled=false; startBtn.textContent='▶️ Start Now'; return; }
      modal.remove();
      const container = document.getElementById("builders-container");
      if (container) container.innerHTML = "";
      await new Promise(resolve => setTimeout(resolve, 500));
      await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadPausedBuilders()]);
      renderBuilderCards();
    } catch (err) {
      console.error('Start failed:', err); alert('Failed to start builder');
      startBtn.disabled=false; startBtn.textContent='▶️ Start Now';
    }
  });
}

function wirePausedBuilderButtons() {
  document.querySelectorAll('.start-builder-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showStartPausedBuilderModal(btn.dataset.builder, btn.dataset.upgrade, btn.dataset.duration);
    });
  });
}

/**
 * FIX #2b: scheduledToDatetimeLocal now uses parseScheduledStart for robustness
 */
function scheduledToDatetimeLocal(s) {
  const d = parseScheduledStart(s);
  return d ? toDatetimeLocal(d) : toDatetimeLocal(new Date());
}

function toDatetimeLocal(d) {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  let username = localStorage.getItem("coc_username");
  if (username && username.endsWith("_CURRENT_WORK")) {
    username = username.replace("_CURRENT_WORK", "");
    localStorage.setItem("coc_username", username);
  }
  if (!username || username === "null" || username === "undefined" || username.trim() === "") {
    showLoginScreen(async (confirmedUsername) => {
      window.COC_USERNAME = confirmedUsername;
      console.log("[Init] Username set to:", confirmedUsername);
      await bootApp();
    });
    return;
  }
  window.COC_USERNAME = username;
  console.log("[Init] Username:", username);
  await bootApp();
});

async function bootApp() {
  renderSkeletonCards(6);
  await refreshDashboard();
  startAutoRefresh();
  startLiveCountdown();
  wireApprenticeBoost();
  wireBoostSimulation();
  wireBoostFocusNavigation();
  wireBuilderCardClicks();
  wireImageButtons();
  await checkForFinishedUpgrades();
}

function switchUser() {
  localStorage.removeItem("coc_username");
  window.COC_USERNAME = null;
  location.reload();
}

function showLoginScreen(onConfirm) {
  const overlay = document.createElement("div");
  overlay.id = "login-overlay";
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:99999",
    "background:rgba(0,0,0,0.85)",
    "display:flex", "align-items:center", "justify-content:center",
    "padding:24px", "box-sizing:border-box"
  ].join(";");

  overlay.innerHTML = `
    <div style="
      background:#1e1e2e; border-radius:16px; padding:32px 28px;
      width:100%; max-width:360px; box-shadow:0 8px 32px rgba(0,0,0,0.6);
      font-family:sans-serif; color:#fff; text-align:center;
    ">
      <div style="font-size:48px; margin-bottom:8px">⚒️</div>
      <h2 style="margin:0 0 6px; font-size:1.3rem">Builder Tracker</h2>
      <p style="margin:0 0 24px; color:#aaa; font-size:0.9rem">Enter your username to continue</p>
      <input
        id="login-username-input"
        type="text"
        placeholder="e.g. Daniel"
        autocomplete="username"
        autocapitalize="off"
        style="
          width:100%; box-sizing:border-box;
          padding:14px 16px; border-radius:10px;
          border:2px solid #444; background:#2a2a3e;
          color:#fff; font-size:1rem; outline:none;
          margin-bottom:16px;
        "
      />
      <button id="login-confirm-btn" style="
        width:100%; padding:14px; border-radius:10px;
        border:none; background:#5865f2; color:#fff;
        font-size:1rem; font-weight:600; cursor:pointer;
        transition:background 0.2s;
      ">Continue →</button>
      <p id="login-error" style="color:#f87171; font-size:0.85rem; margin:12px 0 0; display:none">
        Please enter a username.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector("#login-username-input");
  const btn   = overlay.querySelector("#login-confirm-btn");
  const err   = overlay.querySelector("#login-error");

  setTimeout(() => input.focus(), 100);

  function confirm() {
    const val = input.value.replace(/[^a-zA-Z0-9_]/g, "").trim();
    if (!val) { err.style.display = "block"; return; }
    err.style.display = "none";
    localStorage.setItem("coc_username", val);
    overlay.remove();
    onConfirm(val);
  }

  btn.addEventListener("click", confirm);
  input.addEventListener("keydown", e => { if (e.key === "Enter") confirm(); });
  btn.addEventListener("mouseenter", () => btn.style.background = "#4752c4");
  btn.addEventListener("mouseleave", () => btn.style.background = "#5865f2");
}
