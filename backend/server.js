const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const storyRoutes = require("./routes/stories");
const storyRoutesNew = require("./routes/storyRoutes");
const notificationRoutes = require("./routes/notifications");
const messageRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const uploadDirs = [
    path.join(__dirname, "uploads", "images"),
    path.join(__dirname, "uploads", "videos")
];

uploadDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        console.error("Invalid JSON payload", req.method, req.originalUrl);
        return res.status(400).json({ message: "Invalid JSON payload" });
    }
    next(err);
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/stories", express.static(path.join(__dirname, "uploads", "stories")));
app.use(express.static(path.join(__dirname, "..", "frontent")));

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/minisocial";

mongoose.connect(mongoUrl, { autoIndex: true })
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => {
        console.log("MongoDB Connection Error:", err.message);
    });

io.on("connection", (socket) => {
    socket.on("join", (userId) => socket.join(userId));
    socket.on("typing", (payload) => socket.to(payload.receiver).emit("typing", payload));
    socket.on("message", (payload) => socket.to(payload.receiver).emit("newMessage", payload));
    socket.on("notification", (payload) => socket.to(payload.receiver).emit("newNotification", payload));
});

app.set("io", io);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/story", storyRoutesNew);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);

// Default Route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontent", "index.html"));
});

// Start Server
const PORT = Number(process.env.PORT || 5501);

const startServer = (port) => {
    server.listen(port, () => {
        console.log(`Server Running on Port ${port}`);
    });
};

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        const fallbackPort = PORT + 1;
        console.log(`Port ${PORT} is busy. Trying ${fallbackPort} instead.`);
        startServer(fallbackPort);
    } else {
        console.error(error);
    }
});

startServer(PORT);