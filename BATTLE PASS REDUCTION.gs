/*******************************************************
 * GOLD PASS — DYNAMIC PROGRESSIVE REDUCTION
 *
 * Tier progression (via battlePassBtn in the website):
 *   0% → 10% → 15% → 20% → reset back to 0%
 *
 * The active month is locked when the pass first activates
 * (0→10 transition) = the current calendar month.
 * All queued upgrades whose Start_DateTime falls within
 * that calendar month get the reduction, re-evaluated
 * automatically on every schedule change.
 *
 * State stored per user in ScriptProperties:
 *   bp_state_{username} → JSON { level, month, year }
 *   level : 0 | 10 | 15 | 20
 *   month : 0-indexed (0=Jan … 11=Dec), -1 when inactive
 *   year  : 4-digit, -1 when inactive
 *
 * Website APIs (routed from info.gs doGet dispatch):
 *   battle_pass_status  → battlePassStatus_API_()
 *   preview_battle_pass → previewBattlePass_API_()
 *   apply_battle_pass   → applyBattlePass_API_()
 *
 * Called internally by recalculateBuilderDates_ (info.gs):
 *   bpGetState_()
 *   bpIsInGpMonth_(date, state)
 *   bpMultiplier_(level)
 *   BP_BASE_HEADER  (constant)
 *******************************************************/

const BP_BASE_HEADER = "BP_BaseDuration";

/* =========================
   LEVEL HELPERS
   ========================= */

function bpGetNextLevel_(level) {
  if (level === 0)  return 10;
  if (level === 10) return 15;
  if (level === 15) return 20;
  return 0;
}

function bpMultiplier_(level) {
  if (level === 10) return 0.90;
  if (level === 15) return 0.85;
  if (level === 20) return 0.80;
  return 1.0;
}

/* =========================
   PER-USER STATE
   ========================= */

function bpStateKey_() {
  return 'bp_state_' + (CURRENT_USERNAME || 'default');
}

function bpGetState_() {
  const raw = PROPS.getProperty(bpStateKey_());
  if (!raw) return { level: 0, month: -1, year: -1 };
  try { return JSON.parse(raw); }
  catch (e) { return { level: 0, month: -1, year: -1 }; }
}

function bpSetState_(level, month, year) {
  PROPS.setProperty(bpStateKey_(), JSON.stringify({ level, month, year }));
}

function bpResetState_() {
  PROPS.deleteProperty(bpStateKey_());
}

/* =========================
   DATE HELPER
   ========================= */

/**
 * Returns true if `date` falls within the gold pass month/year.
 * Checks only the calendar month boundary (not time-of-day).
 */
function bpIsInGpMonth_(date, state) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;
  if (state.month < 0 || state.year <= 0) return false;
  return date.getMonth() === state.month && date.getFullYear() === state.year;
}

/* =========================
   ENSURE BASE COLUMN EXISTS
   Adds the hidden BP_BaseDuration column to a builder sheet
   the first time GP is activated. Safe to call repeatedly.
   Returns the 0-indexed column position of BP_BaseDuration.
   ========================= */

function bpEnsureBaseCol_(sheet, colMap, headers) {
  if (colMap[BP_BASE_HEADER] != null) return colMap[BP_BASE_HEADER];

  const newColIdx = headers.length;
  const newCol1   = headers.length + 1;
  sheet.getRange(1, newCol1).setValue(BP_BASE_HEADER);
  sheet.hideColumns(newCol1);
  SpreadsheetApp.flush();
  colMap[BP_BASE_HEADER] = newColIdx;
  return newColIdx;
}

/* =========================
   RECALCULATE ALL USER SHEETS
   Called after any tier change so the new multiplier (or
   the restored base durations on reset) propagates everywhere.
   ========================= */

function bpRecalcAllSheets_() {
  const ss = SpreadsheetApp.getActive();
  ss.getSheets().forEach(sheet => {
    if (sheet.getName().startsWith(builderPrefix_())) {
      recalculateBuilderDates_(sheet);
    }
  });
}

/* =========================
   WEBSITE APIs
   ========================= */

function battlePassStatus_API_() {
  const state = bpGetState_();
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                       'Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    level:     state.level,
    nextLevel: bpGetNextLevel_(state.level),
    label:     state.level + '%',
    month:     state.month,
    year:      state.year,
    active:    state.level > 0,
    monthName: state.month >= 0 ? MONTH_NAMES[state.month] : null
  };
}

function previewBattlePass_API_() {
  const state       = bpGetState_();
  const next        = bpGetNextLevel_(state.level);
  const now         = new Date();
  const previewMonth = state.level === 0 ? now.getMonth()     : state.month;
  const previewYear  = state.level === 0 ? now.getFullYear()  : state.year;
  const previewState = { month: previewMonth, year: previewYear };

  let count = 0;
  const ss = SpreadsheetApp.getActive();
  ss.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith(builderPrefix_())) return;
    const data    = sheet.getDataRange().getValues();
    const colMap  = buildColMap_(data[0]);
    const startCol = colMap["Start_DateTime"];
    if (startCol == null || data.length < 3) return;
    for (let i = 2; i < data.length; i++) {
      const start = data[i][startCol];
      if (bpIsInGpMonth_(start instanceof Date ? start : new Date(start), previewState)) count++;
    }
  });

  return {
    currentLevel:     state.level,
    nextLevel:        next,
    upgradesAffected: count,
    month:            previewMonth,
    year:             previewYear
  };
}

function applyBattlePass_API_() {
  const state   = bpGetState_();
  const current = state.level;
  const next    = bpGetNextLevel_(current);

  if (next === 0) {
    // Reset: clear state first, then recalculate (recalc will restore all bases)
    bpResetState_();
    bpRecalcAllSheets_();
    return { status: "reset", newLevel: 0 };
  }

  // On first activation (0→10), lock the current calendar month
  const now      = new Date();
  const newMonth = current === 0 ? now.getMonth()    : state.month;
  const newYear  = current === 0 ? now.getFullYear() : state.year;

  bpSetState_(next, newMonth, newYear);
  bpRecalcAllSheets_();

  return {
    status:    "applied",
    newLevel:  next,
    month:     newMonth,
    year:      newYear
  };
}
