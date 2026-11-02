import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: "", trim: true },
        techStack: [{ type: String, trim: true }],
        liveUrl: { type: String, default: "", trim: true },
        githubUrl: { type: String, default: "", trim: true }
    },
    { _id: true }
);

const experienceSchema = new mongoose.Schema(
    {
        role: { type: String, required: true, trim: true },
        company: { type: String, required: true, trim: true },
        duration: { type: String, default: "", trim: true },
        description: { type: String, default: "", trim: true }
    },
    { _id: true }
);

const educationSchema = new mongoose.Schema(
    {
        degree: { type: String, required: true, trim: true },
        institution: { type: String, required: true, trim: true },
        year: { type: String, default: "", trim: true },
        grade: { type: String, default: "", trim: true }
    },
    { _id: true }
);

const userSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["student", "recruiter"],
            required: true,
            index: true
        },
        profile: {
            headline: { type: String, default: "" },
            bio: { type: String, default: "" },
            skills: [{ type: String }],
            currentLocation: { type: String, default: "" },
            preferredLocations: [{ type: String }],
            experienceYears: { type: Number, default: 0 },
            expectedCtc: { type: String, default: "" },
            noticePeriod: { type: String, default: "Immediate" },
            openToWork: { type: Boolean, default: true },
            resume: { type: String, default: "" },
            resumeOriginalName: { type: String, default: "" },
            resumeMimeType: { type: String, default: "" },
            parsedResumeText: { type: String, default: "" },
            extractedSkills: [{ type: String }],
            resumeAtsScore: { type: Number, default: 0 },
            resumeParsedAt: { type: Date },
            projects: [projectSchema],
            experience: [experienceSchema],
            education: [educationSchema],
            socialLinks: {
                github: { type: String, default: "" },
                linkedin: { type: String, default: "" },
                portfolio: { type: String, default: "" },
                leetcode: { type: String, default: "" },
                twitter: { type: String, default: "" }
            },
            company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
            profilePhoto: {
                type: String,
                default: ""
            }
        },
        savedJobs: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Job"
            }
        ]
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);