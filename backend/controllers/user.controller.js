import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { parseResumeFile, analyzeResumeText } from "../utils/resumeParser.js";
import { logAuditEvent } from "../models/auditLog.model.js";

const hasValidCloudinaryConfig = () => {
    const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) return false;
    if (
        CLOUD_NAME.includes("your_") ||
        API_KEY.includes("your_") ||
        API_SECRET.includes("your_")
    ) {
        return false;
    }
    return true;
};

/**
 * Strips password hash and formats user object for safe frontend Redux storage
 */
const sanitizeUserPayload = (user) => ({
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs || []
});

export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "All required fields must be provided.",
                success: false
            });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists with this email.",
                success: false
            });
        }

        let profilePhotoUrl = "";
        const file = req.file;

        if (file) {
            const fileUri = getDataUri(file);
            if (hasValidCloudinaryConfig()) {
                try {
                    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
                    profilePhotoUrl = cloudResponse.secure_url;
                } catch (uploadErr) {
                    console.warn("Cloudinary upload skipped, using inline data URI fallback:", uploadErr.message);
                    if (file.size <= 2 * 1024 * 1024) {
                        profilePhotoUrl = fileUri.content;
                    }
                }
            } else if (file.size <= 2 * 1024 * 1024) {
                profilePhotoUrl = fileUri.content;
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createdUser = await User.create({
            fullname: fullname.trim(),
            email: normalizedEmail,
            phoneNumber: String(phoneNumber).trim(),
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: profilePhotoUrl
            }
        });

        logAuditEvent({
            req,
            actorId: createdUser._id,
            actorName: createdUser.fullname,
            actorEmail: createdUser.email,
            actorRole: createdUser.role,
            action: "USER_REGISTERED",
            entityType: "User",
            entityId: createdUser._id,
            status: "SUCCESS",
            metadata: { role: createdUser.role }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error during registration.",
            success: false
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Email, password, and role are required.",
                success: false
            });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            logAuditEvent({
                req,
                actorEmail: normalizedEmail,
                actorRole: role,
                action: "USER_LOGIN_FAILED",
                entityType: "Security",
                status: "FAILURE",
                metadata: { reason: "Account not found" }
            });
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            logAuditEvent({
                req,
                actorId: user._id,
                actorName: user.fullname,
                actorEmail: user.email,
                actorRole: user.role,
                action: "USER_LOGIN_FAILED",
                entityType: "Security",
                status: "FAILURE",
                metadata: { reason: "Invalid password" }
            });
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        if (role !== user.role) {
            return res.status(400).json({
                message: `Account doesn't exist with the ${role} role.`,
                success: false
            });
        }

        const tokenData = {
            userId: user._id,
            role: user.role
        };
        const token = jwt.sign(tokenData, process.env.SECRET_KEY || "jobportal_secret_key", {
            expiresIn: "1d"
        });

        logAuditEvent({
            req,
            actorId: user._id,
            actorName: user.fullname,
            actorEmail: user.email,
            actorRole: user.role,
            action: "USER_LOGIN_SUCCESS",
            entityType: "User",
            entityId: user._id,
            status: "SUCCESS"
        });

        return res
            .status(200)
            .cookie("token", token, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production"
            })
            .json({
                message: `Welcome back ${user.fullname}`,
                user: sanitizeUserPayload(user),
                success: true
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error during login.",
            success: false
        });
    }
};

export const logout = async (req, res) => {
    try {
        return res
            .status(200)
            .cookie("token", "", { maxAge: 0, httpOnly: true, sameSite: "lax" })
            .json({
                message: "Logged out successfully.",
                success: true
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Logout failed.",
            success: false
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const {
            fullname,
            email,
            phoneNumber,
            headline,
            bio,
            skills,
            currentLocation,
            preferredLocations,
            experienceYears,
            expectedCtc,
            noticePeriod,
            openToWork,
            profilePhotoUrl,
            parsedResumeText,
            projects,
            experience,
            education,
            socialLinks,
            autoMergeResumeSkills
        } = req.body;

        const userId = req.id;
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        if (fullname) user.fullname = fullname.trim();
        if (email) user.email = String(email).toLowerCase().trim();
        if (phoneNumber) user.phoneNumber = String(phoneNumber).trim();

        if (headline !== undefined) user.profile.headline = headline.trim();
        if (bio !== undefined) user.profile.bio = bio.trim();
        if (currentLocation !== undefined) user.profile.currentLocation = currentLocation.trim();
        if (expectedCtc !== undefined) user.profile.expectedCtc = expectedCtc.trim();
        if (noticePeriod !== undefined) user.profile.noticePeriod = noticePeriod.trim();
        if (experienceYears !== undefined && experienceYears !== "") {
            user.profile.experienceYears = Math.max(0, Number(experienceYears) || 0);
        }
        if (openToWork !== undefined) {
            user.profile.openToWork = openToWork === true || openToWork === "true";
        }

        if (preferredLocations !== undefined) {
            const locList = Array.isArray(preferredLocations)
                ? preferredLocations
                : String(preferredLocations)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
            user.profile.preferredLocations = locList;
        }

        if (skills !== undefined) {
            const skillsArray = Array.isArray(skills)
                ? skills
                : String(skills)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
            user.profile.skills = skillsArray;
        }

        if (profilePhotoUrl && profilePhotoUrl.trim()) {
            user.profile.profilePhoto = profilePhotoUrl.trim();
        }

        const parseJsonField = (val) => {
            if (!val) return null;
            if (typeof val === "object") return val;
            try {
                return JSON.parse(val);
            } catch {
                return null;
            }
        };

        const parsedProjects = parseJsonField(projects);
        if (Array.isArray(parsedProjects)) {
            user.profile.projects = parsedProjects
                .filter((p) => p && p.title && String(p.title).trim())
                .map((p) => ({
                    title: String(p.title).trim(),
                    description: String(p.description || "").trim(),
                    techStack: Array.isArray(p.techStack)
                        ? p.techStack.map((t) => String(t).trim()).filter(Boolean)
                        : String(p.techStack || "")
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                    liveUrl: String(p.liveUrl || "").trim(),
                    githubUrl: String(p.githubUrl || "").trim()
                }));
        }

        const parsedExp = parseJsonField(experience);
        if (Array.isArray(parsedExp)) {
            user.profile.experience = parsedExp
                .filter((e) => e && e.role && e.company)
                .map((e) => ({
                    role: String(e.role).trim(),
                    company: String(e.company).trim(),
                    duration: String(e.duration || "").trim(),
                    description: String(e.description || "").trim()
                }));
        }

        const parsedEdu = parseJsonField(education);
        if (Array.isArray(parsedEdu)) {
            user.profile.education = parsedEdu
                .filter((ed) => ed && ed.degree && ed.institution)
                .map((ed) => ({
                    degree: String(ed.degree).trim(),
                    institution: String(ed.institution).trim(),
                    year: String(ed.year || "").trim(),
                    grade: String(ed.grade || "").trim()
                }));
        }

        const parsedSocial = parseJsonField(socialLinks);
        if (parsedSocial && typeof parsedSocial === "object") {
            user.profile.socialLinks = {
                github: String(parsedSocial.github ?? user.profile.socialLinks?.github ?? "").trim(),
                linkedin: String(parsedSocial.linkedin ?? user.profile.socialLinks?.linkedin ?? "").trim(),
                portfolio: String(parsedSocial.portfolio ?? user.profile.socialLinks?.portfolio ?? "").trim(),
                leetcode: String(parsedSocial.leetcode ?? user.profile.socialLinks?.leetcode ?? "").trim(),
                twitter: String(parsedSocial.twitter ?? user.profile.socialLinks?.twitter ?? "").trim()
            };
        }

        if (parsedResumeText !== undefined && !req.file) {
            const analysis = analyzeResumeText(parsedResumeText, user.profile.resumeOriginalName || "Resume.txt");
            user.profile.parsedResumeText = analysis.parsedText;
            user.profile.extractedSkills = analysis.extractedSkills;
            user.profile.resumeAtsScore = analysis.atsReadinessScore;
            user.profile.resumeParsedAt = new Date();
        }

        const file = req.file;
        let resumeParseResult = null;

        if (file) {
            const isImage = file.mimetype?.startsWith("image/");
            const fileUri = getDataUri(file);

            if (isImage) {
                if (hasValidCloudinaryConfig()) {
                    try {
                        const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                            resource_type: "image"
                        });
                        user.profile.profilePhoto = cloudResponse.secure_url;
                    } catch {
                        if (file.size <= 3 * 1024 * 1024) {
                            user.profile.profilePhoto = fileUri.content;
                        }
                    }
                } else if (file.size <= 3 * 1024 * 1024) {
                    user.profile.profilePhoto = fileUri.content;
                }
            } else {
                resumeParseResult = parseResumeFile(file);
                user.profile.resumeOriginalName = file.originalname;
                user.profile.resumeMimeType = file.mimetype || "application/pdf";
                user.profile.parsedResumeText = resumeParseResult.parsedText;
                user.profile.extractedSkills = resumeParseResult.extractedSkills;
                user.profile.resumeAtsScore = resumeParseResult.atsReadinessScore;
                user.profile.resumeParsedAt = resumeParseResult.parsedAt;

                if (autoMergeResumeSkills !== "false" && resumeParseResult.extractedSkills.length > 0) {
                    const existingSkillsLower = new Set(
                        (user.profile.skills || []).map((s) => s.toLowerCase())
                    );
                    const mergedSkills = [...(user.profile.skills || [])];
                    for (const extracted of resumeParseResult.extractedSkills) {
                        if (!existingSkillsLower.has(extracted.toLowerCase())) {
                            mergedSkills.push(extracted);
                            existingSkillsLower.add(extracted.toLowerCase());
                        }
                    }
                    user.profile.skills = mergedSkills;
                }

                if (resumeParseResult.detectedLinks?.github && !user.profile.socialLinks?.github) {
                    user.profile.socialLinks = {
                        ...(user.profile.socialLinks || {}),
                        github: resumeParseResult.detectedLinks.github
                    };
                }
                if (resumeParseResult.detectedLinks?.linkedin && !user.profile.socialLinks?.linkedin) {
                    user.profile.socialLinks = {
                        ...(user.profile.socialLinks || {}),
                        linkedin: resumeParseResult.detectedLinks.linkedin
                    };
                }
                if (
                    resumeParseResult.estimatedExperienceYears !== null &&
                    !user.profile.experienceYears
                ) {
                    user.profile.experienceYears = resumeParseResult.estimatedExperienceYears;
                }

                if (hasValidCloudinaryConfig()) {
                    try {
                        const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                            resource_type: "auto"
                        });
                        user.profile.resume = cloudResponse.secure_url;
                    } catch {
                        if (file.size <= 4 * 1024 * 1024) {
                            user.profile.resume = fileUri.content;
                        }
                    }
                } else if (file.size <= 4 * 1024 * 1024) {
                    user.profile.resume = fileUri.content;
                } else {
                    user.profile.resume = `parsed://${encodeURIComponent(file.originalname)}`;
                }
            }
        }

        await user.save();

        logAuditEvent({
            req,
            actorId: user._id,
            actorName: user.fullname,
            actorEmail: user.email,
            actorRole: user.role,
            action: resumeParseResult ? "RESUME_PARSED_AND_UPDATED" : "PROFILE_UPDATED",
            entityType: "User",
            entityId: user._id,
            status: "SUCCESS",
            metadata: resumeParseResult
                ? { extractedSkillsCount: resumeParseResult.extractedSkills.length, atsScore: resumeParseResult.atsReadinessScore }
                : {}
        });

        return res.status(200).json({
            message: resumeParseResult
                ? `Profile updated & Resume parsed (${resumeParseResult.extractedSkills.length} skills extracted for matchmaking)!`
                : "Profile updated successfully.",
            user: sanitizeUserPayload(user),
            resumeAnalysis: resumeParseResult,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update profile.",
            success: false
        });
    }
};

export const parseAndSaveResume = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const file = req.file;
        const { rawResumeText } = req.body;

        if (!file && !rawResumeText) {
            return res.status(400).json({
                success: false,
                message: "Please upload a PDF or Word (.docx/.doc) file or provide resume text."
            });
        }

        const analysis = file
            ? parseResumeFile(file)
            : analyzeResumeText(rawResumeText, user.profile.resumeOriginalName || "Resume.txt");

        if (file) {
            const fileUri = getDataUri(file);
            user.profile.resumeOriginalName = file.originalname;
            user.profile.resumeMimeType = file.mimetype || "application/pdf";
            if (hasValidCloudinaryConfig()) {
                try {
                    const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                        resource_type: "auto"
                    });
                    user.profile.resume = cloudResponse.secure_url;
                } catch {
                    if (file.size <= 4 * 1024 * 1024) user.profile.resume = fileUri.content;
                }
            } else if (file.size <= 4 * 1024 * 1024) {
                user.profile.resume = fileUri.content;
            }
        }

        user.profile.parsedResumeText = analysis.parsedText;
        user.profile.extractedSkills = analysis.extractedSkills;
        user.profile.resumeAtsScore = analysis.atsReadinessScore;
        user.profile.resumeParsedAt = analysis.parsedAt;

        const existingLower = new Set((user.profile.skills || []).map((s) => s.toLowerCase()));
        const merged = [...(user.profile.skills || [])];
        for (const sk of analysis.extractedSkills) {
            if (!existingLower.has(sk.toLowerCase())) {
                merged.push(sk);
                existingLower.add(sk.toLowerCase());
            }
        }
        user.profile.skills = merged;

        if (!user.profile.bio && analysis.extractedSummary) {
            user.profile.bio = analysis.extractedSummary;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: `Resume parsed! Extracted ${analysis.extractedSkills.length} skills & updated your job matchmaking profile.`,
            user: sanitizeUserPayload(user),
            resumeAnalysis: analysis
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to parse resume."
        });
    }
};

export const saveJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const isAlreadySaved = user.savedJobs.some((id) => String(id) === String(jobId));

        if (isAlreadySaved) {
            user.savedJobs = user.savedJobs.filter((id) => String(id) !== String(jobId));
            await user.save();
            return res.status(200).json({
                message: "Job removed from saved list.",
                saved: false,
                success: true
            });
        } else {
            user.savedJobs.push(jobId);
            await user.save();
            return res.status(200).json({
                message: "Job bookmarked successfully!",
                saved: true,
                success: true
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};

export const getSavedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).populate({
            path: "savedJobs",
            populate: {
                path: "company"
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        return res.status(200).json({
            savedJobs: user.savedJobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};