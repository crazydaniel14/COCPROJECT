console.log("Loaded script.js version 4");

/* =========================
   CONFIG
   ========================= */
const API_BASE =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec";

const TABLE_ENDPOINT = API_BASE + "?action=current_work_table";
const REFRESH_ENDPOINT = API_BASE + "?action=refresh_sheet";

/* =========================
   LAST REFRESHED INDICATOR
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
    .then(response => response.json())
    .then(data => {
      const thead = document.querySelector("#builderTable thead");
      const tbody = document.querySelector("#builderTable tbody");

      if (!thead || !tbody) {
        console.error("Table elements not found");
        return;
      }

      thead.innerHTML = "";
      tbody.innerHTML = "";

      /* ----- HEADER ----- */
      const headerRow = document.createElement("tr");
      data[0].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
/* ----- ROWS ----- */

// Collect finish times first
const finishTimes = data.slice(1)
  .map(row => new Date(row[2]))
  .filter(d => !isNaN(d));

// Find earliest finish time
const earliestFinish = new Date(Math.min(...finishTimes));

data.slice(1).forEach(row => {
  const tr = document.createElement("tr");

  const rowFinish = new Date(row[2]);

  // Highlight if this is the earliest finish
  if (rowFinish.getTime() === earliestFinish.getTime()) {
    tr.classList.add("next-finish");
  }

  row.forEach((cell, colIndex) => {
    const td = document.createElement("td");

    // FINISH TIME formatting
    if (colIndex === 2 && cell) {
      const date = new Date(cell);
      td.textContent = date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } else {
      td.textContent = cell;
    }

    tr.appendChild(td);
  });

  tbody.appendChild(tr);
});

/* =========================
   PAGE LOAD + BUTTON WIRING
   ========================= */
document.addEventListener("DOMContentLoaded", () => {

  // Initial load
  loadCurrentWorkTable();
  updateLastRefreshed();

  const refreshBtn = document.getElementById("refreshSheetBtn");

  if (!refreshBtn) {
    console.error("Refresh button not found");
    return;
  }

  refreshBtn.addEventListener("click", () => {
    console.log("Refresh button clicked");

    fetch(REFRESH_ENDPOINT)
      .then(r => r.json())
      .then(() => {
        updateLastRefreshed();
        loadCurrentWorkTable();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to refresh spreadsheet");
      });
  });

});
