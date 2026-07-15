(function () {
    function getCurrentUser() {
        return window.appState?.currentUser || null;
    }

    function showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2200);
    }

    function makeAvatar(name) {
        const initials = String(name || "U").slice(0, 2).toUpperCase();
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" rx="100" fill="#e1306c" />
                <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="84" fill="white" font-family="Arial, sans-serif">${initials}</text>
            </svg>
        `;

        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function getCurrentUserPosts() {
        const currentUser = getCurrentUser();
        if (!currentUser) return [];
        return (window.appState.posts || []).filter((post) => String(getPostOwnerId(post)) === String(currentUser._id));
    }

    function getSavedPosts() {
        const currentUser = getCurrentUser();
        if (!currentUser) return [];
        const savedIds = new Set((currentUser.savedPosts || []).map(String));
        return (window.appState.posts || []).filter((post) => savedIds.has(String(post._id)));
    }

    function getProfileCompletion(currentUser) {
        const checks = [
            { key: "profilePicture", label: "Profile photo" },
            { key: "bio", label: "Bio" },
            { key: "website", label: "Website" },
            { key: "fullName", label: "Full name" },
            { key: "location", label: "Location" }
        ];

        const completed = checks.filter((item) => {
            const value = currentUser[item.key];
            return value && String(value).trim() !== "";
        }).length;

        return {
            completed,
            total: checks.length,
            percent: Math.round((completed / checks.length) * 100),
            missing: checks.filter((item) => !currentUser[item.key] || String(currentUser[item.key]).trim() === "").map((item) => item.label)
        };
    }

    function renderProfileCompletion(currentUser) {
        const card = document.getElementById("profileCompleteCard");
        if (!card) return;
        const completion = getProfileCompletion(currentUser);
        if (completion.percent >= 100) {
            card.style.display = "none";
            return;
        }
        card.style.display = "block";
        card.innerHTML = `
            <h4>Complete your profile</h4>
            <p>Progress: ${completion.percent}%</p>
            <ul>
                ${completion.missing.map((item) => `<li>${item}</li>`).join("")}
            </ul>
        `;
    }

    function renderProfile() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const userName = currentUser.username || "User";
        const bio = currentUser.bio || "Welcome to MiniSocial";
        const avatarUrl = currentUser.profilePicture || makeAvatar(userName);

        const profileImageEls = [
            document.getElementById("profileImage"),
            document.getElementById("sidebarProfileImage")
        ];

        profileImageEls.forEach((element) => {
            if (element) element.src = avatarUrl;
        });

        const usernameEls = [
            document.getElementById("username"),
            document.getElementById("sidebarUsername")
        ];

        usernameEls.forEach((element) => {
            if (element) element.textContent = userName;
        });

        const bioEl = document.getElementById("sidebarBio");
        if (bioEl) bioEl.textContent = bio;

        const postsCountEl = document.getElementById("postsCount");
        const followersCountEl = document.getElementById("followersCount");
        const followingCountEl = document.getElementById("followingCount");

        if (postsCountEl) {
            postsCountEl.textContent = getCurrentUserPosts().length;
        }

        if (followersCountEl) {
            followersCountEl.textContent = (currentUser.followers || []).length;
        }

        if (followingCountEl) {
            followingCountEl.textContent = Number(currentUser.followingCount ?? (currentUser.following || []).length ?? 0);
        }

        renderProfileCompletion(currentUser);
        renderProfileSection();
        renderSuggestedAccounts();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderSuggestedAccounts() {
        const target = document.getElementById("suggestedUsers") || document.getElementById("suggestedForYouList");
        if (!target) return;

        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const accounts = (window.appState.suggestedAccounts || []).filter((account) => {
            const accountId = String(account.id || account._id || "");
            const currentUserId = String(currentUser._id || "");
            if (!accountId || accountId === currentUserId) return false;
            const followingIds = new Set((currentUser.following || []).map(String));
            return !followingIds.has(accountId);
        }).slice(0, 5);

        if (target.id === "suggestedUsers") {
            target.innerHTML = `
                <div class="suggested-card">
                    <div class="suggested-header">
                        <h3>Suggested For You</h3>
                        <span onclick="openSuggestedUsersModal()" style="cursor:pointer;">See all</span>
                    </div>
                    <div class="suggested-list">
                        ${accounts.map((account) => `
                            <div class="suggested-row">
                                <div class="suggested-user" onclick="openProfileModal('${account.id || account._id}')">
                                    <img class="suggested-avatar" src="${account.avatarUrl || makeAvatar(account.username)}" alt="${escapeHtml(account.username)}">
                                    <div class="suggested-info">
                                        <span class="suggested-name">${escapeHtml(account.username)}</span>
                                        <span class="suggested-reason">${escapeHtml(account.reason || account.bio || "New to MiniSocial")}</span>
                                    </div>
                                </div>
                                <button class="follow-btn-toggle${account.isFollowing ? " active" : ""}" onclick="toggleFollow('${account.id || account._id}')">
                                    ${account.isFollowing ? "Following" : "Follow"}
                                </button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
            return;
        }

        target.innerHTML = accounts.map((account) => `
            <div class="suggested-row">
                <div class="suggested-user" onclick="openProfileModal('${account.id || account._id}')">
                    <img class="suggested-avatar" src="${account.avatarUrl || makeAvatar(account.username)}" alt="${escapeHtml(account.username)}">
                    <div class="suggested-info">
                        <span class="suggested-name">${escapeHtml(account.username)}</span>
                        <span class="suggested-reason">${escapeHtml(account.reason || account.bio || "New to MiniSocial")}</span>
                    </div>
                </div>
                <button class="follow-btn-toggle${account.isFollowing ? " active" : ""}" onclick="toggleFollow('${account.id || account._id}')">
                    ${account.isFollowing ? "Following" : "Follow"}
                </button>
            </div>
        `).join("");
    }

    function renderProfileSection() {
        const currentUser = getCurrentUser();
        const profileNameEl = document.getElementById("profileOverlayName");
        const profileBioEl = document.getElementById("profileOverlayBio");
        const profileWebsiteEl = document.getElementById("profileOverlayWebsite");
        const profileAvatarEl = document.getElementById("profileOverlayAvatar");
        const profilePostCountEl = document.getElementById("profilePostCount");
        const profileFollowerCountEl = document.getElementById("profileFollowerCount");
        const profileFollowingCountEl = document.getElementById("profileFollowingCount");
        const galleryEl = document.getElementById("profileGallery");
        const formEl = document.getElementById("profileEditForm");
        const followBtn = document.getElementById("profileFollowBtn");
        const editBtn = document.getElementById("profileEditBtn");
        const messageBtn = document.getElementById("profileMessageBtn");
        const verifiedBadge = document.getElementById("profileVerifiedBadge");
        const nameInput = document.getElementById("profileEditName");
        const imageInput = document.getElementById("profileEditImage");
        const websiteInput = document.getElementById("profileEditWebsite");
        const bioInput = document.getElementById("profileEditBio");

        if (!currentUser || !profileNameEl || !profileBioEl || !galleryEl) return;

        profileNameEl.textContent = currentUser.username || "Your Profile";
        profileBioEl.textContent = currentUser.bio || "Update your identity and browse your curated posts.";
        profileWebsiteEl.textContent = currentUser.website || "";
        profileWebsiteEl.style.display = currentUser.website ? "block" : "none";

        if (profileAvatarEl) {
            profileAvatarEl.src = currentUser.profilePicture || makeAvatar(currentUser.username || "User");
        }

        if (profilePostCountEl) {
            profilePostCountEl.textContent = getCurrentUserPosts().length;
        }
        if (profileFollowerCountEl) {
            profileFollowerCountEl.textContent = (currentUser.followers || []).length;
        }
        if (profileFollowingCountEl) {
            profileFollowingCountEl.textContent = Number(currentUser.followingCount ?? (currentUser.following || []).length ?? 0);
        }

        if (formEl) {
            formEl.style.display = window.appState.profileEditMode ? "grid" : "none";
        }

        if (followBtn) {
            const viewedId = String(window.appState?.viewedProfileUserId || currentUser._id || "");
            const isOwnProfile = String(currentUser._id) === viewedId;
            followBtn.style.display = isOwnProfile ? "none" : "inline-flex";
            if (!isOwnProfile) {
                const isFollowing = (currentUser.following || []).map(String).includes(viewedId);
                followBtn.textContent = isFollowing ? "Following" : "Follow";
                followBtn.classList.toggle("following", isFollowing);
            }
        }

        if (editBtn) {
            editBtn.style.display = String(currentUser._id) === String(window.appState?.viewedProfileUserId || currentUser._id) ? "inline-flex" : "none";
        }

        if (messageBtn) {
            messageBtn.style.display = String(currentUser._id) === String(window.appState?.viewedProfileUserId || currentUser._id) ? "none" : "inline-flex";
        }

        if (verifiedBadge) {
            verifiedBadge.style.display = currentUser.verified ? "inline-flex" : "none";
        }

        if (nameInput) {
            nameInput.value = currentUser.username || "";
        }

        if (imageInput) {
            imageInput.value = currentUser.profilePicture || "";
        }

        if (websiteInput) {
            websiteInput.value = currentUser.website || "";
        }

        if (bioInput) {
            bioInput.value = currentUser.bio || "";
        }

        document.querySelectorAll(".profile-tab").forEach((button) => {
            button.classList.toggle("active", button.dataset.tab === (window.appState.activeProfileTab || "posts"));
        });

        const viewedProfileId = String(window.appState?.viewedProfileUserId || currentUser._id || "");
        const postsToShow = window.appState.activeProfileTab === "saved"
            ? getSavedPosts()
            : (window.appState.posts || []).filter((post) => String(getPostOwnerId(post)) === viewedProfileId);

        if (!postsToShow.length) {
            galleryEl.innerHTML = '<div class="profile-empty">No posts to show here yet.</div>';
            return;
        }

        galleryEl.innerHTML = postsToShow.map((post) => {
            const media = post.image
                ? `<img class="profile-gallery-media" src="${window.BASE_URL}${post.image}" alt="${escapeHtml(post.content || "Post")}">`
                : post.video
                    ? `<video class="profile-gallery-media" controls src="${window.BASE_URL}${post.video}"></video>`
                    : `<div class="profile-gallery-placeholder">${escapeHtml(post.content || "Shared post")}</div>`;

            return `
                <div class="profile-gallery-item">
                    ${media}
                    <div class="profile-gallery-info">
                        <h4>${escapeHtml(post.content ? post.content.slice(0, 32) : "Post")}</h4>
                        <p>${escapeHtml(new Date(post.createdAt).toLocaleDateString())}</p>
                    </div>
                </div>
            `;
        }).join("");
    }

    function toggleProfileEdit() {
        window.appState.profileEditMode = !window.appState.profileEditMode;
        renderProfileSection();
    }

    async function saveProfileChanges() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const imageInput = document.getElementById("editProfileImage");
        const usernameInput = document.getElementById("editUsername");
        const fullNameInput = document.getElementById("editFullName");
        const bioInput = document.getElementById("editBio");
        const websiteInput = document.getElementById("editWebsite");
        const locationInput = document.getElementById("editLocation");

        const payload = {
            username: usernameInput?.value.trim() || currentUser.username,
            fullName: fullNameInput?.value.trim() || currentUser.fullName || "",
            bio: bioInput?.value.trim() || currentUser.bio || "",
            website: websiteInput?.value.trim() || currentUser.website || "",
            location: locationInput?.value.trim() || currentUser.location || ""
        };

        try {
            let response;
            let data;

            if (imageInput?.files?.[0]) {
                const formData = new FormData();
                formData.append("profilePicture", imageInput.files[0]);
                Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

                response = await fetch(`${window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"))}/api/users/${currentUser._id}`, {
                    method: "PUT",
                    body: formData
                });
                data = await response.json();
            } else {
                response = await fetch(`${window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"))}/api/users/${currentUser._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, profilePicture: currentUser.profilePicture || "" })
                });
                data = await response.json();
            }

            if (!response.ok) throw new Error(data.message || "Unable to update profile");

            Object.assign(currentUser, data.user || payload);
            currentUser.profilePicture = data.user?.profilePicture || currentUser.profilePicture;
            localStorage.setItem("user", JSON.stringify(currentUser));
            window.appState.currentUser = currentUser;
            closeEditProfileModal();
            renderProfile();
            if (typeof window.renderPosts === "function") {
                window.renderPosts();
            }
            showToast("Profile updated", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Could not save profile", "error");
        }
    }

    function cancelProfileEdit() {
        window.appState.profileEditMode = false;
        renderProfileSection();
    }

    function setProfileTab(tab) {
        window.appState.activeProfileTab = tab;
        renderProfileSection();
        if (typeof window.renderPosts === "function") {
            window.renderPosts();
        }
    }

    async function handleSuggestedFollowToggle(userId) {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const targetId = String(userId || "");
        const currentUserId = String(currentUser._id || "");
        if (!targetId || targetId === currentUserId) {
            showToast("You cannot follow yourself", "error");
            return;
        }

        const alreadyFollowing = (currentUser.following || []).map(String).includes(targetId);
        const endpoint = alreadyFollowing ? `/api/users/unfollow/${targetId}` : `/api/users/follow/${targetId}`;

        try {
            const response = await fetch(`${window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"))}${endpoint}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update follow state");
            }

            const updatedFollowing = new Set((currentUser.following || []).map(String));
            if (alreadyFollowing) {
                updatedFollowing.delete(targetId);
                currentUser.followingCount = Math.max(0, Number(currentUser.followingCount || 0) - 1);
            } else {
                updatedFollowing.add(targetId);
                currentUser.followingCount = Number(currentUser.followingCount || 0) + 1;
            }

            currentUser.following = Array.from(updatedFollowing);
            localStorage.setItem("user", JSON.stringify(currentUser));
            window.appState.currentUser = currentUser;
            renderProfile();
            renderSuggestedAccounts();
            showToast(alreadyFollowing ? "Unfollowed successfully" : "Followed successfully", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Follow action failed", "error");
        }
    }

    async function handleFollowToggle() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const targetId = String(window.appState?.viewedProfileUserId || currentUser._id || "");
        const currentUserId = String(currentUser._id || "");
        if (!targetId || targetId === currentUserId) {
            showToast("You cannot follow yourself", "error");
            return;
        }

        const followBtn = document.getElementById("profileFollowBtn");
        if (!followBtn) return;

        const isFollowing = followBtn.textContent === "Following";
        const endpoint = isFollowing ? `/api/users/unfollow/${targetId}` : `/api/users/follow/${targetId}`;

        try {
            const response = await fetch(`${window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"))}${endpoint}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update follow state");
            }

            const updatedFollowing = new Set((currentUser.following || []).map(String));
            if (isFollowing) {
                updatedFollowing.delete(targetId);
                currentUser.followingCount = Math.max(0, Number(currentUser.followingCount || 0) - 1);
            } else {
                updatedFollowing.add(targetId);
                currentUser.followingCount = Number(currentUser.followingCount || 0) + 1;
            }

            currentUser.following = Array.from(updatedFollowing);
            localStorage.setItem("user", JSON.stringify(currentUser));
            window.appState.currentUser = currentUser;
            renderProfile();
            renderProfileSection();
            showToast(isFollowing ? "Unfollowed successfully" : "Followed successfully", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Follow action failed", "error");
        }
    }

    async function loadUsers() {
        try {
            const response = await fetch(`${window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"))}/api/users`);
            const users = await response.json();
            const currentUser = getCurrentUser();
            if (!currentUser) return;

            const currentUserId = String(currentUser._id || currentUser.id || "");
            const formatted = users
                .filter((user) => String(user._id || user.id || "") !== currentUserId)
                .map((user) => ({
                    id: user._id || user.id,
                    username: user.username || "User",
                    bio: user.bio || "New to MiniSocial",
                    avatarUrl: user.profilePicture || makeAvatar(user.username || "User"),
                    isFollowing: (currentUser.following || []).map(String).includes(String(user._id || user.id || "")),
                    reason: `${(user.followers || []).length} followers`
                }));

            window.appState.suggestedAccounts = formatted.sort((a, b) => (b.reason.includes("followers") ? 1 : 0) - (a.reason.includes("followers") ? 1 : 0)).slice(0, 10);
            renderSuggestedAccounts();
            if (typeof window.renderSuggestedModal === "function") {
                window.renderSuggestedModal();
            }
        } catch (error) {
            console.error(error);
            showToast("Unable to load suggested users", "error");
        }
    }

    function openProfileModal(userId) {
        const overlay = document.getElementById("profileOverlay");
        if (!overlay) return;
        window.appState.viewedProfileUserId = userId;
        overlay.style.display = "flex";
        renderProfileSection();
    }

    function openSuggestedUsersModal() {
        const modal = document.getElementById("suggestedUsersModal");
        if (!modal) return;
        modal.style.display = "flex";
        if (typeof window.renderSuggestedModal === "function") {
            window.renderSuggestedModal();
        }
    }

    function renderSuggestedModal() {
        const target = document.getElementById("suggestedUsersList");
        if (!target) return;
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        let accounts = (window.appState.suggestedAccounts || []).filter((account) => {
            const accountId = String(account.id || account._id || "");
            const currentUserId = String(currentUser._id || "");
            if (!accountId || accountId === currentUserId) return false;
            const followingIds = new Set((currentUser.following || []).map(String));
            return !followingIds.has(accountId);
        });

        const search = document.getElementById("suggestedSearch")?.value?.toLowerCase() || "";
        if (search) {
            accounts = accounts.filter((account) => (account.username || "").toLowerCase().includes(search));
        }

        const sort = window.appState.suggestedSort || "newest";
        if (sort === "popular") {
            accounts.sort((a, b) => Number(b.reason.match(/\d+/)?.[0] || 0) - Number(a.reason.match(/\d+/)?.[0] || 0));
        } else if (sort === "random") {
            accounts.sort(() => Math.random() - 0.5);
        }

        target.innerHTML = accounts.map((account) => `
            <div class="suggested-row">
                <div class="suggested-user" onclick="openProfileModal('${account.id || account._id}')">
                    <img class="suggested-avatar" src="${account.avatarUrl || makeAvatar(account.username)}" alt="${escapeHtml(account.username)}">
                    <div class="suggested-info">
                        <span class="suggested-name">${escapeHtml(account.username)}</span>
                        <span class="suggested-reason">${escapeHtml(account.reason || account.bio || "New to MiniSocial")}</span>
                    </div>
                </div>
                <button class="follow-btn-toggle${account.isFollowing ? " active" : ""}" onclick="toggleFollow('${account.id || account._id}')">
                    ${account.isFollowing ? "Following" : "Follow"}
                </button>
            </div>
        `).join("");
    }

    window.renderProfile = renderProfile;
    window.renderProfileSection = renderProfileSection;
    window.makeAvatar = makeAvatar;
    window.toggleProfileEdit = toggleProfileEdit;
    window.saveProfileChanges = saveProfileChanges;
    window.cancelProfileEdit = cancelProfileEdit;
    window.setProfileTab = setProfileTab;
    window.handleFollowToggle = handleFollowToggle;
    window.handleSuggestedFollowToggle = handleSuggestedFollowToggle;
    window.loadUsers = loadUsers;
    window.openProfileModal = openProfileModal;
    window.openSuggestedUsersModal = openSuggestedUsersModal;
    window.renderSuggestedModal = renderSuggestedModal;
    window.showToast = showToast;
})();
