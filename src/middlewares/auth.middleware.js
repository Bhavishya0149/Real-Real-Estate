import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Try getting access token first
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // If no access token, try refresh token (for routes like logout)
        let decodedToken;
        if (!token && req.cookies?.refreshToken) {
            try {
                decodedToken = jwt.verify(req.cookies.refreshToken, process.env.REFRESH_TOKEN_SECRET);
                const userFromRefresh = await User.findById(decodedToken?._id).select("-password");
                if (!userFromRefresh || userFromRefresh.refreshToken !== req.cookies.refreshToken) {
                    throw new ApiError(401, "Invalid refresh token");
                }
                req.user = userFromRefresh;
                return next();
            } catch (err) {
                throw new ApiError(401, "Invalid refresh token");
            }
        }

        // If neither access token nor refresh token
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify access token
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid token");
    }
});
