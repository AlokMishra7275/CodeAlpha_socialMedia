const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const upload = require("../middleware/upload");

const router = express.Router();

/*
==========================================
Create Post
POST /api/posts
==========================================
*/
router.post("/", upload.single("media"), async (req, res) => {
    try {
        const { user, content } = req.body;

        let image = "";
        let video = "";

        if (req.file) {
            if (req.file.mimetype.startsWith("image")) {
                image = "/uploads/images/" + req.file.filename;
            } else if (req.file.mimetype.startsWith("video")) {
                video = "/uploads/videos/" + req.file.filename;
            }
        }

        const newPost = new Post({
            user,
            content,
            image,
            video
        });

        await newPost.save();

        res.status(201).json({
            message: "Post created successfully",
            post: newPost
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/*
==========================================
Get All Posts
GET /api/posts
==========================================
*/
router.get("/explore", async (req, res) => {
    try {
        const [posts, users] = await Promise.all([
            Post.find()
                .populate("user", "username profilePicture")
                .sort({ createdAt: -1 })
                .limit(12),
            User.find().select("-password").limit(6)
        ]);

        res.status(200).json({ posts, users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/search", async (req, res) => {
    try {
        const query = (req.query.q || "").trim();

        if (!query) {
            return res.json({ users: [], posts: [] });
        }

        const [users, posts] = await Promise.all([
            User.find({
                $or: [
                    { username: { $regex: query, $options: "i" } },
                    { fullName: { $regex: query, $options: "i" } },
                    { bio: { $regex: query, $options: "i" } }
                ]
            }).select("-password").limit(6),
            Post.find({ content: { $regex: query, $options: "i" } })
                .populate("user", "username profilePicture")
                .sort({ createdAt: -1 })
                .limit(8)
        ]);

        res.json({ users, posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("user", "username profilePicture")
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/*
==========================================
Toggle Like / Unlike a Post
PUT /api/posts/like/:id
==========================================
*/
router.put("/like/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const alreadyLiked = post.likes.some((like) => like.toString() === userId);
        if (alreadyLiked) {
            post.likes = post.likes.filter((like) => like.toString() !== userId);
            await post.save();
            return res.json({ message: "Post unliked successfully", liked: false, likes: post.likes.length });
        }

        post.likes.push(userId);
        await post.save();

        res.json({ message: "Post liked successfully", liked: true, likes: post.likes.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/save/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const postId = req.params.id;
        const alreadySaved = user.savedPosts.some((savedId) => savedId.toString() === postId);
        if (alreadySaved) {
            user.savedPosts = user.savedPosts.filter((savedId) => savedId.toString() !== postId);
        } else {
            user.savedPosts.push(postId);
        }

        await user.save();
        res.json({ message: alreadySaved ? "Post removed from saves" : "Post saved successfully", saved: !alreadySaved });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (req.body.content !== undefined) {
            post.content = req.body.content;
        }

        await post.save();
        res.json({ message: "Post updated successfully", post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;