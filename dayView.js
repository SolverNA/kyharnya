// ===================================================
//  dayView.js — Day panel: open, actions, planning, posts
// ===================================================

/**
 * Opens the day panel for the given date key ("YYYY-MM-DD").
 * @param {string} key
 */
function openDay(key) {
    selectedKey = key;

    const todayKey = formatDate(new Date());
    const panel    = document.getElementById("dayView");

    panel.hidden = false;
    document.getElementById("selectedDateTitle").innerText =
        key === todayKey ? "Сегодня" : key;
    document.getElementById("uploadForm").style.display = "none";
    document.getElementById("planForm").style.display   = "none";

    _renderLeaderboard();
    _renderActions(key, todayKey);
    updateHistory();
}

/**
 * Shows the plan-chef selection form inside the day panel.
 */
function showPlanForm() {
    const form   = document.getElementById("planForm");
    const select = document.getElementById("planChefSelect");

    form.style.display = "block";
    select.innerHTML   =
        CHEFS.map(c => `<option value="${c}">${c}</option>`).join("") +
        `<option value="">-- Сбросить --</option>`;
}

/**
 * Saves (or removes) the plan for the currently selected day.
 */
function savePlan() {
    const chef = document.getElementById("planChefSelect").value;
    const ref  = db.ref("planning/" + selectedKey);

    (chef ? ref.set({ chef }) : ref.remove()).then(() => {
        document.getElementById("planForm").style.display = "none";
        // Small delay so the DB update is reflected before re-opening
        setTimeout(() => openDay(selectedKey), 200);
    });
}

// ── Private helpers ──────────────────────────────────

/** Renders the small leaderboard bar at the top of the day panel. */
function _renderLeaderboard() {
    const medals = ["🥇", "🥈", "🥉"];
    document.getElementById("dayLeaderboard").innerHTML =
        getLeaderboard()
            .map((s, i) => `<span>${medals[i] || ""} <b>${s.chef}</b>: ${s.count}</span>`)
            .join(" | ");
}

/**
 * Renders the correct action button(s) depending on which day is selected
 * and whether the user is logged in.
 *
 * @param {string} key       Selected date key
 * @param {string} todayKey  Today's date key
 */
function _renderActions(key, todayKey) {
    const actions = document.getElementById("actionContainer");

    if (!currentUser) {
        actions.innerHTML = `
            <div style="background:#fef2f2; color:var(--danger); padding:12px; border-radius:12px; text-align:center;">
                Нужно войти
            </div>`;
        return;
    }

    // Calculate offset in days from today
    const selDate  = new Date(key);
    const todayDate = new Date(todayKey);
    const diffDays  = Math.ceil((selDate - todayDate) / (1000 * 60 * 60 * 24));

    if (key === todayKey) {
        _renderTodayActions(key);

    } else if (diffDays > 0 && diffDays <= PLAN_AHEAD_DAYS) {
        const planInfo = planData[key]
            ? `<div style="text-align:center; margin-top:5px; font-size:12px;">План: <b>${planData[key].chef}</b></div>`
            : "";
        actions.innerHTML = `<button class="btn-plan" onclick="showPlanForm()">📅 ЗАПЛАНИРОВАТЬ</button>${planInfo}`;

    } else {
        actions.innerHTML = `
            <div style="text-align:center; color:#94a3b8; font-size:12px;">Только просмотр</div>`;
    }
}

/** Renders action UI specifically for today. */
function _renderTodayActions(key) {
    const actions = document.getElementById("actionContainer");
    const posts   = globalData[key] || {};
    const hasApproved = Object.values(posts).some(p => p.status === "approved");

    if (hasApproved) {
        actions.innerHTML = `
            <div style="text-align:center; color:var(--success); font-weight:bold; padding:10px;">
                ✅ Сегодня уже готовили
            </div>`;
    } else {
        actions.innerHTML = `<button class="btn-camera" onclick="openCamera()">📸 СДЕЛАТЬ ФОТО</button>`;
    }

    // Pre-fill the chef selector
    const select = document.getElementById("chefSelect");
    select.innerHTML = CHEFS.map(c => `<option value="${c}">${c}</option>`).join("");

    if (currentRole && CHEFS.includes(currentRole)) select.value = currentRole;
    if (planData[key]) select.value = planData[key].chef;
}
