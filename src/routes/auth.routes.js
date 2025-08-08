import express from "express";
import { refreshTokens } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/refresh-token", refreshTokens);

export default router;