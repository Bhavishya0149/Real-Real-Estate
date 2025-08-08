import multer from "multer";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

// Defaults from .env or fallbacks
const MAX_PHOTO_SIZE_MB = parseInt(process.env.MAX_PHOTO_SIZE_MB) || 5;   // default 5MB
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB) || 100; // default 100MB

// Storage configuration (same as your existing one)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Filter for photos
const photoFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
        return cb(new ApiError(400, "Invalid photo format. Allowed: JPEG, PNG, WebP"));
    }
    cb(null, true);
};

// Filter for videos
const videoFilter = (req, file, cb) => {
    if (file.mimetype !== "video/mp4") {
        return cb(new ApiError(400, "Invalid video format. Allowed: MP4 only"));
    }
    cb(null, true);
};

// Multer instances for photos and videos with size limits
export const uploadPhotos = multer({
    storage,
    fileFilter: photoFilter,
    limits: { fileSize: MAX_PHOTO_SIZE_MB * 1024 * 1024 }
});

export const uploadVideo = multer({
    storage,
    fileFilter: videoFilter,
    limits: { fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024 }
});
