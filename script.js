console.log("Loaded script.js – v1");

/* =========================
   CONFIG
   ========================= */
const API_BASE = 
    "https://script.google.com/macros/s/AKfycbxvPjXAx0ZNHYUu_P4GR1FDc0VgQlMwZ7HRCmUS1n7Rk76WnNORgvOXm4kllUp1HDaVCA/exec"
const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";
const TODAYS_BOOST_ENDPOINT = API_BASE + "?action=todays_boost";
const BOOST_PLAN_ENDPOINT = API_BASE + "?action=boost_plan";
const APPLY_TODAYS_BOOST = API_BASE + "?action=apply_todays_boost";
const SET_TODAYS_BOOST_BUILDER = API_BASE + "?action=set_todays_boost_builder&builder=";
const REORDER_BUILDER_UPGRADES = API_BASE + "?action=reorder_builder_upgrades";
const RUN_BOOST_SIM = API_BASE + "?action=run_boost_simulation";
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
    if (upgradeName.includes(hero)) {
      return basePath + hero + ".png";
    }
  }
  
  const match = upgradeName.match(/^(.+?)\s*(?:#\d+)?\s+(?:Level|Lvl)\s+(\d+)/i);
  if (!match) return basePath + "PH.png";
  
  const baseName = match[1].trim();
  const levelNum = parseInt(match[2]);
  
  if (!IMAGE_MAP[baseName]) return basePath + "PH.png";
  
  for (const levelStr of IMAGE_MAP[baseName]) {
    if (levelStr === `Lvl ${levelNum}` || levelStr === `Level ${levelNum}`) {
      return basePath + baseName + " " + levelStr + ".png";
    }
    
    if (levelStr.includes("&")) {
      const levels = levelStr.match(/\d+/g).map(Number);
      if (levels.includes(levelNum)) {
        return basePath + baseName + " " + levelStr + ".png";
      }
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
let boostPlanData = [];
let currentBoostIndex = 0;
let openBuilders = [];
let loadingBuilders = new Set();
let lastActiveStatusUpdate = 0; // Timestamp of last Active? update
let reviewedTabs = new Set();
let finishedUpgradesData = null;

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
   SMART ACTIVE STATUS UPDATE
   ========================= */
async function updateActiveStatusSmart() {
  const now = Date.now();
  
  // Only update every 5 minutes max (prevent excessive calls)
  if (now - lastActiveStatusUpdate < 5 * 60 * 1000) {
    return;
  }
  
  try {
    await fetch(API_BASE + "?action=update_active_status");
    lastActiveStatusUpdate = now;
    console.log("Active? status updated at:", new Date());
  } catch (e) {
    console.error("Failed to update Active? status:", e);
  }
}

/* =========================
   SOFT REFRESH (NON-DISRUPTIVE)
   ========================= */
async function softRefreshBuilderCards() {
  // Only refresh if NO builder details are open (preserve unsaved work)
  if (openBuilders.length > 0) {
    console.log("Skipping card refresh - builder details open");
    return;
  }
  
  try {
    await loadCurrentWork();
    await loadTodaysBoost();
    
    // Clear and re-render builder cards
    const container = document.getElementById("builders-container");
    if (container) {
      container.innerHTML = "";
      renderBuilderCards();
    }
  } catch (e) {
    console.error("Soft refresh failed:", e);
  }
}

/* =========================
   DATA LOADERS
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
}

async function loadBoostPlan() {
  try {
    const res = await fetch(BOOST_PLAN_ENDPOINT);
    const data = await res.json();

    if (!data?.table || data.table.length <= 1) {
      boostPlanData = [];
      return;
    }

    const rows = data.table.slice(1);

    boostPlanData = rows.map((row, index) => {
      return {
        day: index === 0 ? "TODAY" : row[0],
        hasBoost: true,
        builder: row[2].replace("_", " "),
        newFinishTime: row[4],
        mode: row[5]
      };
    });

    currentBoostIndex = 0;
    renderBoostFocusCard();

  } catch (e) {
    console.error("Boost plan failed", e);
  }
}

async function refreshDashboard() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    // Step 1: Update Active? status in background (non-blocking)
    updateActiveStatusSmart();
    
    // Step 2: Refresh sheet timestamp
    await fetch(REFRESH_ENDPOINT);
    
    // Step 3: Load data
    await Promise.all([loadCurrentWork(), loadTodaysBoost()]);
    
    // Step 4: Smart render - only if no builder details open
    if (openBuilders.length === 0) {
      renderBuilderCards();
    }
    
    // Step 5: Load boost plan
    await loadBoostPlan();
    
    updateLastRefreshed();
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

  const day = boostPlanData[currentBoostIndex];
  const dayEl = document.querySelector(".boost-day");
  const statusEl = document.querySelector(".boost-status");
  const builderEl = document.querySelector(".boost-builder");
  const extraEl = document.querySelector(".boost-extra");
  const finishEl = document.getElementById("boostFinishTime");
  const modeEl = document.getElementById("boostMode");
  const menuBtn = document.getElementById("boostMenuBtn");
  const dropdown = document.getElementById("boostBuilderDropdown");

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
          const btnBuilderNum = btn.dataset.builderSelect.match(/(\d+)/)?.[1];
          btn.style.display = btnBuilderNum === currentBuilderNum ? "none" : "block";
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
  const res = await fetch(BUILDER_DETAILS_ENDPOINT + "Builder_" + builderNumber);
  return await res.json();
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
      <span></span>
      <span>Future Upgrades</span>
      <span>Duration</span>
      <span>Start and End dates</span>
      <span></span>
    </div>

    <div class="upgrade-list" data-original-order="${originalOrder.join(',')}">
      ${details.upgrades.map((upg, idx) => {
        const imgSrc = getUpgradeImage(upg.upgrade);
        const durationMatch = upg.duration.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
        const days = durationMatch ? parseInt(durationMatch[1]) : 0;
        const hours = durationMatch ? parseInt(durationMatch[2]) : 0;
        const minutes = durationMatch ? parseInt(durationMatch[3]) : 0;
        const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
        
        return `
          <div class="upgrade-item" 
               data-builder="${upg.builder}"
               data-row="${upg.row}"
               data-index="${idx}"
               data-upgrade-name="${upg.upgrade}"
               data-duration-minutes="${totalMinutes}"
               draggable="true">
            <div class="drag-handle">⋮⋮</div>
            <div class="upgrade-name">
              <img src="${imgSrc}" 
                   class="upgrade-icon" 
                   alt="${upg.upgrade}"
                   onerror="this.src='Images/Upgrades/PH.png'" />
              <span>${upg.upgrade}</span>
            </div>
            <div class="upgrade-duration editable-duration" data-index="${idx}">
              ${upg.duration}
            </div>
            <div class="upgrade-time">
              <span>${upg.start}</span>
              <span>→</span>
              <span>${upg.end}</span>
            </div>
            <button class="transfer-builder-btn" 
                    data-upgrade-name="${upg.upgrade}"
                    data-current-builder="${upg.builder}"
                    data-row="${upg.row}"
                    title="Move to another builder">👤</button>
            <div class="upgrade-controls">
              <button class="transfer-builder-btn" 
                      data-upgrade-name="${upg.upgrade}"
                      data-current-builder="${upg.builder}"
                      data-row="${upg.row}"
                      title="Move to another builder">👤</button>
              <div class="drag-handle">⋮⋮</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    
    <div class="save-order-container hidden">
      <button class="save-order-btn">Save Order</button>
      <button class="cancel-order-btn">Cancel</button>
    </div>
  `;

  setTimeout(() => {
    setupDragAndDrop(wrapper);
    setupDurationEditor(wrapper);
    setupBuilderTransfer(wrapper);
    setupBuilderRefresh(wrapper);
  }, 0);

  return wrapper;
}

function renderBuilderCards() {
  if (!currentWorkData) return;

  const container = document.getElementById("builders-container");
  if (!container || container.children.length > 0) return;

  let earliestFinish = Infinity;
  for (let i = 1; i < currentWorkData.length; i++) {
    const t = new Date(currentWorkData[i][2]).getTime();
    if (!isNaN(t) && t < earliestFinish) {
      earliestFinish = t;
    }
  }

  for (let i = 1; i < currentWorkData.length; i++) {
    const row = currentWorkData[i];
    const builderNumber = row[0].toString().match(/(\d+)/)?.[1];
    const finishMs = new Date(row[2]).getTime();
    const currentUpgradeImg = getUpgradeImage(row[1]);

    let badgeHTML = "";

    if (todaysBoostInfo && builderNumber && todaysBoostInfo.builder === builderNumber) {
      let img;
      switch (todaysBoostInfo.status) {
        case "FORCED":
          img = "Images/Badge/Builder Apprentice Forced.png";
          break;
        case "APPLIED":
          img = "Images/Badge/Builder Apprentice applied.png";
          break;
        default:
          img = "Images/Badge/Builder Apprentice Safe.png";
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
        src="Images/Builders/Builder ${builderNumber}.png" 
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
        <div class="builder-time-left editable-card-duration" 
             data-builder="Builder_${builderNumber}"
             data-upgrade="${row[1]}"
             data-row="2"
             title="Click to edit duration">${row[3]}</div>
        <div class="builder-finish">
          Finishes: ${formatFinishTime(row[2])}
        </div>
        <div class="builder-next">
          ▶ Next: ${row[4]}
        </div>
      </div>
    `;

    container.appendChild(card);
    
    const durationEl = card.querySelector('.editable-card-duration');
    if (durationEl) {
      setupCardDurationEditor(durationEl);
    }
  }
}

/* =========================
   DURATION EDITING
   ========================= */
function setupCardDurationEditor(durationEl) {
  durationEl.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const builderName = durationEl.dataset.builder;
    const upgradeName = durationEl.dataset.upgrade;
    const timeText = durationEl.textContent.trim();
    
    let match = timeText.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
    
    if (!match) {
      match = timeText.match(/(\d+)\s*(?:d|days?)\s*(\d+)\s*(?:h|hr|hours?)\s*(\d+)\s*(?:m|min|minutes?)/i);
    }
    
    if (!match) {
      const timeMatch = timeText.match(/(\d+):(\d+)(?::(\d+))?/);
      if (timeMatch) {
        match = ['', '0', timeMatch[1], timeMatch[2]];
      }
    }
    
    if (!match) {
      console.error('Unable to parse duration:', timeText);
      alert('Unable to parse current duration. Format should be like "3 d 14 hr 0 min"');
      return;
    }
    
    const days = parseInt(match[1]) || 0;
    const hours = parseInt(match[2]) || 0;
    const mins = parseInt(match[3]) || 0;
    
    showDurationPicker(days, hours, mins, (newDays, newHours, newMins) => {
      const newTotalMinutes = (newDays * 24 * 60) + (newHours * 60) + newMins;
      const newDurationHr = `${newDays} d ${newHours} hr ${newMins} min`;
      
      if (confirm(`Change duration of "${upgradeName}" to ${newDurationHr}?`)) {
        updateCardDuration(builderName, newTotalMinutes, newDurationHr, durationEl);
      }
    });
  });
}

async function updateCardDuration(builderName, newMinutes, newDurationHr, durationEl) {
  const originalText = durationEl.textContent;
  durationEl.textContent = 'Saving...';
  
  try {
    const res = await fetch(
      `${API_BASE}?action=update_active_upgrade_time&builder=${builderName}&remaining_minutes=${newMinutes}`
    );
    const data = await res.json();
    
    if (data.error) {
      alert('Failed to update: ' + data.error);
      durationEl.textContent = originalText;
      return;
    }
    
    durationEl.textContent = '✓ Saved!';
    setTimeout(async () => {
      const container = document.getElementById("builders-container");
      container.innerHTML = "";
      await Promise.all([loadCurrentWork(), loadTodaysBoost()]);
      renderBuilderCards();
    }, 800);
    
  } catch (err) {
    console.error('Update failed:', err);
    alert('Failed to update duration');
    durationEl.textContent = originalText;
  }
}

function setupDurationEditor(detailsWrapper) {
  const durationElements = detailsWrapper.querySelectorAll('.editable-duration');
  
  durationElements.forEach(durationEl => {
    durationEl.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const upgradeItem = durationEl.closest('.upgrade-item');
      const currentMinutes = parseInt(upgradeItem.dataset.durationMinutes);
      const upgradeName = upgradeItem.dataset.upgradeName;
      const builderName = upgradeItem.dataset.builder;
      const row = upgradeItem.dataset.row;
      
      const days = Math.floor(currentMinutes / (24 * 60));
      const hours = Math.floor((currentMinutes % (24 * 60)) / 60);
      const mins = currentMinutes % 60;
      
      showDurationPicker(days, hours, mins, (newDays, newHours, newMins) => {
        const newTotalMinutes = (newDays * 24 * 60) + (newHours * 60) + newMins;
        const newDurationHr = `${newDays} d ${newHours} hr ${newMins} min`;
        
        if (confirm(`Change duration of "${upgradeName}" to ${newDurationHr}?`)) {
          updateUpgradeDuration(builderName, row, newTotalMinutes, newDurationHr, durationEl, detailsWrapper);
        }
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
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => document.getElementById('picker-days')?.focus(), 100);
  
  modal.querySelectorAll('.number-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const inputName = btn.dataset.input;
      const input = document.getElementById(`picker-${inputName}`);
      const isUp = btn.classList.contains('number-up');
      const currentVal = parseInt(input.value) || 0;
      const min = parseInt(input.min);
      const max = parseInt(input.max);
      
      if (isUp && currentVal < max) {
        input.value = currentVal + 1;
      } else if (!isUp && currentVal > min) {
        input.value = currentVal - 1;
      }
    });
  });
  
  modal.querySelector('.duration-confirm-btn').addEventListener('click', () => {
    const days = parseInt(document.getElementById('picker-days').value) || 0;
    const hours = parseInt(document.getElementById('picker-hours').value) || 0;
    const mins = parseInt(document.getElementById('picker-mins').value) || 0;
    
    modal.remove();
    callback(days, hours, mins);
  });
  
  modal.querySelector('.duration-cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function updateUpgradeDuration(builderName, row, newMinutes, newDurationHr, durationEl, detailsWrapper) {
  const originalText = durationEl.textContent;
  durationEl.textContent = 'Saving...';
  
  try {
    const res = await fetch(
      `${API_BASE}?action=update_upgrade_duration&builder=${builderName}&row=${row}&minutes=${newMinutes}&duration_hr=${encodeURIComponent(newDurationHr)}`
    );
    const data = await res.json();
    
    if (data.error) {
      alert('Failed to update: ' + data.error);
      durationEl.textContent = originalText;
      return;
    }
    
    durationEl.textContent = '✓ Saved!';
    setTimeout(() => {
      const builderNum = detailsWrapper.dataset.builder;
      fetchBuilderDetails(builderNum).then(builderDetails => {
        const newDetailsEl = renderBuilderDetails(builderDetails);
        detailsWrapper.replaceWith(newDetailsEl);
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
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const builderNum = detailsWrapper.dataset.builder;
      const originalText = refreshBtn.textContent;
      refreshBtn.textContent = '⟳';
      refreshBtn.disabled = true;
      refreshBtn.classList.add('spinning');
      
      try {
        const builderDetails = await fetchBuilderDetails(builderNum);
        const newDetailsEl = renderBuilderDetails(builderDetails);
        detailsWrapper.replaceWith(newDetailsEl);
      } catch (err) {
        console.error('Refresh failed:', err);
        refreshBtn.textContent = originalText;
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('spinning');
      }
    });
  }
}

/* =========================
   BUILDER TRANSFER
   ========================= */
function setupBuilderTransfer(detailsWrapper) {
  const transferBtns = detailsWrapper.querySelectorAll('.transfer-builder-btn');
  
  transferBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const upgradeName = btn.dataset.upgradeName;
      const currentBuilder = btn.dataset.currentBuilder;
      const row = btn.dataset.row;
      
      showBuilderPicker(currentBuilder, (targetBuilder) => {
        if (confirm(`Move "${upgradeName}" from ${currentBuilder} to ${targetBuilder}?`)) {
          transferUpgradeToBuilder(upgradeName, currentBuilder, row, targetBuilder, detailsWrapper);
        }
      });
    });
  });
}

function showBuilderPicker(currentBuilder, callback) {
  const modal = document.createElement('div');
  modal.className = 'builder-picker-modal';
  
  const allBuilders = ['Builder_1', 'Builder_2', 'Builder_3', 'Builder_4', 'Builder_5', 'Builder_6'];
  const availableBuilders = allBuilders.filter(b => b !== currentBuilder);
  
  modal.innerHTML = `
    <div class="builder-picker-content">
      <h3>Move to Builder</h3>
      <div class="builder-picker-grid">
        ${availableBuilders.map(builder => {
          const num = builder.match(/\d+/)[0];
          return `
            <button class="builder-picker-btn" data-builder="${builder}">
              <img src="Images/Builders/Builder ${num}.png" 
                   alt="${builder}"
                   onerror="this.style.display='none'">
              <span>Builder ${num}</span>
            </button>
          `;
        }).join('')}
      </div>
      <button class="builder-picker-cancel">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.builder-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetBuilder = btn.dataset.builder;
      modal.remove();
      callback(targetBuilder);
    });
  });
  
  modal.querySelector('.builder-picker-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function transferUpgradeToBuilder(upgradeName, fromBuilder, row, toBuilder, detailsWrapper) {
  try {
    const res = await fetch(
      `${API_BASE}?action=transfer_upgrade&upgrade=${encodeURIComponent(upgradeName)}&from_builder=${fromBuilder}&row=${row}&to_builder=${toBuilder}`
    );
    const data = await res.json();
    
    if (data.error) {
      alert('Failed to transfer: ' + data.error);
      return;
    }
    
    alert(`✓ Moved "${upgradeName}" to ${toBuilder}`);
    
    const builderNum = detailsWrapper.dataset.builder;
    const builderDetails = await fetchBuilderDetails(builderNum);
    const newDetailsEl = renderBuilderDetails(builderDetails);
    detailsWrapper.replaceWith(newDetailsEl);
    
  } catch (err) {
    console.error('Transfer failed:', err);
    alert('Failed to transfer upgrade');
  }
}

/* =========================
   DRAG AND DROP
   ========================= */
function setupDragAndDrop(detailsWrapper) {
  const upgradeList = detailsWrapper.querySelector('.upgrade-list');
  const items = detailsWrapper.querySelectorAll('.upgrade-item');
  const saveBtn = detailsWrapper.querySelector('.save-order-btn');
  const cancelBtn = detailsWrapper.querySelector('.cancel-order-btn');
  const saveContainer = detailsWrapper.querySelector('.save-order-container');
  
  let draggedItem = null;
  let originalOrder = upgradeList.dataset.originalOrder;
  let touchStartY = 0;
  let isDragging = false;
  
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
      checkIfOrderChanged();
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(upgradeList, e.clientY);
      if (afterElement == null) {
        upgradeList.appendChild(draggedItem);
      } else {
        upgradeList.insertBefore(draggedItem, afterElement);
      }
    });
    
    const dragHandles = item.querySelectorAll('.drag-handle');
    
    dragHandles.forEach(dragHandle => {
      dragHandle?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        draggedItem = item;
        touchStartY = e.touches[0].clientY;
        item.classList.add('dragging');
      }, { passive: false });
      
      dragHandle?.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const afterElement = getDragAfterElement(upgradeList, touch.clientY);
        
        if (afterElement == null) {
          upgradeList.appendChild(draggedItem);
        } else {
          upgradeList.insertBefore(draggedItem, afterElement);
        }
      }, { passive: false });
      
      dragHandle?.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        item.classList.remove('dragging');
        draggedItem = null;
        checkIfOrderChanged();
      });
    });
  });
  
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.upgrade-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  function checkIfOrderChanged() {
    const currentItems = upgradeList.querySelectorAll('.upgrade-item');
    const currentOrder = Array.from(currentItems).map(item => item.dataset.index).join(',');
    
    if (currentOrder !== originalOrder) {
      saveContainer.classList.remove('hidden');
      currentItems.forEach(item => item.classList.add('unsaved'));
    } else {
      saveContainer.classList.add('hidden');
      currentItems.forEach(item => item.classList.remove('unsaved'));
    }
  }
  
  saveBtn?.addEventListener('click', async () => {
    const builderNum = detailsWrapper.dataset.builder;
    const currentItems = upgradeList.querySelectorAll('.upgrade-item');
    const newOrder = Array.from(currentItems).map(item => item.dataset.index).join(',');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const res = await fetch(
        `${API_BASE}?action=reorder_builder_upgrades&builder=Builder_${builderNum}&order=${newOrder}`
      );
      const data = await res.json();
      
      if (data.error) {
        alert('Failed to save: ' + data.error);
        return;
      }
      
      originalOrder = newOrder;
      upgradeList.dataset.originalOrder = newOrder;
      currentItems.forEach(item => item.classList.remove('unsaved'));
      saveContainer.classList.add('hidden');
      
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save Order';
        saveBtn.disabled = false;
      }, 1500);
      
      const builderDetails = await fetchBuilderDetails(builderNum);
      const newDetailsEl = renderBuilderDetails(builderDetails);
      detailsWrapper.replaceWith(newDetailsEl);
      
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save order');
      saveBtn.textContent = 'Save Order';
      saveBtn.disabled = false;
    }
  });
  
  cancelBtn?.addEventListener('click', () => {
    const builderNum = detailsWrapper.dataset.builder;
    fetchBuilderDetails(builderNum).then(builderDetails => {
      const newDetailsEl = renderBuilderDetails(builderDetails);
      detailsWrapper.replaceWith(newDetailsEl);
    });
  });
}

/* =========================
   EVENT WIRING
   ========================= */
function wireApprenticeBoost() {
  document.addEventListener("click", async e => {
    const badge = e.target.closest("[data-apply-boost]");
    if (!badge) return;
    
    e.stopPropagation();
    e.preventDefault();
     
    if (todaysBoostInfo?.status === "APPLIED") return;

    if (!confirm("Apply today's boost?")) return;

    const card = badge.closest(".builder-card");
    const builderNumber = card?.dataset.builder;

    try {
      await fetch(APPLY_TODAYS_BOOST);

      badge.src = "Images/Badge/Builder Apprentice applied.png";
      
      if (todaysBoostInfo) {
        todaysBoostInfo.status = "APPLIED";
      }

      await loadCurrentWork();
      
      if (card && currentWorkData && builderNumber) {
        const builderData = currentWorkData.find(row => 
          row[0]?.toString().includes(builderNumber)
        );
        
        if (builderData) {
          const timeLeftEl = card.querySelector(".builder-time-left");
          const finishTimeEl = card.querySelector(".builder-finish");
          
          if (timeLeftEl) timeLeftEl.textContent = builderData[3];
          if (finishTimeEl) finishTimeEl.textContent = "Finishes: " + formatFinishTime(builderData[2]);
        }
      }
      
      await Promise.all([loadTodaysBoost(), loadBoostPlan()]);
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
  
  const menuBtn = document.getElementById("boostMenuBtn");
  const dropdown = document.getElementById("boostBuilderDropdown");
  
  if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });
    
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
    
    dropdown.addEventListener("click", async (e) => {
      const builderBtn = e.target.closest("[data-builder-select]");
      if (!builderBtn) return;
      
      const selectedBuilder = builderBtn.dataset.builderSelect;
      const builderNum = selectedBuilder.match(/(\d+)/)?.[1];
      
      const statusEl = document.querySelector(".boost-status");
      const builderEl = document.querySelector(".boost-builder");
      const originalStatus = statusEl.textContent;
      const originalBuilder = builderEl.textContent;
      
      statusEl.textContent = "Updating...";
      builderEl.textContent = `Changing to Builder ${builderNum}`;
      dropdown.classList.add("hidden");
      menuBtn.disabled = true;
      
      try {
        const res = await fetch(SET_TODAYS_BOOST_BUILDER + selectedBuilder);
        const data = await res.json();
        
        if (data.error) {
          alert(data.error);
          statusEl.textContent = originalStatus;
          builderEl.textContent = originalBuilder;
          menuBtn.disabled = false;
          return;
        }
        
        statusEl.textContent = "Recalculating boost plan...";
        await fetch(RUN_BOOST_SIM);
        
        if (todaysBoostInfo) {
          todaysBoostInfo.builder = builderNum;
        }
        
        statusEl.textContent = "Refreshing...";
        const container = document.getElementById("builders-container");
        container.innerHTML = "";
        await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadBoostPlan()]);
        renderBuilderCards();
        updateLastRefreshed();
        
        statusEl.textContent = "✓ Updated!";
        setTimeout(() => {
          renderBoostFocusCard();
        }, 1500);
        
      } catch (err) {
        console.error("Failed to change builder:", err);
        alert("Failed to change builder: " + err.message);
        statusEl.textContent = originalStatus;
        builderEl.textContent = originalBuilder;
      } finally {
        menuBtn.disabled = false;
      }
    });
  }
}

function wireBuilderCardClicks() {
  document.addEventListener("click", async e => {
    const badge = e.target.closest("[data-apply-boost]");
    if (badge) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    
    const card = e.target.closest(".builder-card");
    if (!card) return;

    const builder = card.dataset.builder;
    if (!builder) return;

    if (loadingBuilders.has(builder)) return;

    const container = document.getElementById("builders-container");

    if (openBuilders.includes(builder)) {
      openBuilders = openBuilders.filter(b => b !== builder);

      card.classList.remove("expanded");
      container
      .querySelectorAll(`.builder-details[data-builder="${builder}"]`)
      .forEach(el => el.remove());
      return;
    }

    loadingBuilders.add(builder);
    card.classList.add("loading");

    if (openBuilders.length === 2) {
      const oldest = openBuilders.shift();

      document
        .querySelector(`.builder-card[data-builder="${oldest}"]`)
        ?.classList.remove("expanded");

      container
        .querySelectorAll(`.builder-details[data-builder="${oldest}"]`)
        .forEach(el => el.remove());
    }

    openBuilders.push(builder);
    card.classList.add("expanded");

    try {
      const builderDetails = await fetchBuilderDetails(builder);
      
      const existingDetails = container.querySelectorAll(`.builder-details[data-builder="${builder}"]`);
      existingDetails.forEach(el => el.remove());
      
      const detailsEl = renderBuilderDetails(builderDetails);
      card.after(detailsEl);
    } catch (error) {
      console.error("Failed to load builder details:", error);
      openBuilders = openBuilders.filter(b => b !== builder);
      card.classList.remove("expanded");
    } finally {
      loadingBuilders.delete(builder);
      card.classList.remove("loading");
    }
  });
}

function startAutoRefresh() {
  // Full refresh every 45 seconds (keeps sheet data fresh)
  setInterval(refreshDashboard, 45 * 1000);
  
  // Soft refresh builder cards every 10 minutes (catches upgrade transitions)
  setInterval(softRefreshBuilderCards, 10 * 60 * 1000);
}

/* =========================
   CHECK FOR FINISHED UPGRADES (Call on page load)
   ========================= */
async function checkForFinishedUpgrades() {
  try {
    const res = await fetch(API_BASE + "?action=check_finished_upgrades");
    const data = await res.json();
    
    if (data.finishedUpgrades && data.finishedUpgrades.length > 0) {
      finishedUpgradesData = data.finishedUpgrades;
      showUpgradeConfirmationModal(data.finishedUpgrades);
    }
  } catch (e) {
    console.error("Failed to check finished upgrades:", e);
  }
}

/* =========================
   SHOW UPGRADE CONFIRMATION MODAL
   ========================= */
function showUpgradeConfirmationModal(upgrades) {
  reviewedTabs = new Set();
  
  const modal = document.createElement('div');
  modal.className = 'upgrade-confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="upgrade-confirmation-modal">
      <div class="modal-header">
        <h3>⚠️ Upgrade Confirmations Needed</h3>
        <span class="review-status">0/${upgrades.length} reviewed</span>
      </div>
      
      <div class="builder-tabs">
        ${upgrades.map((builderData, index) => `
          <button class="tab ${index === 0 ? 'active' : ''}" 
                  data-builder="${builderData.builder}"
                  data-index="${index}">
            ${builderData.builder.replace('_', ' ')}
            <span class="reviewed-indicator" style="display: none;">✓</span>
          </button>
        `).join('')}
      </div>
      
      <div class="tab-content-area">
        ${upgrades.map((builderData, index) => 
          renderBuilderConfirmationTab(builderData, index === 0)
        ).join('')}
      </div>
      
      <div class="modal-footer">
        <button class="confirm-all-btn" disabled>
          Confirm All (Review all tabs first)
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Wire up tab switching
  modal.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const index = parseInt(tab.dataset.index);
      switchConfirmationTab(index);
    });
  });
  
  // Wire up confirmation buttons
  modal.querySelectorAll('.builder-confirm-btn').forEach(btn => {
    btn.addEventListener('click', handleBuilderConfirmation);
  });
  
  modal.querySelectorAll('.builder-pause-btn').forEach(btn => {
    btn.addEventListener('click', handleBuilderPause);
  });
  
  // Wire up time method radio buttons
  modal.querySelectorAll('input[name^="time-method-"]').forEach(radio => {
    radio.addEventListener('change', updateTimePreview);
  });
  
  // Wire up time inputs
  modal.querySelectorAll('.start-time-input, .remaining-days, .remaining-hours, .remaining-mins').forEach(input => {
    input.addEventListener('input', updateTimePreview);
  });
  
  // Wire up different upgrade selector
  modal.querySelectorAll('.show-queue-btn').forEach(btn => {
    btn.addEventListener('click', showUpgradeQueueModal);
  });
  
  // Initialize first tab preview
  updateTimePreview();
}

/* =========================
   RENDER BUILDER CONFIRMATION TAB
   ========================= */
function renderBuilderConfirmationTab(builderData, isActive) {
  const builderIndex = builderData.builder.replace('Builder_', '');
  
  return `
    <div class="tab-content ${isActive ? 'active' : ''}" data-builder="${builderData.builder}">
      <div class="builder-confirmation">
        ${builderData.finished.map(finished => `
          <div class="finished-section">
            <h4>✓ ${finished.upgradeName} finished</h4>
            <p class="finished-time">Completed: ${finished.finishedTime}</p>
          </div>
        `).join('')}
        
        ${builderData.finished.length > 1 ? `
          <div class="cascade-warning">
            ⚠️ Multiple upgrades finished. If an earlier upgrade didn't start, 
            later ones couldn't have started either.
          </div>
        ` : ''}
        
        <div class="active-section">
          <h4>Next upgrade: ${builderData.nowActive.upgradeName}</h4>
          <p class="scheduled-start">Scheduled: ${builderData.nowActive.scheduledStart}</p>
          
          <div class="upgrade-options">
            <label class="upgrade-option">
              <input type="radio" 
                     name="upgrade-choice-${builderData.builder}" 
                     value="planned" 
                     checked>
              <span>Started as planned (${builderData.nowActive.upgradeName})</span>
            </label>
            
            <label class="upgrade-option">
              <input type="radio" 
                     name="upgrade-choice-${builderData.builder}" 
                     value="different">
              <span>Started a different upgrade</span>
              <button class="show-queue-btn" 
                      data-builder="${builderData.builder}"
                      style="display: none;">
                Select from queue
              </button>
            </label>
          </div>
          
          <div class="selected-different-upgrade" style="display: none;">
            <p><strong>Selected:</strong> <span class="different-upgrade-name"></span></p>
          </div>
          
          <div class="time-entry-section">
            <h5>When did you start?</h5>
            
            <label class="time-option">
              <input type="radio" 
                     name="time-method-${builderData.builder}" 
                     value="exact" 
                     checked>
              <span>I remember the exact time</span>
              <input type="datetime-local" 
                     class="start-time-input"
                     data-builder="${builderData.builder}"
                     value="${getDefaultDateTime(builderData.nowActive.scheduledStart)}">
            </label>
            
            <label class="time-option">
              <input type="radio" 
                     name="time-method-${builderData.builder}" 
                     value="remaining">
              <span>I know the time remaining (look at game now)</span>
              <div class="remaining-duration-inputs">
                <input type="number" 
                       class="remaining-days" 
                       data-builder="${builderData.builder}"
                       placeholder="Days" 
                       min="0" 
                       value="0">
                <input type="number" 
                       class="remaining-hours" 
                       data-builder="${builderData.builder}"
                       placeholder="Hours" 
                       min="0" 
                       max="23" 
                       value="0">
                <input type="number" 
                       class="remaining-mins" 
                       data-builder="${builderData.builder}"
                       placeholder="Mins" 
                       min="0" 
                       max="59" 
                       value="0">
              </div>
            </label>
          </div>
          
          <div class="time-preview">
            <h5>Preview:</h5>
            <p>Start: <strong class="preview-start">${builderData.nowActive.scheduledStart}</strong></p>
            <p>End: <strong class="preview-end">Calculating...</strong></p>
            <p>Total Duration: <strong>${builderData.nowActive.totalDuration}</strong></p>
          </div>
          
          <div class="builder-actions">
            <button class="builder-pause-btn" 
                    data-builder="${builderData.builder}">
              Not Started (Pause Builder)
            </button>
            <button class="builder-confirm-btn" 
                    data-builder="${builderData.builder}">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* =========================
   SWITCH CONFIRMATION TAB
   ========================= */
function switchConfirmationTab(index) {
  const modal = document.querySelector('.upgrade-confirmation-modal');
  
  // Update tabs
  modal.querySelectorAll('.tab').forEach((tab, i) => {
    if (i === index) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update content
  modal.querySelectorAll('.tab-content').forEach((content, i) => {
    if (i === index) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Update time preview for this tab
  updateTimePreview();
}

/* =========================
   UPDATE TIME PREVIEW
   ========================= */
function updateTimePreview() {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;
  
  const builder = activeTab.dataset.builder;
  const builderData = finishedUpgradesData.find(b => b.builder === builder);
  if (!builderData) return;
  
  const timeMethod = activeTab.querySelector(`input[name="time-method-${builder}"]:checked`)?.value;
  
  // Parse total duration
  const totalDuration = builderData.nowActive.totalDuration;
  const durationMatch = totalDuration.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const totalDays = durationMatch ? parseInt(durationMatch[1]) : 0;
  const totalHours = durationMatch ? parseInt(durationMatch[2]) : 0;
  const totalMins = durationMatch ? parseInt(durationMatch[3]) : 0;
  const totalMinutes = (totalDays * 24 * 60) + (totalHours * 60) + totalMins;
  
  let startTime, endTime;
  
  if (timeMethod === 'exact') {
    // User entered exact start time
    const startInput = activeTab.querySelector('.start-time-input');
    startTime = new Date(startInput.value);
    endTime = new Date(startTime.getTime() + (totalMinutes * 60 * 1000));
  } else {
    // User entered remaining duration
    const days = parseInt(activeTab.querySelector('.remaining-days').value) || 0;
    const hours = parseInt(activeTab.querySelector('.remaining-hours').value) || 0;
    const mins = parseInt(activeTab.querySelector('.remaining-mins').value) || 0;
    const remainingMinutes = (days * 24 * 60) + (hours * 60) + mins;
    
    // Calculate start time = NOW - (total - remaining)
    const elapsedMinutes = totalMinutes - remainingMinutes;
    const now = new Date();
    startTime = new Date(now.getTime() - (elapsedMinutes * 60 * 1000));
    endTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000));
  }
  
  // Update preview
  if (!isNaN(startTime.getTime())) {
    activeTab.querySelector('.preview-start').textContent = formatFinishTime(startTime);
  }
  if (!isNaN(endTime.getTime())) {
    activeTab.querySelector('.preview-end').textContent = formatFinishTime(endTime);
  }
}

/* =========================
   HANDLE BUILDER CONFIRMATION
   ========================= */
async function handleBuilderConfirmation(e) {
  const button = e.target;
  const builder = button.dataset.builder;
  const activeTab = document.querySelector(`.tab-content[data-builder="${builder}"]`);
  
  const builderData = finishedUpgradesData.find(b => b.builder === builder);
  if (!builderData) return;
  
  // Get selected upgrade
  const upgradeChoice = activeTab.querySelector(`input[name="upgrade-choice-${builder}"]:checked`).value;
  let upgradeName = builderData.nowActive.upgradeName;
  let differentUpgrade = null;
  
  if (upgradeChoice === 'different') {
    differentUpgrade = activeTab.querySelector('.different-upgrade-name').textContent;
    if (!differentUpgrade) {
      alert('Please select which upgrade you started');
      return;
    }
  }
  
  // Get start time
  const timeMethod = activeTab.querySelector(`input[name="time-method-${builder}"]:checked`).value;
  let startTime;
  
  if (timeMethod === 'exact') {
    startTime = new Date(activeTab.querySelector('.start-time-input').value);
  } else {
    // Calculate from remaining duration
    const previewStart = activeTab.querySelector('.preview-start').textContent;
    // Parse the formatted date back
    startTime = new Date(activeTab.querySelector('.start-time-input').value);
  }
  
  if (isNaN(startTime.getTime())) {
    alert('Invalid start time');
    return;
  }
  
  // Show loading
  button.disabled = true;
  button.textContent = 'Confirming...';
  
  try {
    const params = new URLSearchParams({
      action: 'confirm_upgrade_start',
      builder: builder,
      upgradeName: upgradeName,
      startTime: startTime.toISOString(),
      confirmAction: upgradeChoice === 'different' ? 'different' : 'confirm',
      differentUpgrade: differentUpgrade || ''
    });
    
    const res = await fetch(API_BASE + '?' + params.toString());
    const data = await res.json();
    
    if (data.error) {
      alert('Error: ' + data.error);
      button.disabled = false;
      button.textContent = 'Confirm';
      return;
    }
    
    // Mark this tab as reviewed
    reviewedTabs.add(builder);
    updateReviewedStatus();
    
    // Show success indicator
    button.textContent = '✓ Confirmed';
    button.classList.add('confirmed');
    
    // Mark tab as reviewed
    const tab = document.querySelector(`.tab[data-builder="${builder}"]`);
    tab.querySelector('.reviewed-indicator').style.display = 'inline';
    
    // Check if all reviewed
    if (reviewedTabs.size === finishedUpgradesData.length) {
      // Enable confirm all button
      document.querySelector('.confirm-all-btn').disabled = false;
    }
    
  } catch (err) {
    console.error('Confirmation failed:', err);
    alert('Failed to confirm upgrade');
    button.disabled = false;
    button.textContent = 'Confirm';
  }
}

/* =========================
   HANDLE BUILDER PAUSE
   ========================= */
async function handleBuilderPause(e) {
  const button = e.target;
  const builder = button.dataset.builder;
  
  if (!confirm(`Pause ${builder}? This means the upgrade has not started yet.`)) {
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Pausing...';
  
  try {
    const params = new URLSearchParams({
      action: 'confirm_upgrade_start',
      builder: builder,
      upgradeName: '',
      startTime: '',
      confirmAction: 'pause'
    });
    
    const res = await fetch(API_BASE + '?' + params.toString());
    const data = await res.json();
    
    if (data.error) {
      alert('Error: ' + data.error);
      button.disabled = false;
      button.textContent = 'Not Started (Pause Builder)';
      return;
    }
    
    // Mark as reviewed
    reviewedTabs.add(builder);
    updateReviewedStatus();
    
    button.textContent = '⏸️ Paused';
    button.classList.add('paused');
    
    const tab = document.querySelector(`.tab[data-builder="${builder}"]`);
    tab.querySelector('.reviewed-indicator').style.display = 'inline';
    
    if (reviewedTabs.size === finishedUpgradesData.length) {
      document.querySelector('.confirm-all-btn').disabled = false;
    }
    
  } catch (err) {
    console.error('Pause failed:', err);
    alert('Failed to pause builder');
    button.disabled = false;
    button.textContent = 'Not Started (Pause Builder)';
  }
}

/* =========================
   UPDATE REVIEWED STATUS
   ========================= */
function updateReviewedStatus() {
  const statusEl = document.querySelector('.review-status');
  if (statusEl) {
    statusEl.textContent = `${reviewedTabs.size}/${finishedUpgradesData.length} reviewed`;
  }
}

/* =========================
   SHOW UPGRADE QUEUE MODAL
   ========================= */
async function showUpgradeQueueModal(e) {
  const button = e.target;
  const builder = button.dataset.builder;
  
  try {
    const res = await fetch(API_BASE + `?action=get_builder_queue&builder=${builder}`);
    const data = await res.json();
    
    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'upgrade-queue-modal-overlay';
    modal.innerHTML = `
      <div class="upgrade-queue-modal">
        <h3>Select Upgrade You Started</h3>
        <p class="queue-subtitle">Choose from ${builder}'s queued upgrades:</p>
        
        <div class="upgrade-queue-list">
          ${data.queue.map((upgrade, index) => `
            <label class="queue-upgrade-item">
              <input type="radio" 
                     name="selected-upgrade" 
                     value="${upgrade.upgradeName}"
                     ${index === 0 ? 'checked' : ''}>
              <div class="queue-upgrade-content">
                <img src="${getUpgradeImage(upgrade.upgradeName)}" 
                     class="queue-upgrade-icon"
                     onerror="this.src='Images/Upgrades/PH.png'">
                <div class="queue-upgrade-info">
                  <span class="queue-upgrade-name">${upgrade.upgradeName}</span>
                  <span class="queue-upgrade-duration">${upgrade.duration}</span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>
        
        <div class="queue-modal-actions">
          <button class="queue-cancel-btn">Cancel</button>
          <button class="queue-select-btn">Select</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.queue-cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.queue-select-btn').addEventListener('click', () => {
      const selected = modal.querySelector('input[name="selected-upgrade"]:checked');
      if (selected) {
        const activeTab = document.querySelector('.tab-content.active');
        activeTab.querySelector('.different-upgrade-name').textContent = selected.value;
        activeTab.querySelector('.selected-different-upgrade').style.display = 'block';
      }
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
  } catch (err) {
    console.error('Failed to load queue:', err);
    alert('Failed to load upgrade queue');
  }
}

/* =========================
   CONFIRM ALL BUTTON
   ========================= */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('confirm-all-btn') && !e.target.disabled) {
    const modal = document.querySelector('.upgrade-confirmation-modal-overlay');
    if (modal) {
      modal.remove();
      
      // Refresh the dashboard
      const container = document.getElementById("builders-container");
      container.innerHTML = "";
      refreshDashboard();
    }
  }
});

/* =========================
   PAUSED BUILDER UI
   ========================= */
function showPausedBuilderUI() {
  // This is called when rendering builder cards
  // Check if builder is paused and show special UI
  const cards = document.querySelectorAll('.builder-card');
  
  cards.forEach(card => {
    const builderNum = card.dataset.builder;
    // Check if this builder is paused (you'll need to add this to the data)
    // For now, this is a placeholder
  });
}

/* =========================
   HELPER FUNCTIONS
   ========================= */
function getDefaultDateTime(scheduledStart) {
  // Convert "Feb 13 11:46 AM" to datetime-local format
  const date = new Date(scheduledStart);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }
  return date.toISOString().slice(0, 16);
}

// Wire different upgrade radio button
document.addEventListener('change', (e) => {
  if (e.target.type === 'radio' && e.target.name.startsWith('upgrade-choice-')) {
    const builder = e.target.name.replace('upgrade-choice-', '');
    const activeTab = document.querySelector(`.tab-content[data-builder="${builder}"]`);
    const showQueueBtn = activeTab.querySelector('.show-queue-btn');
    
    if (e.target.value === 'different') {
      showQueueBtn.style.display = 'inline-block';
    } else {
      showQueueBtn.style.display = 'none';
      activeTab.querySelector('.selected-different-upgrade').style.display = 'none';
    }
 }
/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  await refreshDashboard();
  startAutoRefresh();
  wireApprenticeBoost();
  wireBoostSimulation();
  wireBoostFocusNavigation();
  wireBuilderCardClicks();
  wireImageButtons();
  await checkForFinishedUpgrades();
});
