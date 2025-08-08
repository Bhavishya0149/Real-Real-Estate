import { Inquiry } from "../models/inquiry.model.js";
import { Property } from "../models/property.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper: Trim strings in object or standalone
const trimString = (value) => (typeof value === "string" ? value.trim() : value);

// Cooldown in ms (5 minutes)
const INQUIRY_COOLDOWN_MS = 5 * 60 * 1000;

// @desc Create inquiry for a property
// @route POST /api/v1/inquiries
// @access Private
export const createInquiry = asyncHandler(async (req, res) => {
    let { propertyId, message } = req.body;

    if (!propertyId) {
        throw new ApiError(400, "Property ID is required");
    }

    propertyId = trimString(propertyId);
    if (message) message = trimString(message);

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    // Prevent inquiry spam: Check last inquiry time for same property by same user
    const recentInquiry = await Inquiry.findOne({
        property: property._id,
        buyer: req.user._id
    }).sort({ createdAt: -1 });

    if (recentInquiry) {
        const timeSinceLastInquiry = Date.now() - recentInquiry.createdAt.getTime();
        if (timeSinceLastInquiry < INQUIRY_COOLDOWN_MS) {
            throw new ApiError(
                429,
                `You can send another inquiry for this property after ${Math.ceil(
                    (INQUIRY_COOLDOWN_MS - timeSinceLastInquiry) / 60000
                )} minutes`
            );
        }
    }

    const inquiry = await Inquiry.create({
        property: property._id,
        buyer: req.user._id,
        seller: property.owner,
        message
    });

    res.status(201).json(new ApiResponse(201, inquiry, "Inquiry created successfully"));
});

// @desc Get inquiries for a property
// @route GET /api/v1/inquiries/property/:propertyId
// @access Private (Owner + Admin)
export const getInquiriesForProperty = asyncHandler(async (req, res) => {
    const propertyId = trimString(req.params.propertyId);

    const inquiries = await Inquiry.find({ property: propertyId })
        .populate("buyer", "fullname email")
        .populate("seller", "fullname email");

    res.status(200).json(new ApiResponse(200, inquiries, "Inquiries fetched successfully"));
});

// @desc Get inquiries for current user (as buyer)
// @route GET /api/v1/inquiries/my
// @access Private
export const getUserInquiries = asyncHandler(async (req, res) => {
    const inquiries = await Inquiry.find({ buyer: req.user._id })
        .populate("property", "title price");

    res.status(200).json(new ApiResponse(200, inquiries, "User inquiries fetched successfully"));
});

// @desc Delete inquiry
// @route DELETE /api/v1/inquiries/:id
// @access Private (Buyer or Admin)
export const deleteInquiry = asyncHandler(async (req, res) => {
    const inquiryId = trimString(req.params.id);

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
        throw new ApiError(404, "Inquiry not found");
    }

    if (inquiry.buyer.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "Not authorized to delete this inquiry");
    }

    await inquiry.deleteOne();
    res.status(200).json(new ApiResponse(200, null, "Inquiry deleted successfully"));
});
