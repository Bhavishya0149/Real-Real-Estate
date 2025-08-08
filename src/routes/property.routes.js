import express from "express";
import {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    uploadPropertyPhotos,
    uploadPropertyVideo,
    deletePropertyPhoto,
    deletePropertyVideo,
    incrementViewCount,
    toggleSaveProperty
} from "../controllers/property.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyOwnerAndAdmin } from "../middlewares/verifyOwnerAndAdmin.middleware.js";
import { uploadPhotos, uploadVideo } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/properties", getAllProperties);
router.get("/properties/:id", getPropertyById);
router.patch("/properties/:id/views", incrementViewCount);

router.post("/properties", verifyJWT, createProperty);
router.put("/properties/:id", verifyJWT, verifyOwnerAndAdmin, updateProperty);
router.delete("/properties/:id", verifyJWT, verifyOwnerAndAdmin, deleteProperty);

router.post("/properties/:id/photos", verifyJWT, verifyOwnerAndAdmin, uploadPhotos.array("photos"), uploadPropertyPhotos);
router.post("/properties/:id/video", verifyJWT, verifyOwnerAndAdmin, uploadVideo.single("video"), uploadPropertyVideo);

router.delete("/properties/:id/photos/:photoId", verifyJWT, verifyOwnerAndAdmin, deletePropertyPhoto);
router.delete("/properties/:id/video/:videoId", verifyJWT, verifyOwnerAndAdmin, deletePropertyVideo);

router.post("/properties/:id/save", verifyJWT, toggleSaveProperty);

export default router;
