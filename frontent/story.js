(function () {
    const BASE_URL = "https://codealpha-socialmedia-yeec.onrender.com";
    let storyQueue = [];
    let storyIndex = 0;
    let playerTimer = null;

    function getCurrentUser() {
        return window.appState?.currentUser || null;
    }

    function getAvatar(user) {
        return user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || "User")}`;
    }

    function closeStoryViewer() {
        const viewer = document.getElementById("storyViewer");
        if (viewer) viewer.style.display = "none";
        if (playerTimer) clearInterval(playerTimer);
        playerTimer = null;
        storyQueue = [];
        storyIndex = 0;
    }

    async function loadStories() {
        const container = document.getElementById("storyStrip");
        if (!container) return;

        try {
            const response = await fetch(`${BASE_URL}/api/stories`);
            const stories = await response.json();
            const currentUser = getCurrentUser();
            const visibleStories = (stories || []).filter((story) => {
                if (!currentUser) return true;
                return String(story.user?._id || story.user) !== String(currentUser._id || currentUser.id || "");
            });

            const addButton = `
                <div class="story-item" onclick="openStoryUploadModal()">
                    <div class="story-ring" style="background: linear-gradient(135deg, #4f46e5, #3b82f6);">
                        <i class="fa-solid fa-plus" style="color:white;font-size:1rem"></i>
                    </div>
                    <span>New</span>
                </div>
            `;

            if (!visibleStories.length) {
                container.innerHTML = `${addButton}<div class="story-item empty">No stories yet</div>`;
                return;
            }

            container.innerHTML = `${addButton}${visibleStories.map((story) => {
                const avatar = getAvatar(story.user);
                return `
                    <div class="story-item" onclick="openStoryViewer('${story._id}')">
                        <div class="story-ring"><img src="${avatar}" alt="${story.user?.username || "Story"}"></div>
                        <span>${story.user?.username || "User"}</span>
                    </div>
                `;
            }).join("")}`;
        } catch (error) {
            console.error(error);
        }
    }

    async function createStory(file, caption) {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const formData = new FormData();
        formData.append("user", currentUser._id || currentUser.id);
        formData.append("caption", caption || "");
        if (file) formData.append("media", file);

        const response = await fetch(`${BASE_URL}/api/stories`, { method: "POST", body: formData });
        const result = await response.json();
        if (response.ok) {
            if (typeof window.showToast === "function") {
                window.showToast("Story shared", "success");
            }
            closeStoryUploadModal();
            await loadStories();
            return result;
        }
        throw new Error(result.message || "Could not share story");
    }

    async function openStoryViewer(storyId) {
        const viewer = document.getElementById("storyViewer");
        const body = viewer?.querySelector(".story-viewer-body");
        if (!viewer || !body) return;

        try {
            const response = await fetch(`${BASE_URL}/api/stories`);
            const stories = await response.json();
            const currentUser = getCurrentUser();
            const visibleStories = (stories || []).filter((story) => {
                if (!currentUser) return true;
                return String(story.user?._id || story.user) !== String(currentUser._id || currentUser.id || "");
            });
            const selectedIndex = visibleStories.findIndex((story) => String(story._id) === String(storyId));
            if (selectedIndex < 0) return;
            storyQueue = visibleStories;
            storyIndex = selectedIndex;
            viewer.style.display = "flex";
            renderStoryViewer();
            if (currentUser) {
                await fetch(`${BASE_URL}/api/stories/view/${storyQueue[storyIndex]._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUser._id || currentUser.id })
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    function renderStoryViewer() {
        const viewer = document.getElementById("storyViewer");
        const body = viewer?.querySelector(".story-viewer-body");
        if (!viewer || !body) return;

        const story = storyQueue[storyIndex];
        if (!story) return;

        const avatar = getAvatar(story.user);
        const isVideo = story.mediaType === "video";
        const mediaUrl = `${BASE_URL}${story.media}`;

        body.innerHTML = `
            <div class="story-nav">
                <button onclick="changeStory(-1)">←</button>
                <button onclick="changeStory(1)">→</button>
            </div>
            <div class="story-viewer-overlay">
                <div class="story-progress-row">
                    ${storyQueue.map((_, index) => `<div class="story-progress-bar"><span style="width:${index === storyIndex ? '0%' : '100%'}"></span></div>`).join("")}
                </div>
                <div class="story-viewer-header">
                    <div class="story-viewer-user">
                        <img src="${avatar}" alt="${story.user?.username || "Story"}">
                        <div>
                            <strong>${story.user?.username || "User"}</strong>
                            <div>${new Date(story.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                        </div>
                    </div>
                    <div class="story-viewer-actions">
                        ${story.user?._id === (getCurrentUser()?._id || getCurrentUser()?.id) ? '<button onclick="deleteCurrentStory()">Delete</button>' : ""}
                        <button onclick="closeStoryViewer()">Close</button>
                    </div>
                </div>
                <div class="story-viewer-caption">${story.caption || ""}</div>
            </div>
            ${isVideo ? `<video class="story-viewer-media" src="${mediaUrl}" autoplay muted loop playsinline></video>` : `<img class="story-viewer-media" src="${mediaUrl}" alt="story" />`}
        `;

        if (playerTimer) clearInterval(playerTimer);
        playerTimer = setInterval(() => {
            advanceStory();
        }, 5000);
    }

    function advanceStory() {
        if (!storyQueue.length) return;
        storyIndex = (storyIndex + 1) % storyQueue.length;
        renderStoryViewer();
    }

    async function deleteCurrentStory() {
        const story = storyQueue[storyIndex];
        const currentUser = getCurrentUser();
        if (!story || !currentUser) return;

        try {
            const response = await fetch(`${BASE_URL}/api/stories/${story._id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser._id || currentUser.id })
            });
            if (response.ok) {
                await loadStories();
                closeStoryViewer();
                if (typeof window.showToast === "function") {
                    window.showToast("Story deleted", "success");
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    function openStoryUploadModal() {
        const modal = document.getElementById("storyUploadModal");
        if (modal) modal.style.display = "flex";
    }

    function closeStoryUploadModal() {
        const modal = document.getElementById("storyUploadModal");
        if (modal) modal.style.display = "none";
        const input = document.getElementById("storyUploadInput");
        const preview = document.getElementById("storyPreviewBox");
        const caption = document.getElementById("storyCaptionInput");
        if (input) input.value = "";
        if (caption) caption.value = "";
        if (preview) preview.innerHTML = "Choose a photo or video";
    }

    function previewStoryFile(file) {
        const preview = document.getElementById("storyPreviewBox");
        if (!preview) return;
        if (!file) {
            preview.innerHTML = "Choose a photo or video";
            return;
        }

        const url = URL.createObjectURL(file);
        if (file.type.startsWith("video")) {
            preview.innerHTML = `<video src="${url}" autoplay muted loop playsinline></video>`;
        } else {
            preview.innerHTML = `<img src="${url}" alt="preview" />`;
        }
    }

    async function submitStoryUpload() {
        const input = document.getElementById("storyUploadInput");
        const caption = document.getElementById("storyCaptionInput")?.value || "";
        if (!input?.files?.length) {
            if (typeof window.showToast === "function") {
                window.showToast("Choose a photo or video first", "error");
            }
            return;
        }
        try {
            await createStory(input.files[0], caption);
        } catch (error) {
            if (typeof window.showToast === "function") {
                window.showToast(error.message || "Unable to share story", "error");
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const input = document.getElementById("storyUploadInput");
        if (input) {
            input.addEventListener("change", (event) => previewStoryFile(event.target.files[0]));
        }
    });

    window.loadStories = loadStories;
    window.createStory = createStory;
    window.openStoryViewer = openStoryViewer;
    window.closeStoryViewer = closeStoryViewer;
    window.changeStory = (direction) => {
        if (!storyQueue.length) return;
        storyIndex = (storyIndex + direction + storyQueue.length) % storyQueue.length;
        renderStoryViewer();
    };
    window.deleteCurrentStory = deleteCurrentStory;
    window.openStoryUploadModal = openStoryUploadModal;
    window.closeStoryUploadModal = closeStoryUploadModal;
    window.submitStoryUpload = submitStoryUpload;
})();
