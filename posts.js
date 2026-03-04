// ===================================================
//  posts.js — Post history rendering & voting logic
// ===================================================

// Inline SVG placeholder — не зависит ни от каких файлов на сервере
const PLACEHOLDER_IMG = "img/placeholder.png"

/**
 * Возвращает валидный src для img — если поле пустое/undefined/битое, возвращает placeholder.
 * @param {string|null|undefined} img
 * @returns {string}
 */
function _getSafeSrc(img) {
    if (!img) return PLACEHOLDER_IMG;
    if (img === "undefined") return PLACEHOLDER_IMG;
    if (img === "null") return PLACEHOLDER_IMG;
    if (img.trim() === "") return PLACEHOLDER_IMG;
    return img;
}

/**
 * Re-renders the post list for `selectedKey`.
 * Called every time globalData changes or the day panel opens.
 */
function updateHistory() {
    const postsObj = globalData[selectedKey] || {};

    // Convert to array, newest first
    const posts = Object.entries(postsObj)
        .map(([key, val]) => ({ ...val, key }))
        .reverse();

    document.getElementById("postHistory").innerHTML =
        posts.map(post => _buildPostHTML(post)).join("");
}

/**
 * Casts a vote for a post using a Firebase transaction.
 * Automatically resolves the post once VOTE_THRESHOLD votes accumulate.
 *
 * @param {string} dateKey
 * @param {string} postKey
 * @param {"like"|"dislike"} type
 */
function vote(dateKey, postKey, type) {
    if (!currentUser) return;

    db.ref(`cook_posts/${dateKey}/${postKey}`).transaction(post => {
        if (!post || post.status !== "pending") return post;

        if (!post.votes) post.votes = {};

        post.votes[currentUser.uid] = {
            val:   type,
            name:  currentRole || currentUser.displayName,
            photo: currentUser.photoURL,
        };

        const votes    = Object.values(post.votes);
        const likes    = votes.filter(v => v.val === "like").length;
        const dislikes = votes.filter(v => v.val === "dislike").length;

        if (likes    >= VOTE_THRESHOLD) post.status = "approved";
        if (dislikes >= VOTE_THRESHOLD) post.status = "rejected";

        return post;
    }, err => {
        if (err) alert("Ошибка голосования");
    });
}

/**
 * Toggles the expanded/collapsed state of a rejected post card.
 * @param {string} key  Firebase post key
 */
function togglePost(key) {
    const el      = document.getElementById(`post-${key}`);
    const content = el.querySelector(".post-body");

    el.classList.toggle("expanded");
    content.style.display = content.style.display === "none" ? "block" : "none";
}

// ── Private helpers ──────────────────────────────────

/**
 * Builds the full HTML string for a single post card.
 */
function _buildPostHTML(post) {
    const votes    = post.votes || {};
    const ups      = Object.values(votes).filter(v => v.val === "like").length;
    const downs    = Object.values(votes).filter(v => v.val === "dislike").length;
    const status   = post.status || "pending";
    const isAuthor = currentUser && post.authorId === currentUser.uid;

    const statusMeta  = _getStatusMeta(status);
    const isCollapsed = status === "rejected";
    const imgSrc      = _getSafeSrc(post.img);

    return `
        <div class="post-item ${_postClass(status)}" id="post-${post.key}">

            ${status === "rejected" ? `
                <div class="post-header" onclick="togglePost('${post.key}')">
                    <span>🚫 Отклонено (${post.chef})</span>
                    <span>▼</span>
                </div>` : ""}

            <div class="post-body" style="${isCollapsed ? "display:none" : ""}">
                <div style="position:relative;">
                    <img src="${imgSrc}"
                         alt=""
                         onerror="this.src='${PLACEHOLDER_IMG}'"
                         style="width:100%; display:block;">
                    <div class="status-badge" style="background:${statusMeta.color}">
                        ${statusMeta.label}
                    </div>
                </div>

                <div style="padding:12px; font-size:14px;">
                    <b>${post.chef}</b> готовил(а)<br>
                    <span style="font-size:11px; color:#64748b;">👤 ${post.author} • ⏰ ${post.time}</span>
                </div>

                ${(status === "pending" && currentUser && !isAuthor) ? _buildVoteActions(post.key, ups, downs, votes) : ""}

                ${(status !== "pending" || isAuthor) ? _buildVoteSummary(ups, downs, status, isAuthor) : ""}
            </div>
        </div>`;
}

/**
 * Returns the CSS class modifier for a given post status.
 */
function _postClass(status) {
    return {
        approved: "post-green-seq",
        pending:  "post-pending",
        rejected: "post-rejected",
    }[status] || "";
}

/**
 * Returns display metadata for a status.
 */
function _getStatusMeta(status) {
    const map = {
        approved: { label: "ОДОБРЕН",        color: "#10b981" },
        rejected: { label: "ОТКЛОНЕН",       color: "#ef4444" },
        pending:  { label: "На голосовании", color: "#94a3b8" },
    };
    return map[status] || map.pending;
}

/**
 * Builds the vote action buttons HTML.
 */
function _buildVoteActions(postKey, ups, downs, votes) {
    const likeAvatars    = _buildAvatarStack(votes, "like");
    const dislikeAvatars = _buildAvatarStack(votes, "dislike");

    return `
        <div class="vote-actions">
            <div class="vote-btn approve" onclick="vote('${selectedKey}', '${postKey}', 'like')">
                👍 Одобрить (${ups})
                <div class="voter-avatars">${likeAvatars}</div>
            </div>
            <div class="vote-btn reject" onclick="vote('${selectedKey}', '${postKey}', 'dislike')">
                👎 Отказать (${downs})
                <div class="voter-avatars">${dislikeAvatars}</div>
            </div>
        </div>`;
}

/**
 * Builds the read-only vote summary shown to the author or after decision.
 */
function _buildVoteSummary(ups, downs, status, isAuthor) {
    const upColor   = status === "approved" ? "var(--success)" : "#64748b";
    const downColor = status === "rejected" ? "var(--danger)"  : "#64748b";

    const authorNote = (isAuthor && status === "pending")
        ? `<div style="text-align:center; font-size:10px; color:#94a3b8; padding-bottom:10px;">
               Вы не можете голосовать за свой пост
           </div>`
        : "";

    return `
        <div style="padding:0 12px 12px; display:flex; gap:10px;">
            <div style="flex:1; text-align:center; font-size:12px; color:${upColor};">👍 ${ups}</div>
            <div style="flex:1; text-align:center; font-size:12px; color:${downColor};">👎 ${downs}</div>
        </div>
        ${authorNote}`;
}

/**
 * Builds a row of voter avatar <img> tags filtered by vote type.
 */
function _buildAvatarStack(votes, type) {
    return Object.values(votes)
        .filter(v => v.val === type)
        .map(v => `<img src="${v.photo}" alt="${v.name}">`)
        .join("");
}
