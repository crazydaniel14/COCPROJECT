console.log("Loaded script.js version 7");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec";

const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";

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

      /* ----- HEADER (explicit, stable) ----- */
      const headerRow = document.createElement("tr");
      TABLE_HEADERS.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      /* ----- FIND EARLIEST FINISH ----- */
      const finishTimes = [];
      for (let i = 1; i < data.length; i++) {
        const d = new Date(data[i][2]);
        if (!isNaN(d)) finishTimes.push(d.getTime());
      }
      const earliestFinish = Math.min.apply(null, finishTimes);

      /* ----- ROWS ----- */
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const tr = document.createElement("tr");

        const rowFinish = new Date(row[2]).getTime();
        if (rowFinish === earliestFinish) {
          tr.classList.add("next-finish");
        }

        for (let c = 0; c < TABLE_HEADERS.length; c++) {
          const td = document.createElement("td");

          // FINISH TIME formatting
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
   PAGE LOAD + BUTTON
   ========================= */
document.addEventListener("DOMContentLoaded", function () {
  loadCurrentWorkTable();
  updateLastRefreshed();

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
        loadCurrentWorkTable();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to refresh spreadsheet");
      })
      .then(() => {
        // Safari-safe cleanup (no .finally)
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
      });
  });
});
