const BASE_URL = "https://codealpha-socialmedia-yeec.onrender.com";
window.BASE_URL = BASE_URL;

const appState = {
    currentUser: null,
    posts: [],
    suggestedAccounts: [],
    profileEditMode: false,
    activeProfileTab: "my-posts"
};
window.appState = appState;

function bindEvents() {
    const searchInput = document.querySelector(".search-box input");
    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            const query = event.target.value.trim().toLowerCase();
            if (typeof window.renderPosts === "function") {
                window.renderPosts(query);
            }
            if (typeof window.performSearch === "function") {
                window.performSearch(event.target.value.trim());
            }
        });
    }

    document.querySelectorAll(".nav-item[data-view], .menu-item[data-view]").forEach((item) => {
        item.addEventListener("click", () => {
            handleSidebarAction(item.dataset.view);
        });
    });
}

function setActiveMenuItem(view) {
    document.querySelectorAll(".nav-item, .menu-item").forEach((item) => {
        const isActive = item.dataset.view === view;
        item.classList.toggle("active", isActive);
    });
}

function setActiveView(view) {
    setActiveMenuItem(view);

    const explorePanel = document.getElementById("explorePanel");
    const postsContainer = document.getElementById("postsContainer");
    const searchModal = document.getElementById("searchModal");
    const createModal = document.getElementById("createModal");

    if (view === "explore") {
        if (explorePanel) {
            explorePanel.style.display = "block";
        }
        if (postsContainer) {
            postsContainer.style.display = "none";
        }
        if (typeof window.loadExploreFeed === "function") {
            window.loadExploreFeed();
        }
    } else {
        if (explorePanel) {
            explorePanel.style.display = "none";
        }
        if (postsContainer) {
            postsContainer.style.display = "block";
        }
    }

    if (searchModal) {
        searchModal.style.display = view === "search" ? "flex" : "none";
    }

    if (createModal) {
        createModal.style.display = view === "create" ? "flex" : "none";
    }
}

function handleSidebarAction(view) {
    if (view === "home") {
        setActiveView("home");
        return;
    }

    if (view === "search") {
        setActiveView("search");
        const input = document.getElementById("searchModalInput");
        if (input) {
            input.focus();
            if (typeof window.performSearch === "function") {
                window.performSearch(input.value.trim());
            }
        }
        return;
    }

    if (view === "explore") {
        setActiveView("explore");
        return;
    }

    if (view === "notifications") {
        setActiveView("home");
        toggleNotifications();
        return;
    }

    if (view === "messages") {
        setActiveView("home");
        toggleMessages();
        return;
    }

    if (view === "create") {
        setActiveView("create");
        return;
    }

    if (view === "profile") {
        openProfileModalFromCurrentUser();
        return;
    }

    if (view === "logout") {
        logout();
    }
}

function openSearchModal(query = "") {
    const modal = document.getElementById("searchModal");
    const input = document.getElementById("searchModalInput");
    if (modal) modal.style.display = "flex";
    if (input) {
        input.value = query;
        input.focus();
        if (typeof window.performSearch === "function") {
            window.performSearch(query);
        }
    }
}

function closeSearchModal() {
    const modal = document.getElementById("searchModal");
    if (modal) modal.style.display = "none";
}

function openCreateModal() {
    const modal = document.getElementById("createModal");
    if (modal) modal.style.display = "flex";
}

function closeCreateModal() {
    const modal = document.getElementById("createModal");
    if (modal) modal.style.display = "none";
}

function focusCreatePost() {
    closeCreateModal();
    const textarea = document.getElementById("postContent");
    if (textarea) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

function closeProfileView() {
    const overlay = document.getElementById("profileOverlay");
    if (overlay) {
        overlay.style.display = "none";
    }
}

function openProfileModalFromCurrentUser() {
    if (typeof window.openProfileModal === "function") {
        window.openProfileModal(window.appState?.currentUser?._id || window.appState?.currentUser?.id);
    }
}

function openEditProfileModal() {
    const modal = document.getElementById("profileEditModal");
    if (!modal) return;
    const currentUser = window.appState?.currentUser;
    if (!currentUser) return;
    document.getElementById("editProfileImage").value = currentUser.profilePicture || "";
    document.getElementById("editUsername").value = currentUser.username || "";
    document.getElementById("editFullName").value = currentUser.fullName || "";
    document.getElementById("editBio").value = currentUser.bio || "";
    document.getElementById("editWebsite").value = currentUser.website || "";
    document.getElementById("editLocation").value = currentUser.location || "";
    modal.style.display = "flex";
}

function closeEditProfileModal() {
    const modal = document.getElementById("profileEditModal");
    if (modal) modal.style.display = "none";
}

function closeSuggestedModal() {
    const modal = document.getElementById("suggestedUsersModal");
    if (modal) modal.style.display = "none";
}

function setSuggestedSort(sort) {
    window.appState.suggestedSort = sort;
    document.querySelectorAll(".suggested-sort-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.sort === sort);
    });
    if (typeof window.renderSuggestedModal === "function") {
        window.renderSuggestedModal();
    }
}

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "block" ? "none" : "block";
    if (typeof window.markNotificationsRead === "function") {
        window.markNotificationsRead();
    }
}

function toggleMessages() {
    const panel = document.getElementById("messagePanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function closeStoryViewer() {
    const viewer = document.getElementById("storyViewer");
    if (viewer) viewer.style.display = "none";
}

function renderSuggestedUsers() {
    if (typeof window.renderSuggestedAccounts === "function") {
        window.renderSuggestedAccounts();
        return;
    }

    const target = document.getElementById("suggestedUsers");
    if (!target) return;

    target.innerHTML = "";
}

function toggleFollow(userId) {
    if (typeof window.handleSuggestedFollowToggle === "function" && userId) {
        window.handleSuggestedFollowToggle(userId);
        return;
    }

    if (typeof window.handleFollowToggle === "function") {
        window.handleFollowToggle();
    }
}

function initializeHomePage() {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
        window.location.href = "index.html";
        return;
    }

    appState.currentUser = JSON.parse(storedUser);
    appState.currentUser.followingCount = Number(
        appState.currentUser.followingCount ?? (appState.currentUser.following || []).length ?? 0
    );

    bindEvents();
    setActiveView("home");
    renderSuggestedUsers();

    if (typeof window.renderProfile === "function") {
        window.renderProfile();
    }

    if (typeof window.loadUsers === "function") {
        window.loadUsers();
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeEditProfileModal();
            closeSuggestedModal();
            closeProfileView();
        }
    });

    document.addEventListener("click", (event) => {
        const overlay = document.getElementById("profileOverlay");
        const editModal = document.getElementById("profileEditModal");
        const suggestedModal = document.getElementById("suggestedUsersModal");
        if (overlay && overlay.style.display === "flex" && event.target === overlay) {
            closeProfileView();
        }
        if (editModal && editModal.style.display === "flex" && event.target === editModal) {
            closeEditProfileModal();
        }
        if (suggestedModal && suggestedModal.style.display === "flex" && event.target === suggestedModal) {
            closeSuggestedModal();
        }
    });

    if (typeof window.loadPosts === "function") {
        window.loadPosts();
    }

    if (typeof window.loadStories === "function") {
        window.loadStories();
    }

    if (typeof window.loadNotifications === "function") {
        window.loadNotifications();
    }

    if (typeof window.loadConversations === "function") {
        window.loadConversations();
    }
}

window.addEventListener("DOMContentLoaded", initializeHomePage);
window.logout = logout;
window.closeProfileView = closeProfileView;
window.openProfileModalFromCurrentUser = openProfileModalFromCurrentUser;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.closeSuggestedModal = closeSuggestedModal;
window.setSuggestedSort = setSuggestedSort;
window.toggleFollow = toggleFollow;
window.renderSuggestedUsers = renderSuggestedUsers;
window.toggleNotifications = toggleNotifications;
window.toggleMessages = toggleMessages;
window.closeStoryViewer = closeStoryViewer;
window.setActiveView = setActiveView;
window.handleSidebarAction = handleSidebarAction;
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.focusCreatePost = focusCreatePost;