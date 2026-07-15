const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const upload = require("../middleware/upload");

const router = express.Router();

function sanitizeUser(user) {
    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;
    safeUser.followingCount = safeUser.following?.length || 0;
    safeUser.followersCount = safeUser.followers?.length || 0;
    return safeUser;
}

/*
==========================================
Register User
POST /api/users/register
==========================================
*/
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, bio } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, and password are required" });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            bio: bio || ""
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: sanitizeUser(newUser)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/*
==========================================
Login User
POST /api/users/login
==========================================
*/
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user._id }, "mySecretKey", { expiresIn: "1d" });

        res.status(200).json({
            message: "Login successful",
            token,
            user: sanitizeUser(user)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/*
==========================================
Follow User
PUT /api/users/follow/:id
==========================================
*/
router.put("/follow/:id", async (req, res) => {
    try {
        const currentUserId = req.body.userId;
        const targetUserId = req.params.id;

        if (currentUserId === targetUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const alreadyFollowing = targetUser.followers.some((id) => id.toString() === currentUserId);
        if (alreadyFollowing) {
            return res.status(400).json({ message: "Already following this user" });
        }

        targetUser.followers.push(currentUserId);
        currentUser.following.push(targetUserId);

        await targetUser.save();
        await currentUser.save();

        res.json({
            message: "User followed successfully",
            following: currentUser.following,
            followers: targetUser.followers
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/unfollow/:id", async (req, res) => {
    try {
        const { userId } = req.body;

        const userToUnfollow = await User.findById(req.params.id);
        const currentUser = await User.findById(userId);

        if (!userToUnfollow || !currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        userToUnfollow.followers = userToUnfollow.followers.filter((id) => id.toString() !== userId);
        currentUser.following = currentUser.following.filter((id) => id.toString() !== req.params.id);

        await userToUnfollow.save();
        await currentUser.save();

        res.json({
            message: "User unfollowed successfully",
            following: currentUser.following,
            followers: userToUnfollow.followers
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==============================
// Get All Users
// GET /api/users
// ==============================
router.get("/", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id", upload.single("profilePicture"), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.file && req.file.mimetype.startsWith("image")) {
            user.profilePicture = "/uploads/images/" + req.file.filename;
        }

        const allowedFields = ["username", "bio", "fullName", "website", "location"];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        if (req.body.profilePicture !== undefined && req.body.profilePicture !== "") {
            user.profilePicture = req.body.profilePicture;
        }

        await user.save();
        res.json({ message: "Profile updated", user: sanitizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(sanitizeUser(user));

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;