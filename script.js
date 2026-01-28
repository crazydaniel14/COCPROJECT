console.log("Loaded script.js version 13");

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
const BATTLE_PASS_STATUS_ENDPOINT = API_BASE + "?action=battle_pass_status";
const BATTLE_PASS_PREVIEW_ENDPOINT = API_BASE + "?action=preview_battle_pass";
const BATTLE_PASS_APPLY_ENDPOINT = API_BASE + "?action=apply_battle_pass";


/* =========================
   BATTLE PASS BUTTON
   ========================= */

const battlePassBtn = document.getElementById("battlePassBtn");

if (battlePassBtn) {
  battlePassBtn.addEventListener("click", async () => {
    battlePassBtn.style.pointerEvents = "none";
    battlePassBtn.style.opacity = "0.6";

    try {
      // 1️⃣ Get current state
      const statusRes = await fetch(BATTLE_PASS_STATUS_ENDPOINT);
      const status = await statusRes.json();

      // 2️⃣ Preview
      const previewRes = await fetch(BATTLE_PASS_PREVIEW_ENDPOINT);
      const preview = await previewRes.json();

      const message =
        `Battle Pass Reduction\n\n` +
        `Current: ${status.currentLevel}%\n` +
        `Next: ${status.nextLevel}%\n\n` +
        `Upgrades affected this month: ${preview.upgradesAffected}\n\n` +
        `Do you want to proceed?`;

      if (!confirm(message)) return;

      // 3️⃣ Apply
      const applyRes = await fetch(BATTLE_PASS_APPLY_ENDPOINT);
      const result = await applyRes.json();

      if (result.status === "reset") {
        alert("Battle Pass reductions reset to 0%.");
      } else {
        alert(
          `Applied ${result.newLevel}% reduction.\n` +
          `Upgrades affected: ${result.affectedUpgrades}`
        );
      }

      // 4️⃣ Refresh UI
      loadCurrentWorkTable();
      loadBoostPlan();
      loadTodaysBoost();

    } catch (err) {
      console.error(err);
      alert("Failed to apply Battle Pass reduction.");
    } finally {
      battlePassBtn.style.pointerEvents = "auto";
      battlePassBtn.style.opacity = "1";
    }
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
   LAST REFRESHED
   ========================= */
function updateLastRefreshed() {
  const el = document.getElementById("lastRefreshed");
  if (!el) return;

  const now = new Date();
  el.textContent =
    "Last refreshed: " +
    now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
}

/* =========================
   TODAY'S BOOST
   ========================= */
function loadTodaysBoost() {
  fetch(TODAYS_BOOST_ENDPOINT)
    .then(r => r.json())
    .then(data => {
      const box = document.getElementById("todaysBoost");
      if (!box) return;

      box.innerHTML = `
        <h3>TODAY’S BOOST</h3>
        <div><strong>Upgrade:</strong> ${data.upgrade || "-"}</div>
        <div><strong>Builder:</strong> ${data.builder || "-"}</div>
        <div><strong>Status:</strong> ${data.status || "-"}</div>
        ${
          data.warning
            ? `<div style="margin-top:6px;font-weight:bold;">⚠ ${data.warning}</div>`
            : ""
        }
      `;
    })
    .catch(err => console.error("Failed to load today's boost", err));
}

/* =========================
   LOAD CURRENT WORK TABLE
   ========================= */
function loadCurrentWorkTable() {
  fetch(TABLE_ENDPOINT)
    .then(r => r.json())
    .then(data => {
      const thead = document.querySelector("#builderTable thead");
      const tbody = document.querySelector("#builderTable tbody");
      if (!thead || !tbody) return;

      thead.innerHTML = "";
      tbody.innerHTML = "";

      const headerRow = document.createElement("tr");
      TABLE_HEADERS.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const finishTimes = [];
      for (let i = 1; i < data.length; i++) {
        const d = new Date(data[i][2]);
        if (!isNaN(d)) finishTimes.push(d.getTime());
      }
      const earliestFinish = Math.min(...finishTimes);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const tr = document.createElement("tr");

        if (new Date(row[2]).getTime() === earliestFinish) {
          tr.classList.add("next-finish");
        }

        for (let c = 0; c < TABLE_HEADERS.length; c++) {
          const td = document.createElement("td");

          if (c === 2 && row[c]) {
            const date = new Date(row[c]);
            td.textContent = date.toLocaleString("en-US", {
              timeZone: "America/New_York",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            });
          } else {
            td.textContent = row[c] || "";
          }

          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load CURRENT WORK table");
    });
}

/* =========================
   LOAD BOOST PLAN TABLE
   ========================= */
function loadBoostPlan() {
  fetch(BOOST_PLAN_ENDPOINT)
    .then(r => r.json())
    .then(data => {
      const table = document.getElementById("boost-plan-table");
      if (!table) return;

      table.innerHTML = "";

      data.table.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        row.forEach(cell => {
          const el = document.createElement(rowIndex === 0 ? "th" : "td");
          el.textContent = cell;

          if (cell === "SAFE") el.classList.add("safe");
          if (cell === "FORCED") el.classList.add("forced");

          tr.appendChild(el);
        });

        table.appendChild(tr);
      });
    })
    .catch(err => console.error("Failed to load boost plan", err));
}

/* =========================
   PAGE LOAD + BUTTONS
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  loadTodaysBoost();
  loadCurrentWorkTable();
  loadBoostPlan();
  updateLastRefreshed();

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
   * SHARED MODAL — BUILDER POTION + 1-HOUR BOOST
   *****************************************************/
  const builderPotionModal = document.getElementById("builderPotionModal");
  const potionCountInput = document.getElementById("potionCount");
  const previewPotionBtn = document.getElementById("previewPotionBtn");
  const confirmPotionBtn = document.getElementById("confirmPotionBtn");
  const cancelPotionBtn = document.getElementById("cancelPotionBtn");
  const previewBox = document.getElementById("builderPotionPreview");

  const builderPotionBtn = document.getElementById("builderPotionBtn");
  const oneHourBoostBtn = document.getElementById("oneHourBoostBtn");

  let currentPreviewAction = null;
  let currentApplyAction = null;

  if (!builderPotionBtn) return;

  // ---- OPEN MODAL (Builder Potion) ----
  builderPotionBtn.addEventListener("click", () => {
    currentPreviewAction = "preview_builder_potion";
    currentApplyAction = "apply_builder_potion";

    builderPotionModal.classList.remove("hidden");
    previewBox.innerHTML = "";
    confirmPotionBtn.disabled = true;
  });

  // ---- OPEN MODAL (1-Hour Boost) ----
  if (oneHourBoostBtn) {
    oneHourBoostBtn.addEventListener("click", () => {
      currentPreviewAction = "preview_one_hour_boost";
      currentApplyAction = "apply_one_hour_boost";

      builderPotionModal.classList.remove("hidden");
      previewBox.innerHTML = "";
      confirmPotionBtn.disabled = true;
    });
  }

  cancelPotionBtn.addEventListener("click", () => {
    builderPotionModal.classList.add("hidden");
  });

  previewPotionBtn.addEventListener("click", async () => {
    const times = Number(potionCountInput.value);
    if (!times || times <= 0) {
      alert("Please select a valid amount.");
      return;
    }

    previewBox.innerHTML = "Loading preview…";

    try {
      const res = await fetch(
        `${API_BASE}?action=${currentPreviewAction}&times=${times}`
      );
      const data = await res.json();

      let html = `<strong>Applying ${times} boost(s):</strong><br><br>`;
      data.preview.forEach(row => {
        html += `
          ${row.builder}:<br>
          ${new Date(row.oldTime).toLocaleString()} →
          ${new Date(row.newTime).toLocaleString()}<br><br>
        `;
      });

      previewBox.innerHTML = html;
      confirmPotionBtn.disabled = false;
    } catch (err) {
      console.error(err);
      previewBox.innerHTML = "Failed to load preview.";
    }
  });

  confirmPotionBtn.addEventListener("click", async () => {
    const times = Number(potionCountInput.value);
    confirmPotionBtn.disabled = true;
    previewBox.innerHTML = "Applying…";

    try {
      await fetch(
        `${API_BASE}?action=${currentApplyAction}&times=${times}`
      );

      previewBox.innerHTML = "Boost applied ✅";
      loadTodaysBoost();
      loadCurrentWorkTable();
      loadBoostPlan();

      setTimeout(() => {
        builderPotionModal.classList.add("hidden");
      }, 800);
    } catch (err) {
      console.error(err);
      previewBox.innerHTML = "Failed to apply boost.";
    }
  });
});
