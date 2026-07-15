const multer = require("multer");
const path = require("path");

// Storage configuration
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        if (file.mimetype.startsWith("image")) {
            cb(null, "uploads/images");
        }
        else if (file.mimetype.startsWith("video")) {
            cb(null, "uploads/videos");
        }
        else {
            cb(new Error("Unsupported file type"));
        }

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

const upload = multer({ storage });

module.exports = upload;