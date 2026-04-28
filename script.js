console.log("Loaded script.js – v6-all-fixes");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbzaxmuwpTD9cUzrz4e4k75caCpQrTjEDefs-B5nuEaqlFoMrBHjrhDun3Iy7kPkc9j2/exec";

function tok() {
  return window.COC_TOKEN ? `&token=${encodeURIComponent(window.COC_TOKEN)}` : '';
}
function endpoint(action) {
  return `${API_BASE}?action=${action}&username=${window.COC_USERNAME}${tok()}`;
}

/* =========================
   GAME DOMAIN RULES
   — These constants define how the COC building system works.
     All pages and logic should respect these rules.
   =========================

   BUILDING LEVEL STRUCTURE
   ─────────────────────────
   Levels progress as integers: 1, 2, 3, … up to the building's current max.
   After reaching numeric max, some buildings gain supercharge levels: *, **, ***.
   In upgrade names these appear as "Lvl *", "Lvl **", "Lvl ***".
   Numeric levels always sort before supercharge levels.

   UPGRADE NAME FORMAT
   ────────────────────
   "{Building Name} #{instance} Lvl {level}"
   - #{instance} is only present when multiple copies exist (e.g. #1, #2).
     Unique buildings omit it entirely.
   - {level} is either a number (1, 2, …) or stars (*, **, ***).
   Examples:
     "Super Wizard Tower #1 Lvl 2"   → instance 1, upgrading to Lvl 2 (current = Lvl 1)
     "Archer Tower Lvl 21"           → unique building, upgrading to Lvl 21
     "Inferno Tower #2 Lvl *"        → supercharging instance 2 (already at numeric max)

   CATEGORY PERMANENCE
   ────────────────────
   TypeB_ID | Name               | Permanent | Notes
   ---------|--------------------|-----------|-----------------------------------------
   1        | Defenses           | YES       | Standard defenses
   2        | Resources          | YES       | Mines, drills, storages
   3        | Craft. Defenses    | NO        | Temporary — added for a developer-set
            |                    |           | cycle, then removed from the game
   4        | Traps              | YES       | Spring Traps, Bombs, etc.
   5        | Supercharged       | NO        | Temporary boost on fully-upgraded
            |                    |           | defenses/collectors; disappears when
            |                    |           | the game releases the next real level
   6        | Guardians          | YES       |
   7        | Heroes             | YES       |
   8        | Army               | YES       |
   ========================= */

const CATEGORY_META = {
  "1": { name: "Defenses",        permanent: true  },
  "2": { name: "Resources",       permanent: true  },
  "3": { name: "Craft. Defenses", permanent: false },
  "4": { name: "Traps",           permanent: true  },
  "5": { name: "Supercharged",    permanent: false },
  "6": { name: "Guardians",       permanent: true  },
  "7": { name: "Heroes",          permanent: true  },
  "8": { name: "Army",            permanent: true  },
};

/* =========================
   USER PASSWORDS
   Add passwords here for users that need protection.
   Users NOT listed can log in with no password at all.

   HOW TO SET A PASSWORD:
   Remove the // from the example line and fill in the username and password.
   Example:
     "Daniel": "mypassword123",
     "Player2": "abc456",
   ========================= */
const USER_PASSWORDS = {
   "Daniel": "2304",
};

const REFRESH_ENDPOINT      = API_BASE + "?action=refresh_sheet";
function TODAYS_BOOST_URL()       { return endpoint("todays_boost"); }
function BOOST_PLAN_URL()         { return endpoint("boost_plan"); }
function APPLY_TODAYS_BOOST_URL() { return endpoint("apply_todays_boost"); }
function SET_BOOST_BUILDER_URL(b) { return endpoint("set_todays_boost_builder") + "&builder=" + b; }

function BOOST_LEVEL_URL()        { return endpoint("get_boost_level"); }
function SET_BOOST_LEVEL_URL(lvl) { return endpoint("set_boost_level") + "&level=" + lvl; }

function BUILDER_SNACK_URL()  { return endpoint("apply_one_hour_boost"); }
function BATTLE_PASS_URL()    { return endpoint("apply_battle_pass"); }
function BUILDER_DETAILS_URL(builderName) { return endpoint("builder_details") + "&builder=" + builderName; }
function PAUSED_BUILDERS_URL() { return endpoint("get_paused_builders"); }
function TOWN_HALL_LEVEL_URL()        { return endpoint("get_town_hall_level"); }
function ALL_BUILDERS_LAST_FINISH_URL() { return endpoint("get_all_builders_last_finish"); }
function REGISTER_USER_URL()          { return `${API_BASE}?action=register_user`; }

/* =========================
   BUILDING ID MAP
   Maps Clash of Clans building data IDs to human-readable names.
   Used for parsing village JSON exports.
   ========================= */
const BUILDING_ID_MAP = {
  1000000: "Army Camp",
  1000001: "Town Hall",
  1000002: "Elixir Collector",
  1000003: "Elixir Storage",
  1000004: "Gold Mine",
  1000005: "Gold Storage",
  1000006: "Barracks",
  1000007: "Laboratory",
  1000008: "Cannon",
  1000009: "Archer Tower",
  1000010: "Wall",
  1000011: "Wizard Tower",
  1000012: "Air Defense",
  1000013: "Mortar",
  1000014: "Clan Castle",
  1000015: "Builders Hut",
  1000019: "Hidden Tesla",
  1000020: "Spell Factory",
  1000021: "X-Bow",
  1000023: "Dark Elixir Drill",
  1000024: "Dark Elixir Storage",
  1000026: "Dark Barracks",
  1000027: "Inferno Tower",
  1000028: "Air Sweeper",
  1000029: "Dark Spell Factory",
  1000031: "Eagle Artillery",
  1000032: "Bomb Tower",
  1000059: "Workshop",
  1000067: "Scattershot",
  1000068: "Pet House",
  1000070: "Blacksmith",
  1000071: "Hero Hall",
  1000072: "Spell Tower",
  1000077: "Monolith",
  1000079: "Multi-Gear Tower",
  1000084: "Multi-Archer Tower",
  1000085: "Ricochet Cannon",
  1000089: "Firespitter",
  1000093: "Revenge Tower",
  1000097: "Crafted Defense",
  1000102: "Super Wizard Tower",
  4000000: "Barbarian",
  4000001: "Archer",
  4000002: "Goblin",
  4000003: "Giant",
  4000004: "Wall Breaker",
  4000005: "Balloon",
  4000006: "Wizard",
  4000007: "Healer",
  4000008: "Dragon",
  4000009: "P.E.K.K.A",
  4000010: "Minion",
  4000011: "Hog Rider",
  4000012: "Valkyrie",
  4000013: "Golem",
  4000015: "Witch",
  4000017: "Lava Hound",
  4000022: "Bowler",
  4000023: "Baby Dragon",
  4000024: "Miner",
  4000051: "Wall Wrecker",
  4000052: "Battle Blimp",
  4000053: "Yeti",
  4000058: "Ice Golem",
  4000059: "Electro Dragon",
  4000062: "Stone Slammer",
  4000065: "Dragon Rider",
  4000075: "Siege Barracks",
  4000082: "Headhunter",
  4000087: "Log Launcher",
  4000091: "Flame Flinger",
  4000092: "Battle Drill",
  4000095: "Electro Titan",
  4000097: "Apprentice Warden",
  4000110: "Root Rider",
  4000123: "Druid",
  4000132: "Thrower",
  4000135: "Troop Launcher",
  4000150: "Furnace",
  12000000: "Bomb",
  12000001: "Spring Trap",
  12000002: "Giant Bomb",
  12000005: "Air Bomb",
  12000006: "Seeking Air Mine",
  12000008: "Skeleton Trap",
  12000016: "Tornado Trap",
  12000020: "Giga Bomb",
  26000000: "Lightning Spell",
  26000001: "Healing Spell",
  26000002: "Rage Spell",
  26000003: "Jump Spell",
  26000005: "Freeze Spell",
  26000009: "Poison Spell",
  26000010: "Earthquake Spell",
  26000011: "Haste Spell",
  26000016: "Clone Spell",
  26000017: "Skeleton Spell",
  26000028: "Bat Spell",
  26000035: "Invisibility Spell",
  26000053: "Recall Spell",
  26000070: "Overgrowth Spell",
  26000098: "Revive Spell",
  26000109: "Ice Block Spell",
  28000000: "Barbarian King",
  28000001: "Archer Queen",
  28000002: "Grand Warden",
  28000004: "Royal Champion",
  28000006: "Minion Prince",
  73000000: "L.A.S.S.I",
  73000001: "Electro Owl",
  73000002: "Mighty Yak",
  73000003: "Unicorn",
  73000004: "Phoenix",
  73000007: "Poison Lizard",
  73000008: "Diggy",
  73000009: "Frosty",
  73000010: "Spirit Fox",
  73000011: "Angry Jelly",
  73000016: "Sneezy",
};

/* IMAGE_MAP, HERO_NAMES, getSuperchargeImage, getUpgradeImage → imagemap.js */

let _riDoneTimer = null;
function showRefreshIndicator(state) {
  const el = document.getElementById('refresh-indicator');
  if (!el) return;
  clearTimeout(_riDoneTimer);
  el.classList.remove('hidden', 'refreshing', 'done');
  if (state === 'refreshing') {
    el.classList.add('refreshing');
  } else if (state === 'done') {
    el.classList.add('done');
    _riDoneTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  } else {
    el.classList.add('hidden');
  }
}

function formatUpgradeName(name) {
  if (!name) return '';
  return name.replace(/\*/g, '<img src="Images/SCicon.png" style="height:1em;vertical-align:middle;margin:0 1px;" alt="SC">');
}


/* =========================
   GLOBAL STATE
   ========================= */
let currentWorkData = null;
let townHallLevel = null;
let allBuildersLastFinish = null;
let todaysBoostInfo = null;
let isRefreshing = false;
let _pendingRefresh = false;      // queues a fast-refresh while one is in-flight
let _mutationQueue = Promise.resolve(); // serialises write operations
let _autoRefreshTimer = null;     // resettable auto-refresh timeout
let reviewedTabs = new Set();
let finishedUpgradesData = null;
let boostPlanData = [];
let currentBoostIndex = 0;
let currentBoostLevel = 8;
const MAX_BOOST_LEVEL = 8; // update when a new level is added to the game
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

const AUTO_REFRESH_MS = 90 * 1000;
let _nextRefreshAt = null;
let _refreshCountdownTimer = null;

function updateLastRefreshed() {
  const el = document.getElementById("lastRefreshed");
  if (!el) return;
  const timeStr = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
  _nextRefreshAt = Date.now() + AUTO_REFRESH_MS;
  clearInterval(_refreshCountdownTimer);
  _refreshCountdownTimer = setInterval(() => {
    if (!_nextRefreshAt) return;
    const secsLeft = Math.max(0, Math.ceil((_nextRefreshAt - Date.now()) / 1000));
    el.textContent = `Last refreshed: ${timeStr} · next in ${secsLeft}s`;
    if (secsLeft === 0) clearInterval(_refreshCountdownTimer);
  }, 1000);
}

// Enqueue a write operation so concurrent edits are serialised.
// The async fn is not started until all previously-queued mutations finish.
function enqueueMutation(fn) {
  const result = _mutationQueue.then(() => fn());
  _mutationQueue = result.catch(() => {}); // keep the chain alive on error
  return result;
}

// Resettable auto-refresh: each call cancels the current timer and starts a
// fresh one.  Call after a successful mutation to push the next refresh back.
function scheduleNextRefresh(delay = AUTO_REFRESH_MS) {
  clearTimeout(_autoRefreshTimer);
  _nextRefreshAt = Date.now() + delay;
  _autoRefreshTimer = setTimeout(runAutoRefresh, delay);
}

async function runAutoRefresh() {
  await refreshDashboard();
  scheduleNextRefresh(); // chain the next tick
}

function parseScheduledStart(scheduledStart) {
  if (!scheduledStart) return null;
  const currentYear = new Date().getFullYear();
  for (const year of [currentYear, currentYear + 1]) {
    const d = new Date(`${scheduledStart} ${year}`);
    if (!isNaN(d.getTime())) return d;
  }
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
    renderTownHallSection();
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

async function loadTownHallLevel() {
  try {
    const res  = await fetch(TOWN_HALL_LEVEL_URL());
    const data = await res.json();
    console.log("[TH] raw response:", data);
    const parsed = parseInt(data.th_level, 10);
    townHallLevel = isNaN(parsed) ? null : parsed;
  } catch (e) {
    console.error("loadTownHallLevel failed", e);
    townHallLevel = null;
  }
}

async function loadAllBuildersLastFinish() {
  try {
    const res  = await fetch(ALL_BUILDERS_LAST_FINISH_URL());
    const data = await res.json();
    allBuildersLastFinish = data.last_finish ?? null;
  } catch (e) {
    console.error("loadAllBuildersLastFinish failed", e);
    allBuildersLastFinish = null;
  }
}

function formatLastFinishDate(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const opts = {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric"
  };
  return d.toLocaleString("en-US", opts).replace(/,/g, "");
}

function renderTownHallSection() {
  const section = document.getElementById("th-info-section");
  if (!section) return;
  if (!townHallLevel) { section.innerHTML = ""; return; }

  const imgSrc   = `Images/Upgrades/Town Hall Lvl ${townHallLevel}.png`;
  const finishStr = allBuildersLastFinish ? formatLastFinishDate(allBuildersLastFinish) : "—";

  section.innerHTML = `
    <img class="th-info-img" src="${imgSrc}" alt="Town Hall ${townHallLevel}"
         onerror="this.src='Images/Upgrades/PH.png'" />
    <div class="th-info-details">
      <div class="th-info-title">Town Hall ${townHallLevel}</div>
      <div class="th-info-finish">
        <span class="th-info-finish-label">Est. Finish</span>
        <span class="th-info-finish-date">${finishStr}</span>
      </div>
    </div>`;
}

async function loadBoostLevel() {
  try {
    const res  = await fetch(BOOST_LEVEL_URL());
    const data = await res.json();
    currentBoostLevel = data.level ?? 8;
    const badge = document.getElementById("boostLevelBadge");
    if (badge) badge.textContent = currentBoostLevel + " Lvl";
  } catch (e) { console.error("loadBoostLevel failed", e); }
}

async function loadBoostPlan() {
  try {
    const res = await fetch(BOOST_PLAN_URL());
    const data = await res.json();
    if (!data?.table || data.table.length <= 1) { boostPlanData = []; return; }
    boostPlanData = data.table.slice(1).map((row, i) => ({
      day:          i === 0 ? "TODAY" : row[0],
      hasBoost:     true,
      upgradeName:  row[1],
      builder:      row[2].replace("_", " "),
      newFinishTime: row[4],
      mode:         row[5]
    }));
    currentBoostIndex = 0;
    renderBoostFocusCard();
  } catch (e) { console.error("Boost plan failed", e); }
}

async function refreshDashboardFast() {
  if (isRefreshing) { _pendingRefresh = true; return; }
  isRefreshing = true;
  showRefreshIndicator('refreshing');
  try {
    updateActiveStatusSmart();
    await Promise.all([
      loadCurrentWork(),
      loadTodaysBoost(),
      loadPausedBuilders(),
      loadBoostPlan(),
      loadBoostLevel(),
      loadTownHallLevel(),
      loadAllBuildersLastFinish()
    ]);
    if (openBuilders.length === 0) {
      const container = document.getElementById("builders-container");
      if (container) container.innerHTML = "";
      renderBuilderCards();
    }
    renderTownHallSection();
    updateLastRefreshed();
    showRefreshIndicator('done');
  } catch (e) {
    console.error("Fast refresh failed", e);
    showRefreshIndicator('hidden');
  } finally {
    isRefreshing = false;
    if (_pendingRefresh) { _pendingRefresh = false; refreshDashboardFast(); }
  }
}

async function refreshDashboard() {
  if (isRefreshing) { _pendingRefresh = true; return; }
  isRefreshing = true;
  showRefreshIndicator('refreshing');
  try {
    updateActiveStatusSmart();
    await fetch(endpoint("refresh_sheet"));
    await Promise.all([
      loadCurrentWork(),
      loadTodaysBoost(),
      loadPausedBuilders(),
      loadBoostPlan(),
      loadBoostLevel(),
      loadTownHallLevel(),
      loadAllBuildersLastFinish()
    ]);
    if (openBuilders.length === 0) {
      const container = document.getElementById("builders-container");
      if (container) container.innerHTML = "";
      renderBuilderCards();
    }
    renderTownHallSection();
    updateLastRefreshed();
    showRefreshIndicator('done');
  } catch (e) {
    console.error("Refresh failed", e);
    showRefreshIndicator('hidden');
  } finally {
    isRefreshing = false;
    if (_pendingRefresh) { _pendingRefresh = false; refreshDashboardFast(); }
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
    const thumbSrc = getUpgradeImage(day.upgradeName || '');
    builderEl.innerHTML = `<img src="${thumbSrc}" class="boost-upgrade-thumb" onerror="this.src='Images/Upgrades/PH.png'" />${day.builder}`;
    builderEl.style.display = "flex";
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
    builderEl.innerHTML = "";
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
    <div class="builder-stats-bar">
      <div class="builder-stat">
        <span class="builder-stat-value">${details.upgrades.length}</span>
        <span class="builder-stat-label">upgrade${details.upgrades.length !== 1 ? 's' : ''} queued</span>
      </div>
      <div class="builder-stat-sep"></div>
      <div class="builder-stat">
        <span class="builder-stat-label">Expected finish</span>
        <span class="builder-stat-value">${details.upgrades.length > 0 ? details.upgrades[details.upgrades.length - 1].end : '—'}</span>
      </div>
    </div>
    <div class="upgrade-headers">
      <span></span><span>Future Upgrades</span><span>Duration</span>
      <span>Start and End dates</span><span></span>
    </div>
    <div class="upgrade-list" data-original-order="${originalOrder.join(',')}">
      ${details.upgrades.map((upg, idx) => {
        const isSC = upg.upgrade && upg.upgrade.includes('*');
        const imgSrc = isSC ? getSuperchargeImage(upg.upgrade) : getUpgradeImage(upg.upgrade);
        const totalMinutes = upg.durationMinutes || 0;
        return `
          <div class="upgrade-item"
               data-builder="${upg.builder}" data-row="${upg.row}"
               data-index="${idx}" data-upgrade-name="${upg.upgrade}"
               data-duration-minutes="${totalMinutes}" draggable="true">
            <div class="drag-handle">⋮⋮</div>
            <div class="upgrade-name">
              ${isSC ? `
              <div style="position:relative;display:inline-flex;flex-shrink:0;">
                <img src="${imgSrc}" class="upgrade-icon" alt="${upg.upgrade}"
                     onerror="this.src='Images/Upgrades/PH.png'"
                     style="filter:drop-shadow(0 0 5px rgba(9,61,186,0.85));" />
                <div style="position:absolute;inset:0;background:rgba(9,61,186,0.10);border-radius:6px;pointer-events:none;"></div>
              </div>` : `
              <img src="${imgSrc}" class="upgrade-icon" alt="${upg.upgrade}"
                   onerror="this.src='Images/Upgrades/PH.png'" />`}
              <span${isSC ? ' style="color:#093DBA"' : ''}>${formatUpgradeName(upg.upgrade)}</span>
              ${upg.cost ? `<span class="upgrade-cost">${upg.cost}</span>` : ''}
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
  const matches = boostPlanData.filter(day => {
    if (!day.hasBoost) return false;
    const boostBuilderNum = day.builder.match(/(\d+)/)?.[1];
    return boostBuilderNum === builderNumber;
  });
  if (!matches.length) return null;
  return matches[matches.length - 1].newFinishTime;
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

  let cardCount = 0;
  for (let i = 1; i < currentWorkData.length && cardCount < 6; i++) {
    const row               = currentWorkData[i];
    cardCount++;
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
          <div class="builder-finish-row">
            <div class="builder-finish">Finishes: ${formatFinishTime(row[2])}</div>
            <button class="finish-upgrade-btn" data-builder="${builderNumber}" data-upgrade="${row[1]}" data-next="${row[4]}" title="Mark upgrade as finished"><img src="Images/Finished.png" alt="Finish" /></button>
          </div>
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
  const newFinishDate = new Date(Date.now() + newMinutes * 60 * 1000);

  // Optimistic DOM update
  durationEl.textContent = newDurationHr;
  const finishEl = durationEl.closest('.builder-text')?.querySelector('.builder-finish');
  const originalFinishText = finishEl?.textContent;
  if (finishEl) finishEl.textContent = 'Finishes: ' + formatFinishTime(newFinishDate);

  // Optimistic currentWorkData update
  const builderNum = builderName.match(/(\d+)/)?.[1];
  let originalDataFinish = null;
  if (builderNum && currentWorkData) {
    const dataRow = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
    if (dataRow) { originalDataFinish = dataRow[2]; dataRow[2] = newFinishDate.toISOString(); }
  }

  showRefreshIndicator('refreshing');
  suppressFinishedCheckFor(60 * 1000);

  await enqueueMutation(async () => {
    try {
      const res  = await fetch(`${API_BASE}?action=update_active_upgrade_time&username=${window.COC_USERNAME}&builder=${builderName}&remaining_minutes=${newMinutes}${tok()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      scheduleNextRefresh(); // push auto-refresh back so it doesn't race with our update
      showRefreshIndicator('done');
    } catch (err) {
      console.error('Update failed:', err);
      // Rollback
      durationEl.textContent = originalText;
      if (finishEl && originalFinishText) finishEl.textContent = originalFinishText;
      if (builderNum && currentWorkData && originalDataFinish !== null) {
        const dataRow = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
        if (dataRow) dataRow[2] = originalDataFinish;
      }
      showRefreshIndicator('hidden');
      showBsErrorToast('Failed to update duration — no changes were made');
    }
  });
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
  await enqueueMutation(async () => {
    try {
      const res  = await fetch(`${API_BASE}?action=update_upgrade_duration&username=${window.COC_USERNAME}&builder=${builderName}&row=${row}&minutes=${newMinutes}&duration_hr=${encodeURIComponent(newDurationHr)}${tok()}`);
      const data = await res.json();
      if (data.error) { alert('Failed to update: ' + data.error); durationEl.textContent = originalText; return; }
      scheduleNextRefresh();
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
  });
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
    const res  = await fetch(`${API_BASE}?action=transfer_upgrade&username=${window.COC_USERNAME}&upgrade=${encodeURIComponent(upgradeName)}&from_builder=${fromBuilder}&row=${row}&to_builder=${toBuilder}${tok()}`);
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
      const url = `${API_BASE}?action=reorder_builder_upgrades&username=${encodeURIComponent(window.COC_USERNAME)}&builder=Builder_${builderNum}&order=${encodeURIComponent(newOrder)}${tok()}`;
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

      if (todaysBoostInfo) todaysBoostInfo.status = "APPLIED";
      else todaysBoostInfo = { status: "APPLIED", builder: builderNumber };

      badge.src = "Images/Badge/Builder Apprentice applied.png";

      // Instant card update from the API response — no extra fetch needed
      if (card && data.newEndTime && data.newDuration != null) {
        const newEnd = new Date(data.newEndTime);
        const tl = card.querySelector(".builder-time-left");
        const ft = card.querySelector(".builder-finish");
        if (tl) {
          const d = Math.floor(data.newDuration / (24 * 60));
          const h = Math.floor((data.newDuration % (24 * 60)) / 60);
          const m = data.newDuration % 60;
          tl.textContent = `${d} d ${h} hr ${m} min`;
        }
        if (ft) ft.textContent = "Finishes: " + formatFinishTime(newEnd);
      }

      // Refresh remaining data in parallel
      await Promise.all([loadCurrentWork(), loadBoostPlan()]);
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
  document.getElementById("oneHourBoostBtn")?.addEventListener("click",  () => showBuilderSnackModal());
  document.getElementById("builderPotionBtn")?.addEventListener("click", () => showBuilderPotionModal());
  document.getElementById("battlePassBtn")?.addEventListener("click",    async () => { await fetch(BATTLE_PASS_URL()); refreshDashboard(); });
  document.getElementById("buildingBtn")?.addEventListener("click",      () => { window.location.href = "building.html"; });
}

/* =========================
   BUILDER BOOST MODAL (shared)
   ========================= */
function showBuilderSnackModal()  { showBuilderBoostModal({ title: 'Builder Snack',  image: 'Images/BuilderSnack.png',   desc: 'Each snack reduces all active builders by 1 hour.',   minsPerUse: 60,  apiAction: 'apply_one_hour_boost',   errorMsg: 'Failed to apply snacks — no changes were made'  }); }
function showBuilderPotionModal() { showBuilderBoostModal({ title: 'Builder Potion', image: 'Images/BuilderPotion.png', desc: 'Each potion reduces all active builders by 9 hours.', minsPerUse: 540, apiAction: 'apply_builder_potion', errorMsg: 'Failed to apply potion — no changes were made' }); }

function showBuilderBoostModal({ title, image, desc, minsPerUse, apiAction, errorMsg }) {
  document.querySelector('.bs-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'bs-modal-overlay';
  overlay.innerHTML = `
    <div class="bs-modal">
      <h3><img src="${image}" class="bs-title-icon" alt=""> ${title}</h3>
      <p class="bs-modal-desc">${desc}</p>
      <div class="bs-count-row">
        <button class="bs-count-btn" id="bsDecBtn">−</button>
        <input class="bs-count-input" id="bsCountInput" type="number" min="1" max="10" value="1">
        <button class="bs-count-btn" id="bsIncBtn">+</button>
      </div>
      <div class="bs-preview-list" id="bsPreviewList">
        <div class="bs-preview-loading">Loading preview…</div>
      </div>
      <div class="bs-modal-footer">
        <button class="bs-cancel-btn" id="bsCancelBtn">Cancel</button>
        <button class="bs-apply-btn" id="bsApplyBtn" disabled>Apply</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const countInput  = overlay.querySelector('#bsCountInput');
  const decBtn      = overlay.querySelector('#bsDecBtn');
  const incBtn      = overlay.querySelector('#bsIncBtn');
  const applyBtn    = overlay.querySelector('#bsApplyBtn');
  const cancelBtn   = overlay.querySelector('#bsCancelBtn');
  const previewList = overlay.querySelector('#bsPreviewList');

  let debounceTimer = null;

  function updateCountBtns() {
    const v = parseInt(countInput.value) || 1;
    decBtn.disabled = v <= 1;
    incBtn.disabled = v >= 10;
  }

  function bsFormatTime(ms) {
    if (!ms) return '—';
    const d = new Date(ms);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function bsBuilderLabel(builderStr) {
    return builderStr.replace(/^[^_]+_/, '').replace(/_/g, ' ');
  }

  function fetchPreview() {
    const times = parseInt(countInput.value) || 1;
    const reduceMs = times * minsPerUse * 60 * 1000;

    if (!currentWorkData || currentWorkData.length <= 1) {
      previewList.innerHTML = '<div class="bs-preview-loading">No builder data loaded.</div>';
      return;
    }

    const rows = [];
    for (let i = 1; i < currentWorkData.length; i++) {
      const row = currentWorkData[i];
      const builderName = row[0]?.toString();
      const upgradeName = row[1]?.toString() || '';
      const finishMs = new Date(row[2]).getTime();
      if (!builderName || isNaN(finishMs)) continue;
      rows.push({ builder: builderName, upgrade: upgradeName, oldTime: finishMs, newTime: finishMs - reduceMs });
    }

    if (rows.length === 0) {
      previewList.innerHTML = '<div class="bs-preview-loading">No active upgrades found.</div>';
      applyBtn.disabled = true;
      return;
    }

    const savedMins = reduceMs / 60000;
    const savedLabel = savedMins >= 60
      ? `(${savedMins / 60} hr${savedMins / 60 !== 1 ? 's' : ''})`
      : `(${savedMins} min.)`;

    previewList.innerHTML = rows.map(p => `
      <div class="bs-builder-row">
        <img src="${getUpgradeImage(p.upgrade)}" class="bs-upgrade-icon"
             alt="${p.upgrade}" onerror="this.src='Images/Upgrades/PH.png'">
        <span class="bs-builder-name">${bsBuilderLabel(p.builder)}<span class="bs-saved-label">${savedLabel}</span></span>
        <span class="bs-builder-times">
          ${bsFormatTime(p.oldTime)}
          <span class="bs-arrow">→</span>
          <span class="bs-new-time">${bsFormatTime(p.newTime)}</span>
        </span>
      </div>`).join('');
    applyBtn.disabled = false;
  }

  function schedulePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchPreview, 200);
  }

  decBtn.addEventListener('click', () => {
    const v = parseInt(countInput.value) || 1;
    if (v > 1) { countInput.value = v - 1; updateCountBtns(); schedulePreview(); }
  });
  incBtn.addEventListener('click', () => {
    const v = parseInt(countInput.value) || 1;
    if (v < 10) { countInput.value = v + 1; updateCountBtns(); schedulePreview(); }
  });
  countInput.addEventListener('input', () => {
    let v = parseInt(countInput.value) || 1;
    v = Math.max(1, Math.min(10, v));
    countInput.value = v;
    updateCountBtns();
    schedulePreview();
  });

  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  applyBtn.addEventListener('click', async () => {
    const times = parseInt(countInput.value) || 1;
    const reduceMs = times * minsPerUse * 60 * 1000;

    const snapshot = currentWorkData ? currentWorkData.map(row => [...row]) : null;

    if (currentWorkData) {
      for (let i = 1; i < currentWorkData.length; i++) {
        const finishMs = new Date(currentWorkData[i][2]).getTime();
        if (!isNaN(finishMs)) {
          currentWorkData[i][2] = new Date(finishMs - reduceMs).toISOString();
        }
      }
      const now = Date.now();
      document.querySelectorAll('.builder-time-left[data-builder]').forEach(el => {
        const builderNum = el.dataset.builder.match(/(\d+)/)?.[1];
        if (!builderNum) return;
        const row = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
        if (!row) return;
        const newFinishMs = new Date(row[2]).getTime();
        const remainingMs = newFinishMs - now;
        if (remainingMs > 0) {
          const totalMins = Math.floor(remainingMs / 60000);
          const days  = Math.floor(totalMins / (24 * 60));
          const hours = Math.floor((totalMins % (24 * 60)) / 60);
          const mins  = totalMins % 60;
          el.textContent = `${days} d ${hours} hr ${mins} min`;
        } else {
          el.textContent = '0 d 0 hr 0 min';
        }
        const finishEl = el.closest('.builder-text')?.querySelector('.builder-finish');
        if (finishEl) finishEl.textContent = 'Finishes: ' + formatFinishTime(new Date(row[2]));
      });
    }

    overlay.remove();
    showRefreshIndicator('refreshing');

    try {
      const res = await fetch(`${API_BASE}?action=${apiAction}&username=${window.COC_USERNAME}&times=${times}${tok()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.updatedBuilders) && data.updatedBuilders.length === 0) {
        throw new Error('No builders were updated');
      }
      await refreshDashboardFast();
    } catch(e) {
      if (snapshot) {
        currentWorkData = snapshot;
        const now = Date.now();
        document.querySelectorAll('.builder-time-left[data-builder]').forEach(el => {
          const builderNum = el.dataset.builder.match(/(\d+)/)?.[1];
          if (!builderNum) return;
          const row = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
          if (!row) return;
          const finishMs = new Date(row[2]).getTime();
          const remainingMs = finishMs - now;
          if (remainingMs > 0) {
            const totalMins = Math.floor(remainingMs / 60000);
            const days  = Math.floor(totalMins / (24 * 60));
            const hours = Math.floor((totalMins % (24 * 60)) / 60);
            const mins  = totalMins % 60;
            el.textContent = `${days} d ${hours} hr ${mins} min`;
          } else {
            el.textContent = '0 d 0 hr 0 min';
          }
          const finishEl = el.closest('.builder-text')?.querySelector('.builder-finish');
          if (finishEl) finishEl.textContent = 'Finishes: ' + formatFinishTime(new Date(row[2]));
        });
      }
      showRefreshIndicator('hidden');
      showBsErrorToast(errorMsg);
    }
  });

  updateCountBtns();
  fetchPreview();
}

function showBsErrorToast(msg) {
  document.querySelector('.bs-error-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'bs-error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* =========================
   BOOST LEVEL MODAL
   ========================= */
function showBoostLevelModal() {
  document.querySelector('.boost-level-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'bs-modal-overlay boost-level-overlay';
  overlay.style.cssText = 'display:flex;';

  function buildContent() {
    const atMax = currentBoostLevel >= MAX_BOOST_LEVEL;
    return `
      <div class="bs-modal boost-level-modal">
        <button class="boost-level-close">✕</button>
        <button class="boost-level-gear" title="Downgrade settings">⚙</button>

        <div class="boost-level-body">
          <img src="Images/Badge/Builder Apprentice Safe.png" class="boost-level-img"
               onerror="this.src='Images/Upgrades/PH.png'" />
          <div class="boost-level-info">
            <div class="boost-level-title">Builder's Apprentice</div>
            <div class="boost-level-current">Level <strong>${currentBoostLevel}</strong></div>
            <div class="boost-level-up-section" ${atMax ? 'style="display:none"' : ''}>
              <div class="boost-level-up-idle">
                <button class="boost-level-up-btn">Level Up →</button>
              </div>
              <div class="boost-level-up-confirm" style="display:none">
                <div class="boost-level-confirm-text">
                  Level up to <strong>Level ${currentBoostLevel + 1}</strong>?
                </div>
                <div class="boost-level-confirm-actions">
                  <button class="boost-level-confirm-yes">✓ Confirm</button>
                  <button class="boost-level-confirm-no">Cancel</button>
                </div>
              </div>
            </div>
            ${atMax ? '<div class="boost-level-maxed">Max level</div>' : ''}
          </div>
        </div>

        <div class="boost-level-gear-panel" style="display:none">
          <div class="boost-level-gear-title">Downgrade to:</div>
          ${Array.from({length: currentBoostLevel - 1}, (_, i) => i + 1).reverse().map(lvl => `
            <button class="boost-level-down-btn" data-level="${lvl}">Level ${lvl}</button>
          `).join('')}
          ${currentBoostLevel <= 1 ? '<div style="color:#9999a8;font-size:12px;text-align:center">Already at minimum</div>' : ''}
        </div>
      </div>`;
  }

  overlay.innerHTML = buildContent();
  document.body.appendChild(overlay);

  function rebind() {
    overlay.querySelector('.boost-level-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Level up flow
    overlay.querySelector('.boost-level-up-btn')?.addEventListener('click', () => {
      overlay.querySelector('.boost-level-up-idle').style.display = 'none';
      overlay.querySelector('.boost-level-up-confirm').style.display = 'block';
    });
    overlay.querySelector('.boost-level-confirm-no')?.addEventListener('click', () => {
      overlay.querySelector('.boost-level-up-confirm').style.display = 'none';
      overlay.querySelector('.boost-level-up-idle').style.display = 'block';
    });
    overlay.querySelector('.boost-level-confirm-yes')?.addEventListener('click', async () => {
      const newLevel = currentBoostLevel + 1;
      overlay.querySelector('.boost-level-confirm-yes').disabled = true;
      overlay.querySelector('.boost-level-confirm-yes').textContent = '…';
      try {
        await fetch(SET_BOOST_LEVEL_URL(newLevel));
        currentBoostLevel = newLevel;
        const badge = document.getElementById('boostLevelBadge');
        if (badge) badge.textContent = currentBoostLevel + ' Lvl';
        overlay.remove();
      } catch (e) {
        console.error('Failed to set boost level', e);
        overlay.querySelector('.boost-level-confirm-yes').disabled = false;
        overlay.querySelector('.boost-level-confirm-yes').textContent = '✓ Confirm';
      }
    });

    // Gear toggle
    const gearBtn   = overlay.querySelector('.boost-level-gear');
    const gearPanel = overlay.querySelector('.boost-level-gear-panel');
    gearBtn?.addEventListener('click', e => {
      e.stopPropagation();
      gearPanel.style.display = gearPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Downgrade buttons
    overlay.querySelectorAll('.boost-level-down-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newLevel = parseInt(btn.dataset.level);
        btn.disabled = true; btn.textContent = '…';
        try {
          await fetch(SET_BOOST_LEVEL_URL(newLevel));
          currentBoostLevel = newLevel;
          const badge = document.getElementById('boostLevelBadge');
          if (badge) badge.textContent = currentBoostLevel + ' Lvl';
          overlay.remove();
        } catch (e) {
          console.error('Failed to set boost level', e);
          btn.disabled = false;
        }
      });
    });
  }

  rebind();
}

function wireBoostLevel() {
  document.getElementById('boostLevelBadge')
    ?.addEventListener('click', showBoostLevelModal);
}

function wireBoostSimulation() {
  const btn = document.getElementById("runBoostSimBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true; btn.classList.add("spinning");
    try {
      await fetch(endpoint("run_boost_simulation"), { redirect: 'follow' });
      await refreshDashboardFast();
    } catch (e) { console.error("Boost sim failed:", e); }
    btn.classList.remove("spinning"); btn.disabled = false;
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
    const finishBtn = e.target.closest(".finish-upgrade-btn");
    if (finishBtn) { showFinishUpgradeModal(finishBtn.dataset.builder, finishBtn.dataset.upgrade, finishBtn.dataset.next); return; }
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

function setupPullToRefresh(onRefresh) {
  const THRESHOLD = 80;
  let startY = 0, dist = 0, active = false;

  const bar = document.createElement('div');
  bar.className = 'ptr-bar';
  document.body.prepend(bar);

  function onStart(clientY) {
    if (window.scrollY !== 0) return;
    startY = clientY; dist = 0; active = true;
  }
  function onMove(clientY) {
    if (!active) return;
    dist = Math.max(0, clientY - startY);
    bar.style.setProperty('--ptr-p', Math.min(dist / THRESHOLD, 1));
    bar.classList.toggle('ptr-ready', dist >= THRESHOLD);
  }
  async function onEnd() {
    if (!active) return;
    active = false;
    if (dist < THRESHOLD) {
      bar.style.setProperty('--ptr-p', 0);
      bar.classList.remove('ptr-ready');
      return;
    }
    bar.classList.remove('ptr-ready');
    bar.classList.add('ptr-loading');
    await onRefresh();
    bar.classList.remove('ptr-loading');
    bar.style.setProperty('--ptr-p', 0);
    dist = 0;
  }

  document.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  document.addEventListener('touchmove',  e => onMove(e.touches[0].clientY),  { passive: true });
  document.addEventListener('touchend',   onEnd);

  document.addEventListener('mousedown', e => onStart(e.clientY));
  document.addEventListener('mousemove', e => { if (active) onMove(e.clientY); });
  document.addEventListener('mouseup',   onEnd);
}

function startAutoRefresh() {
  scheduleNextRefresh(); // resettable timer instead of fixed setInterval
  setInterval(softRefreshBuilderCards, 10 * 60 * 1000);
}

/* =========================
   LIVE COUNTDOWN
   ========================= */
function startLiveCountdown() {
  setInterval(() => {
    if (!currentWorkData) return;
    const now = Date.now();
    document.querySelectorAll(".builder-time-left[data-builder]").forEach(el => {
      const builderName = el.dataset.builder;
      const builderNum  = builderName.match(/(\d+)/)?.[1];
      if (!builderNum) return;
      const row = currentWorkData.find(r => r[0]?.toString().includes(`_${builderNum}`) || r[0]?.toString().endsWith(builderNum));
      if (!row) return;
      const finishMs = new Date(row[2]).getTime();
      if (isNaN(finishMs)) return;
      const remainingMs = finishMs - now;
      if (remainingMs <= 0) { el.textContent = "0 d 0 hr 0 min"; return; }
      const totalMins  = Math.floor(remainingMs / 60000);
      const days  = Math.floor(totalMins / (24 * 60));
      const hours = Math.floor((totalMins % (24 * 60)) / 60);
      const mins  = totalMins % 60;
      el.textContent = `${days} d ${hours} hr ${mins} min`;
    });
  }, 60 * 1000);
}

/* =========================
   UPGRADE CONFIRMATION MODAL
   ========================= */
let lastFinishedCheck = 0;
let suppressFinishedCheck = false;

async function checkForFinishedUpgrades(force = false) {
  if (suppressFinishedCheck && !force) return;
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

function showUpgradeConfirmationModal(upgrades) {
  reviewedTabs = new Set();
  document.querySelector('.upgrade-confirmation-modal-overlay')?.remove();
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
  const m = (active.totalDuration || '').match(/(\d+)\s*d\s*(\d+)\s*hr\s*(\d+)\s*min/);
  const prefillDays = m?m[1]:'0', prefillHours = m?m[2]:'0', prefillMins = m?m[3]:'0';
  const defaultDT = scheduledToDatetimeLocal(active.scheduledStart);
  return `
    <div class="ucm-tab-content ${isActive?'active':''}" data-builder="${b}">
      ${builderData.finished.map((f, i) => `
        <div class="ucm-finished-row">
          <span class="ucm-finished-text">✅ <strong>${f.upgradeName}</strong> finished <span class="ucm-finished-time">&nbsp;·&nbsp; ${f.finishedTime}</span></span>
          ${i > 0 ? `<button class="ucm-resume-from-btn" data-builder="${b}" data-from-index="${i}" data-upgrade="${f.upgradeName.replace(/"/g,'&quot;')}">↩ Resume from here</button>` : ''}
        </div>
      `).join('')}
      ${builderData.finished.length > 1 ? `<div class="ucm-cascade-warn">⚠️ Multiple upgrades finished — if an earlier one didn't start, later ones couldn't have either. Use <strong>↩ Resume from here</strong> on the upgrade that didn't start.</div>` : ''}
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
  modal.querySelectorAll('.ucm-resume-from-btn').forEach(btn => btn.addEventListener('click', () => handleResumeFrom(btn, modal, upgrades)));
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
    const params = new URLSearchParams({ action:'confirm_upgrade_start', username:window.COC_USERNAME, builder:b, upgradeName, startTime:startTime.toISOString(), confirmAction:choice==='different'?'different':'confirm', differentUpgrade:differentUpgrade||'', token:window.COC_TOKEN||'' });
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
    const params = new URLSearchParams({ action:'confirm_upgrade_start', username:window.COC_USERNAME, builder:b, upgradeName:'', startTime:'', confirmAction:'pause', differentUpgrade:'', token:window.COC_TOKEN||'' });
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

async function handleResumeFrom(btn, modal, upgrades) {
  const b = btn.dataset.builder;
  const fromIndex = parseInt(btn.dataset.fromIndex);
  const bd = upgrades.find(u => u.builder === b);
  if (!bd) return;
  const resumeUpgrade = bd.finished[fromIndex].upgradeName;
  const toRequeue = [
    ...bd.finished.slice(fromIndex).map(f => f.upgradeName),
    bd.nowActive.upgradeName
  ];
  if (!confirm(`"${resumeUpgrade}" didn't start?\n\nThis will requeue "${resumeUpgrade}" and everything after it so you can review from there.`)) return;
  btn.disabled = true; btn.textContent = 'Rewinding…';
  try {
    const params = new URLSearchParams({
      action: 'confirm_upgrade_start',
      username: window.COC_USERNAME,
      builder: b,
      upgradeName: resumeUpgrade,
      startTime: '',
      confirmAction: 'rewind',
      differentUpgrade: '',
      requeueUpgrades: toRequeue.join(','),
      token: window.COC_TOKEN || ''
    });
    const res  = await fetch(API_BASE + '?' + params.toString());
    const data = await res.json();
    if (data.error) { alert('Error: '+data.error); btn.disabled=false; btn.textContent='↩ Resume from here'; return; }
    // Re-fetch only the finished upgrades state and rebuild the modal — no full page refresh
    const res2 = await fetch(endpoint("check_finished_upgrades"));
    const data2 = await res2.json();
    console.log('[rewind] check_finished_upgrades response:', JSON.stringify(data2));
    modal.remove();
    if (data2.finishedUpgrades && data2.finishedUpgrades.length > 0) {
      showUpgradeConfirmationModal(data2.finishedUpgrades);
    }
  } catch (err) {
    console.error('Rewind failed:', err); alert('Failed to rewind builder');
    btn.disabled=false; btn.textContent='↩ Resume from here';
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
        params = new URLSearchParams({ action:'start_paused_builder', username:window.COC_USERNAME, builder:b, method:'exact', startTime:exactTime.toISOString(), token:window.COC_TOKEN||'' });
      } else {
        const d = parseInt(document.getElementById('sp-rd').value)||0;
        const h = parseInt(document.getElementById('sp-rh').value)||0;
        const m = parseInt(document.getElementById('sp-rm').value)||0;
        params = new URLSearchParams({ action:'start_paused_builder', username:window.COC_USERNAME, builder:b, method:'remaining', remainingMinutes:String(d*24*60+h*60+m), token:window.COC_TOKEN||'' });
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

/* =========================
   FINISH UPGRADE (MANUAL)
   ========================= */
function showFinishUpgradeModal(builderNumber, currentUpgrade, nextUpgrade) {
  document.querySelector('.fim-overlay')?.remove();
  const imgSrc     = getUpgradeImage(currentUpgrade);
  const nextImgSrc = getUpgradeImage(nextUpgrade);
  const overlay = document.createElement('div');
  overlay.className = 'fim-overlay';
  overlay.innerHTML = `
    <div class="fim-modal">
      <div class="fim-header">
        <h3>Finish Upgrade?</h3>
      </div>
      <div class="fim-body">
        <div class="fim-upgrade-row">
          <img src="${imgSrc}" class="fim-upgrade-img" onerror="this.src='Images/Upgrades/PH.png'" alt="${currentUpgrade}" />
          <div class="fim-upgrade-name">${formatUpgradeName(currentUpgrade)}</div>
        </div>
        <div class="fim-toggle-row">
          <div class="fim-next-info">
            <img src="${nextImgSrc}" class="fim-next-img" onerror="this.src='Images/Upgrades/PH.png'" alt="${nextUpgrade}" />
            <span>Start <strong>${formatUpgradeName(nextUpgrade)}</strong> immediately?</span>
          </div>
          <label class="fim-toggle-switch">
            <input type="checkbox" id="fim-start-next" checked />
            <span class="fim-toggle-slider"></span>
          </label>
        </div>
        <div class="fim-toggle-label" id="fim-toggle-label">Next upgrade will start immediately ✓</div>
      </div>
      <div class="fim-footer">
        <button class="fim-cancel-btn">Cancel</button>
        <button class="fim-confirm-btn">Finish Upgrade ✅</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const toggle = overlay.querySelector('#fim-start-next');
  const label  = overlay.querySelector('#fim-toggle-label');
  toggle.addEventListener('change', () => {
    label.textContent = toggle.checked
      ? 'Next upgrade will start immediately ✓'
      : 'Next upgrade will be paused ⏸';
    label.style.color = toggle.checked ? '#81c784' : '#ffb74d';
  });

  overlay.querySelector('.fim-cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.fim-confirm-btn').addEventListener('click', () => {
    const startNext = toggle.checked;
    overlay.remove();
    // Instant DOM feedback — swap card to show next upgrade immediately
    const card = document.querySelector(`.builder-card[data-builder="${builderNumber}"]`);
    if (card) {
      const nextImg = getUpgradeImage(nextUpgrade);
      const iconEl = card.querySelector('.current-upgrade-icon');
      if (iconEl) { iconEl.src = nextImg; iconEl.alt = nextUpgrade; }
      const upgradeEl = card.querySelector('.builder-upgrade');
      if (upgradeEl) upgradeEl.innerHTML = formatUpgradeName(nextUpgrade);
      const durationEl = card.querySelector('.editable-card-duration');
      if (durationEl) durationEl.textContent = 'Syncing…';
      const finishEl = card.querySelector('.builder-finish');
      if (finishEl) finishEl.textContent = 'Syncing…';
      const nextEl = card.querySelector('.builder-next');
      if (nextEl) nextEl.textContent = 'Syncing…';
      const finishBtn = card.querySelector('.finish-upgrade-btn');
      if (finishBtn) finishBtn.style.display = 'none';
    }
    showRefreshIndicator('refreshing');
    finishUpgradeNow(builderNumber, currentUpgrade, startNext)
      .then(data => {
        // Patch card immediately from API response — no extra fetch
        if (card && data?.newActive) {
          const { durationHr, finishTime, nextUpgrade: nextInQueue } = data.newActive;
          const durationEl = card.querySelector('.editable-card-duration');
          if (durationEl) durationEl.textContent = durationHr;
          const finishEl = card.querySelector('.builder-finish');
          if (finishEl) finishEl.textContent = 'Finishes: ' + formatFinishTime(finishTime);
          const nextEl = card.querySelector('.builder-next');
          if (nextEl) nextEl.innerHTML = `<img src="${getUpgradeImage(nextInQueue)}" class="next-upgrade-icon" alt="${nextInQueue}" onerror="this.src='Images/Upgrades/PH.png'" /> ▶ Next: ${nextInQueue}`;
          const finishBtn = card.querySelector('.finish-upgrade-btn');
          if (finishBtn) finishBtn.style.display = '';
        }
      })
      .catch(err => console.error('Finish upgrade API failed:', err))
      .finally(() => refreshDashboardFast());
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function finishUpgradeNow(builderNumber, currentUpgrade, startNext) {
  const params = new URLSearchParams({
    action:      'finish_upgrade',
    username:    window.COC_USERNAME,
    builder:     `Builder_${builderNumber}`,
    upgradeName: currentUpgrade,
    startNext:   startNext ? 'true' : 'false',
    token:       window.COC_TOKEN || ''
  });
  const res  = await fetch(API_BASE + '?' + params.toString());
  return await res.json();
}

function wirePausedBuilderButtons() {
  document.querySelectorAll('.start-builder-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showStartPausedBuilderModal(btn.dataset.builder, btn.dataset.upgrade, btn.dataset.duration);
    });
  });
}

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
  // Restore session tokens from localStorage before any API call is made
  window.COC_TOKEN = localStorage.getItem("coc_token") || '';

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
  setupPullToRefresh(refreshDashboard);
  startLiveCountdown();
  wireApprenticeBoost();
  wireBoostSimulation();
  wireBoostLevel();
  wireBoostFocusNavigation();
  wireBuilderCardClicks();
  wireImageButtons();
  wireSearchFeature();
  setTimeout(() => checkForFinishedUpgrades(true), 1500);

  // Jump to a specific upgrade if navigated here from the Buildings page
  const pendingJump = localStorage.getItem('bldg_jump');
  if (pendingJump) {
    localStorage.removeItem('bldg_jump');
    try {
      const { builder, upgrade } = JSON.parse(pendingJump);
      waitForBuilderCard(builder).then(() => jumpToUpgrade(builder, upgrade)).catch(() => {});
    } catch(e) {}
  }
}

function switchUser() {
  // Remove any existing profile popup first (toggle behaviour)
  const existing = document.getElementById("profile-popup");
  if (existing) { existing.remove(); return; }

  const username = window.COC_USERNAME || localStorage.getItem("coc_username") || "—";
  const tag      = localStorage.getItem("coc_tag");
  const thLevel  = localStorage.getItem("coc_th_level");

  const popup = document.createElement("div");
  popup.id = "profile-popup";
  popup.style.cssText = [
    "position:fixed", "top:64px", "right:16px", "z-index:99990",
    "background:#1e1e2e", "border:1px solid #333", "border-radius:12px",
    "padding:20px 22px", "min-width:200px", "max-width:260px",
    "box-shadow:0 8px 24px rgba(0,0,0,0.6)", "font-family:sans-serif",
    "color:#fff", "text-align:left"
  ].join(";");

  const tagLine    = tag      ? `<div style="color:#aaa;font-size:0.8rem;margin-top:4px">${tag}</div>` : "";
  const thLine     = thLevel  ? `<div style="color:#f5c842;font-size:0.8rem;margin-top:2px">Town Hall ${thLevel}</div>` : "";

  popup.innerHTML = `
    <div style="font-weight:700;font-size:1rem;margin-bottom:2px">${username}</div>
    ${tagLine}
    ${thLine}
    <hr style="border:none;border-top:1px solid #333;margin:14px 0;">
    <button id="profile-logout-btn" style="
      width:100%;padding:10px;border-radius:8px;border:none;
      background:#ef4444;color:#fff;font-size:0.9rem;
      font-weight:600;cursor:pointer;font-family:sans-serif;
    ">Log Out</button>
  `;

  document.body.appendChild(popup);

  popup.querySelector("#profile-logout-btn").addEventListener("click", () => {
    popup.remove();
    localStorage.removeItem("coc_username");
    localStorage.removeItem("coc_tag");
    localStorage.removeItem("coc_th_level");
    localStorage.removeItem("coc_token");
    window.COC_USERNAME = null;
    window.COC_TOKEN    = null;
    document.getElementById("builders-container").innerHTML = "";
    document.querySelector('.upgrade-confirmation-modal-overlay')?.remove();
    showLoginScreen(async (confirmedUsername) => {
      window.COC_USERNAME = confirmedUsername;
      location.reload();
    });
  });

  // Close when clicking outside
  function onOutsideClick(e) {
    const switchBtn = document.querySelector('[onclick="switchUser()"]');
    if (!popup.contains(e.target) && e.target !== switchBtn) {
      popup.remove();
      document.removeEventListener("click", onOutsideClick, true);
    }
  }
  // Defer listener to avoid catching the current click
  setTimeout(() => document.addEventListener("click", onOutsideClick, true), 0);

  // Close on Escape
  function onEsc(e) {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("keydown", onEsc);
    }
  }
  document.addEventListener("keydown", onEsc);
}
/* =========================
   SEARCH FEATURE
   ========================= */
let searchDebounceTimer = null;

function openSearchModal() {
  document.getElementById('searchModal').style.display = 'flex';
  setTimeout(() => document.getElementById('searchInput')?.focus(), 50);
}

function closeSearchModal() {
  document.getElementById('searchModal').style.display = 'none';
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  if (input) input.value = '';
  if (results) results.innerHTML = '<div class="search-hint">Start typing to search upgrades across all builders</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}

async function performSearch(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!resultsEl) return;
  if (!query || query.trim().length < 2) {
    resultsEl.innerHTML = '<div class="search-hint">Type at least 2 characters to search</div>';
    return;
  }

  resultsEl.innerHTML = '<div class="search-loading">Searching all builders...</div>';

  const q = query.trim().toLowerCase();
  const allResults = [];

  // Fetch all 6 builders in parallel for speed
  const fetches = Array.from({ length: 6 }, (_, i) =>
    fetchBuilderDetails((i + 1).toString()).catch(e => {
      console.warn(`Search: failed to fetch builder ${i + 1}:`, e);
      return null;
    })
  );
  const results = await Promise.all(fetches);

  results.forEach((data, idx) => {
    if (!data?.upgrades) return;
    const builderNum = (idx + 1).toString();
    data.upgrades.forEach(upg => {
      // Normalise query: treat SC icons as * so "lvl *" matches "Lvl *"
      const name = (upg.upgrade || '').toLowerCase();
      if (name.includes(q)) {
        allResults.push({
          builder: builderNum,
          upgradeName: upg.upgrade,
          start: upg.start,
          end: upg.end,
          duration: upg.duration
        });
      }
    });
  });

  if (allResults.length === 0) {
    resultsEl.innerHTML = `<div class="search-no-results">No upgrades found for "<strong style="color:#ccc">${escapeHtml(query)}</strong>"</div>`;
    return;
  }

  resultsEl.innerHTML = allResults.map(r => {
    const isSC   = r.upgradeName && r.upgradeName.includes('*');
    const imgSrc = isSC ? getSuperchargeImage(r.upgradeName) : getUpgradeImage(r.upgradeName);
    const nameHtml = isSC
      ? `<span style="color:#093DBA">${formatUpgradeName(escapeHtml(r.upgradeName))}</span>`
      : escapeHtml(r.upgradeName);
    return `
    <div class="search-result-item">
      <div class="search-result-main">
        <img src="${imgSrc}" class="search-result-icon"
             onerror="this.src='Images/Upgrades/PH.png'" alt="" />
        <div class="search-result-info">
          <div class="search-result-name">${nameHtml}</div>
          <div class="search-result-meta">
            <span class="search-builder-tag">Builder ${r.builder}</span>
            <span class="search-duration">${escapeHtml(r.duration)}</span>
          </div>
          <div class="search-result-dates">${escapeHtml(r.start)} → ${escapeHtml(r.end)}</div>
        </div>
      </div>
      <div class="search-result-footer">
        <button class="search-jump-btn"
                data-builder="${r.builder}"
                data-upgrade-name="${escapeAttr(r.upgradeName)}">
          Jump to ↗
        </button>
      </div>
    </div>`;
  }).join('');
}

function findUpgradeItemByName(upgradeName) {
  return Array.from(document.querySelectorAll('.upgrade-item'))
    .find(el => el.dataset.upgradeName === upgradeName);
}

function waitForUpgradeItem(upgradeName, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const existing = findUpgradeItemByName(upgradeName);
    if (existing) { resolve(existing); return; }

    const container = document.getElementById('builders-container');
    const observer = new MutationObserver(() => {
      const el = findUpgradeItemByName(upgradeName);
      if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
    });
    observer.observe(container, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Upgrade item not found: ' + upgradeName));
    }, timeout);
  });
}

function waitForBuilderCard(builderNumber, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById('builders-container');
    const existing = container?.querySelector(`.builder-card[data-builder="${builderNumber}"]`);
    if (existing) { resolve(existing); return; }

    const observer = new MutationObserver(() => {
      const el = container?.querySelector(`.builder-card[data-builder="${builderNumber}"]`);
      if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Builder card not found: ' + builderNumber));
    }, timeout);
  });
}

async function jumpToUpgrade(builderNumber, upgradeName) {
  closeSearchModal();

  const container = document.getElementById('builders-container');
  const card = container.querySelector(`.builder-card[data-builder="${builderNumber}"]`);
  if (!card) return;

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!openBuilders.includes(builderNumber)) {
    card.click();
  }

  try {
    await waitForUpgradeItem(upgradeName, 6000);
  } catch (e) {
    console.warn('Search jump: could not find upgrade item:', e);
    return;
  }

  await new Promise(r => setTimeout(r, 200));

  const upgradeItem = findUpgradeItemByName(upgradeName);
  if (upgradeItem) {
    upgradeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    upgradeItem.classList.add('search-highlight');
    setTimeout(() => upgradeItem.classList.remove('search-highlight'), 3000);
  }
}

function wireSearchFeature() {
  const btn     = document.getElementById('searchBtn');
  const modal   = document.getElementById('searchModal');
  const closeBtn = document.getElementById('searchModalClose');
  const input   = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  btn?.addEventListener('click', openSearchModal);
  closeBtn?.addEventListener('click', closeSearchModal);

  modal?.addEventListener('click', e => {
    if (e.target === modal) closeSearchModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.style.display !== 'none') closeSearchModal();
  });

  input?.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => performSearch(input.value), 300);
  });

  results?.addEventListener('click', e => {
    const jumpBtn = e.target.closest('.search-jump-btn');
    if (!jumpBtn) return;
    const builder = jumpBtn.dataset.builder;
    const upgradeName = jumpBtn.dataset.upgradeName;
    if (builder && upgradeName) jumpToUpgrade(builder, upgradeName);
  });
}

/* =========================
   REGISTRATION
   Called from the "New User" tab in showLoginScreen().
   Parses village JSON, extracts tag + TH level, POSTs to register_user.
   ========================= */
async function doRegister(nameInput, jsonInput, errEl, loadingEl, btn, overlay, onConfirm) {
  const rawName = nameInput.value.replace(/[^a-zA-Z0-9_ ]/g, "").trim();
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  if (!name) {
    errEl.textContent = "Please enter your in-game name.";
    errEl.style.display = "block";
    nameInput.focus();
    return;
  }

  const rawJson = jsonInput.value.trim();
  if (!rawJson) {
    errEl.textContent = "Please paste your village JSON or upload a file.";
    errEl.style.display = "block";
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    errEl.textContent = "Invalid JSON — make sure you copied it fully.";
    errEl.style.display = "block";
    return;
  }

  if (!parsed.tag) {
    errEl.textContent = "JSON does not contain a player tag. Is this a village export?";
    errEl.style.display = "block";
    return;
  }

  // Extract TH level: Town Hall is dataId 1000001
  let thLevel = null;
  if (Array.isArray(parsed.buildings)) {
    const thBuilding = parsed.buildings.find(b => b.data === 1000001);
    if (thBuilding) thLevel = thBuilding.lvl;
  }

  errEl.style.display = "none";
  loadingEl.style.display = "block";
  btn.disabled = true;
  btn.style.opacity = "0.6";

  try {
    const body = new URLSearchParams({
      action: "register_user",
      username: name,
      tag: parsed.tag,
      th_level: thLevel !== null ? String(thLevel) : "",
      raw_json: rawJson,
    });

    const res = await fetch(REGISTER_USER_URL(), { method: "POST", body });
    const data = await res.json();

    if (data.error) {
      loadingEl.style.display = "none";
      btn.disabled = false;
      btn.style.opacity = "1";
      errEl.textContent = data.error;
      errEl.style.display = "block";
      return;
    }

    // Success — store session data including the API token returned by the server
    localStorage.setItem("coc_username", name);
    if (parsed.tag)       localStorage.setItem("coc_tag", parsed.tag);
    if (thLevel !== null) localStorage.setItem("coc_th_level", String(thLevel));
    if (data.token)       { localStorage.setItem("coc_token", data.token); window.COC_TOKEN = data.token; }

    overlay.remove();
    onConfirm(name);
  } catch (e) {
    loadingEl.style.display = "none";
    btn.disabled = false;
    btn.style.opacity = "1";
    errEl.textContent = "Network error — please try again.";
    errEl.style.display = "block";
  }
}

/* =========================
   LOGIN SCREEN
   — Two tabs: "Existing User" (username + optional password)
               "New User"      (in-game name + village JSON upload)
   ========================= */
function showLoginScreen(onConfirm) {
  const overlay = document.createElement("div");
  overlay.id = "login-overlay";
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:99999",
    "background:rgba(0,0,0,0.85)",
    "display:flex", "align-items:center", "justify-content:center",
    "padding:24px", "box-sizing:border-box"
  ].join(";");

  const sharedInputStyle = `
    width:100%; box-sizing:border-box;
    padding:14px 16px; border-radius:10px;
    border:2px solid #444; background:#2a2a3e;
    color:#fff; font-size:1rem; outline:none;
    font-family:sans-serif; transition:border-color 0.2s;
  `;

  overlay.innerHTML = `
    <div style="
      background:#1e1e2e; border-radius:16px; padding:32px 28px;
      width:100%; max-width:380px; box-shadow:0 8px 32px rgba(0,0,0,0.6);
      font-family:sans-serif; color:#fff; text-align:center;
    ">
      <div style="font-size:48px; margin-bottom:8px">⚒️</div>
      <h2 style="margin:0 0 20px; font-size:1.3rem">Builder Tracker</h2>

      <!-- Tabs -->
      <div style="display:flex; gap:8px; margin-bottom:24px; background:#2a2a3e; border-radius:10px; padding:4px;">
        <button id="tab-existing" style="
          flex:1; padding:10px; border-radius:8px; border:none; cursor:pointer;
          font-size:0.9rem; font-weight:600; font-family:sans-serif;
          background:#f5c842; color:#1e1e2e; transition:all 0.2s;
        ">Existing User</button>
        <button id="tab-new" style="
          flex:1; padding:10px; border-radius:8px; border:none; cursor:pointer;
          font-size:0.9rem; font-weight:600; font-family:sans-serif;
          background:transparent; color:#aaa; transition:all 0.2s;
        ">New User</button>
      </div>

      <!-- Existing User Panel -->
      <div id="panel-existing">
        <p style="margin:0 0 16px; color:#aaa; font-size:0.9rem">Enter your credentials to continue</p>
        <input
          id="login-username-input"
          type="text"
          placeholder="Username"
          autocomplete="username"
          autocapitalize="off"
          style="${sharedInputStyle} margin-bottom:10px;"
        />
        <div id="login-password-wrap" style="margin-bottom:10px;">
          <input
            id="login-password-input"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            style="${sharedInputStyle}"
          />
        </div>
        <button id="login-confirm-btn" style="
          width:100%; padding:14px; border-radius:10px;
          border:none; background:#5865f2; color:#fff;
          font-size:1rem; font-weight:600; cursor:pointer;
          transition:background 0.2s; font-family:sans-serif;
          margin-top:6px;
        ">Continue →</button>
        <p id="login-error" style="color:#f87171; font-size:0.85rem; margin:12px 0 0; display:none">
          Please enter a username.
        </p>
      </div>

      <!-- New User Panel -->
      <div id="panel-new" style="display:none;">
        <p style="margin:0 0 16px; color:#aaa; font-size:0.9rem">
          Upload your village data to create an account
        </p>
        <input
          id="reg-name-input"
          type="text"
          placeholder="Your in-game name"
          autocapitalize="words"
          style="${sharedInputStyle} margin-bottom:10px;"
        />
        <textarea
          id="reg-json-input"
          placeholder="Paste your village JSON here..."
          rows="6"
          style="${sharedInputStyle} margin-bottom:6px; resize:vertical; font-family:monospace; font-size:0.8rem; line-height:1.4;"
        ></textarea>
        <label id="reg-file-label" style="
          display:block; padding:10px; border-radius:8px; border:2px dashed #444;
          color:#aaa; font-size:0.85rem; cursor:pointer; margin-bottom:12px;
          transition:border-color 0.2s; box-sizing:border-box;
        ">
          Or upload a .json file
          <input id="reg-file-input" type="file" accept=".json,application/json" style="display:none;" />
        </label>
        <button id="reg-confirm-btn" style="
          width:100%; padding:14px; border-radius:10px;
          border:none; background:#f5c842; color:#1e1e2e;
          font-size:1rem; font-weight:600; cursor:pointer;
          transition:background 0.2s; font-family:sans-serif;
        ">Create Account</button>
        <p id="reg-error" style="color:#f87171; font-size:0.85rem; margin:12px 0 0; display:none">
          Please fill in all fields.
        </p>
        <p id="reg-loading" style="color:#aaa; font-size:0.85rem; margin:12px 0 0; display:none">
          Registering...
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // --- Tab switching ---
  const tabExisting   = overlay.querySelector("#tab-existing");
  const tabNew        = overlay.querySelector("#tab-new");
  const panelExisting = overlay.querySelector("#panel-existing");
  const panelNew      = overlay.querySelector("#panel-new");

  function activateTab(tab) {
    if (tab === "existing") {
      tabExisting.style.background = "#f5c842";
      tabExisting.style.color = "#1e1e2e";
      tabNew.style.background = "transparent";
      tabNew.style.color = "#aaa";
      panelExisting.style.display = "block";
      panelNew.style.display = "none";
      setTimeout(() => overlay.querySelector("#login-username-input")?.focus(), 50);
    } else {
      tabNew.style.background = "#f5c842";
      tabNew.style.color = "#1e1e2e";
      tabExisting.style.background = "transparent";
      tabExisting.style.color = "#aaa";
      panelNew.style.display = "block";
      panelExisting.style.display = "none";
      setTimeout(() => overlay.querySelector("#reg-name-input")?.focus(), 50);
    }
  }

  tabExisting.addEventListener("click", () => activateTab("existing"));
  tabNew.addEventListener("click", () => activateTab("new"));

  // --- Existing user login ---
  const usernameInput = overlay.querySelector("#login-username-input");
  const passwordWrap  = overlay.querySelector("#login-password-wrap");
  const passwordInput = overlay.querySelector("#login-password-input");
  const btn           = overlay.querySelector("#login-confirm-btn");
  const err           = overlay.querySelector("#login-error");

  setTimeout(() => usernameInput.focus(), 100);

  async function doLogin() {
    const raw = usernameInput.value.replace(/[^a-zA-Z0-9_]/g, "").trim();
    const val = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!val) {
      err.textContent = "Please enter a username.";
      err.style.display = "block";
      return;
    }
    if (USER_PASSWORDS[val] !== undefined) {
      passwordWrap.style.display = "block";
      if (passwordInput.value !== USER_PASSWORDS[val]) {
        err.textContent = "Incorrect password.";
        err.style.display = "block";
        passwordInput.style.borderColor = "#f87171";
        setTimeout(() => { passwordInput.style.borderColor = "#444"; }, 2000);
        passwordInput.focus();
        return;
      }
    }
    err.style.display = "none";
    localStorage.setItem("coc_username", val);

    // Fetch profile data + API token from the server (login action requires no prior token)
    try {
      const res  = await fetch(`${API_BASE}?action=login&username=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.th_level) localStorage.setItem("coc_th_level", String(data.th_level));
      if (data.tag)      localStorage.setItem("coc_tag", data.tag);
      if (data.token)    { localStorage.setItem("coc_token", data.token); window.COC_TOKEN = data.token; }
    } catch { /* non-blocking — proceed without it */ }

    overlay.remove();
    onConfirm(val);
  }

  btn.addEventListener("click", doLogin);
  usernameInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  passwordInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  btn.addEventListener("mouseenter", () => btn.style.background = "#4752c4");
  btn.addEventListener("mouseleave", () => btn.style.background = "#5865f2");

  // --- New user registration ---
  const regNameInput  = overlay.querySelector("#reg-name-input");
  const regJsonInput  = overlay.querySelector("#reg-json-input");
  const regFileInput  = overlay.querySelector("#reg-file-input");
  const regFileLabel  = overlay.querySelector("#reg-file-label");
  const regBtn        = overlay.querySelector("#reg-confirm-btn");
  const regErr        = overlay.querySelector("#reg-error");
  const regLoading    = overlay.querySelector("#reg-loading");

  // File upload → fill textarea
  regFileInput.addEventListener("change", () => {
    const file = regFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      regJsonInput.value = e.target.result;
      regFileLabel.style.borderColor = "#f5c842";
      regFileLabel.style.color = "#f5c842";
    };
    reader.onerror = () => {
      regErr.textContent = "Could not read file.";
      regErr.style.display = "block";
    };
    reader.readAsText(file);
  });

  regFileLabel.addEventListener("dragover", e => {
    e.preventDefault();
    regFileLabel.style.borderColor = "#f5c842";
  });
  regFileLabel.addEventListener("dragleave", () => {
    regFileLabel.style.borderColor = "#444";
  });
  regFileLabel.addEventListener("drop", e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      regJsonInput.value = ev.target.result;
      regFileLabel.style.borderColor = "#f5c842";
      regFileLabel.style.color = "#f5c842";
    };
    reader.readAsText(file);
  });

  regBtn.addEventListener("click", () => doRegister(regNameInput, regJsonInput, regErr, regLoading, regBtn, overlay, onConfirm));
  regBtn.addEventListener("mouseenter", () => regBtn.style.background = "#d4a800");
  regBtn.addEventListener("mouseleave", () => regBtn.style.background = "#f5c842");
}
