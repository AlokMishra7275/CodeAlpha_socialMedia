const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const upload = require("../middleware/upload");

router.post("/", upload.single("media"), async (req, res) => {
    try {
        const { sender, receiver, text } = req.body;
        let conversation = await Conversation.findOne({
            participants: { $all: [sender, receiver] }
        });

        if (!conversation) {
            conversation = await Conversation.create({ participants: [sender, receiver], lastMessage: text || "Media" });
        }

        let media = "";
        if (req.file) {
            media = "/uploads/images/" + req.file.filename;
        }

        const message = await Message.create({
            conversation: conversation._id,
            sender,
            receiver,
            text: text || "",
            media
        });

        conversation.lastMessage = text || (media ? "Media" : "");
        conversation.updatedAt = new Date();
        await conversation.save();

        res.status(201).json({ message, conversation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/:conversationId", async (req, res) => {
    try {
        const messages = await Message.find({ conversation: req.params.conversationId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/conversations/:userId", async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.params.userId }).sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
