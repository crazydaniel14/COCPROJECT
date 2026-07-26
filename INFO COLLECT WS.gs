/*****************************************************
 * CONFIG
 *****************************************************/
const DAILY_LOCK_CELL = "A11"; // stores yyyy-MM-dd when boost applied
const TZ = "America/New_York";

let CURRENT_USERNAME = null;

/*****************************************************
 * SECURITY — encryption + token auth
 *
 * Master encryption key lives in Script Properties
 * (Project Settings → Script Properties), never in
 * the sheet or source code.
 *
 * Per-user API tokens are also stored in Script
 * Properties under the key "tok_<username>".
 * The frontend must pass &token=<token> on every call.
 *****************************************************/
const PROPS = PropertiesService.getScriptProperties();

/** Returns the persistent master encryption key, creating it once on first run. */
function getMasterKey_() {
  let k = PROPS.getProperty('ENC_KEY');
  if (!k) {
    const raw = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.getUuid() + new Date().getTime()
    );
    k = Utilities.base64EncodeWebSafe(raw);
    PROPS.setProperty('ENC_KEY', k);
  }
  return k;
}

/**
 * XOR-based symmetric encryption — same function encrypts and decrypts.
 * encrypt_(plaintext)  → base64-encoded ciphertext
 * encrypt_(ciphertext, true) → original plaintext
 */
function encrypt_(text, decrypt) {
  const key   = Utilities.newBlob(getMasterKey_(), 'UTF-8').getBytes();
  const bytes = decrypt
    ? Utilities.base64DecodeWebSafe(text)
    : Utilities.newBlob(text, 'UTF-8').getBytes();
  const out = bytes.map((b, i) => (b ^ key[i % key.length]) & 0xFF);
  return decrypt
    ? Utilities.newBlob(out).getDataAsString('UTF-8')
    : Utilities.base64EncodeWebSafe(out);
}
const decrypt_ = (text) => encrypt_(text, true);

/** Generate a 32-char opaque token for a user and persist it. Returns the token. */
function genToken_(username) {
  const raw   = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    username + Utilities.getUuid() + Date.now()
  );
  const token = Utilities.base64EncodeWebSafe(raw).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  PROPS.setProperty('tok_' + username, token);
  return token;
}

/** Returns true only when the supplied token matches the stored one. */
function checkToken_(username, token) {
  if (!token || !username) return false;
  const stored = PROPS.getProperty('tok_' + username);
  return !!stored && stored === token;
}

function safeUsername_(username) {
  return String(username || "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .trim();
}

function setCurrentUser_(username) {
  CURRENT_USERNAME = safeUsername_(username);
}

function getUserSheet_(baseName) {
  const ss = SpreadsheetApp.getActive();
  if (!CURRENT_USERNAME) return ss.getSheetByName(baseName);
  return ss.getSheetByName(`${CURRENT_USERNAME}_${baseName}`);
}

function getBuilderSheet_(builderName) {
  const ss = SpreadsheetApp.getActive();
  // Normalize spaces to underscores (sheet cells may store "Builder 3" not "Builder_3")
  const normalized = String(builderName || "").replace(/\s+/g, "_").trim();
  if (!CURRENT_USERNAME) return ss.getSheetByName(normalized);
  if (normalized.startsWith(CURRENT_USERNAME + "_")) {
    return ss.getSheetByName(normalized);
  }
  return ss.getSheetByName(`${CURRENT_USERNAME}_${normalized}`);
}

function builderSheetName_(builderName) {
  if (!CURRENT_USERNAME) return builderName;
  if (builderName.startsWith(CURRENT_USERNAME + "_")) return builderName;
  return `${CURRENT_USERNAME}_${builderName}`;
}

function builderPrefix_() {
  return CURRENT_USERNAME ? `${CURRENT_USERNAME}_Builder_` : "Builder_";
}


/*****************************************************
 * BUILDING CATEGORY LOOKUP
 * TypeB_ID is computed from the upgrade name at read
 * time — never stored in the sheet, so reorders and
 * edits can never lose it.
 *
 * Level structure: 1, 2, 3 … then *, **, *** (supercharge)
 * Temporary types:
 *   3 = Craft. Defenses  — DHP / CP / HP suffix in name;
 *                          developer-cycle rotation
 *   5 = Supercharged     — level suffix is *, **, or ***;
 *                          temp boost until next real level ships
 *****************************************************/
const BUILDING_CATEGORY = {
  // ── Defenses (1) ──────────────────────────────────
  "Cannon":               "1",
  "Archer Tower":         "1",
  "Mortar":               "1",
  "Air Defense":          "1",
  "Hidden Tesla":         "1",
  "X-Bow":                "1",
  "Inferno Tower":        "1",
  "Eagle Artillery":      "1",
  "Scattershot":          "1",
  "Monolith":             "1",
  "Wizard Tower":         "1",
  "Bomb Tower":           "1",
  "Firespitter":          "1",
  "Builder Hut":          "1",
  "Multi-Archer Tower":   "1",
  "Multi-Gear Tower":     "1",
  "Town Hall":            "1",
  "Giga Tesla":           "1",
  "Giga Bomb":            "1",
  "Super Wizard Tower":   "1",
  "Revenge Tower":        "1",
  "Ricochet Cannon":      "1",
  "Spell Tower":          "1",
  // ── Resources (2) ─────────────────────────────────
  "Gold Mine":            "2",
  "Elixir Collector":     "2",
  "Dark Elixir Drill":    "2",
  "Gold Storage":         "2",
  "Elixir Storage":       "2",
  "Dark Elixir Storage":  "2",
  // ── Traps (4) ─────────────────────────────────────
  "Spring Trap":          "4",
  "Giant Bomb":           "4",
  "Air Bomb":             "4",
  "Seeking Air Mine":     "4",
  "Skeleton Trap":        "4",
  "Bomb":                 "4",
  // ── Guardians (6) ─────────────────────────────────
  "Longshot":             "6",
  // ── Heroes (7) ────────────────────────────────────
  "Barbarian King":       "7",
  "Archer Queen":         "7",
  "Grand Warden":         "7",
  "Royal Champion":       "7",
  "Minion Prince":        "7",
  "Dragon Duke":          "7",
  "Hero Hall":            "7",
  // ── Army (8) ──────────────────────────────────────
  "Laboratory":           "8",
  "Workshop":             "8",
  "Pet House":            "8",
  "Clan Castle":          "8",
  "Blacksmith":           "8",
  "Army Camp":            "8",
  "Barracks":             "8",
  "Spell Factory":        "8",
};

/**
 * Derives TypeB_ID from an upgrade name. Priority:
 *   1. Level suffix has * → Supercharged (5)
 *   2. Base name has DHP / CP / HP suffix → Craft. Defenses (3)
 *   3. Static BUILDING_CATEGORY lookup
 */
function getBuildingTypeB_(upgradeName) {
  if (!upgradeName) return null;
  const s = String(upgradeName);

  // 1. Supercharged — level is *, **, ***
  if (/(?:Lvl|Level)\s+\*+/i.test(s)) return "5";

  // Strip instance (#N) and level suffix to get base name
  const m = s.match(/^(.+?)\s*(?:#\d+)?\s+(?:Lvl|Level)\s+/i);
  const base = m ? m[1].trim() : s.trim();

  // 2. Craft. Defenses — base name ends with DHP, CP, or HP
  if (/\s(?:DHP|CP|HP)$/.test(base)) return "3";

  // 3. Static lookup
  return BUILDING_CATEGORY[base] || null;
}


/*****************************************************
 * ONE-TIME TOKEN MIGRATION
 * Run this ONCE from the Apps Script editor:
 *   Run > Run function > migrateTokens
 * It generates a token for every existing user in the
 * Registrations sheet who doesn't already have one.
 * Safe to re-run — skips users who already have a token.
 *****************************************************/
function migrateTokens() {
  const ss  = SpreadsheetApp.getActive();
  const reg = ss.getSheetByName('Registrations');

  if (!reg) {
    Logger.log('migrateTokens: Registrations sheet not found. Nothing to do.');
    return;
  }

  const rows = reg.getDataRange().getValues();
  // row[0] = username, row[1] = tag, row[2] = th_level, ...
  // Skip header row (index 0)

  let migrated = 0;
  let skipped  = 0;

  for (let i = 1; i < rows.length; i++) {
    const username = safeUsername_(String(rows[i][0] || '').trim());
    if (!username) {
      Logger.log(`migrateTokens: row ${i + 1} has no username — skipping`);
      continue;
    }

    const existing = PROPS.getProperty('tok_' + username);
    if (existing) {
      Logger.log(`migrateTokens: ${username} already has a token — skipping`);
      skipped++;
      continue;
    }

    const token = genToken_(username);
    Logger.log(`migrateTokens: generated token for ${username} → ${token}`);
    migrated++;
  }

  Logger.log(`migrateTokens DONE — migrated: ${migrated}, already had token: ${skipped}`);
}

/*****************************************************
 * SETUP TRIGGERS — Run setupAllTriggers() once manually
 * from the Apps Script editor (Run > Run function > setupAllTriggers)
 *****************************************************/
function setupAllTriggers() {
  // Remove all existing time-based triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Hourly: update Active? status and mark PENDING upgrades
  ScriptApp.newTrigger('updateActiveStatusScheduled')
    .timeBased()
    .everyHours(1)
    .create();

  // Daily at midnight NY time: re-run boost simulation so "TODAY" row is always fresh
  ScriptApp.newTrigger('dailyBoostSimScheduled')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();

  Logger.log('All triggers created: hourly Active? update + daily boost sim');
}

// Keep old name working so existing installations do not break
function setupHourlyTrigger() { setupAllTriggers(); }

/*****************************************************
 * SHEET EDITS
 *****************************************************/
function onEdit(e) {
  const range = e && e.range;
  if (!range) return;

  const sheet = range.getSheet();
  const name  = sheet.getName();
  const touchesE13 =
    range.getRow() <= 13 &&
    range.getLastRow() >= 13 &&
    range.getColumn() <= 5 &&
    range.getLastColumn() >= 5;

  if (!touchesE13 || (name !== "CURRENT_WORK" && !name.endsWith("_CURRENT_WORK"))) return;

  if (name.endsWith("_CURRENT_WORK")) {
    setCurrentUser_(name.replace(/_CURRENT_WORK$/, ""));
  } else {
    setCurrentUser_(null);
  }

  recalculateMonthlyReductionSheets_();
}

/*****************************************************
 * SCHEDULED ACTIVE STATUS UPDATE
 *****************************************************/
function updateActiveStatusScheduled() {
  try {
    const result = updateActiveStatus_(); // already calls markFinishedUpgradesAsPending_ internally
    Logger.log('Scheduled Active? status update completed at: ' + new Date());
    Logger.log('Result: ' + JSON.stringify(result));
  } catch (e) {
    Logger.log('Error in scheduled update: ' + e.toString());
  }
}

/*****************************************************
 * DAILY BOOST SIMULATION REFRESH
 * Runs at midnight so the boost plan shows the correct
 * "TODAY" row when users open the app the next morning.
 * All registered users are processed in sequence.
 *****************************************************/
function dailyBoostSimScheduled() {
  const ss = SpreadsheetApp.getActive();
  // Find all CURRENT_WORK sheets to get usernames
  const usernames = ss.getSheets()
    .map(s => s.getName())
    .filter(n => n.endsWith('_CURRENT_WORK'))
    .map(n => n.replace('_CURRENT_WORK', ''));

  if (usernames.length === 0) {
    // Fallback: try running without a user context (single-user setup)
    Logger.log('dailyBoostSimScheduled: no usernames found, running without user context');
    try { runBoostSimulation(); } catch(e) { Logger.log('Error: ' + e.toString()); }
    return;
  }

  usernames.forEach(username => {
    try {
      setCurrentUser_(username);
      runBoostSimulation();
      Logger.log('Daily boost sim completed for: ' + username);
    } catch (e) {
      Logger.log('Daily boost sim error for ' + username + ': ' + e.toString());
    }
  });
}

/*****************************************************
 * CACHED REGISTRATION LOOKUP
 * Both getVillageBuildings_ and getTownHallLevel_ read
 * the full Registrations sheet. Cache the row for 5 min
 * so repeated calls on the same page load are instant.
 *****************************************************/
function getCachedRegistration_(username) {
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'reg_' + safeUsername_(username);
  const hit      = cache.get(cacheKey);
  if (hit) return JSON.parse(hit);

  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registrations');
  if (!reg) return null;

  const rows = reg.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === username.toLowerCase()) {
      const result = {
        username: rows[i][0],
        tag:      rows[i][1],
        th_level: rows[i][2],
        raw_json: rows[i][3]   // may be encrypted; callers handle it
      };
      cache.put(cacheKey, JSON.stringify(result), 300); // 5-min TTL
      return result;
    }
  }
  return null;
}

/** Call after registration or any update that changes a user's row. */
function invalidateRegCache_(username) {
  CacheService.getScriptCache().remove('reg_' + safeUsername_(username));
}

/*****************************************************
 * ROUTER
 *****************************************************/
function doGet(e) {
  Logger.log("CODE VERSION: v3-fixed");
  const action      = e?.parameter?.action || "ping";
  const rawUsername = e?.parameter?.username || null;
  let username      = (rawUsername && rawUsername !== "null" && rawUsername !== "undefined")
    ? rawUsername : null;

  // Resolve to canonical casing from Registrations sheet so token lookups
  // (tok_<username>) always match regardless of what case the frontend sends.
  if (username) {
    const reg = getCachedRegistration_(username);
    if (reg) username = reg.username;
  }

  setCurrentUser_(username);

  if (action === "debug_builder") {
    const b = e?.parameter?.builder || "Builder_1";
    setCurrentUser_(e?.parameter?.username || "Daniel");
    const builderSheet = getBuilderSheet_(b);
    if (!builderSheet) return jsonWithCORS_({ error: "sheet not found after setCurrentUser_" });
    const data = builderSheet.getDataRange().getValues();
    return jsonWithCORS_({ sheetName: builderSheet.getName(), headers: data[0], rowCount: data.length });
  }

  if (!username && action !== "ping") {
    return jsonWithCORS_({ error: "Missing username" });
  }

  // Token auth — every authenticated action requires a valid token.
  // "ping", "login", and "refresh_sheet" are exempt.
  const NO_TOKEN_ACTIONS = new Set(["ping", "login", "refresh_sheet"]);
  if (username && !NO_TOKEN_ACTIONS.has(action) && !checkToken_(username, e?.parameter?.token)) {
    return jsonWithCORS_({ error: "Unauthorized: missing or invalid token." });
  }

  const p = e.parameter;
  const dispatch = {
    login:                       () => jsonWithCORS_(doLogin_(username, e?.parameter?.password || '')),
    current_work_table:          () => jsonWithCORS_(getCurrentWorkTable_(username)),
    dashboard_data:              () => jsonWithCORS_(getDashboardData_()),
    refresh_sheet:               () => refreshSheet_(),
    todays_boost:                () => jsonWithCORS_(getTodaysBoost_()),
    apply_todays_boost:          () => jsonWithCORS_(dailyBoostReduction()),
    boost_plan:                  () => jsonWithCORS_(getBoostPlanTable()),
    run_boost_simulation:        () => jsonWithCORS_(runBoostSimulation_API_()),
    preview_builder_potion:      () => jsonWithCORS_(previewBuilderPotion_API_(Number(p.times))),
    apply_builder_potion:        () => jsonWithCORS_(applyBuilderPotion_API_(Number(p.times))),
    preview_one_hour_boost:      () => jsonWithCORS_(previewOneHourBoost_API_(Number(p.times))),
    apply_one_hour_boost:        () => jsonWithCORS_(applyOneHourBoost_API_(Number(p.times))),
    battle_pass_status:          () => jsonWithCORS_(battlePassStatus_API_()),
    preview_battle_pass:         () => jsonWithCORS_(previewBattlePass_API_()),
    apply_battle_pass:           () => jsonWithCORS_(applyBattlePass_API_()),
    builder_details:             () => jsonWithCORS_(getBuilderDetails_(p.builder)),
    set_todays_boost_builder:    () => jsonWithCORS_(setTodaysBoostBuilder_(p.builder)),
    reorder_builder_upgrades:    () => jsonWithCORS_(reorderBuilderUpgrades_(p.builder, p.order)),
    update_upgrade_duration:     () => jsonWithCORS_(updateUpgradeDuration_(p.builder, Number(p.row), Number(p.minutes), p.duration_hr)),
    update_active_upgrade_time:  () => jsonWithCORS_(updateActiveUpgradeTime_(p.builder, Number(p.remaining_minutes))),
    transfer_upgrade:            () => jsonWithCORS_(transferUpgrade_(p.upgrade, p.from_builder, Number(p.row), p.to_builder)),
    update_active_status:        () => jsonWithCORS_(updateActiveStatus_()),
    check_finished_upgrades:     () => jsonWithCORS_(checkFinishedUpgrades_()),
    get_village_buildings:       () => getVillageBuildings_(username),
    confirm_upgrade_start:       () => jsonWithCORS_(confirmUpgradeStart_(p.builder, p.upgradeName, p.startTime, p.confirmAction, p.differentUpgrade || null, p.requeueUpgrades || "")),
    start_paused_builder:        () => { const m = p.method || "exact"; return jsonWithCORS_(startPausedBuilder_(p.builder, m, m === "exact" ? p.startTime : p.remainingMinutes)); },
    get_builder_queue:           () => jsonWithCORS_(getBuilderQueue_(p.builder)),
    get_paused_builders:         () => jsonWithCORS_(getPausedBuilders_()),
    get_boost_level:             () => { const sh = getUserSheet_("CURRENT_WORK"); return jsonWithCORS_({ level: sh ? (Number(sh.getRange("C21").getValue()) || 8) : 8 }); },
    set_boost_level:             () => { const lvl = parseInt(p.level); if (!isNaN(lvl) && lvl >= 1) getUserSheet_("CURRENT_WORK").getRange("C21").setValue(lvl); return jsonWithCORS_({ status: "OK", level: lvl }); },
    set_builder_count:           () => {
      const n = parseInt(p.count);
      if (isNaN(n) || n < 1 || n > 6) return jsonWithCORS_({ error: "Invalid count (must be 1–6)" });
      const safe = safeUsername_(CURRENT_USERNAME);
      const sh = getUserSheet_("CURRENT_WORK");
      if (!sh) return jsonWithCORS_({ error: "Sheet not found" });
      for (let i = 1; i <= 6; i++) {
        const cell = sh.getRange(i + 1, 1);
        const cur  = String(cell.getValue());
        if (i <= n) {
          if (cur.trim() === '' || cur.includes('Not Active Yet')) cell.setValue(i);
        } else {
          if (!cur.includes('Not Active Yet')) cell.setValue('Not Active Yet');
        }
      }
      const ss = SpreadsheetApp.getActive();
      for (let i = 1; i <= 6; i++) {
        const bs = ss.getSheetByName(`${safe}_Builder_${i}`);
        if (!bs) continue;
        const cell = bs.getRange(2, 1);
        const cur  = String(cell.getValue());
        if (i <= n) {
          if (cur.includes('Not Active Yet')) cell.setValue('');
        } else {
          if (!cur.includes('Not Active Yet')) cell.setValue('Not Active Yet');
        }
      }
      return jsonWithCORS_({ status: 'OK', count: n });
    },
    finish_upgrade:              () => jsonWithCORS_(finishUpgrade_(p.builder, p.upgradeName, p.startNext)),
    complete_queued_upgrade:     () => jsonWithCORS_(completeQueuedUpgrade_(p.builder, p.upgradeName, Number(p.row))),
    get_town_hall_level:         () => getTownHallLevel_(username),
    get_all_builders_last_finish:() => getAllBuildersLastFinish_(),
    get_unassigned_upgrades:     () => jsonWithCORS_(getUnassignedUpgrades_()),
    assign_unassigned_upgrade:   () => jsonWithCORS_(assignUnassignedUpgrade_(p.upgradeName, p.builder, Number(p.durationMinutes))),
  };

  if (dispatch[action]) return dispatch[action]();
  return jsonWithCORS_({ error: "Unknown action" });
}

/**
 * Called by the frontend login flow (no token required).
 * Returns th_level, tag, and the user's API token so the
 * frontend can store it for all subsequent authenticated calls.
 *
 * Password check: if a pwd_<username> property exists in Script Properties,
 * the supplied password must match it. Users with no stored password can
 * log in with an empty password field.
 */
function doLogin_(username, password) {
  const reg = getCachedRegistration_(username);
  if (!reg) return { error: "User not found. Did you register?" };

  // Use the canonical username from the sheet so token/password lookups
  // match the key used at registration time, regardless of input casing.
  const canonical = reg.username;

  const storedPassword = PROPS.getProperty('pwd_' + canonical);
  if (storedPassword && storedPassword !== (password || '')) {
    return { error: "Incorrect password." };
  }

  const token = PROPS.getProperty('tok_' + canonical);
  if (!token) return { error: "No token found. Please re-register." };
  return { th_level: reg.th_level, tag: reg.tag, token };
}

/**
 * ONE-TIME helper — run this once from the Apps Script editor to set
 * or update passwords. Edit the object below, run setPassword(), done.
 * Safe to re-run; it simply overwrites the stored value.
 */
function setPassword() {
  const passwords = {
    "Daniel": "2304",
    // "Player2": "abc456",
  };
  for (const [user, pwd] of Object.entries(passwords)) {
    PROPS.setProperty('pwd_' + user, pwd);
    Logger.log('Password set for ' + user);
  }
  Logger.log('Done.');
}

const BUILDING_ID_MAP = {
  // Defenses
  "Archer Tower":        "1000009",
  "Cannon":              "1000008",
  "Mortar":              "1000013",
  "Air Defense":         "1000012",
  "Wizard Tower":        "1000011",
  "Bomb Tower":          "1000032",
  "X-Bow":               "1000021",
  "Inferno Tower":       "1000027",
  "Eagle Artillery":     "1000031",
  "Scattershot":         "1000067",
  "Hidden Tesla":        "1000019",
  "Air Sweeper":         "1000028",
  "Builder Hut":         "1000015",
  "Spell Tower":         "1000072",
  "Firespitter":         "1000089",
  "Monolith":            "1000077",
  "Multi-Archer Tower":  "1000084",
  "Ricochet Cannon":     "1000085",
  "Super Wizard Tower":  "1000102",
  "Revenge Tower":       "1000093",
  // Resources
  "Gold Mine":           "1000004",
  "Elixir Collector":    "1000002",
  "Gold Storage":        "1000005",
  "Elixir Storage":      "1000003",
  "Dark Elixir Storage": "1000024",
  "Dark Elixir Drill":   "1000023",
  // Army
  "Army Camp":           "1000000",
  "Barracks":            "1000006",
  "Dark Barracks":       "1000026",
  "Spell Factory":       "1000020",
  "Dark Spell Factory":  "1000029",
  "Laboratory":          "1000007",
  "Workshop":            "1000059",
  "Blacksmith":          "1000070",
  "Hero Hall":           "1000071",
  "Pet House":           "1000068",
  // Traps
  "Bomb":                "12000000",
  "Air Bomb":            "12000005",
  "Spring Trap":         "12000001",
  "Giant Bomb":          "12000002",
  "Seeking Air Mine":    "12000006",
  "Skeleton Trap":       "12000008",
  "Tornado Trap":        "12000016",
  "Giga Bomb":           "12000020",
  // Heroes
  "Barbarian King":      "28000000",
  "Archer Queen":        "28000001",
  "Grand Warden":        "28000002",
  "Royal Champion":      "28000004",
  "Minion Prince":       "28000006",
  "Dragon Duke":         "28000007",
};

/**
 * Reads the completed upgrades log (D34:E in CURRENT_WORK) and returns
 * a map of { buildingId → [level, level, ...] } sorted descending.
 * Used to override stale JSON levels with levels earned since the last upload.
 */
function getCompletedUpgradeOverrides_() {
  const sheet = getUserSheet_("CURRENT_WORK");
  if (!sheet) return {};

  const lastRow = sheet.getLastRow();
  if (lastRow < 34) return {};

  const data = sheet.getRange(34, 4, lastRow - 33, 2).getValues(); // D34:E = Builder, UpgradeName

  const overrides = {};

  for (const row of data) {
    const upgradeName = String(row[1] || '').trim();
    if (!upgradeName) continue;

    // Skip supercharged upgrades (* levels) — numeric level didn't change
    if (/Lvl\s+\*+/i.test(upgradeName)) continue;

    // Parse "Base Name #N Lvl X" or "Base Name Lvl X"
    const m = upgradeName.match(/^(.+?)\s*(?:#\d+)?\s+Lvl\s+(\d+)$/i);
    if (!m) continue;

    const baseName   = m[1].trim();
    const level      = parseInt(m[2]);
    const buildingId = BUILDING_ID_MAP[baseName];
    if (!buildingId || !level) continue;

    if (!overrides[buildingId]) overrides[buildingId] = [];
    overrides[buildingId].push(level);
  }

  for (const id of Object.keys(overrides)) overrides[id].sort((a, b) => b - a);

  return overrides;
}

function getVillageBuildings_(username) {
  const reg = getCachedRegistration_(username);
  if (!reg) return jsonWithCORS_({ error: "User not found" });

  const stored = reg.raw_json;
  if (!stored) return jsonWithCORS_({ error: "No village JSON on file" });

  let parsed;
  try {
    // Support both legacy plaintext and new encrypted format
    const jsonStr = stored.startsWith('{') ? stored : decrypt_(stored);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    return jsonWithCORS_({ error: "Corrupt village JSON" });
  }

  const grouped = {};

  for (const b of (parsed.buildings || [])) {
    const typeId = String(b.data);
    const count  = b.cnt || 1;
    if (!grouped[typeId]) grouped[typeId] = [];
    for (let j = 0; j < count; j++) grouped[typeId].push(b.lvl);
  }

  for (const t of [...(parsed.traps || []), ...(parsed.traps2 || [])]) {
    const typeId = String(t.data);
    const count  = t.cnt || 1;
    if (!grouped[typeId]) grouped[typeId] = [];
    for (let j = 0; j < count; j++) grouped[typeId].push(t.lvl);
  }

  for (const id of Object.keys(grouped)) grouped[id].sort((a, b) => b - a);

  for (const h of (parsed.heroes || [])) grouped[String(h.data)] = [h.lvl];

  // Max-merge completed upgrades on top of JSON snapshot so progress stays
  // current without requiring a re-upload after each finished upgrade.
  const overrides = getCompletedUpgradeOverrides_();
  for (const [buildingId, completedLevels] of Object.entries(overrides)) {
    const current = grouped[buildingId] || [];
    for (let i = 0; i < completedLevels.length; i++) {
      if (i < current.length) {
        current[i] = Math.max(current[i], completedLevels[i]);
      } else {
        current.push(completedLevels[i]);
      }
    }
    current.sort((a, b) => b - a);
    grouped[buildingId] = current;
  }

  return jsonWithCORS_({ buildings: grouped });
}

function getTownHallLevel_(username) {
  const reg = getCachedRegistration_(username);
  if (!reg) return jsonWithCORS_({ error: "User not found" });
  return jsonWithCORS_({ th_level: reg.th_level, tag: reg.tag });
}

function getAllBuildersLastFinish_() {
  const builders = ["Builder_1","Builder_2","Builder_3","Builder_4","Builder_5","Builder_6"];
  let latestDate = null;
  for (const b of builders) {
    try {
      const sheet = getBuilderSheet_(b);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) continue;
      for (let r = data.length - 1; r >= 1; r--) {
        const endVal = data[r][5];
        if (!endVal) continue;
        const d = new Date(endVal);
        if (!isNaN(d) && (!latestDate || d > latestDate)) latestDate = d;
        break;
      }
    } catch(err) {}
  }
  return jsonWithCORS_({ last_finish: latestDate ? latestDate.toISOString() : null });
}

/*****************************************************
 * POST ROUTER
 * Handles actions that send large payloads (e.g. raw_json).
 *****************************************************/
function doPost(e) {
  const action = e?.parameter?.action || "";

  if (action === "register_user") {
    return registerUser_(e);
  }

  if (action === "populate_unassigned_upgrades") {
    return populateUnassignedUpgrades_(e);
  }

  return jsonWithCORS_({ error: "Unknown POST action" });
}

/*****************************************************
 * REGISTER USER
 * Creates a row in the "Registrations" sheet.
 * Called from the New User tab in the frontend.
 *****************************************************/
function registerUser_(e) {
  const username = safeUsername_(e?.parameter?.username || "");
  const tag      = String(e?.parameter?.tag || "").trim().toUpperCase();
  const thLevel  = String(e?.parameter?.th_level || "").trim();
  const rawJson  = e?.parameter?.raw_json || "";

  if (!username) return jsonWithCORS_({ error: "Please enter your in-game name." });
  if (!tag)      return jsonWithCORS_({ error: "Village JSON is missing a player tag." });

  const ss    = SpreadsheetApp.getActive();
  let sheet   = ss.getSheetByName("Registrations");

  if (!sheet) {
    sheet = ss.insertSheet("Registrations");
    sheet.appendRow(["username", "tag", "th_level", "raw_json", "registered_at", "status"]);
    sheet.getRange("A1:F1").setFontWeight("bold");
    sheet.getRange("A1:F1").setBackground("#b7b7b7");
  }

  // Duplicate checks
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toUpperCase() === tag) {
      return jsonWithCORS_({ error: "This village is already registered." });
    }
    if (safeUsername_(data[i][0]) === username) {
      return jsonWithCORS_({ error: "That username is already taken." });
    }
  }

  // Encrypt village JSON before storing — master key lives in Script Properties only.
  const encryptedJson = rawJson ? encrypt_(rawJson) : "";

  sheet.appendRow([
    username,
    tag,
    thLevel,
    encryptedJson,
    Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss"),
    "pending"
  ]);

  // Generate a unique API token for this user; the frontend must store it.
  const token = genToken_(username);
  invalidateRegCache_(username);

  // Create all working sheets for this user based on their builder count.
  let builderCount = parseInt(e?.parameter?.builder_count || '') || 1;
  builderCount = Math.max(1, Math.min(6, builderCount));
  initUserSheets_(username, builderCount, thLevel);

  Logger.log(`Registered new user: ${username} (${tag}) TH${thLevel} builders:${builderCount}`);
  return jsonWithCORS_({ success: true, username, tag, th_level: thLevel, token });
}

function populateUnassignedUpgrades_(e) {
  let username = safeUsername_(e?.parameter?.username || "");
  const token    = e?.parameter?.token || "";
  if (!username) return jsonWithCORS_({ error: "Missing username" });

  // Match doGet auth behavior: frontend stores usernames lower-case, while
  // tokens are keyed by the canonical casing from the Registrations sheet.
  const reg = getCachedRegistration_(username);
  if (reg) username = reg.username;

  if (!checkToken_(username, token)) return jsonWithCORS_({ error: "Unauthorized" });
  setCurrentUser_(username);

  let upgrades;
  try {
    upgrades = JSON.parse(e?.parameter?.upgrades || "[]");
  } catch(err) {
    return jsonWithCORS_({ error: "Invalid upgrades JSON" });
  }
  if (!Array.isArray(upgrades)) return jsonWithCORS_({ error: "upgrades must be an array" });

  const sheet = getUserSheet_("CURRENT_WORK");
  if (!sheet) return jsonWithCORS_({ error: "CURRENT_WORK sheet not found" });

  // Clear only columns A:B from row 34 down — columns D:F (completed log) stay intact.
  const lastRow = sheet.getLastRow();
  if (lastRow >= 34) {
    sheet.getRange(34, 1, lastRow - 33, 2).clearContent();
  }

  if (upgrades.length > 0) {
    const rows = upgrades.map(u => [u.upgradeName || "", Number(u.durationMinutes) || 0]);
    sheet.getRange(34, 1, rows.length, 2).setValues(rows);
  }

  return jsonWithCORS_({ success: true, count: upgrades.length });
}

/*****************************************************
 * INIT USER SHEETS
 * Called once at registration. Creates username_CURRENT_WORK
 * and username_Builder_1 … username_Builder_6.
 * Builders beyond builderCount get a "Not Active Yet" marker
 * row so the UI and backend functions skip them gracefully.
 *****************************************************/
function initUserSheets_(username, builderCount, thLevel) {
  const ss   = SpreadsheetApp.getActive();
  const safe = safeUsername_(username);

  // ── CURRENT_WORK ──────────────────────────────────────────────
  // getCurrentWorkTable_() reads A1:E7 (1 header + 6 data rows).
  // Builder column stores plain numbers (1-6) — the sheet itself
  // is already scoped to the user so no username prefix needed.
  const cwName = `${safe}_CURRENT_WORK`;
  let cw = ss.getSheetByName(cwName) || ss.insertSheet(cwName);
  cw.clearContents();
  cw.getRange(1, 1, 1, 5)
    .setValues([['Builder','UpgradeName','End_DateTime','Next_Upgrade']])
    .setFontWeight('bold').setBackground('#b7b7b7');
  for (let i = 1; i <= 6; i++) {
    const label = i <= builderCount ? i : 'Not Active Yet';
    cw.getRange(i + 1, 1).setValue(label);
  }

  // ── CURRENT_WORK META CELLS ────────────────────────────────────
  // A11 (DAILY_LOCK_CELL): last boost date — left blank, written by dailyBoostReduction()
  // C11: player's current Town Hall level
  // C21: Builder Apprentice level (defaults to 1 for new users)
  if (thLevel) cw.getRange('C11').setValue(Number(thLevel));
  cw.getRange('C21').setValue(1);

  // ── BOOST PLAN TABLE ──────────────────────────────────────────
  // getTodaysBoost_() and getBoostPlanTable() read A22:F30.
  // Row 22 = headers, rows 23-30 = daily plan data (filled by runBoostSimulation).
  cw.getRange('A22:F22')
    .setValues([['Boost Date','Upgrade','Builder','Old F Time','New F Time','S/F']])
    .setFontWeight('bold').setBackground('#b7b7b7');

  // ── BUILDER SHEETS ─────────────────────────────────────────────
  const BUILDER_HEADERS = [[
    'Builder','UpgradeName','Duration (min)','Duration (hr)',
    'Start_DateTime','End_DateTime','Active?','Confirmation_Status'
  ]];
  for (let i = 1; i <= 6; i++) {
    const sheetName = `${safe}_Builder_${i}`;
    let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, 8).setValues(BUILDER_HEADERS).setFontWeight('bold').setBackground('#b7b7b7');
    if (i > builderCount) {
      sheet.getRange(2, 1).setValue('Not Active Yet');
    }
  }

  Logger.log(`initUserSheets_: created sheets for ${safe} (${builderCount} active builders, TH${thLevel})`);
}

/*****************************************************
 * CURRENT WORK TABLE
 * Reads directly from the user's Google Sheet.
 * No Supabase — single source of truth.
 *****************************************************/
function getCurrentWorkTable_(username) {
  const ss   = SpreadsheetApp.getActive();
  const safe = safeUsername_(username || CURRENT_USERNAME);
  const cw   = ss.getSheetByName(`${safe}_CURRENT_WORK`);
  if (!cw) { Logger.log("CURRENT_WORK not found: " + safe); return []; }

  // Column A rows 2-7 tells us which builders are active vs locked
  const colA = cw.getRange("A2:A7").getValues();

  const result = [["Builder", "UpgradeName", "End_DateTime", "Next_Upgrade"]];

  for (let i = 0; i < 6; i++) {
    const builderNum = i + 1;
    const cellVal    = String(colA[i][0] || '').trim();

    if (cellVal.includes('Not Active Yet')) {
      result.push(["Not Active Yet", "", "", ""]);
      continue;
    }

    const builderSheet = ss.getSheetByName(`${safe}_Builder_${builderNum}`);
    if (!builderSheet) {
      result.push([`${safe}_Builder_${builderNum}`, "", "", ""]);
      continue;
    }

    const data = builderSheet.getDataRange().getValues();
    if (data.length < 2) {
      result.push([`${safe}_Builder_${builderNum}`, "", "", ""]);
      continue;
    }

    const headers = data[0];
    const colMap  = {};
    headers.forEach((h, idx) => { colMap[String(h).trim()] = idx; });

    const upgradeCol = colMap["UpgradeName"];
    const endCol     = colMap["End_DateTime"];
    const activeCol  = colMap["Active?"];

    // Check if builder is disabled ("Not Active Yet" in first data cell)
    if (String(data[1][0] || '').trim().includes('Not Active Yet')) {
      result.push(["Not Active Yet", "", "", ""]);
      continue;
    }

    // Find Active?=TRUE row
    let activeRowIdx  = -1;
    let activeUpgrade = "";
    let activeEnd     = "";
    for (let r = 1; r < data.length; r++) {
      if (data[r][activeCol] === true) {
        activeRowIdx  = r;
        activeUpgrade = data[r][upgradeCol] || "";
        activeEnd     = data[r][endCol]     || "";
        break;
      }
    }

    // Fallback: take the first row if nothing is marked active yet
    if (activeRowIdx === -1 && data.length > 1) {
      activeUpgrade = data[1][upgradeCol] || "";
      activeEnd     = data[1][endCol]     || "";
      activeRowIdx  = 1;
    }

    // Next upgrade: the row right after the active one
    let nextUpgrade = "";
    if (activeRowIdx !== -1 && activeRowIdx + 1 < data.length) {
      nextUpgrade = data[activeRowIdx + 1][upgradeCol] || "";
    }

    result.push([`${safe}_Builder_${builderNum}`, activeUpgrade, activeEnd, nextUpgrade]);
  }

  return result;
}

/*****************************************************
 * DASHBOARD DATA
 *****************************************************/
function getDashboardData_() {
  const currentWork = getCurrentWorkTable_(CURRENT_USERNAME);
  const todaysBoost = getTodaysBoost_();
  const boostPlan   = getBoostPlanTable();

  return {
    currentWork,
    todaysBoost,
    boostPlan,
    meta: {
      lastRefreshed: Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss"),
      timezone: TZ
    }
  };
}

/*****************************************************
 * TODAY'S BOOST
 *****************************************************/
function getTodaysBoost_() {
  const sh = getUserSheet_("CURRENT_WORK");
  if (!sh) return { error: "CURRENT WORK not found" };

  const appliedKey = sh.getRange(DAILY_LOCK_CELL).getDisplayValue();
  const todayKey   = todayKeyNY_();

  const boostPlanData = sh.getRange("A22:F30").getValues();
  if (boostPlanData.length < 2) {
    return { error: "Boost plan table is empty" };
  }

  const todayRow = boostPlanData[1];
  const upgrade  = todayRow[1];
  const builder  = todayRow[2];
  let status     = todayRow[5] || "";

  if (appliedKey === todayKey) {
    status = "APPLIED";
  }

  return { upgrade, builder, status, warning: "" };
}

/*****************************************************
 * BOOST PLAN
 *****************************************************/
function getBoostPlanTable() {
  const sh = getUserSheet_("CURRENT_WORK");
  if (!sh) return { table: [] };
  return { table: sh.getRange("A22:F30").getDisplayValues() };
}

/*****************************************************
 * SET TODAY'S BOOST BUILDER
 *****************************************************/
function setTodaysBoostBuilder_(newBuilder) {
  const ss = SpreadsheetApp.getActive();
  const cw = getUserSheet_("CURRENT_WORK");
  if (!cw) return { error: "CURRENT WORK not found" };

  const todayKey   = todayKeyNY_();
  const appliedKey = cw.getRange(DAILY_LOCK_CELL).getDisplayValue();

  if (appliedKey === todayKey) {
    return { error: "Boost already applied today. Cannot change builder." };
  }

  const builderSheet = getBuilderSheet_(newBuilder);
  if (!builderSheet) {
    return { error: `Builder sheet ${newBuilder} not found` };
  }

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const upgradeCol = colMap["UpgradeName"];
  const endCol     = colMap["End_DateTime"];
  const activeCol  = colMap["Active?"];

  if (upgradeCol == null || endCol == null || activeCol == null) {
    return { error: "Required columns not found in builder sheet" };
  }

  let activeUpgrade = null;
  let oldFinishTime = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === true || String(data[i][activeCol]).toUpperCase() === "TRUE") {
      activeUpgrade = data[i][upgradeCol];
      oldFinishTime = data[i][endCol];
      break;
    }
  }

  if (!activeUpgrade || !oldFinishTime) {
    return { error: `No active upgrade found for ${newBuilder}` };
  }

  const newFinishTime = new Date(oldFinishTime.getTime() - (8 * 60 * 60 * 1000));
  const hours  = newFinishTime.getHours();
  const minutes = newFinishTime.getMinutes();
  const isSafe = (hours >= 8 && (hours < 23 || (hours === 23 && minutes === 0)));
  const status = isSafe ? "SAFE" : "FORCED";

  const today = new Date();
  cw.getRange("A23:F23").setValues([[today, activeUpgrade, newBuilder, oldFinishTime, newFinishTime, status]]);

  return {
    status: "success",
    message: `Today's boost reassigned to ${newBuilder}`,
    builder: newBuilder,
    upgrade: activeUpgrade,
    oldFinish: oldFinishTime,
    newFinish: newFinishTime,
    safeOrForced: status
  };
}

/*****************************************************
 * APPLY DAILY BOOST
 *****************************************************/
function dailyBoostReduction() {
  const ss = SpreadsheetApp.getActive();
  const cw = getUserSheet_("CURRENT_WORK");
  if (!cw) return { error: "CURRENT WORK not found" };

  const todayKey   = todayKeyNY_();
  const lastApplied = cw.getRange(DAILY_LOCK_CELL).getDisplayValue();

  Logger.log("Today's date key: " + todayKey);
  Logger.log("Last applied: " + lastApplied);

  if (lastApplied === todayKey) {
    return { status: "already_applied", date: todayKey };
  }

  const boostPlanData = cw.getRange("A22:F30").getValues();
  if (boostPlanData.length < 2) {
    return { error: "Boost plan table is empty" };
  }

  const todayRow       = boostPlanData[1];
  const upgradeRaw     = todayRow[1];
  // Normalize builder name: sheet cells may store "Builder 3" (space) but sheets
  // are named "Builder_3" (underscore). Replace spaces with underscores.
  const builderSheetName = String(todayRow[2] || "").replace(/\s+/g, "_").trim();

  if (!upgradeRaw || !builderSheetName) {
    return { error: "Today's boost info is incomplete" };
  }

  const upgradeName = normalize_(upgradeRaw);
  const builder     = getBuilderSheet_(builderSheetName);
  if (!builder) return { error: "Builder sheet not found: " + builderSheetName };

  const UPGRADE_COL    = 2;
  const DURATION_COL   = 3;
  const DURATION_HR_COL = 4;
  const END_COL        = 6;
  const BOOST_MINUTES = getBoostHours_();

  const lastRow = builder.getLastRow();
  if (lastRow < 2) return { error: "No upgrades in builder sheet" };

  const upgrades = builder.getRange(2, UPGRADE_COL, lastRow - 1, 1).getValues();

  let targetRow = null;
  for (let i = 0; i < upgrades.length; i++) {
    if (normalize_(upgrades[i][0]) === upgradeName) {
      targetRow = i + 2;
      break;
    }
  }
  if (!targetRow) return { error: "Upgrade not found: " + upgradeRaw };

  const durationCell = builder.getRange(targetRow, DURATION_COL);
  const oldVal = Number(durationCell.getValue());
  if (!Number.isFinite(oldVal)) {
    return { error: "Duration (min) not numeric" };
  }

  const newVal = Math.max(0, oldVal - BOOST_MINUTES);
  durationCell.setValue(newVal);

  const days  = Math.floor(newVal / (24 * 60));
  const hours = Math.floor((newVal % (24 * 60)) / 60);
  const mins  = newVal % 60;
  builder.getRange(targetRow, DURATION_HR_COL).setValue(`${days} d ${hours} hr ${mins} min`);

  const oldEndTime = builder.getRange(targetRow, END_COL).getValue();
  const newEndTime = new Date(oldEndTime.getTime() - (BOOST_MINUTES * 60 * 1000));
  builder.getRange(targetRow, END_COL).setValue(newEndTime);

  recalculateBuilderDates_(builder);

  Logger.log("Writing lock to A11: " + todayKey);
  cw.getRange(DAILY_LOCK_CELL).setValue(todayKey);
  SpreadsheetApp.flush();

  return {
    status: "boost_applied",
    date: todayKey,
    upgrade: upgradeRaw,
    builder: builderSheetName,
    oldDuration: oldVal,
    newDuration: newVal,
    newEndTime
  };
}

/*****************************************************
 * REFRESH
 *****************************************************/
function refreshSheet_() {
  const ss = SpreadsheetApp.getActive();
  ss.getSheets()[0].getRange("M1").setValue(new Date());
  SpreadsheetApp.flush();
  return jsonWithCORS_({ status: "refreshed" });
}

/*****************************************************
 * REORDER BUILDER UPGRADES
 *****************************************************/
function reorderBuilderUpgrades_(builderName, newOrderStr) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builderName);

  if (!builderSheet) {
    return { error: `Builder sheet ${builderName} not found` };
  }

  const newOrder = newOrderStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const upgradeCol  = colMap["UpgradeName"];
  const durationCol = colMap["Duration (min)"];
  const startCol    = colMap["Start_DateTime"];
  const endCol      = colMap["End_DateTime"];
  const activeCol   = colMap["Active?"];

  if (upgradeCol == null || durationCol == null || startCol == null || endCol == null) {
    return { error: "Required columns not found. Headers found: " + headers.join(", ") };
  }

  const activeRow   = data[1];
  const upgradeRows = [];
  for (let i = 2; i < data.length; i++) upgradeRows.push(data[i]);

  for (const idx of newOrder) {
    if (idx < 0 || idx >= upgradeRows.length) {
      return { error: `Index ${idx} out of range (queue has ${upgradeRows.length} items)` };
    }
  }

  if (newOrder.length !== upgradeRows.length) {
    return { error: `Order length ${newOrder.length} doesn't match queue length ${upgradeRows.length}` };
  }

  const reorderedRows = newOrder.map(idx => upgradeRows[idx]);
  let currentStartTime = activeRow[endCol];

  if (!(currentStartTime instanceof Date)) {
    currentStartTime = new Date(currentStartTime);
  }

  for (let i = 0; i < reorderedRows.length; i++) {
    const row = reorderedRows[i];
    const durationMinutes = row[durationCol];
    row[startCol] = new Date(currentStartTime);
    const endTime = new Date(currentStartTime.getTime() + (durationMinutes * 60 * 1000));
    row[endCol]   = endTime;
    if (activeCol != null) row[activeCol] = false;
    currentStartTime = endTime;
  }

  if (upgradeRows.length > 0) {
    builderSheet.getRange(3, 1, upgradeRows.length, headers.length).clearContent();
  }
  if (reorderedRows.length > 0) {
    builderSheet.getRange(3, 1, reorderedRows.length, headers.length).setValues(reorderedRows);
  }

  recalculateBuilderDates_(builderSheet);

  return {
    status: "success",
    message: `Reordered ${reorderedRows.length} upgrades for ${builderName}`,
    builder: builderName
  };
}

/*****************************************************
 * UPDATE UPGRADE DURATION
 *****************************************************/
function updateUpgradeDuration_(builderName, row, newMinutes, newDurationHr) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builderName);

  if (!builderSheet) {
    return { error: `Builder sheet ${builderName} not found` };
  }

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const activeCol = colMap["Active?"];
  const isActive  = (row === 2 && data[1][activeCol] === true);

  if (isActive) {
    const now        = new Date();
    const newEndTime = new Date(now.getTime() + (newMinutes * 60 * 1000));
    builderSheet.getRange(row, 3).setValue(newMinutes);
    builderSheet.getRange(row, 4).setValue(newDurationHr);
    builderSheet.getRange(row, 6).setValue(newEndTime);
    recalculateBuilderDates_(builderSheet);
  } else {
    builderSheet.getRange(row, 3).setValue(newMinutes);
    builderSheet.getRange(row, 4).setValue(newDurationHr);
    recalculateBuilderDates_(builderSheet);
  }

  return {
    status: "success",
    message: `Updated duration for row ${row}`,
    builder: builderName,
    newMinutes,
    newDurationHr,
    isActive
  };
}

function recalculateBuilderDates_(builderSheet) {
  const data    = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap  = buildColMap_(headers);

  const durationCol   = colMap["Duration (min)"];
  const durationHrCol = colMap["Duration (hr)"];
  const startCol      = colMap["Start_DateTime"];
  const endCol        = colMap["End_DateTime"];

  if (durationCol == null || startCol == null || endCol == null) {
    Logger.log("recalculateBuilderDates_: missing required columns in " + builderSheet.getName());
    return;
  }

  // Row 2 (data[1]) is the active upgrade — its end time is the anchor.
  // Only queued rows (3+) are recalculated.
  if (data.length < 3) { updateActiveStatus_(builderSheet); return; }

  let prevEnd = data[1][endCol];
  if (!(prevEnd instanceof Date) || isNaN(prevEnd.getTime())) {
    updateActiveStatus_(builderSheet);
    return;
  }
  prevEnd = new Date(Math.round(prevEnd.getTime() / 60000) * 60000);

  // Monthly reductions are evaluated once per call, then applied per row.
  // They stack from the same original duration so changing/removing one
  // reduction never compounds against an already-reduced value.
  const gpState       = bpGetState_();
  const gpActive      = gpState.level > 0 && gpState.month >= 0 && gpState.year > 0;
  const gpMult        = bpMultiplier_(gpState.level);
  const monthlyState  = monthlyReductionGetState_();
  const monthlyActive = monthlyState.active;

  // Ensure the base-duration column exists when any monthly reducer is active.
  const baseHeader = getReductionBaseHeader_();
  let baseCol = colMap[baseHeader] != null ? colMap[baseHeader] : null;
  if ((gpActive || monthlyActive) && baseCol == null) {
    baseCol = ensureReductionBaseCol_(builderSheet, colMap, headers);
    // Expand data rows to include the new empty column so index reads below work.
    for (let r = 0; r < data.length; r++) data[r].push("");
  }

  const queuedCount = data.length - 2;
  const durOut    = [];
  const dhrOut    = [];
  const startOut  = [];
  const endOut    = [];
  const baseOut   = [];
  let   baseColChanged = false;

  for (let i = 2; i < data.length; i++) {
    const currentDur = Number(data[i][durationCol]) || 0;
    const storedBase = baseCol != null ? (Number(data[i][baseCol]) || 0) : 0;

    let effectiveDur;
    let newBase = storedBase || "";

    const candidateStart = new Date(prevEnd);
    const gpApplies = gpActive && bpIsInGpMonth_(candidateStart, gpState);
    const monthlyApplies = monthlyActive && monthlyReductionIsInMonth_(candidateStart, monthlyState);
    const reductionApplies = gpApplies || monthlyApplies;

    if (reductionApplies) {
      const base = storedBase || currentDur;
      if (!storedBase && currentDur > 0) {
        newBase = currentDur; // store original on first touch
        baseColChanged = true;
      }
      let combinedMult = 1;
      if (gpApplies) combinedMult *= gpMult;
      if (monthlyApplies) combinedMult *= monthlyState.multiplier;
      effectiveDur = base > 0 ? Math.floor(base * combinedMult) : currentDur;
    } else {
      // Outside active reduction windows — restore original if we had stored one.
      if (storedBase > 0) {
        effectiveDur   = storedBase;
        newBase        = "";
        baseColChanged = true;
      } else {
        effectiveDur = currentDur;
      }
    }

    if (!effectiveDur) {
      durOut.push([currentDur]);
      dhrOut.push([data[i][durationHrCol]]);
      startOut.push([data[i][startCol]]);
      endOut.push([data[i][endCol]]);
      baseOut.push([newBase]);
      continue;
    }

    const newStart = new Date(prevEnd);
    const newEnd   = new Date(prevEnd.getTime() + effectiveDur * 60 * 1000);

    const days  = Math.floor(effectiveDur / (24 * 60));
    const hours = Math.floor((effectiveDur % (24 * 60)) / 60);
    const mins  = effectiveDur % 60;

    durOut.push([effectiveDur]);
    dhrOut.push([`${days} d ${hours} hr ${mins} min`]);
    startOut.push([newStart]);
    endOut.push([newEnd]);
    baseOut.push([newBase]);
    prevEnd = newEnd;
  }

  builderSheet.getRange(3, durationCol    + 1, queuedCount, 1).setValues(durOut);
  builderSheet.getRange(3, durationHrCol  + 1, queuedCount, 1).setValues(dhrOut);
  builderSheet.getRange(3, startCol       + 1, queuedCount, 1).setValues(startOut);
  builderSheet.getRange(3, endCol         + 1, queuedCount, 1).setValues(endOut);
  if (baseCol != null && baseColChanged) {
    builderSheet.getRange(3, baseCol + 1, queuedCount, 1).setValues(baseOut);
  }

  updateActiveStatus_(builderSheet);
}

function recalculateMonthlyReductionSheets_() {
  if (typeof bpRecalcAllSheets_ === "function") {
    bpRecalcAllSheets_();
    return;
  }

  for (let i = 1; i <= 6; i++) {
    const sheet = getBuilderSheet_(`Builder_${i}`);
    if (!sheet || sheet.getLastRow() < 2) continue;
    recalculateBuilderDates_(sheet);
  }
}

/*****************************************************
 * UPDATE ACTIVE UPGRADE TIME
 *****************************************************/
function updateActiveUpgradeTime_(builderName, remainingMinutes) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builderName);

  if (!builderSheet) {
    return { error: `Builder sheet ${builderName} not found` };
  }

  const END_COL    = 6;
  const now        = new Date();
  const newEndTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000));
  builderSheet.getRange(2, END_COL).setValue(newEndTime);
  recalculateBuilderDates_(builderSheet);

  return {
    status: "success",
    message: "Updated active upgrade end time",
    builder: builderName,
    remainingMinutes,
    newEndTime
  };
}

/*****************************************************
 * TRANSFER UPGRADE
 *****************************************************/
function transferUpgrade_(upgradeName, fromBuilder, row, toBuilder) {
  const ss        = SpreadsheetApp.getActive();
  const fromSheet = getBuilderSheet_(fromBuilder);
  const toSheet   = getBuilderSheet_(toBuilder);

  if (!fromSheet) return { error: `Source builder ${fromBuilder} not found` };
  if (!toSheet)   return { error: `Target builder ${toBuilder} not found` };

  const rowData = fromSheet.getRange(row, 1, 1, 8).getValues()[0];
  const actualUpgradeName = rowData[1];

  if (normalize_(actualUpgradeName) !== normalize_(upgradeName)) {
    return { error: "Upgrade name mismatch" };
  }

  const durationMin = rowData[2];
  const durationHr  = rowData[3];

  const targetLastRow = toSheet.getLastRow();
  const targetNewRow  = targetLastRow + 1;

  let newStartTime = targetLastRow >= 2
    ? toSheet.getRange(targetLastRow, 6).getValue()
    : new Date();

  const newEndTime = new Date(newStartTime.getTime() + (durationMin * 60 * 1000));

  toSheet.getRange(targetNewRow, 1, 1, 8).setValues([[
    toBuilder, actualUpgradeName, durationMin, durationHr,
    newStartTime, newEndTime, false, "QUEUED"
  ]]);

  fromSheet.deleteRow(row);

  if (fromSheet.getLastRow() >= 2) {
    recalculateBuilderDates_(fromSheet);
  }

  recalculateBuilderDates_(toSheet);

  return {
    status: "success",
    message: `Transferred ${upgradeName} from ${fromBuilder} to ${toBuilder}`,
    fromBuilder, toBuilder,
    upgrade: actualUpgradeName
  };
}

/*****************************************************
 * UPDATE ACTIVE STATUS
 *
 * FIX: Previously skipped entire sheets if ANY row had PAUSED status.
 * Now only skips if the currently-ACTIVE row is PAUSED, so other
 * upgrades in the same sheet still get Active? updated correctly.
 *****************************************************/
function updateActiveStatus_(singleSheet) {
  const ss     = SpreadsheetApp.getActive();
  const sheets = singleSheet ? [singleSheet] : ss.getSheets();
  const now    = new Date();
  let updatedCount = 0;

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (!name.startsWith(builderPrefix_())) return;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    let activeCol = -1, startCol = -1, endCol = -1, statusCol = -1;

    headers.forEach((h, i) => {
      const header = String(h).trim();
      if (header === "Active?")             activeCol = i;
      if (header === "Start_DateTime")      startCol  = i;
      if (header === "End_DateTime")        endCol    = i;
      if (header === "Confirmation_Status") statusCol = i;
    });

    if (activeCol === -1 || startCol === -1 || endCol === -1) return;

    // FIX: Only skip if the currently-active row itself is PAUSED
    if (statusCol !== -1) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][activeCol] === true && String(data[i][statusCol]).trim() === "PAUSED") {
          return; // Active upgrade is paused — leave Active? alone for this builder
        }
      }
    }

    let activeRow = -1;
    for (let i = 1; i < data.length; i++) {
      const start = data[i][startCol];
      const end   = data[i][endCol];
      if (start instanceof Date && end instanceof Date && now >= start && now < end) {
        activeRow = i + 1;
        break;
      }
    }

    // Batch write the entire Active? column instead of one cell per row
    const activeValues = [];
    for (let i = 1; i < data.length; i++) {
      activeValues.push([i + 1 === activeRow]);
    }
    sheet.getRange(2, activeCol + 1, data.length - 1, 1).setValues(activeValues);

    updatedCount++;
  });

  markFinishedUpgradesAsPending_();

  return {
    status: "success",
    message: `Active status updated for ${updatedCount} builders`,
    timestamp: new Date()
  };
}

/*****************************************************
 * UPGRADE CONFIRMATION SYSTEM
 *****************************************************/

// Completed upgrades table lives in user_CURRENT_WORK, headers at D33:F33, data from D34 down.
// Returns the CURRENT_WORK sheet, ensuring the header row is in place.
function getCompletedUpgradesSheet_() {
  const sheet = getUserSheet_("CURRENT_WORK");
  if (!sheet) return null;
  const header = sheet.getRange("D33:F33").getValues()[0];
  if (header[0] !== "Builder") {
    sheet.getRange("D33:F33").setValues([["Builder", "UpgradeName", "Finished DateTime"]]);
    sheet.getRange("D33:F33").setFontWeight("bold");
    sheet.getRange("D33:F33").setBackground("#b7b7b7");
  }
  return sheet;
}

// Appends one completed-upgrade row to the D:F table in CURRENT_WORK.
function appendCompletedRow_(sheet, builder, upgradeName, finishedAt) {
  // Find next empty row in column D at or below row 34
  const lastRow = sheet.getLastRow();
  let nextRow = 34;
  if (lastRow >= 34) {
    const colD = sheet.getRange(34, 4, lastRow - 33, 1).getValues();
    for (let i = colD.length - 1; i >= 0; i--) {
      if (colD[i][0] !== "") { nextRow = 34 + i + 1; break; }
    }
  }
  sheet.getRange(nextRow, 4, 1, 3).setValues([[builder, upgradeName, finishedAt]]);
}

// Removes older level entries for the same upgrade from the D:F table in CURRENT_WORK.
// E.g. adding "Royal Champion Lvl 50" deletes any "Royal Champion Lvl X" rows already there.
function removePreviousLevels_(sheet, upgradeName) {
  const baseName = upgradeName.replace(/\s+Lvl\s+\d+$/i, "").trim();
  if (baseName === upgradeName) return; // No level suffix — nothing to deduplicate

  const lastRow = sheet.getLastRow();
  if (lastRow < 34) return;

  const data = sheet.getRange(34, 4, lastRow - 33, 2).getValues(); // columns D & E
  // Iterate in reverse so deletions don't shift indices
  for (let i = data.length - 1; i >= 0; i--) {
    const existingName = String(data[i][1]); // column E = UpgradeName
    const existingBase = existingName.replace(/\s+Lvl\s+\d+$/i, "").trim();
    if (existingBase === baseName && existingName !== upgradeName) {
      sheet.deleteRow(34 + i);
    }
  }
}

function addConfirmationStatusColumn() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (!name.startsWith(builderPrefix_())) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.includes("Confirmation_Status")) {
      Logger.log(name + " already has Confirmation_Status column");
      return;
    }

    const newCol = 8;
    sheet.insertColumnAfter(7);
    sheet.getRange(1, newCol).setValue("Confirmation_Status");
    sheet.getRange(1, newCol).setFontWeight("bold");

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const statusValues = Array.from({ length: lastRow - 1 }, () => ["QUEUED"]);
      sheet.getRange(2, newCol, statusValues.length, 1).setValues(statusValues);
    }

    Logger.log("Added Confirmation_Status to " + name);
  });
}

/*****************************************************
 * CHECK FINISHED UPGRADES
 *
 * FIX: Returns builder as "Builder_N" not "Daniel_Builder_N".
 * The frontend sends this value back to confirmUpgradeStart_ which calls
 * getBuilderSheet_() — that function re-adds the username prefix.
 * Returning the full sheet name caused double-prefixing → sheet not found.
 *****************************************************/
function checkFinishedUpgrades_() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  const finishedUpgrades = [];
  const prefix = builderPrefix_(); // e.g. "Daniel_Builder_"

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (!name.startsWith(prefix)) return;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    const colMap = {};
    headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

    const activeCol     = colMap["Active?"];
    const statusCol     = colMap["Confirmation_Status"];
    const upgradeCol    = colMap["UpgradeName"];
    const durationHrCol = colMap["Duration (hr)"];
    const startCol      = colMap["Start_DateTime"];
    const endCol        = colMap["End_DateTime"];

    if (activeCol == null || statusCol == null) return;

    const finished = [], queued = [];
    let nowActive = null;

    for (let i = 1; i < data.length; i++) {
      const row      = data[i];
      const isActive = row[activeCol] === true;
      const status   = String(row[statusCol]).trim();

      if (!isActive && status === "PENDING") {
        finished.push({
          upgradeName:   row[upgradeCol],
          finishedTime:  Utilities.formatDate(new Date(row[endCol]), TZ, "MMM dd h:mm a"),
          totalDuration: row[durationHrCol],
          rawEndDate:    row[endCol],
          row: i + 1
        });
      }
      if (isActive) {
        nowActive = {
          upgradeName:    row[upgradeCol],
          scheduledStart: Utilities.formatDate(new Date(row[startCol]), TZ, "MMM dd h:mm a"),
          totalDuration:  row[durationHrCol],
          status,
          row: i + 1
        };
      }
      if (!isActive && (status === "QUEUED" || status === "CONFIRMED")) {
        queued.push({ upgradeName: row[upgradeCol], duration: row[durationHrCol], row: i + 1 });
      }
    }

    if (finished.length > 0) {
      const builderKey = CURRENT_USERNAME
        ? name.replace(CURRENT_USERNAME + "_", "")
        : name;

      // nowActive may be null if there's a gap between upgrades (nothing currently running)
      // In that case, use the first queued upgrade as the "about to start" item
      const effectiveActive = nowActive || (queued.length > 0 ? {
        upgradeName: queued[0].upgradeName,
        scheduledStart: "Not yet started",
        totalDuration: queued[0].duration,
        status: "QUEUED",
        row: queued[0].row
      } : null);

      // If the next active upgrade is already paused, the user has already handled the
      // transition. Auto-archive the PENDING rows silently — no confirmation modal needed.
      if (effectiveActive && effectiveActive.status === "PAUSED") {
        const completedSheet = getCompletedUpgradesSheet_();
        for (let i = finished.length - 1; i >= 0; i--) {
          const fin = finished[i];
          removePreviousLevels_(completedSheet, fin.upgradeName);
          appendCompletedRow_(completedSheet, builderKey, fin.upgradeName, fin.rawEndDate || new Date());
          sheet.deleteRow(fin.row);
        }
      } else if (effectiveActive) {
        finishedUpgrades.push({
          builder: builderKey,
          finished,
          nowActive: effectiveActive,
          queuedUpgrades: queued
        });
      }
    }
  });

  return { finishedUpgrades, timestamp: new Date() };
}

function confirmUpgradeStart_(builder, upgradeName, startTime, confirmAction, differentUpgrade, requeueUpgrades) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builder);
  if (!builderSheet) return { error: `Builder sheet ${builder} not found` };

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  if (confirmAction === "pause")  return pauseBuilder_(builderSheet, colMap);
  if (confirmAction === "rewind") return rewindBuilder_(builderSheet, colMap, requeueUpgrades, upgradeName);
  if (confirmAction === "different" && differentUpgrade) {
    return switchToDifferentUpgrade_(builderSheet, colMap, upgradeName, differentUpgrade, startTime);
  }

  const upgradeCol    = colMap["UpgradeName"];
  const durationCol   = colMap["Duration (min)"];
  const durationHrCol = colMap["Duration (hr)"];
  const startCol      = colMap["Start_DateTime"];
  const endCol        = colMap["End_DateTime"];
  const activeCol     = colMap["Active?"];
  const statusCol     = colMap["Confirmation_Status"];

  let activeRow = -1;
  const finishedRows = [];

  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const isActive = row[activeCol] === true;
    const status   = String(row[statusCol]).trim();
    if (isActive) activeRow = i + 1;
    if (status === "PENDING") {
      finishedRows.push({ row: i + 1, name: row[upgradeCol], totalDuration: row[durationHrCol], start: row[startCol], end: row[endCol] });
    }
  }

  if (activeRow === -1) return { error: "Active upgrade not found" };

  const newStartTime = new Date(startTime);
  if (isNaN(newStartTime.getTime())) return { error: "Invalid start time format" };

  const completedSheet  = getCompletedUpgradesSheet_();
  const deletedUpgrades = [];
  finishedRows.sort((a, b) => a.row - b.row);

  for (const finished of finishedRows) {
    removePreviousLevels_(completedSheet, finished.name);
    appendCompletedRow_(completedSheet, builder, finished.name, finished.end);
    deletedUpgrades.push(finished.name);
  }

  const rowsAboveActive = finishedRows.filter(f => f.row < activeRow).length;
  for (let i = finishedRows.length - 1; i >= 0; i--) {
    builderSheet.deleteRow(finishedRows[i].row);
  }

  const correctedActiveRow = activeRow - rowsAboveActive;
  const durationMinutes    = builderSheet.getRange(correctedActiveRow, durationCol + 1).getValue();
  const newEndTime         = new Date(newStartTime.getTime() + (durationMinutes * 60 * 1000));

  builderSheet.getRange(correctedActiveRow, startCol  + 1).setValue(newStartTime);
  builderSheet.getRange(correctedActiveRow, endCol    + 1).setValue(newEndTime);
  builderSheet.getRange(correctedActiveRow, statusCol + 1).setValue("CONFIRMED");
  builderSheet.getRange(correctedActiveRow, activeCol + 1).setValue(true);

  recalculateBuilderDates_(builderSheet);

  return {
    status: "success",
    message: "Upgrade confirmed and finished upgrades moved to history",
    builder,
    deleted: deletedUpgrades,
    updated: {
      upgradeName,
      newStart: Utilities.formatDate(newStartTime, TZ, "MMM dd h:mm a"),
      newEnd:   Utilities.formatDate(newEndTime,   TZ, "MMM dd h:mm a")
    }
  };
}

function completeQueuedUpgrade_(builder, upgradeName, rowNum) {
  const builderSheet = getBuilderSheet_(builder);
  if (!builderSheet) return { error: `Builder sheet ${builder} not found` };
  if (!rowNum || rowNum < 2) return { error: 'Invalid row number' };

  const headers = builderSheet.getRange(1, 1, 1, builderSheet.getLastColumn()).getValues()[0];
  const colMap  = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const upgradeCol = colMap['UpgradeName'];
  const activeCol  = colMap['Active?'];

  if (upgradeCol == null || activeCol == null) {
    return { error: 'Required columns not found in builder sheet' };
  }

  const rowData      = builderSheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const cellName     = String(rowData[upgradeCol] || '').trim();
  const cellIsActive = rowData[activeCol];

  if (cellName !== String(upgradeName || '').trim()) {
    return { error: `Row mismatch: expected "${upgradeName}" but found "${cellName}". Please refresh and try again.` };
  }
  if (cellIsActive === true) {
    return { error: 'This is the currently active upgrade. Use the Finish Upgrade button on the builder card instead.' };
  }

  const completedSheet = getCompletedUpgradesSheet_();
  if (completedSheet) {
    removePreviousLevels_(completedSheet, upgradeName);
    appendCompletedRow_(completedSheet, builder, upgradeName, new Date());
  }

  builderSheet.deleteRow(rowNum);
  recalculateBuilderDates_(builderSheet);

  return { success: true, removed: upgradeName };
}

function finishUpgrade_(builder, upgradeName, startNext) {
  const builderSheet = getBuilderSheet_(builder);
  if (!builderSheet) return { error: `Builder sheet ${builder} not found` };

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const upgradeCol    = colMap["UpgradeName"];
  const durationCol   = colMap["Duration (min)"];
  const durationHrCol = colMap["Duration (hr)"];
  const startCol      = colMap["Start_DateTime"];
  const endCol        = colMap["End_DateTime"];
  const activeCol     = colMap["Active?"];
  const statusCol     = colMap["Confirmation_Status"];

  if (upgradeCol == null || activeCol == null || statusCol == null) {
    return { error: "Required columns not found" };
  }

  // Find the active row, collecting any PENDING rows above it along the way
  let activeRowIdx = -1;
  const pendingRowIndices = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === true) { activeRowIdx = i; break; }
    if (String(data[i][statusCol]).trim() === "PENDING") pendingRowIndices.push(i);
  }
  if (activeRowIdx === -1) return { error: "No active upgrade found" };

  const completedSheet = getCompletedUpgradesSheet_();

  // Archive PENDING rows first (naturally-finished upgrades not yet cleaned up).
  // Iterate in reverse so that deleting lower rows doesn't shift upper indices.
  for (let i = pendingRowIndices.length - 1; i >= 0; i--) {
    const idx = pendingRowIndices[i];
    removePreviousLevels_(completedSheet, data[idx][upgradeCol]);
    appendCompletedRow_(completedSheet, builder, data[idx][upgradeCol], data[idx][endCol] || new Date());
    builderSheet.deleteRow(idx + 1);
  }

  const activeRowData = data[activeRowIdx];
  const now = new Date();

  // Move active upgrade to completed table in CURRENT_WORK (D33:F down)
  removePreviousLevels_(completedSheet, activeRowData[upgradeCol]);
  appendCompletedRow_(completedSheet, builder, activeRowData[upgradeCol], now);

  // Delete the active row, adjusted for any PENDING rows removed above it
  builderSheet.deleteRow((activeRowIdx + 1) - pendingRowIndices.length);

  // Check if a next upgrade exists (now shifted to row 2)
  const remaining = builderSheet.getDataRange().getValues();
  if (remaining.length < 2) {
    return {
      status: "success",
      message: `Finished ${upgradeName} for ${builder}. Queue is now empty.`,
      startedNext: false,
      queueEmpty: true
    };
  }

  if (startNext === 'true') {
    const durationMinutes = remaining[1][durationCol];
    const newEndTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    builderSheet.getRange(2, startCol  + 1).setValue(now);
    builderSheet.getRange(2, endCol    + 1).setValue(newEndTime);
    builderSheet.getRange(2, statusCol + 1).setValue("CONFIRMED");
    builderSheet.getRange(2, activeCol + 1).setValue(true);
    recalculateBuilderDates_(builderSheet);
  } else {
    // Pause the next upgrade — clear any pre-calculated dates so the frontend
    // doesn't see a running countdown for a paused upgrade
    builderSheet.getRange(2, statusCol + 1).setValue("PAUSED");
    builderSheet.getRange(2, activeCol + 1).setValue(true);
    if (startCol != null) builderSheet.getRange(2, startCol + 1).setValue("");
    if (endCol   != null) builderSheet.getRange(2, endCol   + 1).setValue("");

    const pausedData    = builderSheet.getDataRange().getValues();
    const pausedColMap  = {};
    pausedData[0].forEach((h, i) => { pausedColMap[String(h).trim()] = i; });
    return {
      status:      "success",
      message:     `Finished ${upgradeName} for ${builder}`,
      startedNext: false,
      pausedInfo: {
        upgradeName: pausedData[1][pausedColMap["UpgradeName"]]  || "",
        duration:    pausedData[1][pausedColMap["Duration (hr)"]] || ""
      }
    };
  }

  return {
    status: "success",
    message: `Finished ${upgradeName} for ${builder}`,
    startedNext: startNext === 'true'
  };
}

function rewindBuilder_(builderSheet, colMap, requeueUpgradesStr, rewindTargetName) {
  const data       = builderSheet.getDataRange().getValues();
  const upgradeCol = colMap["UpgradeName"];
  const statusCol  = colMap["Confirmation_Status"];
  const activeCol  = colMap["Active?"];

  const toRequeue  = (requeueUpgradesStr || '')
    .split(',').map(s => normalize_(s.trim())).filter(Boolean);

  if (toRequeue.length === 0) return { error: "No upgrades specified for rewind" };

  const targetNorm = normalize_(String(rewindTargetName || ''));

  for (let i = 1; i < data.length; i++) {
    const name = normalize_(String(data[i][upgradeCol]));
    if (toRequeue.includes(name)) {
      const isTarget = name === targetNorm;
      builderSheet.getRange(i + 1, statusCol + 1).setValue(isTarget ? "PAUSED" : "QUEUED");
      builderSheet.getRange(i + 1, activeCol + 1).setValue(isTarget);
    }
  }

  SpreadsheetApp.flush();
  return { status: "success", message: `Rewound to ${rewindTargetName}`, builder: builderSheet.getName() };
}

function pauseBuilder_(builderSheet, colMap) {
  const data      = builderSheet.getDataRange().getValues();
  const statusCol = colMap["Confirmation_Status"];
  const activeCol = colMap["Active?"];

  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === true) {
      builderSheet.getRange(i + 1, statusCol + 1).setValue("PAUSED");
      break;
    }
  }

  return { status: "success", message: "Builder paused", builder: builderSheet.getName() };
}

function startPausedBuilder_(builder, method, startTimeOrRemaining) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builder);
  if (!builderSheet) return { error: `Builder sheet ${builder} not found` };

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const statusCol   = colMap["Confirmation_Status"];
  const activeCol   = colMap["Active?"];
  const startCol    = colMap["Start_DateTime"];
  const endCol      = colMap["End_DateTime"];
  const durationCol = colMap["Duration (min)"];

  let pausedRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === "PAUSED" && data[i][activeCol] === true) {
      pausedRow = i + 1;
      break;
    }
  }

  if (pausedRow === -1) return { error: "No paused upgrade found" };

  const durationMinutes = builderSheet.getRange(pausedRow, durationCol + 1).getValue();
  let newStartTime, newEndTime;

  if (method === "exact") {
    newStartTime = new Date(startTimeOrRemaining);
    if (isNaN(newStartTime.getTime())) return { error: "Invalid start time format" };
    newEndTime = new Date(newStartTime.getTime() + (durationMinutes * 60 * 1000));
  } else {
    const remainingMinutes = parseInt(startTimeOrRemaining);
    const elapsedMinutes   = durationMinutes - remainingMinutes;
    const serverNow        = new Date();
    newStartTime = new Date(serverNow.getTime() - (elapsedMinutes * 60 * 1000));
    newEndTime   = new Date(serverNow.getTime() + (remainingMinutes * 60 * 1000));
  }

  builderSheet.getRange(pausedRow, startCol  + 1).setValue(newStartTime);
  builderSheet.getRange(pausedRow, endCol    + 1).setValue(newEndTime);
  builderSheet.getRange(pausedRow, statusCol + 1).setValue("CONFIRMED");

  // Clear any stale PENDING rows
  const toDelete = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === "PENDING") toDelete.push(i + 1);
  }
  toDelete.reverse().forEach(row => builderSheet.deleteRow(row));

  recalculateBuilderDates_(builderSheet);

  return { status: "success", message: "Builder resumed", builder };
}

function switchToDifferentUpgrade_(builderSheet, colMap, originalUpgrade, newUpgrade, startTime) {
  const data        = builderSheet.getDataRange().getValues();
  const upgradeCol  = colMap["UpgradeName"];
  const activeCol   = colMap["Active?"];
  const statusCol   = colMap["Confirmation_Status"];
  const startCol    = colMap["Start_DateTime"];
  const endCol      = colMap["End_DateTime"];
  const durationCol = colMap["Duration (min)"];

  let originalRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === true && normalize_(data[i][upgradeCol]) === normalize_(originalUpgrade)) {
      originalRow = i + 1;
      break;
    }
  }
  if (originalRow === -1) return { error: "Original upgrade not found" };

  let newRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(data[i][upgradeCol]) === normalize_(newUpgrade)) {
      newRow = i + 1;
      break;
    }
  }
  if (newRow === -1) return { error: "New upgrade not found in queue" };

  const newUpgradeData  = builderSheet.getRange(newRow, 1, 1, 8).getValues()[0];
  const newStartTime    = new Date(startTime);
  if (isNaN(newStartTime.getTime())) return { error: "Invalid start time format" };

  const durationMinutes = newUpgradeData[durationCol];
  const newEndTime      = new Date(newStartTime.getTime() + (durationMinutes * 60 * 1000));

  builderSheet.getRange(originalRow, statusCol + 1).setValue("SKIPPED");
  builderSheet.getRange(originalRow, activeCol + 1).setValue(false);
  builderSheet.getRange(newRow, activeCol  + 1).setValue(true);
  builderSheet.getRange(newRow, startCol   + 1).setValue(newStartTime);
  builderSheet.getRange(newRow, endCol     + 1).setValue(newEndTime);
  builderSheet.getRange(newRow, statusCol  + 1).setValue("CONFIRMED");

  const rowData = builderSheet.getRange(newRow, 1, 1, builderSheet.getLastColumn()).getValues();
  builderSheet.deleteRow(newRow);
  builderSheet.insertRowAfter(1);
  builderSheet.getRange(2, 1, 1, rowData[0].length).setValues(rowData);

  recalculateBuilderDates_(builderSheet);

  return { status: "success", message: `Switched to ${newUpgrade}`, builder: builderSheet.getName(), newUpgrade };
}

function getBuilderQueue_(builder) {
  const ss = SpreadsheetApp.getActive();
  const builderSheet = getBuilderSheet_(builder);
  if (!builderSheet) return { error: `Builder sheet ${builder} not found` };

  const data = builderSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

  const upgradeCol    = colMap["UpgradeName"];
  const durationHrCol = colMap["Duration (hr)"];
  const statusCol     = colMap["Confirmation_Status"];

  const queue = [];
  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const status = row[statusCol];
    if (status === "QUEUED" || status === "PAUSED") {
      queue.push({ upgradeName: row[upgradeCol], duration: row[durationHrCol], row: i + 1 });
    }
  }

  return { builder, queue };
}

/*****************************************************
 * MARK FINISHED UPGRADES AS PENDING
 *
 * FIX 1: When firstActiveRow is -1 (no active row set yet), the old code
 * blocked ALL rows via the isBeforeActive check. Now rows are marked PENDING
 * based purely on end time when no active row exists.
 *
 * FIX 2: Added CONFIRMED and SKIPPED to the skip list so resolved upgrades
 * are never re-marked PENDING after being confirmed.
 *****************************************************/
function markFinishedUpgradesAsPending_() {
  const ss = SpreadsheetApp.getActive();
  const now = new Date();

  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    if (!name.startsWith(builderPrefix_())) return;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    const colMap = {};
    headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

    const activeCol = colMap["Active?"];
    const statusCol = colMap["Confirmation_Status"];
    const endCol    = colMap["End_DateTime"];

    if (activeCol == null || statusCol == null || endCol == null) return;

    let firstActiveRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][activeCol] === true) { firstActiveRow = i; break; }
    }

    // Build status column array from existing data, then overwrite only what changes.
    // Never overwrite terminal statuses — CONFIRMED flips to PENDING once its end time passes.
    const skipStatuses = ["PENDING", "PAUSED", "SKIPPED"];
    const statusOut = data.slice(1).map(row => [String(row[statusCol]).trim()]);
    let changed = false;

    for (let i = 1; i < data.length; i++) {
      const row      = data[i];
      const isActive = row[activeCol] === true;
      const status   = String(row[statusCol]).trim();
      const endTime  = row[endCol];

      if (skipStatuses.includes(status) || isActive) continue;

      // When no active row found, allow all past-ended rows to be marked PENDING
      const isBeforeActive = firstActiveRow === -1 || i < firstActiveRow;

      if (isBeforeActive && endTime instanceof Date && endTime < now) {
        statusOut[i - 1][0] = "PENDING";
        Logger.log(`Marked PENDING: ${sheet.getName()} row ${i + 1} - ${row[colMap["UpgradeName"]]}`);
        changed = true;
      }
    }

    // One batch write per sheet instead of one write per PENDING row
    if (changed) {
      sheet.getRange(2, statusCol + 1, data.length - 1, 1).setValues(statusOut);
    }
  });
}

function getPausedBuilders_() {
  const ss = SpreadsheetApp.getActive();
  const result = {};

  for (let n = 1; n <= 6; n++) {
    const name  = builderPrefix_() + n;
    const sheet = ss.getSheetByName(name);

    if (!sheet) { result[name] = { paused: false }; continue; }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) { result[name] = { paused: false }; continue; }

    const headers = data[0];
    const colMap = {};
    headers.forEach((h, i) => { colMap[String(h).trim()] = i; });

    const statusCol   = colMap["Confirmation_Status"];
    const upgradeCol  = colMap["UpgradeName"];
    const durationCol = colMap["Duration (hr)"];
    const activeCol   = colMap["Active?"];

    if (statusCol == null) { result[name] = { paused: false }; continue; }

    let isPaused = false, pausedUpgrade = "", pausedDuration = "";

    for (let i = 1; i < data.length; i++) {
      const status   = String(data[i][statusCol]).trim();
      const isActive = data[i][activeCol] === true;
      if (status === "PAUSED" && isActive) {
        isPaused = true;
        pausedUpgrade  = data[i][upgradeCol]  || "";
        pausedDuration = data[i][durationCol] || "";
        break;
      }
    }

    result[name] = { paused: isPaused, upgradeName: pausedUpgrade, duration: pausedDuration };
  }

  return result;
}


/*****************************************************
 * UNASSIGNED UPGRADES
 * Reads from {username}_CURRENT_WORK, A34:B downwards.
 * Column A = UpgradeName, Column B = Duration (min).
 * Duration + cost are resolved from gamedata.js on the frontend.
 *****************************************************/
function getUnassignedUpgrades_() {
  const sheet = getUserSheet_('CURRENT_WORK');
  if (!sheet) return { upgrades: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < 34) return { upgrades: [] };

  const numRows = lastRow - 33; // rows from row 34 to lastRow
  const data    = sheet.getRange(34, 1, numRows, 2).getValues(); // A34:B<lastRow>

  const upgrades = [];
  for (let i = 0; i < data.length; i++) {
    const name = String(data[i][0] || '').trim();
    if (!name) continue;
    const durationMinutes = Number(data[i][1]) || 0;
    upgrades.push({ upgradeName: name, durationMinutes });
  }

  return { upgrades };
}

/*****************************************************
 * ASSIGN UNASSIGNED UPGRADE TO BUILDER
 * Moves one upgrade from the unassigned list (A34:B) to a builder sheet.
 *****************************************************/
function assignUnassignedUpgrade_(upgradeName, builderName, durationMinutes) {
  if (!upgradeName || !builderName) return { error: "Missing upgradeName or builder" };

  const cwSheet = getUserSheet_('CURRENT_WORK');
  if (!cwSheet) return { error: "CURRENT_WORK sheet not found" };

  // Find the upgrade in the unassigned list (A34:B downwards)
  const lastRow = cwSheet.getLastRow();
  if (lastRow < 34) return { error: "No unassigned upgrades found" };

  const numRows  = lastRow - 33;
  const data     = cwSheet.getRange(34, 1, numRows, 2).getValues();
  const normName = normalize_(upgradeName);
  let   foundRow = -1;
  let   foundDur = durationMinutes;

  for (let i = 0; i < data.length; i++) {
    if (normalize_(String(data[i][0] || '')) === normName) {
      foundRow = 34 + i;
      foundDur = Number(data[i][1]) || durationMinutes;
      break;
    }
  }

  if (foundRow === -1) return { error: "Upgrade not found in unassigned list" };

  // Add to target builder sheet
  const builderSheet = getBuilderSheet_(builderName);
  if (!builderSheet) return { error: `Builder sheet ${builderName} not found` };

  const builderLastRow = builderSheet.getLastRow();
  const newRow         = builderLastRow + 1;
  const isFirstUpgrade = builderLastRow < 2; // only header row exists

  const prevEndCell = (!isFirstUpgrade) ? builderSheet.getRange(builderLastRow, 6).getValue() : null;
  const startTime   = (prevEndCell && prevEndCell instanceof Date && !isNaN(prevEndCell.getTime()))
    ? prevEndCell
    : new Date();
  const endTime     = new Date(startTime.getTime() + foundDur * 60 * 1000);
  const durationHr  = foundDur / 60;

  // First upgrade for this builder → show as PAUSED so user picks when to start
  const isActive = isFirstUpgrade;
  const status   = isFirstUpgrade ? "PAUSED" : "QUEUED";

  builderSheet.getRange(newRow, 1, 1, 8).setValues([[
    builderName, upgradeName, foundDur, durationHr,
    startTime, endTime, isActive, status
  ]]);

  if (!isFirstUpgrade) updateActiveStatus_(builderSheet);

  // Remove from unassigned list
  cwSheet.deleteRow(foundRow);

  return {
    status: "success",
    message: `Assigned "${upgradeName}" to ${builderName}`,
    builder: builderName,
    upgrade: upgradeName
  };
}

/*****************************************************
 * HELPERS
 *****************************************************/
function jsonWithCORS_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Build a {headerName: columnIndex} map from a header row array. */
function buildColMap_(headers) {
  const colMap = {};
  headers.forEach((h, i) => { if (h) colMap[String(h).trim()] = i; });
  return colMap;
}

function getBuilderDetails_(builderName) {
  try {
    const ss = SpreadsheetApp.getActive();
    const tz = typeof TZ !== "undefined" ? TZ : "America/New_York";

    const resolvedName = CURRENT_USERNAME
      ? `${CURRENT_USERNAME}_${builderName}`
      : builderName;

    Logger.log("getBuilderDetails_ called — resolved: " + resolvedName + " | user: " + CURRENT_USERNAME);

    const builderSheet = ss.getSheetByName(resolvedName);

    if (!builderSheet) {
      const allSheets = ss.getSheets().map(s => s.getName());
      Logger.log("Sheet not found. All sheets: " + JSON.stringify(allSheets));
      return {
        error: "Builder sheet not found",
        resolvedName,
        username: CURRENT_USERNAME,
        allSheets
      };
    }

    const data = builderSheet.getDataRange().getValues();
    if (data.length < 2) return { builder: builderName, upgrades: [] };

    const headers = data[0];
    const colMap = {};
    headers.forEach((h, i) => { if (h) colMap[String(h).trim()] = i; });

    const upgradeCol     = colMap["UpgradeName"]    ?? 1;
    const durationMinCol = colMap["Duration (min)"] ?? 2;
    const durationHrCol  = colMap["Duration (hr)"]  ?? 3;
    const startCol       = colMap["Start_DateTime"] ?? 4;
    const endCol         = colMap["End_DateTime"]   ?? 5;

    const gpState  = bpGetState_();
    const gpActive = gpState.level > 0 && gpState.month >= 0 && gpState.year > 0;

    const upgrades = [];
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row[upgradeCol]) continue;

      const startRaw  = row[startCol];
      const endRaw    = row[endCol];
      const startDate = startRaw instanceof Date ? startRaw : new Date(startRaw);
      const endDate   = endRaw   instanceof Date ? endRaw   : new Date(endRaw);

      const startFmt = isNaN(startDate.getTime()) ? "—" : Utilities.formatDate(startDate, tz, "MMM dd h:mm a");
      const endFmt   = isNaN(endDate.getTime())   ? "—" : Utilities.formatDate(endDate,   tz, "MMM dd h:mm a");

      const durationMin = Number(row[durationMinCol]) || 0;
      const durationHr  = row[durationHrCol] || formatMinutesToHr_(durationMin);
      const hasGoldPass = gpActive && bpIsInGpMonth_(startDate, gpState);

      upgrades.push({
        builder:         builderName,
        upgrade:         row[upgradeCol],
        duration:        durationHr,
        durationMinutes: durationMin,
        start:           startFmt,
        end:             endFmt,
        row:             i + 1,
        cost:            row[colMap["Cost"]] || "",
        TypeB_ID:        getBuildingTypeB_(row[upgradeCol]),
        goldPass:        hasGoldPass
      });
    }

    return { builder: builderName, upgrades };

  } catch (e) {
    Logger.log("getBuilderDetails_ EXCEPTION: " + e.toString());
    return { error: "Exception: " + e.toString(), builderName, username: CURRENT_USERNAME };
  }
}

function getBoostHours_() {
  // ===== BOOST LEVEL LOOKUP TABLE =====
  // Index = level number, value = hours reduced per boost.
  // Level 1 = 1hr, Level 2 = 2hr, ..., Level 8 = 8hr (current max).
  // TO ADD A NEW LEVEL: append the new hour value at the next index.
  //   e.g. Level 9 reduces 9 hours → BOOST_HOURS = [0,1,2,3,4,5,6,7,8,9]
  const BOOST_HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const sheet = getUserSheet_("CURRENT_WORK");
  const level = sheet ? (Number(sheet.getRange("C21").getValue()) || 8) : 8;
  return (BOOST_HOURS[level] ?? BOOST_HOURS[BOOST_HOURS.length - 1]) * 60; // returns MINUTES
}


function normalize_(v) {
  return String(v)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function todayKeyNY_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
}

function getReductionBaseHeader_() {
  return (typeof BP_BASE_HEADER !== "undefined" && BP_BASE_HEADER)
    ? BP_BASE_HEADER
    : "BP_BaseDuration";
}

function ensureReductionBaseCol_(sheet, colMap, headers) {
  if (typeof bpEnsureBaseCol_ === "function") {
    return bpEnsureBaseCol_(sheet, colMap, headers);
  }

  const header = getReductionBaseHeader_();
  if (colMap[header] != null) return colMap[header];

  const col = headers.length;
  sheet.getRange(1, col + 1).setValue(header);
  colMap[header] = col;
  headers.push(header);
  return col;
}

function monthlyReductionGetState_() {
  const sheet = getUserSheet_("CURRENT_WORK");
  const cell  = sheet ? sheet.getRange("E13") : null;
  const raw   = cell ? cell.getValue() : 0;
  const shown = cell ? cell.getDisplayValue() : "";
  const pct   = parseMonthlyReductionPercent_(raw, shown);
  const now   = new Date();

  return {
    percent: pct,
    multiplier: Math.max(0, 1 - pct / 100),
    active: pct > 0,
    monthKey: Utilities.formatDate(now, TZ, "yyyy-MM")
  };
}

function parseMonthlyReductionPercent_(raw, displayValue) {
  let pct = 0;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    pct = raw > 0 && raw <= 1 ? raw * 100 : raw;
  } else {
    const display = String(displayValue || raw || "").trim();
    const hasPercent = display.includes("%");
    const numeric = Number(display.replace("%", "").trim());
    if (Number.isFinite(numeric)) {
      pct = !hasPercent && numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
    }
  }

  return Math.min(Math.max(pct, 0), 100);
}

function monthlyReductionIsInMonth_(dateValue, monthlyState) {
  if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) return false;
  return Utilities.formatDate(dateValue, TZ, "yyyy-MM") === monthlyState.monthKey;
}

/******************************************************
 * BUILDER POTION — PREVIEW API
 ******************************************************/
function previewBuilderPotion_API_(times) {
  if (!times || isNaN(times) || times <= 0) {
    return { error: "Invalid potion count" };
  }

  const POTION_MINUTES = 540;
  const totalMinutes = POTION_MINUTES * times;

  const currentWork = getUserSheet_("CURRENT_WORK");
  const previewValues = currentWork ? currentWork.getRange("C2:C7").getValues() : [];

  const preview = [];
  for (let i = 0; i < 6; i++) {
    const oldTime = previewValues[i] ? previewValues[i][0] : null;
    if (oldTime instanceof Date) {
      preview.push({
        builder: builderSheetName_(`Builder_${i + 1}`),
        oldTime: oldTime.getTime(),
        newTime: oldTime.getTime() - totalMinutes * 60000
      });
    }
  }

  return { potions: times, totalMinutes, preview };
}

/******************************************************
 * BUILDER POTION — APPLY API  (wrapper)
 ******************************************************/
function applyBuilderPotion_API_(times) {
  if (!times || isNaN(times) || times <= 0) {
    return { error: "Invalid potion count" };
  }
  const POTION_MINUTES = 540;
  const totalMinutes = POTION_MINUTES * times;
  const updated = applyBuilderPotionCore_(totalMinutes);
  return { status: "ok", potions: times, totalMinutes, updated };
}

/******************************************************
 * BUILDER POTION — APPLY CORE
 ******************************************************/
function applyBuilderPotionCore_(totalMinutes) {
  const reduceMs = totalMinutes * 60 * 1000;
  const now = new Date();
  const updated = [];

  for (let i = 1; i <= 6; i++) {
    const sheet = getBuilderSheet_(`Builder_${i}`);
    if (!sheet) continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const data = sheet.getRange(2, 5, lastRow - 1, 2).getValues(); // cols E & F

    // Find active row: start <= now AND finish >= now
    let activeRow = -1;
    for (let r = 0; r < data.length; r++) {
      const start = data[r][0], finish = data[r][1];
      if (start instanceof Date && finish instanceof Date &&
          start <= now && finish >= now) {
        activeRow = r + 2;
        break;
      }
    }

    if (activeRow === -1) continue;

    // Shift active row finish time (col F)
    const finishCell = sheet.getRange(activeRow, 6);
    const oldFinish = finishCell.getValue();
    if (!(oldFinish instanceof Date)) continue;
    finishCell.setValue(new Date(oldFinish.getTime() - reduceMs));

    // Cascade all queued rows after the active one
    for (let r = activeRow - 1; r < data.length; r++) {
      const sheetRow = r + 2;
      if (sheetRow <= activeRow) continue;
      const qStart = data[r][0], qFinish = data[r][1];
      if (!(qStart instanceof Date) || !(qFinish instanceof Date)) continue;
      if (qStart <= now) continue;
      sheet.getRange(sheetRow, 5).setValue(new Date(qStart.getTime() - reduceMs));
      sheet.getRange(sheetRow, 6).setValue(new Date(qFinish.getTime() - reduceMs));
    }

    updated.push({ builder: sheet.getName(), oldFinish: oldFinish.getTime(), newFinish: oldFinish.getTime() - reduceMs });
  }

  return updated;
}

/******************************************************
 * ONE-HOUR BOOST — PREVIEW API
 ******************************************************/
function previewOneHourBoost_API_(times) {
  if (!Number.isFinite(times) || times <= 0) {
    return { error: "Invalid boost count" };
  }

  const totalMinutes = 60 * times;

  const cw = getUserSheet_("CURRENT_WORK");
  if (!cw) return { error: "CURRENT_WORK not found" };

  const previewValues = cw.getRange("C2:C7").getValues();
  const preview = [];

  for (let i = 0; i < 6; i++) {
    const oldTime = previewValues[i]?.[0];
    if (oldTime instanceof Date) {
      preview.push({
        builder: builderSheetName_(`Builder_${i + 1}`),
        oldTime: oldTime.getTime(),
        newTime: oldTime.getTime() - totalMinutes * 60000
      });
    }
  }

  return { boosts: times, totalMinutes, preview };
}

/******************************************************
 * ONE-HOUR BOOST — APPLY API
 ******************************************************/
function applyOneHourBoost_API_(times) {
  if (!Number.isFinite(times) || times <= 0) {
    return { error: "Invalid boost count" };
  }

  const reduceMs = times * 60 * 60 * 1000;
  const now = new Date();
  const updated = [];

  for (let i = 1; i <= 6; i++) {
    const sheet = getBuilderSheet_(`Builder_${i}`);
    if (!sheet) continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const data = sheet.getRange(2, 5, lastRow - 1, 2).getValues(); // cols E & F

    // Find active row: start <= now AND finish >= now
    let activeRow = -1;
    for (let r = 0; r < data.length; r++) {
      const start = data[r][0], finish = data[r][1];
      if (start instanceof Date && finish instanceof Date &&
          start <= now && finish >= now) {
        activeRow = r + 2;
        break;
      }
    }

    if (activeRow === -1) continue;

    // Shift active row finish time (col F)
    const activeFinishCell = sheet.getRange(activeRow, 6);
    const oldFinish = activeFinishCell.getValue();
    if (!(oldFinish instanceof Date)) continue;
    activeFinishCell.setValue(new Date(oldFinish.getTime() - reduceMs));

    // Cascade all queued rows after the active one
    for (let r = activeRow - 1; r < data.length; r++) {
      const sheetRow = r + 2;
      if (sheetRow <= activeRow) continue;
      const qStart = data[r][0], qFinish = data[r][1];
      if (!(qStart instanceof Date) || !(qFinish instanceof Date)) continue;
      if (qStart <= now) continue;
      sheet.getRange(sheetRow, 5).setValue(new Date(qStart.getTime() - reduceMs));
      sheet.getRange(sheetRow, 6).setValue(new Date(qFinish.getTime() - reduceMs));
    }

    updated.push({
      builder: sheet.getName(),
      oldFinish: oldFinish.getTime(),
      newFinish: oldFinish.getTime() - reduceMs
    });
  }

  return {
    status: "success",
    boostsApplied: times,
    minutesReducedPerBuilder: times * 60,
    updatedBuilders: updated
  };
}
