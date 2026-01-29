console.log("Loaded script.js version 21");

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

/* ---- BATTLE PASS ENDPOINTS (NEW) ---- */
const BATTLE_PASS_STATUS_ENDPOINT =
  API_BASE + "?action=battle_pass_status";
const BATTLE_PASS_PREVIEW_ENDPOINT =
  API_BASE + "?action=preview_battle_pass";
const BATTLE_PASS_APPLY_ENDPOINT =
  API_BASE + "?action=apply_battle_pass";

/* =========================
   BATTLE PASS HOVER (SAFE)
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
      // fallback if API fails
      btn.title = "Battle Pass Reduction";
    });
}

// Store today's boost info for UI use
let todaysBoostInfo = null;

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
  // Save boost info globally for builder cards
  if (data.builder && data.status) {
    todaysBoostInfo = {
      builder: data.builder.toString().replace(/[^0-9]/g, ""), // extract number
      status: data.status // SAFE or FORCED
    };
  } else {
    todaysBoostInfo = null;
  }

  // We no longer need a visible TODAY'S BOOST block
  const box = document.getElementById("todaysBoost");
  if (box) box.innerHTML = "";
})
    .catch(err => console.error("Failed to load today's boost", err));
}
/* =========================
   render info for builder card
   ========================= */
function renderBuilderCardsFromTableData(data) {
  const container = document.getElementById("builders-container");
  if (!container) return;

  container.innerHTML = "";
// Find earliest finish time
let earliestFinish = Infinity;
for (let i = 1; i < data.length; i++) {
  const t = new Date(data[i][2]).getTime();
  if (!isNaN(t) && t < earliestFinish) {
    earliestFinish = t;
  }
}


  // skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    let builderRaw = row[0] || "";
// Normalize builder name for display
let builderNumber = builderRaw
  .toString()
  .replace(/[^0-9]/g, ""); // extract number
const builderName = builderNumber
  ? `BUILDER ${builderNumber}`
  : "BUILDER";

    const currentUpgrade = row[1] || "";
    const finishTimeRaw = row[2] || "";
    const timeLeft = row[3] || "";
    const nextUpgrade = row[4] || "";

    let finishFormatted = "";
    if (finishTimeRaw) {
      const d = new Date(finishTimeRaw);
      if (!isNaN(d)) {
        finishFormatted = d.toLocaleString("en-US", {
          timeZone: "America/New_York",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
      }
    }

   const card = document.createElement("div");
   card.className = "builder-card";
   const finishTimeMs = new Date(finishTimeRaw).getTime();
   if (!isNaN(finishTimeMs) && finishTimeMs === earliestFinish) {
   card.classList.add("next-finish");
   }


    let apprenticeBadge = "";

// Check if this builder gets today's boost
if (
  todaysBoostInfo &&
  todaysBoostInfo.builder === builderNumber
) {
  const badgeImg =
    todaysBoostInfo.status === "FORCED"
      ? "Images/Builder Apprentice Forced.png"
      : "Images/Builder Apprentice Safe.png";

// BUILDER APPRENTICE
   apprenticeBadge = `
    <img
      src="${badgeImg}"
      class="apprentice-badge"
      alt="Today's Boost"
    />
  `;
}

card.innerHTML = `
  ${apprenticeBadge}

  <img src="Images/Builder.png" class="builder-character" />

  <div class="builder-text">
    <div class="builder-name">${builderName}</div>
    <div class="builder-upgrade">${currentUpgrade}</div>
    <div class="builder-time-left">${timeLeft}</div>
    <div class="builder-finish">Finishes: ${finishFormatted}</div>
    <div class="builder-next">▶ Next: ${nextUpgrade}</div>
  </div>
`;

    container.appendChild(card);
  }
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
      // NEW: render builder cards from same data
      renderBuilderCardsFromTableData(data);
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
   AUTO REFRESH (EVERY 45 sec)
   ========================= */
function startAutoRefresh() {
  setInterval(async () => {
    console.log("Auto-refreshing dashboard data…");

    try {
      // 1️⃣ Force spreadsheet recalculation
      await fetch(REFRESH_ENDPOINT);

      // 2️⃣ Re-fetch updated data
      loadTodaysBoost();
      loadCurrentWorkTable();
      loadBoostPlan();
      updateLastRefreshed();
      updateBattlePassHover();

    } catch (err) {
      console.error("Auto-refresh failed", err);
    }

  }, 45 * 1000); // 45 seconds
}
let isRefreshing = false;

function startAutoRefresh() {
  setInterval(async () => {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
      console.log("Auto-refreshing dashboard data…");
      await fetch(REFRESH_ENDPOINT);

      loadTodaysBoost();
      loadCurrentWorkTable();
      loadBoostPlan();
      updateLastRefreshed();
      updateBattlePassHover();
    } finally {
      isRefreshing = false;
    }
  }, 45 * 1000);
}
/* =========================
   PAGE LOAD + BUTTONS
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  loadTodaysBoost();
  loadCurrentWorkTable();
  loadBoostPlan();
  updateLastRefreshed();
  updateBattlePassHover();
  startAutoRefresh();


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

  /*****************************************************
   * BATTLE PASS BUTTON (NEW)
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
        updateBattlePassHover();
      } catch (err) {
        console.error(err);
        alert("Battle Pass action failed.");
      }
    });
  }
});
