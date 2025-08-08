import express from "express";
import {
    createUser,
    loginUser,
    updateUser,
    updateEmailSharing,
    verifyEmail,
    verifyMobile,
    getCurrentUser,
    logoutUser,
    getSavedProperties
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/users", createUser); // POST /api/v1/users
router.post("/auth/login", loginUser); // POST /api/v1/auth/login
router.get("/users/verify-email/:verificationString", verifyEmail); // GET /api/v1/users/verify-email/:verificationString
router.get("/users/verify-mobile/:verificationString", verifyMobile); // GET /api/v1/users/verify-mobile/:verificationString

// Private routes (JWT required)
router.use(verifyJWT);

router.put("/users", updateUser); // PUT /api/v1/users
router.patch("/users/email-sharing", updateEmailSharing); // PATCH /api/v1/users/email-sharing
router.get("/users/profile", getCurrentUser); // GET /api/v1/users/profile
router.post("/auth/logout", logoutUser); // POST /api/v1/auth/logout
router.get("/users/saved-properties", getSavedProperties); // GET /api/v1/users/saved-properties

export default router;
