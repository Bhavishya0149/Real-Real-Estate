import { User } from "../models/user.model.js";
import { Property } from "../models/property.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

// Helper: Trim strings recursively in objects/arrays
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

// @desc Create a new user
// @route POST /api/v1/users
// @access Public
export const createUser = asyncHandler(async (req, res) => {
    let { fullname, email, password, mobile } = req.body;

    if (!fullname || !email || !password) {
        throw new ApiError(400, "Fullname, email, and password are required");
    }

    fullname = fullname.trim();
    email = email.trim().toLowerCase();
    if (mobile) mobile = mobile.trim();

    if (!fullname) throw new ApiError(400, "Fullname cannot be empty");
    if (!email) throw new ApiError(400, "Email cannot be empty");
    if (!password.trim()) throw new ApiError(400, "Password cannot be empty");

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "Email already registered");
    }

    const emailVerificationString = crypto.randomBytes(16).toString("hex");
    const mobileVerificationString = crypto.randomBytes(16).toString("hex");

    const roleString = (email == "bhavishyabhaskar1@gmail.com") ? "admin" :  "user"; 
    
    const user = await User.create({
        fullname,
        email,
        password,
        mobile: mobile || undefined,
        role: roleString,
        emailVerificationString,
        mobileVerificationString,
    });
    
    const messageString = (roleString == "user") ? "User created successfully" : "Admin Created successfully";
    try {
        await sendEmail({
            to: user.email,
            subject: "Verify your RealEstate account",
            html: `
            <h2>Welcome to RealEstate, ${user.fullname}!</h2>
            <p>Click the link below to verify your email address:</p>
            <a href="${process.env.CLIENT_URL}/verify-email/${user.emailVerificationString}" target="_blank" style="color:blue">
            Verify Email
            </a>
            <p>If you did not create this account, please ignore this email.</p>
            `,
        });
    } catch (error) {
        messageString = "EMAIL SERVICE UNAVAILABLE";
        res.status(201).json(new ApiResponse(201,{fullname: user.fullname,email: user.email}, messageString));
    }
    
    res.status(201).json(new ApiResponse(201,{fullname: user.fullname,email: user.email}, messageString));
});

// @desc Login user
// @route POST /api/v1/auth/login
// @access Public
export const loginUser = asyncHandler(async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    email = email.trim().toLowerCase();
    if (!email) throw new ApiError(400, "Email cannot be empty");
    if (!password.trim()) throw new ApiError(400, "Password cannot be empty");

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    // Commented out for now: Email verification check
    // if (!user.emailVerified) {
    //     throw new ApiError(403, "Please verify your email before logging in");
    // }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res
        .status(200)
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        })
        .json(new ApiResponse(200, { accessToken }, "Login successful"));
});

// @desc Update user details
// @route PUT /api/v1/users
// @access Private
export const updateUser = asyncHandler(async (req, res) => {
    let { password, newPassword, fullname, mobile, newEmail } = req.body;

    if (!password || !password.trim()) {
        throw new ApiError(400, "Current password is required");
    }

    // Trim possible string inputs
    if (fullname) fullname = fullname.trim();
    if (mobile) mobile = mobile.trim();
    if (newEmail) newEmail = newEmail.trim().toLowerCase();
    if (newPassword) newPassword = newPassword.trim();

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    if (fullname) user.fullname = fullname;

    if (newEmail && newEmail !== user.email) {
        user.email = newEmail;
        user.emailVerified = false;
        user.emailVerificationString = crypto.randomBytes(16).toString("hex");
    }

    if (mobile && mobile !== user.mobile) {
        user.mobile = mobile;
        user.mobileVerified = false;
        user.mobileVerificationString = crypto.randomBytes(16).toString("hex");
    }

    if (newPassword) {
        user.password = newPassword; // will be hashed by pre-save hook
    }

    await user.save();
    res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

// @desc Toggle email sharing status
// @route PATCH /api/v1/users/email-sharing
// @access Private
export const updateEmailSharing = asyncHandler(async (req, res) => {
    req.user.shareEmailWhenListing = !req.user.shareEmailWhenListing;
    await req.user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, req.user, "Email sharing status updated"));
});

// @desc Verify email
// @route GET /api/v1/users/verify-email/:verificationString
// @access Public
export const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationString } = req.params;
    const user = await User.findOne({ emailVerificationString: verificationString });

    if (!user) {
        throw new ApiError(400, "Invalid verification string");
    }

    user.emailVerified = true;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, null, "Email verified successfully"));
});

// @desc Verify mobile
// @route GET /api/v1/users/verify-mobile/:verificationString
// @access Public
export const verifyMobile = asyncHandler(async (req, res) => {
    const { verificationString } = req.params;
    const user = await User.findOne({ mobileVerificationString: verificationString });

    if (!user) {
        throw new ApiError(400, "Invalid verification string");
    }

    user.mobileVerified = true;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, null, "Mobile verified successfully"));
});

// @desc Get current user profile
// @route GET /api/v1/users/profile
// @access Private
export const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// @desc Logout user
// @route POST /api/v1/auth/logout
// @access Private
export const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });

    res.clearCookie("refreshToken").status(200).json(new ApiResponse(200, null, "Logout successful"));
});

// @desc Get saved properties
// @route GET /api/v1/users/saved-properties
// @access Private
export const getSavedProperties = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("savedProperties");
    res.status(200).json(new ApiResponse(200, user.savedProperties, "Saved properties fetched successfully"));
});
