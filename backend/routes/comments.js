const express = require("express");
const Comment = require("../models/Comment");

const router = express.Router();

/*
==========================================
Add Comment
POST /api/comments
==========================================
*/
router.post("/", async (req, res) => {

    try {

        const { post, user, text } = req.body;

        const newComment = new Comment({
            post,
            user,
            text
        });

        await newComment.save();

        res.status(201).json({
            message: "Comment added successfully",
            comment: newComment
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

/*
==========================================
Get Comments of a Post
GET /api/comments/:postId
==========================================
*/
router.get("/:postId", async (req, res) => {

    try {

        const comments = await Comment.find({
            post: req.params.postId
        }).populate("user", "username email");

        res.json(comments);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
// Get all comments
router.get("/", async (req, res) => {
    try {
        const comments = await Comment.find()
            .populate("user", "username email")
            .populate("post", "content");

        res.json(comments);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;