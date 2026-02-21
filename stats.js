// ===================================================
//  stats.js — Streak calculation & leaderboard logic
// ===================================================

/**
 * Walks all dates from globalData + planData in chronological order,
 * computes the fire-days map and current streak count,
 * and saves aggregated stats into `window.appStats`.
 *
 * Side-effects:
 *   - Populates global `fireDaysMap`
 *   - Updates the 🔥 counter in the header
 *   - Writes `window.appStats` for use by openStats() and getLeaderboard()
 */
function calculateStats() {
    let currentStreak = 0;

    // Balance counters — how many times each chef cooked
    const balanceCounts = {};
    CHEFS.forEach(c => { balanceCounts[c] = 0; });

    // Aggregates for the stats modal
    const chefCounts = {};
    CHEFS.forEach(c => { chefCounts[c] = 0; });

    const userPosts = {};  // author → post count
    const userVotes = {};  // voter name → vote count

    fireDaysMap = {}; // reset global

    // Merge all known date keys and sort chronologically
    const allDates    = new Set([...Object.keys(globalData), ...Object.keys(planData)]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
        const posts       = globalData[date] ? Object.values(globalData[date]) : [];
        const approvedPost = posts.find(p => p.status === "approved");

        // ── Aggregate stats for modal ──
        posts.forEach(p => {
            if (p.status !== "approved") return;

            chefCounts[p.chef] = (chefCounts[p.chef] || 0) + 1;
            userPosts[p.author] = (userPosts[p.author] || 0) + 1;

            if (p.votes) {
                Object.values(p.votes).forEach(v => {
                    userVotes[v.name] = (userVotes[v.name] || 0) + 1;
                });
            }
        });

        // ── Streak & fire-day logic ──
        let contributesToStreak = false;

        if (approvedPost) {
            balanceCounts[approvedPost.chef]++;
            contributesToStreak = true;
        }

        // Check balance: no chef should be ahead of others by more than 1
        const counts = Object.values(balanceCounts);
        const diff   = Math.max(...counts) - Math.min(...counts);
        const balanceOk = diff <= 1;

        if (!balanceOk) {
            currentStreak = 0;
            fireDaysMap[date] = false;
            return; // skip rest for this date
        }

        const plan = planData[date];
        if (plan && !approvedPost) {
            // Planned but not yet cooked — no fire yet
            contributesToStreak = false;
        }

        if (contributesToStreak) {
            fireDaysMap[date] = true;
            currentStreak++;
        }
    });

    document.getElementById("fireStats").innerText = `🔥 ${currentStreak}`;

    // Expose for other modules
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
