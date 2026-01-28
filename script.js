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
   ⭐ BATTLE PASS HOVER
   ========================= */
function updateBattlePassHover() {
  const btn = document.getElementById("battlePassBtn");
  if (!btn) return;

  fetch(BATTLE_PASS_STATUS_ENDPOINT)
    .then(r => r.json())
    .then(data => {
      if (data.nextLevel === 0) {
        btn.title = "Reset Battle Pass to 0%";
      } else {
        btn.title = `Next: ${data.nextLevel}% reduction`;
      }
    })
    .catch(() => {
      btn.title = "Battle Pass Reduction";
    });
}

/* =========================
   DAILY BOOST UI LOCK
   ========================= */
const BOOST_KEY = "dailyBoostApplied";

function todayKeyNY() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York"
  });
}

function lockBoostButton(btn) {
  btn.disabled = true;
  btn.textContent = "Today’s boost applied ✅";
}

function unlockBoostButton(btn) {
  btn.disabled = false;
  btn.textContent = "Apply Today’s Boost";
}

/* =========================
   CANONICAL TABLE HEADERS
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
  updateBattlePassHover(); // ⭐ HOVER (page load)

  /* ---- APPLY DAILY BOOST ---- */
  const applyBtn = document.getElementById("applyBoostBtn");
  if (applyBtn) {
    if (localStorage.getItem(BOOST_KEY) === todayKeyNY()) {
      lockBoostButton(applyBtn);
    }

    applyBtn.addEventListener("click", function () {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying…";

      fetch(APPLY_BOOST_ENDPOINT)
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            alert("Boost failed: " + data.error);
            unlockBoostButton(applyBtn);
            return;
          }

          localStorage.setItem(BOOST_KEY, todayKeyNY());
          lockBoostButton(applyBtn);

          loadTodaysBoost();
          loadCurrentWorkTable();
          loadBoostPlan();
        })
        .catch(err => {
          console.error(err);
          alert("Failed to apply boost");
          unlockBoostButton(applyBtn);
        });
    });
  }

  /* ---- RUN BOOST SIMULATION ---- */
  const runSimBtn = document.getElementById("runBoostSimBtn");
  if (runSimBtn) {
    runSimBtn.addEventListener("click", function () {
      const originalText = runSimBtn.textContent;
      runSimBtn.disabled = true;
      runSimBtn.textContent = "Running simulation…";

      fetch(RUN_BOOST_SIM_ENDPOINT)
        .then(() => loadBoostPlan())
        .catch(err => {
          console.error(err);
          alert("Failed to run boost simulation");
        })
        .finally(() => {
          runSimBtn.disabled = false;
          runSimBtn.textContent = originalText;
        });
    });
  }

  /* ---- REFRESH BUTTON ---- */
  const refreshBtn = document.getElementById("refreshSheetBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      const originalText = refreshBtn.textContent;
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Refreshing…";

      fetch(REFRESH_ENDPOINT)
        .then(() => {
          updateLastRefreshed();
          loadTodaysBoost();
          loadCurrentWorkTable();
          loadBoostPlan();
        })
        .catch(err => {
          console.error(err);
          alert("Failed to refresh spreadsheet");
        })
        .finally(() => {
          refreshBtn.disabled = false;
          refreshBtn.textContent = originalText;
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

        const result = await (await fetch(BATTLE_PASS_APPLY_ENDPOINT)).json();

        alert(
          result.status === "reset"
            ? "Battle Pass reset to 0%"
            : `Applied ${result.newLevel}% reduction`
        );

        loadTodaysBoost();
        loadCurrentWorkTable();
        loadBoostPlan();
        updateBattlePassHover(); // ⭐ HOVER (after apply)
      } catch (err) {
        console.error(err);
        alert("Battle Pass action failed.");
      }
    });
  }
});
