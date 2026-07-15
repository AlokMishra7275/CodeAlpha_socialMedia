const express = require("express");
const router = express.Router();
const storyUpload = require("../middleware/storyUpload");
const {
    createStory,
    getStories,
    getStoriesByUser,
    viewStory,
    deleteStory
} = require("../controllers/storyController");

router.post("/", storyUpload.single("media"), createStory);
router.get("/", getStories);
router.get("/user/:id", getStoriesByUser);
router.put("/view/:storyId", viewStory);
router.delete("/:id", deleteStory);

module.exports = router;
