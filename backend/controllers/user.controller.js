import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

/**
 * Register a new User (Student or Recruiter)
 * Supports optional profile photo upload via Cloudinary
 */
export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: "User already exists with this email.",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let profilePhotoUrl = "";
        if (req.file) {
            try {
                const fileUri = getDataUri(req.file);
                const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                    resource_type: "auto"
                });
                profilePhotoUrl = cloudResponse.secure_url;
            } catch (uploadErr) {
                console.warn("[Register Photo Upload Warning]:", uploadErr.message);
                // Fallback to inline data URI for small images
                if (req.file.size <= 2 * 1024 * 1024) {
                    const fileUri = getDataUri(req.file);
                    profilePhotoUrl = fileUri.content;
                }
            }
        }

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: profilePhotoUrl,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

/**
 * Authenticate User & issue HTTP-only JWT cookie
 */
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            });
        }

        const tokenData = {
            userId: user._id
        };
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile,
            savedJobs: user.savedJobs || []
        };

        return res.status(200).cookie("token", token, {
            maxAge: 1 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'strict'
        }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error during login.",
            success: false
        });
    }
};

/**
 * Clear authentication cookie on logout
 */
export const logout = async (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error during logout.",
            success: false
        });
    }
};

/**
 * Update User Profile (Works for both Students and Recruiters)
 * - Uses DataURI for PDF resumes (<= 4MB) so Chrome's PDF viewer NEVER fails with Cloudinary 401/404 PDF restrictions
 * - Uses Cloudinary (with DataURI fallback) for profile photos
 */
export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills, profilePhotoUrl } = req.body;

        const userId = req.id;
        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            });
        }

        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (bio !== undefined) user.profile.bio = bio;

        if (skills !== undefined) {
            const skillsArray = skills ? skills.split(",").map(skill => skill.trim()).filter(Boolean) : [];
            user.profile.skills = skillsArray;
        }

        // Allow setting profile photo via direct URL if provided
        if (profilePhotoUrl && profilePhotoUrl.trim()) {
            user.profile.profilePhoto = profilePhotoUrl.trim();
        }

        // Handle file upload (Image -> profilePhoto, PDF -> resume)
        if (req.file) {
            const fileUri = getDataUri(req.file);
            const isImage = req.file.mimetype && req.file.mimetype.startsWith("image/");

            if (isImage) {
                try {
                    const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                        resource_type: "image"
                    });
                    user.profile.profilePhoto = cloudResponse.secure_url;
                } catch (cloudErr) {
                    console.warn("[Cloudinary Image Upload Fallback]:", cloudErr.message);
                    user.profile.profilePhoto = fileUri.content;
                }
            } else {
                // For PDF resumes: store inline base64 DataURI if under 4.5MB so Chrome PDF viewer
                // renders it reliably without Cloudinary free-tier PDF delivery restrictions!
                if (req.file.size <= 4.5 * 1024 * 1024) {
                    user.profile.resume = fileUri.content;
                    user.profile.resumeOriginalName = req.file.originalname;
                } else {
                    try {
                        const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                            resource_type: "raw"
                        });
                        user.profile.resume = cloudResponse.secure_url;
                        user.profile.resumeOriginalName = req.file.originalname;
                    } catch (cloudErr) {
                        console.warn("[Cloudinary PDF Upload Error]:", cloudErr.message);
                    }
                }
            }
        }

        await user.save();

        const updatedUser = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile,
            savedJobs: user.savedJobs
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: updatedUser,
            success: true
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error during profile update.",
            success: false
        });
    }
};

/**
 * Bookmark or unbookmark a job for later viewing
 */
export const toggleSaveJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        const isAlreadySaved = user.savedJobs.some(id => id.toString() === jobId);

        if (isAlreadySaved) {
            user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
            await user.save();
            return res.status(200).json({
                message: "Job removed from saved items.",
                success: true,
                saved: false
            });
        } else {
            user.savedJobs.push(jobId);
            await user.save();
            return res.status(200).json({
                message: "Job saved successfully.",
                success: true,
                saved: true
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
};

/**
 * Fetch all bookmarked jobs populated with company details
 */
export const getSavedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).populate({
            path: 'savedJobs',
            populate: {
                path: 'company'
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        return res.status(200).json({
            savedJobs: user.savedJobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
};