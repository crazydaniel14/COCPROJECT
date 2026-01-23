const API_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE?action=current_work";

fetch(API_URL)
  .then(r => r.json())
  .then(rows => {
    const tbody = document.querySelector("#boostTable tbody");

    rows.slice(1).forEach(row => {
      const tr = document.createElement("tr");

      if (row[5] === "FORCED") {
        tr.classList.add("forced");
      }

      row.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error(err);
    alert("Failed to load CURRENT WORK data");
  });
