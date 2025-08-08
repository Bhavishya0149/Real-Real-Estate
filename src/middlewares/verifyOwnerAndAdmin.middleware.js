import { Property } from "../models/property.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc Middleware to ensure user is both the owner of the property AND an admin
// @usage Place after verifyJWT in routes
export const verifyOwnerAndAdmin = asyncHandler(async (req, res, next) => {
    const propertyId = req.params.id || req.body.propertyId;

    if (!propertyId) {
        throw new ApiError(400, "Property ID is required");
    }

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    if (req.user._id.toString() !== property.owner.toString() || req.user.role !== "admin") {
        throw new ApiError(403, "You are not authorized to perform this action");
    }

    next();
});
