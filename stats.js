// ===================================================
//  stats.js — Streak calculation & leaderboard logic
//
//  Note: calculateStats() now only sees data for the
//  currently loaded month (globalData + planData).
//  The streak counter in the header always shows the
//  streak for the viewed month — this is intentional
//  and consistent with the per-month data loading.
// ===================================================

/**
 * Walks all dates in globalData + planData chronologically,
 * computes fire-days map, current streak, and aggregated stats.
 * Writes results into `window.appStats` and `fireDaysMap`.
 */
function calculateStats() {
    let currentStreak = 0;

    const balanceCounts = {};
    CHEFS.forEach(c => { balanceCounts[c] = 0; });

    const chefCounts = {};
    CHEFS.forEach(c => { chefCounts[c] = 0; });

    const userPosts = {};
    const userVotes = {};

    fireDaysMap = {};

    const allDates    = new Set([...Object.keys(globalData), ...Object.keys(planData)]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
        const posts        = globalData[date] ? Object.values(globalData[date]) : [];
        const approvedPost = posts.find(p => p.status === "approved");

        posts.forEach(p => {
            if (p.status !== "approved") return;

            chefCounts[p.chef]  = (chefCounts[p.chef]  || 0) + 1;
            userPosts[p.author] = (userPosts[p.author] || 0) + 1;

            if (p.votes) {
                Object.values(p.votes).forEach(v => {
                    userVotes[v.name] = (userVotes[v.name] || 0) + 1;
                });
            }
        });

        let contributesToStreak = false;

        if (approvedPost) {
            balanceCounts[approvedPost.chef]++;
            contributesToStreak = true;
        }

        const counts    = Object.values(balanceCounts);
        const balanceOk = Math.max(...counts) - Math.min(...counts) <= 1;

        if (!balanceOk) {
            currentStreak     = 0;
            fireDaysMap[date] = false;
            return;
        }

        if (planData[date] && !approvedPost) {
            contributesToStreak = false;
        }

        if (contributesToStreak) {
            fireDaysMap[date] = true;
            currentStreak++;
        }
    });

    const el = document.getElementById("fireStats");
    if (el) el.innerText = `🔥 ${currentStreak}`;

    window.appStats = { chefCounts, userPosts, userVotes };
}

/**
 * Returns chef leaderboard sorted by cook count descending.
 * @returns {{ chef: string, count: number }[]}
 */
function getLeaderboard() {
    if (!window.appStats) return [];
    return Object.entries(window.appStats.chefCounts)
    .map(([chef, count]) => ({ chef, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Opens and populates the statistics modal.
 */
function openStats() {
    if (!currentUser) return;

    const modal = document.getElementById("statsModal");
    const table = document.getElementById("statsTable");
    const s     = window.appStats;

    const allNames = new Set([
        ...CHEFS,
        ...Object.keys(s.userPosts),
                             ...Object.keys(s.userVotes),
    ]);

    let html = `<tr><th>Имя</th><th>Готовил</th><th>Посты</th><th>Голоса</th></tr>`;

    allNames.forEach(name => {
        html += `
        <tr>
        <td><b>${name}</b></td>
        <td>${s.chefCounts[name] || 0}</td>
        <td>${s.userPosts[name]  || 0}</td>
        <td>${s.userVotes[name]  || 0}</td>
        </tr>`;
    });

    table.innerHTML = html;
    modal.style.display = "flex";
}
