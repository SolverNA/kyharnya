// ===================================================
//  calendar.js — Month calendar rendering & navigation
// ===================================================

/**
 * Re-renders the full calendar grid for the current `viewDate`.
 * Must be called after any data change.
 */
function render() {
    calculateStats(); // always recalculate streaks/stats first

    const grid     = document.getElementById("calendar");
    grid.innerHTML = "";

    const year     = viewDate.getFullYear();
    const month    = viewDate.getMonth();
    const todayKey = formatDate(new Date());

    document.getElementById("monthDisplay").innerText =
        new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(viewDate);

    _renderWeekdayHeaders(grid);
    _renderEmptyLeadCells(grid, year, month);
    _renderDayCells(grid, year, month, todayKey);
}

/**
 * Shifts the viewed month by `delta` months and re-renders.
 * @param {number} delta  +1 or -1
 */
function moveMonth(delta) {
    viewDate.setMonth(viewDate.getMonth() + delta);
    render();
}

/**
 * Formats a Date object as "YYYY-MM-DD".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ── Private helpers ──────────────────────────────────

function _renderWeekdayHeaders(grid) {
    ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].forEach(label => {
        const el        = document.createElement("div");
        el.className    = "weekday";
        el.innerText    = label;
        grid.appendChild(el);
    });
}

function _renderEmptyLeadCells(grid, year, month) {
    // getDay() returns 0=Sun…6=Sat; we want Monday-first, so shift
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDayOfWeek; i++) {
        grid.appendChild(document.createElement("div"));
    }
}

function _renderDayCells(grid, year, month, todayKey) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const key  = formatDate(new Date(year, month, d));
        const cell = _buildDayCell(key, d, todayKey);
        grid.appendChild(cell);
    }
}

/**
 * Builds and returns a single day <div> element.
 */
function _buildDayCell(key, dayNumber, todayKey) {
    const hasPlan = planData[key];
    const isFire  = fireDaysMap[key];

    // Find the chef of the approved post (if any)
    let approvedChef = null;
    if (globalData[key]) {
        Object.values(globalData[key]).forEach(p => {
            if (p.status === "approved") approvedChef = p.chef;
        });
    }

    const el = document.createElement("div");
    el.className = [
        "day",
        key === todayKey ? "today"    : "",
        approvedChef    ? "has-data"  : "",
        hasPlan         ? "planned"   : "",
        isFire          ? "is-fire"   : "",
    ].filter(Boolean).join(" ");

    // Inner content
    let html = `<span class="day-label">${dayNumber}</span>`;

    if (hasPlan && !approvedChef) {
        html += `<div class="plan-name">${hasPlan.chef}</div>`;
    }
    if (approvedChef) {
        html += `<div class="plan-name" style="color:#065f46">${approvedChef}</div>`;
    }
    if (isFire) {
        html += `<div class="fire-icon-day">🔥</div>`;
    }

    el.innerHTML = html;
    el.onclick   = () => openDay(key);

    return el;
}
