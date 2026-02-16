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

/* Builder / Pass actions */
const APPLY_TODAYS_BOOST = API_BASE + "?action=apply_todays_boost";
const SET_TODAYS_BOOST_BUILDER = API_BASE + "?action=set_todays_boost_builder&builder=";
const REORDER_BUILDER_UPGRADES = API_BASE + "?action=reorder_builder_upgrades";
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
  "Hidden Tesla": ["Lvl 16"],  // 🔧 ADDED THIS LINE
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
let loadingBuilders = new Set(); // Track which builders are currently loading
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
    
    // Handle three-dot menu
    if (menuBtn && dropdown && day.day === "TODAY") {
      // Disable menu if boost already applied
      if (todaysBoostInfo?.status === "APPLIED") {
        menuBtn.style.opacity = "0.3";
        menuBtn.style.cursor = "not-allowed";
        menuBtn.disabled = true;
      } else {
        menuBtn.style.opacity = "1";
        menuBtn.style.cursor = "pointer";
        menuBtn.disabled = false;
        
        // Hide current builder from dropdown
        const currentBuilderNum = todaysBoostInfo?.builder;
        dropdown.querySelectorAll("[data-builder-select]").forEach(btn => {
          const btnBuilderNum = btn.dataset.builderSelect.match(/(\d+)/)?.[1];
          if (btnBuilderNum === currentBuilderNum) {
            btn.style.display = "none";
          } else {
            btn.style.display = "block";
          }
        });
      }
      menuBtn.style.display = "block";
    } else if (menuBtn) {
      // Hide menu for non-TODAY days
      menuBtn.style.display = "none";
    }
  } else {
    statusEl.textContent = "No Boost";
    statusEl.classList.remove("boost-active");

    builderEl.style.display = "none";
    extraEl.style.display = "none";
    
    if (menuBtn) menuBtn.style.display = "none";
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

  // Track original order for detecting changes
  const originalOrder = details.upgrades.map((_, i) => i);
  
  wrapper.innerHTML = `
    <div class="builder-details-header"></div>
    <div class="upgrade-headers">
      <span>Future Upgrades</span>
      <span>Duration</span>
      <span>Start and End dates</span>
    </div>

    <div class="upgrade-list" data-original-order="${originalOrder.join(',')}">
      ${details.upgrades.map((upg, idx) => {
        const imgSrc = getUpgradeImage(upg.upgrade);
        // Extract duration in minutes from upgrade name or calculate it
        // Duration format: "5 d 19 hr 0 min" → need to convert to minutes
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
            <div class="upgrade-controls">
              <div class="drag-handle">⋮⋮</div>
              <button class="transfer-builder-btn" 
                      data-upgrade-name="${upg.upgrade}"
                      data-current-builder="${upg.builder}"
                      data-row="${upg.row}"
                      title="Move to another builder">👤</button>
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

  // Add drag and drop event listeners
  setTimeout(() => {
    setupDragAndDrop(wrapper);
    setupDurationEditor(wrapper);
    setupBuilderTransfer(wrapper);
  }, 0);

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
    
    // Add click handler for duration editing on card
    const durationEl = card.querySelector('.editable-card-duration');
    if (durationEl) {
      setupCardDurationEditor(durationEl);
    }
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
   DURATION EDITOR FOR BUILDER CARDS
   ========================= */
function setupCardDurationEditor(durationEl) {
  durationEl.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger card opening
    
    const builderName = durationEl.dataset.builder;
    const upgradeName = durationEl.dataset.upgrade;
    const row = durationEl.dataset.row;
    
    // Parse current time left - handle different formats
    const timeText = durationEl.textContent.trim();
    
    // Try format: "3 d 14 hr 0 min"
    let match = timeText.match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
    
    // Try alternative format: "3d 14hr 0m" or "3 days 14 hours 0 minutes"
    if (!match) {
      match = timeText.match(/(\d+)\s*(?:d|days?)\s*(\d+)\s*(?:h|hr|hours?)\s*(\d+)\s*(?:m|min|minutes?)/i);
    }
    
    // Try time-only format: "14:30:00" (hours:mins:secs)
    if (!match) {
      const timeMatch = timeText.match(/(\d+):(\d+)(?::(\d+))?/);
      if (timeMatch) {
        const days = 0;
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        match = ['', days.toString(), hours.toString(), mins.toString()];
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
        updateCardDuration(builderName, row, newTotalMinutes, newDurationHr, durationEl);
      }
    });
  });
}

async function updateCardDuration(builderName, row, newMinutes, newDurationHr, durationEl) {
  const originalText = durationEl.textContent;
  durationEl.textContent = 'Saving...';
  
  try {
    // For active upgrade, newMinutes is TIME REMAINING, not total duration
    // We need to update End_DateTime to be NOW + newMinutes
    // But keep Duration (min) as the original total duration
    
    const res = await fetch(
      `${API_BASE}?action=update_active_upgrade_time&builder=${builderName}&remaining_minutes=${newMinutes}`
    );
    const data = await res.json();
    
    if (data.error) {
      alert('Failed to update: ' + data.error);
      durationEl.textContent = originalText;
      return;
    }
    
    // Show success briefly then refresh
    durationEl.textContent = '✓ Saved!';
    setTimeout(async () => {
      // Refresh entire dashboard to show updated times
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

/* =========================
   DURATION EDITOR
   ========================= */
function setupDurationEditor(detailsWrapper) {
  const durationElements = detailsWrapper.querySelectorAll('.editable-duration');
  
  durationElements.forEach(durationEl => {
    durationEl.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't trigger drag
      
      const upgradeItem = durationEl.closest('.upgrade-item');
      const currentMinutes = parseInt(upgradeItem.dataset.durationMinutes);
      const upgradeName = upgradeItem.dataset.upgradeName;
      const builderName = upgradeItem.dataset.builder;
      const row = upgradeItem.dataset.row;
      
      // Convert minutes to days, hours, minutes
      const days = Math.floor(currentMinutes / (24 * 60));
      const hours = Math.floor((currentMinutes % (24 * 60)) / 60);
      const mins = currentMinutes % 60;
      
      showDurationPicker(days, hours, mins, (newDays, newHours, newMins) => {
        const newTotalMinutes = (newDays * 24 * 60) + (newHours * 60) + newMins;
        const newDurationHr = `${newDays} d ${newHours} hr ${newMins} min`;
        
        // Confirm change
        if (confirm(`Change duration of "${upgradeName}" to ${newDurationHr}?`)) {
          updateUpgradeDuration(builderName, row, newTotalMinutes, newDurationHr, durationEl, detailsWrapper);
        }
      });
    });
  });
}

function showDurationPicker(initialDays, initialHours, initialMins, callback) {
  // Create modal
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
  
  // Focus first input
  setTimeout(() => document.getElementById('picker-days')?.focus(), 100);
  
  // Number button handlers
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
  
  // Confirm button
  modal.querySelector('.duration-confirm-btn').addEventListener('click', () => {
    const days = parseInt(document.getElementById('picker-days').value) || 0;
    const hours = parseInt(document.getElementById('picker-hours').value) || 0;
    const mins = parseInt(document.getElementById('picker-mins').value) || 0;
    
    modal.remove();
    callback(days, hours, mins);
  });
  
  // Cancel button
  modal.querySelector('.duration-cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
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
    
    // Show success briefly
    durationEl.textContent = '✓ Saved!';
    setTimeout(() => {
      // Refresh builder details to show updated dates
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
  
  // Get all builders except current one
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
  
  // Handle builder selection
  modal.querySelectorAll('.builder-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetBuilder = btn.dataset.builder;
      modal.remove();
      callback(targetBuilder);
    });
  });
  
  // Cancel button
  modal.querySelector('.builder-picker-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
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
    
    // Show success and refresh
    alert(`✓ Moved "${upgradeName}" to ${toBuilder}`);
    
    // Refresh the builder details
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
   DRAG AND DROP FOR REORDERING
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
    // Desktop drag events
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
    
    // Mobile touch events
    const dragHandle = item.querySelector('.drag-handle');
    
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
      // Show save button and highlight changed items
      saveContainer.classList.remove('hidden');
      currentItems.forEach(item => item.classList.add('unsaved'));
    } else {
      saveContainer.classList.add('hidden');
      currentItems.forEach(item => item.classList.remove('unsaved'));
    }
  }
  
  // Save button click
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
      
      // Update original order
      originalOrder = newOrder;
      upgradeList.dataset.originalOrder = newOrder;
      
      // Remove unsaved styling
      currentItems.forEach(item => item.classList.remove('unsaved'));
      saveContainer.classList.add('hidden');
      
      // Show success
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save Order';
        saveBtn.disabled = false;
      }, 1500);
      
      // Refresh the builder details to show updated dates
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
  
  // Cancel button
  cancelBtn?.addEventListener('click', () => {
    // Reload builder details to reset order
    const builderNum = detailsWrapper.dataset.builder;
    fetchBuilderDetails(builderNum).then(builderDetails => {
      const newDetailsEl = renderBuilderDetails(builderDetails);
      detailsWrapper.replaceWith(newDetailsEl);
    });
  });
}

/* =========================
   INTERACTIONS
   ========================= */
function wireApprenticeBoost() {
  document.addEventListener("click", async e => {
    const badge = e.target.closest("[data-apply-boost]");
    if (!badge) return;
    
    // 🔒 STOP card from opening
    e.stopPropagation();
    e.preventDefault();
     
    // Prevent double-apply
    if (todaysBoostInfo?.status === "APPLIED") return;

    if (!confirm("Apply today's boost?")) return;

    // Get the builder card to update its time
    const card = badge.closest(".builder-card");
    const builderNumber = card?.dataset.builder;

    try {
      // Apply the boost
      await fetch(APPLY_TODAYS_BOOST);

      // 🔥 IMMEDIATE UI UPDATE - Change badge image
      badge.src = "Images/Builder Apprentice applied.png";
      
      // Update global state
      if (todaysBoostInfo) {
        todaysBoostInfo.status = "APPLIED";
      }

      // 🔄 Refresh data to get new times
      await loadCurrentWork();
      
      // 🎯 Update ONLY this builder's time display
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
      
      // Update other data in background
      await Promise.all([loadTodaysBoost(), loadBoostPlan()]);
      updateLastRefreshed();
      
      // Re-render cards to show APPLIED badge
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
  
  // Wire three-dot menu toggle
  const menuBtn = document.getElementById("boostMenuBtn");
  const dropdown = document.getElementById("boostBuilderDropdown");
  
  if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
    
    // Handle builder selection
    dropdown.addEventListener("click", async (e) => {
      const builderBtn = e.target.closest("[data-builder-select]");
      if (!builderBtn) return;
      
      const selectedBuilder = builderBtn.dataset.builderSelect;
      const builderNum = selectedBuilder.match(/(\d+)/)?.[1];
      
      // Show loading state
      const statusEl = document.querySelector(".boost-status");
      const builderEl = document.querySelector(".boost-builder");
      const originalStatus = statusEl.textContent;
      const originalBuilder = builderEl.textContent;
      
      statusEl.textContent = "Updating...";
      builderEl.textContent = `Changing to Builder ${builderNum}`;
      dropdown.classList.add("hidden");
      menuBtn.disabled = true;
      
      try {
        // Change the builder (this updates A23:F23)
        const res = await fetch(SET_TODAYS_BOOST_BUILDER + selectedBuilder);
        const data = await res.json();
        
        if (data.error) {
          alert(data.error);
          statusEl.textContent = originalStatus;
          builderEl.textContent = originalBuilder;
          menuBtn.disabled = false;
          return;
        }
        
        // Run boost simulation to update rows 24-30
        statusEl.textContent = "Recalculating boost plan...";
        await fetch(RUN_BOOST_SIM);
        
        // Update global state
        if (todaysBoostInfo) {
          todaysBoostInfo.builder = builderNum;
        }
        
        // Refresh everything to show badge on new builder and updated boost plan
        statusEl.textContent = "Refreshing...";
        const container = document.getElementById("builders-container");
        container.innerHTML = "";
        await Promise.all([loadCurrentWork(), loadTodaysBoost(), loadBoostPlan()]);
        renderBuilderCards();
        updateLastRefreshed();
        
        // Show success message briefly
        statusEl.textContent = "✓ Updated!";
        setTimeout(() => {
          renderBoostFocusCard(); // Restore normal display
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

// Click handler for builder cards - moved to function for clarity
function wireBuilderCardClicks() {
  document.addEventListener("click", async e => {
    // Check if badge was clicked first
    const badge = e.target.closest("[data-apply-boost]");
    if (badge) {
      // Stop event from reaching card
      e.stopPropagation();
      e.preventDefault();
      return; // Let wireApprenticeBoost handle it
    }
    
    const card = e.target.closest(".builder-card");
    if (!card) return;

    const builder = card.dataset.builder;
    if (!builder) return;

    // 🔒 Prevent interaction while loading
    if (loadingBuilders.has(builder)) return;

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

    // 🔒 Mark as loading
    loadingBuilders.add(builder);
    card.classList.add("loading");

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

    try {
      const builderDetails = await fetchBuilderDetails(builder);
      
      // 🔒 Double-check no duplicate details exist before adding
      const existingDetails = container.querySelectorAll(`.builder-details[data-builder="${builder}"]`);
      existingDetails.forEach(el => el.remove());
      
      const detailsEl = renderBuilderDetails(builderDetails);
      card.after(detailsEl);
    } catch (error) {
      console.error("Failed to load builder details:", error);
      // If loading fails, remove from openBuilders
      openBuilders = openBuilders.filter(b => b !== builder);
      card.classList.remove("expanded");
    } finally {
      // 🔓 Remove loading state
      loadingBuilders.delete(builder);
      card.classList.remove("loading");
    }
  });
}

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
  wireBuilderCardClicks();
});
