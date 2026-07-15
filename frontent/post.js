(function () {
    const BASE_URL = window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"));

    function getPostOwnerName(post) {
        return post.user?.username || "Unknown user";
    }

    function getPostOwnerId(post) {
        return post.user?._id || post.user || "";
    }

    function formatDate(value) {
        if (!value) return "Just now";
        return new Date(value).toLocaleString();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderPostCard(post) {
        const ownerName = getPostOwnerName(post);
        const createdAt = formatDate(post.createdAt);
        const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
        const currentUserId = String(window.appState?.currentUser?._id || window.appState?.currentUser?.id || "");
        const isLiked = Array.isArray(post.likes) && currentUserId
            ? post.likes.some((like) => String(like) === currentUserId)
            : false;
        const isMine = currentUserId && String(post.user?._id || post.user || "") === currentUserId;
        const isSaved = Array.isArray(window.appState?.currentUser?.savedPosts)
            ? window.appState.currentUser.savedPosts.some((savedId) => String(savedId) === String(post._id))
            : false;

        const mediaMarkup = post.image
            ? `<img class="post-image" src="${BASE_URL}${post.image}" alt="Post media">`
            : post.video
                ? `<video class="post-video" controls src="${BASE_URL}${post.video}"></video>`
                : "";

        const contentMarkup = post.content
            ? `<p>${escapeHtml(post.content)}</p>`
            : "";

        return `
            <article class="post">
                <div class="post-header">
                    <img class="post-avatar" src="${makeAvatar(ownerName)}" alt="${escapeHtml(ownerName)} avatar">
                    <div>
                        <h3>${escapeHtml(ownerName)}</h3>
                        <small>${escapeHtml(createdAt)}</small>
                    </div>
                </div>
                <div class="post-content">${contentMarkup}</div>
                ${mediaMarkup}
                <div class="post-footer">
                    <span onclick="toggleLike('${post._id}')" style="color: ${isLiked ? '#e1306c' : '#4b5563'}">
                        <i class="fa-solid fa-heart"></i> ${likesCount}
                    </span>
                    <span>
                        <i class="fa-solid fa-comment"></i> Comment
                    </span>
                    <span onclick="savePost('${post._id}')" style="color: ${isSaved ? '#e1306c' : '#4b5563'}">
                        <i class="fa-solid fa-bookmark"></i> ${isSaved ? 'Saved' : 'Save'}
                    </span>
                    <span onclick="sharePost('${post._id}')">
                        <i class="fa-solid fa-share"></i> Share
                    </span>
                    ${isMine ? `<span onclick="editPost('${post._id}')"><i class="fa-solid fa-pen"></i> Edit</span>` : ""}
                    ${isMine ? `<span onclick="deletePost('${post._id}')" style="color:#ef4444"><i class="fa-solid fa-trash"></i> Delete</span>` : ""}
                </div>
                <div class="post-comments-section">
                    <div class="comments-list" id="comments-${post._id}"></div>
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <input id="comment-input-${post._id}" type="text" placeholder="Write a comment..." style="flex:1; padding:8px 10px; border:1px solid #e5e7eb; border-radius:999px;">
                        <button onclick="submitComment('${post._id}')" style="padding:8px 12px; border:none; border-radius:999px; background:#e1306c; color:white; cursor:pointer;">Send</button>
                    </div>
                </div>
            </article>
        `;
    }

    async function loadPosts() {
        const container = document.getElementById("postsContainer");
        if (!container) return;

        container.innerHTML = '<div class="post">Loading posts...</div>';

        try {
            const response = await fetch(`${BASE_URL}/api/posts`);
            const posts = await response.json();

            window.appState.posts = Array.isArray(posts) ? posts : [];
            renderPosts();
            renderProfile();
        } catch (error) {
            console.error(error);
            container.innerHTML = '<div class="post">Unable to load posts right now.</div>';
        }
    }

    function renderPosts(searchQuery = "") {
        const container = document.getElementById("postsContainer");
        if (!container) return;

        let filteredPosts = (window.appState.posts || []);

        if (searchQuery) {
            filteredPosts = filteredPosts.filter((post) => {
                const ownerName = getPostOwnerName(post).toLowerCase();
                const content = (post.content || "").toLowerCase();
                return ownerName.includes(searchQuery) || content.includes(searchQuery);
            });
        }

        if (!filteredPosts.length) {
            container.innerHTML = '<div class="post">No posts match your current view.</div>';
            return;
        }

        container.innerHTML = filteredPosts.map((post) => renderPostCard(post)).join("");

        filteredPosts.forEach((post) => {
            loadComments(post._id);
        });

        if (typeof window.renderProfileSection === "function") {
            window.renderProfileSection();
        }
    }

    async function performSearch(query) {
        const target = document.getElementById("searchResults");
        if (!target) return;

        const trimmed = (query || "").trim();
        if (!trimmed) {
            target.innerHTML = '<div class="search-empty">Try searching for people, posts, or topics.</div>';
            return;
        }

        target.innerHTML = '<div class="search-empty">Searching...</div>';

        try {
            const response = await fetch(`${BASE_URL}/api/posts/search?q=${encodeURIComponent(trimmed)}`);
            const data = await response.json();
            const users = Array.isArray(data.users) ? data.users : [];
            const posts = Array.isArray(data.posts) ? data.posts : [];

            if (!users.length && !posts.length) {
                target.innerHTML = '<div class="search-empty">No matches found.</div>';
                return;
            }

            target.innerHTML = `
                ${users.length ? `
                    <div class="search-section">
                        <h4>People</h4>
                        ${users.map((user) => `
                            <div class="search-result-row" onclick="window.openProfileModal('${user._id || user.id}')">
                                <div class="search-result-meta">
                                    <img class="suggested-avatar" src="${user.profilePicture || window.makeAvatar ? window.makeAvatar(user.username || "User") : ""}" alt="${escapeHtml(user.username || "User")}">
                                    <div>
                                        <strong>${escapeHtml(user.username || "User")}</strong>
                                        <p>${escapeHtml(user.bio || "New to MiniSocial")}</p>
                                    </div>
                                </div>
                                <span class="search-result-pill">View</span>
                            </div>
                        `).join("")}
                    </div>
                ` : ""}
                ${posts.length ? `
                    <div class="search-section">
                        <h4>Posts</h4>
                        ${posts.map((post) => `
                            <div class="search-result-row">
                                <div class="search-result-meta">
                                    <div>
                                        <strong>${escapeHtml(post.content || "Shared a post")}</strong>
                                        <p>${escapeHtml(post.user?.username || "User")}</p>
                                    </div>
                                </div>
                                <span class="search-result-pill">${escapeHtml(new Date(post.createdAt).toLocaleDateString())}</span>
                            </div>
                        `).join("")}
                    </div>
                ` : ""}
            `;
        } catch (error) {
            console.error(error);
            target.innerHTML = '<div class="search-empty">Unable to search right now.</div>';
        }
    }

    async function loadExploreFeed() {
        const target = document.getElementById("explorePanel");
        if (!target) return;

        target.innerHTML = '<div class="post">Loading explore feed...</div>';

        try {
            const response = await fetch(`${BASE_URL}/api/posts/explore`);
            const data = await response.json();
            const posts = Array.isArray(data.posts) ? data.posts : [];
            const users = Array.isArray(data.users) ? data.users : [];

            target.innerHTML = `
                <div class="explore-heading">
                    <h3>Explore</h3>
                    <p>Discover new creators and trending posts</p>
                </div>
                <div class="explore-grid">
                    <div class="explore-card">
                        <h4>Trending posts</h4>
                        <div class="explore-list">
                            ${posts.slice(0, 6).map((post) => `
                                <div class="explore-post-item">
                                    <div>
                                        <strong>${escapeHtml(post.content || "Shared a post")}</strong>
                                        <p>${escapeHtml(post.user?.username || "User")}</p>
                                    </div>
                                    <span class="search-result-pill">${Array.isArray(post.likes) ? post.likes.length : 0} likes</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                    <div class="explore-card">
                        <h4>Suggested creators</h4>
                        <div class="explore-list">
                            ${users.slice(0, 6).map((user) => `
                                <div class="explore-post-item" onclick="window.openProfileModal('${user._id || user.id}')">
                                    <div class="search-result-meta">
                                        <img class="suggested-avatar" src="${user.profilePicture || (window.makeAvatar ? window.makeAvatar(user.username || "User") : "")}" alt="${escapeHtml(user.username || "User")}">
                                        <div>
                                            <strong>${escapeHtml(user.username || "User")}</strong>
                                            <p>${escapeHtml(user.bio || "New to MiniSocial")}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error(error);
            target.innerHTML = '<div class="post">Unable to load explore feed right now.</div>';
        }
    }

    async function createPost() {
        const content = document.getElementById("postContent")?.value.trim() || "";
        const mediaFile = document.getElementById("mediaFile")?.files?.[0];
        const button = document.querySelector(".post-controls button");

        if (!content && !mediaFile) {
            alert("Write something or add a photo/video first.");
            return;
        }

        if (!window.appState?.currentUser) {
            window.location.href = "index.html";
            return;
        }

        const originalLabel = button?.innerHTML || "Share Post";
        if (button) {
            button.disabled = true;
            button.innerHTML = "Posting...";
        }

        const formData = new FormData();
        formData.append("user", window.appState.currentUser._id);
        formData.append("content", content);

        if (mediaFile) {
            formData.append("media", mediaFile);
        }

        try {
            const response = await fetch(`${BASE_URL}/api/posts`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to create post");
            }

            const postInput = document.getElementById("postContent");
            const mediaInput = document.getElementById("mediaFile");
            if (postInput) postInput.value = "";
            if (mediaInput) mediaInput.value = "";

            window.appState.posts.unshift({
                ...data.post,
                user: {
                    _id: window.appState.currentUser._id,
                    username: window.appState.currentUser.username
                },
                likes: []
            });

            renderPosts();
            renderProfile();
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not create post");
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalLabel;
            }
        }
    }

    async function toggleLike(postId) {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;

        const currentUserId = String(currentUser._id || currentUser.id || "");
        if (!currentUserId) return;

        const post = window.appState.posts.find((item) => item._id === postId);
        const alreadyLiked = Array.isArray(post?.likes) && post.likes.some((like) => String(like) === currentUserId);

        try {
            const response = await fetch(`${BASE_URL}/api/posts/like/${postId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: currentUserId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to like post");
            }

            if (post) {
                if (!Array.isArray(post.likes)) {
                    post.likes = [];
                }
                if (data.liked) {
                    if (!post.likes.some((like) => String(like) === currentUserId)) {
                        post.likes.push(currentUserId);
                    }
                } else {
                    post.likes = post.likes.filter((like) => String(like) !== currentUserId);
                }
            }

            if (typeof window.renderPosts === "function") {
                window.renderPosts(document.querySelector(".search-box input")?.value.trim().toLowerCase() || "");
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not like post");
        }
    }

    async function savePost(postId) {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;

        try {
            const response = await fetch(`${BASE_URL}/api/posts/save/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser._id || currentUser.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to save post");

            if (!Array.isArray(currentUser.savedPosts)) {
                currentUser.savedPosts = [];
            }
            if (data.saved) {
                currentUser.savedPosts.push(postId);
            } else {
                currentUser.savedPosts = currentUser.savedPosts.filter((savedId) => String(savedId) !== String(postId));
            }
            localStorage.setItem("user", JSON.stringify(currentUser));
            window.appState.currentUser = currentUser;
            if (typeof window.renderPosts === "function") {
                window.renderPosts(document.querySelector(".search-box input")?.value.trim().toLowerCase() || "");
            }
            if (typeof window.renderProfile === "function") {
                window.renderProfile();
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not save post");
        }
    }

    async function deletePost(postId) {
        try {
            const response = await fetch(`${BASE_URL}/api/posts/${postId}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to delete post");
            window.appState.posts = window.appState.posts.filter((post) => post._id !== postId);
            if (typeof window.renderPosts === "function") {
                window.renderPosts(document.querySelector(".search-box input")?.value.trim().toLowerCase() || "");
            }
            if (typeof window.renderProfile === "function") {
                window.renderProfile();
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not delete post");
        }
    }

    async function editPost(postId) {
        const post = window.appState.posts.find((item) => item._id === postId);
        if (!post) return;
        const nextContent = window.prompt("Update your post", post.content || "");
        if (nextContent === null) return;
        try {
            const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: nextContent.trim() })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to edit post");
            post.content = nextContent.trim();
            if (typeof window.renderPosts === "function") {
                window.renderPosts(document.querySelector(".search-box input")?.value.trim().toLowerCase() || "");
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not edit post");
        }
    }

    async function sharePost(postId) {
        const post = window.appState.posts.find((item) => item._id === postId);
        const message = post?.content ? `Check out this post: ${post.content}` : "Check out this post";
        try {
            if (navigator.share) {
                await navigator.share({ title: "MiniSocial", text: message });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(message);
                alert("Post link copied to clipboard");
            } else {
                alert("Sharing is not supported in this browser");
            }
        } catch (error) {
            console.error(error);
        }
    }

    window.loadPosts = loadPosts;
    window.renderPosts = renderPosts;
    window.createPost = createPost;
    window.toggleLike = toggleLike;
    window.performSearch = performSearch;
    window.loadExploreFeed = loadExploreFeed;
    window.savePost = savePost;
    window.deletePost = deletePost;
    window.editPost = editPost;
    window.sharePost = sharePost;
    window.getPostOwnerName = getPostOwnerName;
    window.getPostOwnerId = getPostOwnerId;
    window.escapeHtml = escapeHtml;
    window.formatDate = formatDate;
})();
