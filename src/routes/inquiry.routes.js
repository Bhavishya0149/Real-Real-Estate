import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createInquiry,
    getInquiriesForProperty,
    getUserInquiries,
    deleteInquiry
} from "../controllers/inquiry.controller.js";
import { verifyOwnerAndAdmin } from "../middlewares/verifyOwnerAndAdmin.middleware.js";

const router = Router();

router.post("/", verifyJWT, createInquiry);

router.get("/property/:propertyId", verifyJWT, verifyOwnerAndAdmin, getInquiriesForProperty);

router.get("/my", verifyJWT, getUserInquiries);
router.delete("/:id", verifyJWT, deleteInquiry);

export default router;
