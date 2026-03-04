// ===================================================
//  posts.js — Post history rendering & voting logic
// ===================================================

const PLACEHOLDER_IMG = "/placeholder.jpg";

/**
 * Re-renders the post list for `selectedKey`.
 */
function updateHistory() {
    const postsObj = globalData[selectedKey] || {};

    const posts = Object.entries(postsObj)
    .map(([key, val]) => ({ ...val, key }))
    .reverse();

    document.getElementById("postHistory").innerHTML =
    posts.map(post => _buildPostHTML(post)).join("");
}

function vote(dateKey, postKey, type) {
    if (!currentUser) return;

    db.ref(`cook_posts/${dateKey}/${postKey}`).transaction(post => {
        if (!post || post.status !== "pending") return post;

        if (!post.votes) post.votes = {};

        post.votes[currentUser.uid] = {
            val:   type,
            name:  currentRole || currentUser.displayName,
            photo: currentUser.photoURL || "",
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

function togglePost(key) {
    const el      = document.getElementById(`post-${key}`);
    const content = el.querySelector(".post-body");

    el.classList.toggle("expanded");
    content.style.display = content.style.display === "none" ? "block" : "none";
}

// ── Private helpers ──────────────────────────────────

function _buildPostHTML(post) {
    const votes     = post.votes || {};
    const ups       = Object.values(votes).filter(v => v.val === "like").length;
    const downs     = Object.values(votes).filter(v => v.val === "dislike").length;
    const status    = post.status || "pending";
    const isAuthor  = currentUser && post.authorId === currentUser.uid;
    const isPending = status === "pending";

    const statusMeta  = _getStatusMeta(status);
    const isCollapsed = status === "rejected";
    const showVoteButtons = isPending && currentUser && !isAuthor;

    // Use placeholder if img is missing, empty, or literally "undefined"
    const imgSrc = (post.img && post.img !== "undefined") ? post.img : PLACEHOLDER_IMG;

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
        alt="Фото блюда"
        onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}'">
        <div class="status-badge" style="background:${statusMeta.color}">
        ${statusMeta.label}
        </div>
        </div>

        <div style="padding:12px; font-size:14px;">
        <b>${post.chef}</b> готовил(а)<br>
        <span style="font-size:11px; color:#64748b;">👤 ${post.author} • ⏰ ${post.time}</span>
        </div>

        ${showVoteButtons ? _buildVoteActions(post.key, ups, downs, votes) : _buildVoteSummary(ups, downs, status, isAuthor && isPending)}
        </div>
        </div>`;
}

function _postClass(status) {
    return { approved: "post-green-seq", pending: "post-pending", rejected: "post-rejected" }[status] || "";
}

function _getStatusMeta(status) {
    return {
        approved: { label: "ОДОБРЕН",        color: "#10b981" },
        rejected: { label: "ОТКЛОНЕН",       color: "#ef4444" },
        pending:  { label: "На голосовании", color: "#94a3b8" },
    }[status] || { label: "На голосовании", color: "#94a3b8" };
}

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

function _buildVoteSummary(ups, downs, status, showAuthorNote) {
    const upColor   = status === "approved" ? "var(--success)" : "#64748b";
    const downColor = status === "rejected"  ? "var(--danger)"  : "#64748b";

    const authorNote = showAuthorNote
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

function _buildAvatarStack(votes, type) {
    return Object.values(votes)
    .filter(v => v.val === type)
    .map(v => `<img src="${v.photo}" alt="${v.name}">`)
    .join("");
}
