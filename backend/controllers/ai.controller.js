import axios from "axios";
import jwt from "jsonwebtoken";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

// Helper to optionally resolve logged-in user from cookie
const getOptionalUser = async (req) => {
    try {
        const token = req.cookies?.token;
        if (!token || !process.env.SECRET_KEY) return null;
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded?.userId) return null;
        return await User.findById(decoded.userId);
    } catch {
        return null;
    }
};

export const generateCoverLetter = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { externalTitle, externalCompany, externalJobDescription } = req.body;
        const user = req.user || (await getOptionalUser(req));

        let roleTitle = externalTitle || "Software Engineer";
        let companyName = externalCompany || "your organization";
        let stackText = "modern web technologies";
        let jobDetails = "";

        if (jobId && jobId !== "external") {
            const job = await Job.findById(jobId).populate('company');
            if (!job) {
                return res.status(404).json({ message: "Job not found.", success: false });
            }
            roleTitle = job.title;
            companyName = job.company?.name || "your company";
            stackText = job.requirements?.join(", ") || "full-stack development";
            jobDetails = `Role: ${job.title}, Company: ${companyName}, Stack: ${stackText}, Description: ${job.description}`;
        } else if (externalJobDescription) {
            jobDetails = `Role: ${roleTitle}, Company: ${companyName}, Description: ${externalJobDescription}`;
        } else {
            return res.status(400).json({ message: "Job details are required.", success: false });
        }

        const candidateName = user?.fullname || "a passionate professional";
        const candidateSkills = user?.profile?.skills?.length
            ? user.profile.skills.join(", ")
            : stackText;

        const prompt = `
            Write an ultra-short, punchy, modern note/cover message for this job application.
            Constraints:
            - STRICTLY under 120 words.
            - Clean plain text paragraphs only. NO markdown bullet points like '*', '-', or '**'.
            - Direct, confident, and professional tone tailored to the stack.

            Job Info: ${jobDetails}
            Candidate: ${candidateName}, Skills: ${candidateSkills}
        `;

        if (process.env.GROQ_API_KEY) {
            try {
                const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
                const response = await axios.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        model: modelName,
                        messages: [
                            { role: "system", content: "You are a concise executive career copywriter. Write short, clean text with zero markdown symbols." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.5,
                        max_tokens: 300
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                        }
                    }
                );

                const coverLetter = response.data?.choices?.[0]?.message?.content;
                if (coverLetter) {
                    const cleanedLetter = coverLetter.replace(/[*_#`]/g, '').trim();
                    return res.status(200).json({
                        message: "AI Cover letter generated successfully.",
                        coverLetter: cleanedLetter,
                        success: true
                    });
                }
            } catch (groqErr) {
                console.warn("[AI Generator] Falling back to template:", groqErr.message);
            }
        }

        // Intelligent fallback if GROQ_API_KEY is not configured or rate-limited
        const fallbackLetter = `Dear Hiring Team at ${companyName},\n\nI am writing to express my strong interest in the ${roleTitle} position. With hands-on experience in ${candidateSkills}, I have consistently delivered scalable, user-focused solutions that align closely with your technical requirements.\n\nI am excited about the opportunity to bring my problem-solving mindset and technical expertise to ${companyName} and contribute immediately to your engineering goals. Thank you for your time and consideration.\n\nBest regards,\n${user?.fullname || "Candidate"}`;

        return res.status(200).json({
            message: "AI Cover letter generated successfully.",
            coverLetter: fallbackLetter,
            success: true
        });
    } catch (error) {
        console.error("[AI Generator Error]:", error.message);
        return res.status(500).json({
            message: "Failed to generate cover letter.",
            success: false
        });
    }
};

export const getAtsMatchScore = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId).populate("company");
        if (!job) {
            return res.status(404).json({ message: "Job not found.", success: false });
        }

        const user = await getOptionalUser(req);
        const userSkills = (user?.profile?.skills || []).map(s => s.trim()).filter(Boolean);
        const userBio = user?.profile?.bio || "";

        // Normalize job requirements into discrete tokens/skills
        const rawReqs = Array.isArray(job.requirements)
            ? job.requirements.flatMap(r => r.split(","))
            : String(job.requirements || "").split(",");
        const jobSkills = rawReqs.map(s => s.trim()).filter(Boolean);

        const matchedSkills = [];
        const missingSkills = [];

        jobSkills.forEach(reqSkill => {
            const reqLower = reqSkill.toLowerCase();
            const isMatched = userSkills.some(us => {
                const uLower = us.toLowerCase();
                return uLower.includes(reqLower) || reqLower.includes(uLower);
            }) || userBio.toLowerCase().includes(reqLower);

            if (isMatched) {
                matchedSkills.push(reqSkill);
            } else {
                missingSkills.push(reqSkill);
            }
        });

        let score = jobSkills.length > 0
            ? Math.round((matchedSkills.length / jobSkills.length) * 100)
            : (userSkills.length > 0 ? 75 : 40);

        if (user?.profile?.resume && score < 95) {
            score = Math.min(100, score + 5);
        }

        let summary = "";
        if (score >= 80) {
            summary = `Strong match for ${job.title}! Your profile aligns well with ${job.company?.name || "the company"}'s core stack.`;
        } else if (score >= 50) {
            summary = `Moderate match. Highlighting ${missingSkills.slice(0, 3).join(", ")} in your profile or cover note will significantly boost your shortlisting odds.`;
        } else {
            summary = `Low initial keyword overlap. Consider adding ${missingSkills.slice(0, 3).join(", ")} to your skills & resume before applying.`;
        }

        return res.status(200).json({
            success: true,
            score,
            matchedSkills,
            missingSkills,
            totalJobSkills: jobSkills.length,
            hasResume: Boolean(user?.profile?.resume),
            summary
        });
    } catch (error) {
        console.error("[ATS Match Error]:", error.message);
        return res.status(500).json({
            message: "Failed to calculate ATS match score.",
            success: false
        });
    }
};

export const generateInterviewPrep = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId).populate("company");
        if (!job) {
            return res.status(404).json({ message: "Job not found.", success: false });
        }

        const reqList = Array.isArray(job.requirements) ? job.requirements.join(", ") : job.requirements;

        if (process.env.GROQ_API_KEY) {
            try {
                const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
                const prompt = `
                    Generate 5 interview questions and concise model answers for a candidate interviewing for:
                    Role: ${job.title} at ${job.company?.name || "a tech company"}
                    Required Skills: ${reqList}
                    Experience Level: ${job.experienceLevel} years
                    Description: ${job.description}

                    Return ONLY valid JSON array of 5 objects with keys:
                    [{"type": "Technical" | "Behavioral" | "System Design", "question": "...", "answer": "...", "tip": "..."}]
                `;

                const response = await axios.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        model: modelName,
                        messages: [
                            { role: "system", content: "Return strictly a JSON array of 5 interview question objects. No markdown code fences." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.4,
                        max_tokens: 900
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                        }
                    }
                );

                const content = response.data?.choices?.[0]?.message?.content || "";
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return res.status(200).json({
                            success: true,
                            questions: parsed
                        });
                    }
                }
            } catch (groqErr) {
                console.warn("[AI Interview Prep] Using structured fallback:", groqErr.message);
            }
        }

        const primarySkill = job.requirements?.[0] || job.title;
        const secondarySkill = job.requirements?.[1] || "scalable architecture";

        const fallbackQuestions = [
            {
                type: "Technical",
                question: `How have you used ${primarySkill} in production, and what performance bottlenecks did you solve?`,
                answer: `Structure your answer around a real module you built using ${primarySkill}. Explain the initial bottleneck (e.g., slow rendering, N+1 queries, or state bloat), the profiling tools you used, and the measurable improvement achieved.`,
                tip: `Mention specific metrics (e.g., reduced latency by 35%) relevant to ${job.title}.`
            },
            {
                type: "Technical",
                question: `Walk us through how you integrate ${primarySkill} with ${secondarySkill} while maintaining clean code and error handling.`,
                answer: `Discuss modular separation of concerns, input validation, centralized error handling, and automated testing strategies when working across ${reqList || "your stack"}.`,
                tip: "Recruiters look for maintainability and production readiness."
            },
            {
                type: "System Design",
                question: `If you had to design a core feature for ${job.company?.name || "our platform"} handling 10x traffic growth, how would you architect it?`,
                answer: `Start by clarifying functional & non-functional requirements, API contracts, database indexing, caching layers, and horizontal scaling strategies suitable for a ${job.experienceLevel}+ year ${job.title}.`,
                tip: "Always discuss trade-offs between consistency, latency, and complexity."
            },
            {
                type: "Behavioral",
                question: `Tell me about a time you had to quickly learn a new technology or debug a critical issue under a tight deadline.`,
                answer: `Use the STAR method (Situation, Task, Action, Result). Highlight how you broke down the problem, collaborated with teammates, communicated status proactively, and prevented future regressions.`,
                tip: "Focus on ownership and calm execution under pressure."
            },
            {
                type: "Role Fit",
                question: `Why are you excited about the ${job.title} role at ${job.company?.name || "this company"}?`,
                answer: `Connect your hands-on experience in ${reqList || primarySkill} directly to ${job.company?.name || "the company"}'s product mission and explain how you can contribute within the first 60 days.`,
                tip: "Reference details from the job description to show genuine preparation."
            }
        ];

        return res.status(200).json({
            success: true,
            questions: fallbackQuestions
        });
    } catch (error) {
        console.error("[Interview Prep Error]:", error.message);
        return res.status(500).json({
            message: "Failed to generate interview prep questions.",
            success: false
        });
    }
};