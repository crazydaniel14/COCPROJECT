console.log("Loaded script.js version 11");

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
    .catch(err => {
      console.error("Failed to load today's boost", err);
    });
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
      const earliestFinish = Math.min.apply(null, finishTimes);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const tr = document.createElement("tr");

        const rowFinish = new Date(row[2]).getTime();
        if (rowFinish === earliestFinish) {
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
    .catch(err => {
      console.error("Failed to load boost plan", err);
    });
}

/* =========================
   PAGE LOAD + BUTTONS
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  loadTodaysBoost();
  loadCurrentWorkTable();
  loadBoostPlan();
  updateLastRefreshed();

  /* ---- APPLY BOOST BUTTON ---- */
  const applyBtn = document.getElementById("applyBoostBtn");
  if (applyBtn) {

    // 🔄 Restore lock if boost already used today
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

          // 🔒 Save daily lock
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

   /* ---- RUN BOOST SIMULATION BUTTON ---- */
const runSimBtn = document.getElementById("runBoostSimBtn");
if (runSimBtn) {
  runSimBtn.addEventListener("click", function () {
    const originalText = runSimBtn.textContent;
    runSimBtn.disabled = true;
    runSimBtn.textContent = "Running simulation…";

    fetch(RUN_BOOST_SIM_ENDPOINT)
      .then(r => r.json())
      .then(() => {
        loadBoostPlan(); // refresh the mirrored table
      })
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
  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", function () {
    const originalText = refreshBtn.textContent;
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing…";

    fetch(REFRESH_ENDPOINT)
      .then(r => r.json())
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
      .then(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
      });
  });
});
