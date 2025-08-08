import { Property } from "../models/property.model.js";
import { Address } from "../models/address.model.js";
import { Photo } from "../models/photo.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const PHOTO_LIMIT = parseInt(process.env.PHOTO_LIMIT) || 20;
const VIDEO_LIMIT = parseInt(process.env.VIDEO_LIMIT) || 1;

// Helper: Trim all string fields in an object recursively
const trimStringsInObject = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === "string") {
            obj[key] = obj[key].trim();
        } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map(item =>
                typeof item === "string" ? item.trim() : item
            );
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
            trimStringsInObject(obj[key]);
        }
    }
};

// Helper: Validate numeric field
const ensureNumber = (value, fieldName) => {
    if (isNaN(Number(value))) {
        throw new ApiError(400, `${fieldName} must be a valid number`);
    }
    return Number(value);
};

// Helper: Validate coordinates
const ensureCoordinates = (coords) => {
    if (!Array.isArray(coords) || coords.length !== 2 || coords.some(c => isNaN(Number(c)))) {
        throw new ApiError(400, "Coordinates must be an array of two valid numbers");
    }
    return coords.map(Number);
};

// @desc Create new property
// @route POST /api/v1/properties
// @access Private (Owner + Admin)
export const createProperty = asyncHandler(async (req, res) => {
    let { title, description, propertyType, price, area, amenities, coordinates, address } = req.body;

    if (!title || !propertyType || !price || !area || !coordinates || !address) {
        throw new ApiError(400, "Missing required fields");
    }

    if(req.user.role != "admin"){
        throw new ApiError(400, "Only admins can create properties");
    }

    // Trim & validate
    if (typeof title === "string") title = title.trim();
    if (typeof description === "string") description = description.trim();
    if (typeof propertyType === "string") propertyType = propertyType.trim();
    if (Array.isArray(amenities)) amenities = amenities.map(a => typeof a === "string" ? a.trim() : a);
    else amenities = [];

    price = ensureNumber(price, "Price");
    area = ensureNumber(area, "Area");
    coordinates = ensureCoordinates(coordinates);

    if (typeof address !== "object" || Array.isArray(address) || address === null) {
        throw new ApiError(400, "Address must be an object");
    }
    trimStringsInObject(address);

    const newAddress = await Address.create(address);

    const property = await Property.create({
        title,
        description: description || "",
        propertyType,
        price,
        area,
        amenities,
        location: { type: "Point", coordinates },
        address: newAddress._id,
        owner: req.user._id
    });

    res.status(201).json(new ApiResponse(201, property, "Property created successfully"));
});

// @desc Get all properties
// @route GET /api/v1/properties
// @access Public
export const getAllProperties = asyncHandler(async (req, res) => {
    const properties = await Property.find()
        .populate("address")
        .populate("photos")
        .populate("videos");
    res.status(200).json(new ApiResponse(200, properties, "Properties fetched successfully"));
});

// @desc Get property by ID
// @route GET /api/v1/properties/:id
// @access Public
export const getPropertyById = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id)
        .populate("address")
        .populate("photos")
        .populate("videos");
    if (!property) {
        throw new ApiError(404, "Property not found");
    }
    res.status(200).json(new ApiResponse(200, property, "Property fetched successfully"));
});

// @desc Update property
// @route PUT /api/v1/properties/:id
// @access Private (Owner + Admin)
export const updateProperty = asyncHandler(async (req, res) => {
    let { address, price, area, coordinates, ...updates } = req.body;

    trimStringsInObject(updates);

    if (price !== undefined) price = ensureNumber(price, "Price");
    if (area !== undefined) area = ensureNumber(area, "Area");
    if (coordinates !== undefined) coordinates = ensureCoordinates(coordinates);

    const property = await Property.findById(req.params.id);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    if (address !== undefined) {
        if (typeof address !== "object" || Array.isArray(address) || address === null) {
            throw new ApiError(400, "Address must be an object");
        }
        trimStringsInObject(address);
        await Address.findByIdAndUpdate(property.address, address, {
            new: true,
            runValidators: true
        });
    }

    Object.assign(property, updates);
    if (price !== undefined) property.price = price;
    if (area !== undefined) property.area = area;
    if (coordinates !== undefined) property.location.coordinates = coordinates;

    await property.save();

    res.status(200).json(new ApiResponse(200, property, "Property updated successfully"));
});

// @desc Delete property
// @route DELETE /api/v1/properties/:id
// @access Private (Owner + Admin)
export const deleteProperty = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    const photos = await Photo.find({ property: property._id });
    for (const photo of photos) {
        await cloudinary.uploader.destroy(photo.public_id);
    }
    const videos = await Video.find({ property: property._id });
    for (const video of videos) {
        await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });
    }

    await Address.findByIdAndDelete(property.address);
    await Photo.deleteMany({ property: property._id });
    await Video.deleteMany({ property: property._id });
    await property.deleteOne();

    res.status(200).json(new ApiResponse(200, null, "Property deleted successfully"));
});

// @desc Upload photos
// @route POST /api/v1/properties/:id/photos
// @access Private (Owner + Admin)
export const uploadPropertyPhotos = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "No photos uploaded");
    }

    const property = await Property.findById(req.params.id).populate("photos");
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    if (property.photos.length + req.files.length > PHOTO_LIMIT) {
        throw new ApiError(400, `Cannot upload more than ${PHOTO_LIMIT} photos`);
    }

    const uploadedPhotos = [];
    for (const file of req.files) {
        const result = await uploadOnCloudinary(file.path);
        if (result) {
            const photo = await Photo.create({
                property: property._id,
                url: result.secure_url,
                public_id: result.public_id
            });
            property.photos.push(photo._id);
            uploadedPhotos.push(photo);
        }
    }

    await property.save();
    res.status(200).json(new ApiResponse(200, uploadedPhotos, "Photos uploaded successfully"));
});

// @desc Upload video
// @route POST /api/v1/properties/:id/video
// @access Private (Owner + Admin)
export const uploadPropertyVideo = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No video uploaded");
    }

    const property = await Property.findById(req.params.id).populate("videos");
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    if (property.videos.length >= VIDEO_LIMIT) {
        throw new ApiError(400, `Only ${VIDEO_LIMIT} video allowed per property`);
    }

    const result = await uploadOnCloudinary(req.file.path);
    if (result) {
        const video = await Video.create({
            property: property._id,
            url: result.secure_url,
            publicId: result.public_id,
            uploadedBy: req.user._id
        });
        property.videos.push(video._id);
        await property.save();
        res.status(200).json(new ApiResponse(200, video, "Video uploaded successfully"));
    } else {
        throw new ApiError(500, "Video upload failed");
    }
});

// @desc Delete photo
// @route DELETE /api/v1/properties/:id/photos/:photoId
// @access Private (Owner + Admin)
export const deletePropertyPhoto = asyncHandler(async (req, res) => {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
        throw new ApiError(404, "Photo not found");
    }

    await cloudinary.uploader.destroy(photo.public_id);

    const property = await Property.findById(photo.property);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    await photo.deleteOne();
    property.photos.pull(photo._id);
    await property.save();

    res.status(200).json(new ApiResponse(200, null, "Photo deleted successfully"));
});

// @desc Delete video
// @route DELETE /api/v1/properties/:id/video/:videoId
// @access Private (Owner + Admin)
export const deletePropertyVideo = asyncHandler(async (req, res) => {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });

    const property = await Property.findById(video.property);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    await video.deleteOne();
    property.videos.pull(video._id);
    await property.save();

    res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
});

// @desc Increment property view count
// @route PATCH /api/v1/properties/:id/views
// @access Public
export const incrementViewCount = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) {
        throw new ApiError(404, "Property not found");
    }
    property.viewCount += 1;
    await property.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, property.viewCount, "View count incremented"));
});

// @desc Toggle save property
// @route POST /api/v1/properties/:id/save
// @access Private
export const toggleSaveProperty = asyncHandler(async (req, res) => {
    const user = req.user;
    const propertyId = req.params.id;

    const index = user.savedProperties.findIndex(
        id => id.toString() === propertyId
    );

    if (index === -1) {
        user.savedProperties.push(propertyId);
    } else {
        user.savedProperties.splice(index, 1);
    }

    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, null, "Save property status toggled"));
});
