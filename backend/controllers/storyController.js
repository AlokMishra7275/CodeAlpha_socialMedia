const fs = require("fs");
const path = require("path");
const Story = require("../models/Story");

function buildStoryResponse(story) {
    const storyObj = story.toObject ? story.toObject() : { ...story };
    storyObj.viewsCount = Array.isArray(storyObj.views) ? storyObj.views.length : 0;
    return storyObj;
}

async function createStory(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a story image or video" });
        }

        const { user, caption } = req.body;
        const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
        const media = `/uploads/stories/${req.file.filename}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const story = await Story.create({
            user,
            media,
            mediaType,
            caption: caption || "",
            expiresAt,
            views: []
        });

        const populated = await Story.findById(story._id)
            .populate("user", "username profilePicture")
            .populate("views.user", "username profilePicture");

        res.status(201).json({ message: "Story uploaded successfully", story: buildStoryResponse(populated) });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "..", "uploads", "stories", req.file.filename);
            fs.existsSync(filePath) && fs.unlinkSync(filePath);
        }
        res.status(500).json({ message: error.message });
    }
}

async function getStories(req, res) {
    try {
        const stories = await Story.find({ expiresAt: { $gt: new Date() } })
            .populate("user", "username profilePicture")
            .populate("views.user", "username profilePicture")
            .sort({ createdAt: -1 });

        res.json(stories.map(buildStoryResponse));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function getStoriesByUser(req, res) {
    try {
        const stories = await Story.find({ user: req.params.id, expiresAt: { $gt: new Date() } })
            .populate("user", "username profilePicture")
            .populate("views.user", "username profilePicture")
            .sort({ createdAt: -1 });

        res.json(stories.map(buildStoryResponse));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function viewStory(req, res) {
    try {
        const { userId } = req.body;
        const story = await Story.findById(req.params.storyId);

        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }

        const alreadyViewed = story.views.some((view) => view.user?.toString() === userId);
        if (!alreadyViewed && userId) {
            story.views.push({ user: userId, viewedAt: new Date() });
            await story.save();
        }

        const populated = await Story.findById(story._id)
            .populate("user", "username profilePicture")
            .populate("views.user", "username profilePicture");

        res.json({ message: "Story view recorded", story: buildStoryResponse(populated) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function deleteStory(req, res) {
    try {
        const { userId } = req.body;
        const story = await Story.findById(req.params.id);

        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }

        if (story.user.toString() !== userId) {
            return res.status(403).json({ message: "You can only delete your own stories" });
        }

        if (story.media) {
            const filePath = path.join(__dirname, "..", story.media.replace(/^\//, ""));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Story.findByIdAndDelete(req.params.id);
        res.json({ message: "Story deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createStory,
    getStories,
    getStoriesByUser,
    viewStory,
    deleteStory
};
