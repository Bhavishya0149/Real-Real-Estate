import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import propertyRoutes from "./property.routes.js";
import inquiryRoutes from "./inquiry.routes.js";

const router = express.Router();

router.use(authRoutes);
router.use(userRoutes);
router.use(propertyRoutes);
router.use(inquiryRoutes);

export default router;
