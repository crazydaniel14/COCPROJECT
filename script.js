console.log("Loaded script.js version 15");

/* =========================
   CONFIG (DEFINE FIRST)
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec";

const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";
const TODAYS_BOOST_ENDPOINT = API_BASE + "?action=todays_boost";
const APPLY_BOOST_ENDPOINT = API_BASE + "?action=apply_todays_boost";
const BOOST_PLAN_ENDPOINT = API_BASE + "?action=boost_plan";
const RUN_BOOST_SIM_ENDPOINT = API_BASE + "?action=run_boost_simulation";

/* ---- BATTLE PASS ENDPOINTS ---- */
const BATTLE_PASS_STATUS_ENDPOINT =
  API_BASE + "?action=battle_pass_status";
const BATTLE_PASS_PREVIEW_ENDPOINT =
  API_BASE + "?action=preview_battle_pass";
const BATTLE_PASS_APPLY_ENDPOINT =
  API_BASE + "?action=apply_battle_pass";

/* =========================
   DAILY BOOST UI LOCK
   ========================= */
const BOOST_KEY = "dailyBoostApplied";

function todayKeyNY() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York"
  });
}

/* =========================
   ⭐ BATTLE PASS LABEL
   ========================= */
function loadBattlePassStatus() {
  const label = document.getElementById("battlePassLabel");
  if (!label) return;

  fetch(BATTLE_PASS_STATUS_ENDPOINT)
    .then(r => r.json())
    .then(data => {
      label.textContent = `${data.currentLevel}%`;
    })
    .catch(() => {
      label.textContent = "—";
    });
}

/* =========================
   TABLE HEADERS
   ========================= */
const TABLE_HEADERS = [
  "BUILDER",
  "CURRENT UPGRADE",
  "FINISH TIME",
  "Time left of upgrade",
  "NEXT UPGRADE"
];

/* =========================
   PAGE LOAD + BUTTONS
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  loadTodaysBoost();
  loadCurrentWorkTable();
  loadBoostPlan();
  updateLastRefreshed();
  loadBattlePassStatus(); // ⭐ NEW

  /* ---- APPLY DAILY BOOST ---- */
  const applyBtn = document.getElementById("applyBoostBtn");
  if (applyBtn) {
    if (localStorage.getItem(BOOST_KEY) === todayKeyNY()) {
      applyBtn.disabled = true;
      applyBtn.textContent = "Today’s boost applied ✅";
    }

    applyBtn.addEventListener("click", function () {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying…";

      fetch(APPLY_BOOST_ENDPOINT)
        .then(r => r.json())
        .then(() => {
          localStorage.setItem(BOOST_KEY, todayKeyNY());
          applyBtn.textContent = "Today’s boost applied ✅";

          loadTodaysBoost();
          loadCurrentWorkTable();
          loadBoostPlan();
        })
        .catch(() => {
          applyBtn.disabled = false;
          applyBtn.textContent = "Apply Today’s Boost";
        });
    });
  }

  /* ---- RUN BOOST SIMULATION ---- */
  const runSimBtn = document.getElementById("runBoostSimBtn");
  if (runSimBtn) {
    runSimBtn.addEventListener("click", function () {
      runSimBtn.disabled = true;
      runSimBtn.textContent = "Running simulation…";

      fetch(RUN_BOOST_SIM_ENDPOINT)
        .then(() => loadBoostPlan())
        .finally(() => {
          runSimBtn.disabled = false;
          runSimBtn.textContent = "Run Boost Simulation";
        });
    });
  }

  /*****************************************************
   * BATTLE PASS BUTTON
   *****************************************************/
  const battlePassBtn = document.getElementById("battlePassBtn");

  if (battlePassBtn) {
    battlePassBtn.addEventListener("click", async () => {
      try {
        const status = await (await fetch(BATTLE_PASS_STATUS_ENDPOINT)).json();
        const preview = await (await fetch(BATTLE_PASS_PREVIEW_ENDPOINT)).json();

        const msg =
          `Battle Pass Reduction\n\n` +
          `Current: ${status.currentLevel}%\n` +
          `Next: ${status.nextLevel}%\n\n` +
          `Upgrades affected this month: ${preview.upgradesAffected}\n\n` +
          `Proceed?`;

        if (!confirm(msg)) return;

        await fetch(BATTLE_PASS_APPLY_ENDPOINT);

        loadCurrentWorkTable();
        loadBoostPlan();
        loadBattlePassStatus(); // ⭐ NEW
      } catch (err) {
        console.error(err);
        alert("Battle Pass action failed.");
      }
    });
  }
});
