(function () {
    const BASE_URL = window.BASE_URL || (window.location.origin.includes("5503") ? window.location.origin : (window.location.origin.replace(/:\d+$/, "") + ":5503"));

    async function loadConversations() {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;
        const target = document.getElementById("conversationList");
        if (!target) return;
        try {
            const response = await fetch(`${BASE_URL}/api/messages/conversations/${currentUser._id}`);
            const conversations = await response.json();
            target.innerHTML = (conversations || []).map((conversation) => `
                <div class="conversation-item" onclick="openConversation('${conversation._id}')">
                    <span>${conversation.lastMessage || "Start a conversation"}</span>
                </div>
            `).join("");
        } catch (error) {
            console.error(error);
        }
    }

    async function sendMessage(receiverId, text) {
        const currentUser = window.appState?.currentUser;
        if (!currentUser) return;
        await fetch(`${BASE_URL}/api/messages`, {
            method: "POST",
            body: JSON.stringify({ sender: currentUser._id, receiver: receiverId, text }),
            headers: { "Content-Type": "application/json" }
        });
        loadConversations();
    }

    window.loadConversations = loadConversations;
    window.sendMessage = sendMessage;
})();
