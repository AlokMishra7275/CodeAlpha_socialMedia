(function () {
    const BASE_URL = window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"));

    async function loadNotifications() {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;

        try {
            const response = await fetch(`${BASE_URL}/api/notifications/${currentUser._id}`);
            const notifications = await response.json();
            const badge = document.getElementById("notificationBadge");
            const list = document.getElementById("notificationList");
            const unreadCount = (notifications || []).filter((item) => !item.read).length;
            if (badge) badge.textContent = unreadCount;
            if (list) {
                list.innerHTML = (notifications || []).slice(0, 6).map((item) => `
                    <div class="notification-item">
                        <strong>${item.sender?.username || "User"}</strong>
                        <span>${item.message || item.type}</span>
                    </div>
                `).join("");
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function markNotificationsRead() {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;
        await fetch(`${BASE_URL}/api/notifications/read/${currentUser._id}`, { method: "PUT" });
        loadNotifications();
    }

    window.loadNotifications = loadNotifications;
    window.markNotificationsRead = markNotificationsRead;
})();
