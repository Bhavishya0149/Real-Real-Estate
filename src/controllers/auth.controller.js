import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// @desc Refresh access and refresh tokens
// @route POST /api/v1/auth/refresh-token
// @access Public
// @steps
//  1. Extract refresh token from cookies or body.
//  2. Verify token signature and match with DB.
//  3. If valid, generate new access + refresh tokens.
//  4. Save new refresh token in DB.
//  5. Send tokens to client (refresh token in HttpOnly cookie).
// @usage
//  POST /api/v1/auth/refresh-token
//  Body: { refreshToken: "<token>" }
export const refreshTokens = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token missing");
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decoded?._id);
    if (!user) {
        throw new ApiError(401, "User not found");
    }

    if (user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token does not match");
    }

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res
    .status(200)
    .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    })
    .json(
        new ApiResponse(
        200,
        { accessToken, refreshToken }, // <- include it here
        "Login successful"
        )
    );
});
