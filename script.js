console.log("Loaded script.js version 2");

const API_URL =
  "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec?action=current_work_table";

fetch(API_URL)
  .then(response => response.json())
  .then(data => {
    const thead = document.querySelector("#builderTable thead");
    const tbody = document.querySelector("#builderTable tbody");

    // ----- HEADER -----
    const headerRow = document.createElement("tr");
    data[0].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // ----- ROWS -----
    data.slice(1).forEach(row => {
      const tr = document.createElement("tr");
row.forEach((cell, colIndex) => {
  const td = document.createElement("td");

  // FINISH TIME column (index 2)
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
  })
  .catch(error => {
    console.error(error);
    alert("Failed to load CURRENT WORK table");
  });
document
  .getElementById("refreshSheetBtn")
  .addEventListener("click", () => {

    // Call Apps Script to refresh the spreadsheet
    fetch(
      "https://script.google.com/macros/s/AKfycbycmSvqeMj_GpuALxs8HTEf5GiI09nQI6fm04RtsA3stKbSW-d6zbm8bzWNWszl1GzQpw/exec?action=refresh_sheet"
    )
      .then(response => response.json())
      .then(() => {
        // After spreadsheet refresh, reload the table
        loadCurrentWorkTable();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to refresh spreadsheet");
      });

  });

