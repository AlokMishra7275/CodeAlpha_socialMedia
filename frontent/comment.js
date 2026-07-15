(function () {
    const BASE_URL = "https://codealpha-socialmedia-yeec.onrender.com";

    async function loadComments(postId) {
        const container = document.getElementById(`comments-${postId}`);
        if (!container) return;

        container.innerHTML = "<div style='color:#6b7280; font-size:0.9rem;'>Loading comments...</div>";

        try {
            const response = await fetch(`${BASE_URL}/api/comments/${postId}`);
            const comments = await response.json();

            if (!Array.isArray(comments) || !comments.length) {
                container.innerHTML = "<div style='color:#6b7280; font-size:0.9rem;'>No comments yet.</div>";
                return;
            }

            container.innerHTML = comments
                .map((comment) => `
                    <div style="padding:4px 0; line-height:1.4;">
                        <strong>${escapeHtml(comment.user?.username || "User")}</strong>
                        <span>${escapeHtml(comment.text || "")}</span>
                    </div>
                `)
                .join("");
        } catch (error) {
            console.error(error);
            container.innerHTML = "<div style='color:#6b7280; font-size:0.9rem;'>Unable to load comments.</div>";
        }
    }

    async function submitComment(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        const text = input?.value.trim();

        if (!text) return;
        if (!window.appState?.currentUser) {
            window.location.href = "index.html";
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    post: postId,
                    user: window.appState.currentUser._id,
                    text
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to add comment");
            }

            input.value = "";
            loadComments(postId);
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not add comment");
        }
    }

    window.loadComments = loadComments;
    window.submitComment = submitComment;
})();
