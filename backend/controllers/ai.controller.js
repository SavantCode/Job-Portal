import axios from "axios";
import jwt from "jsonwebtoken";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Application } from "../models/application.model.js";

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

/**
 * Context-Aware AI Drafting Engine for Recruiter Hiring Pipeline
 * Supports: shortlist, assignment, interview, offer_letter, joining_letter, rejection
 */
export const draftRecruiterCommunication = async (req, res) => {
    try {
        const {
            applicationId,
            actionType = "interview",
            interviewDetails = {},
            assignmentDetails = {},
            offerDetails = {},
            joiningDetails = {}
        } = req.body;

        const application = await Application.findById(applicationId)
            .populate("applicant")
            .populate({
                path: "job",
                populate: { path: "company" }
            });

        if (!application) {
            return res.status(404).json({ message: "Application not found.", success: false });
        }

        const candidate = application.applicant;
        const job = application.job;
        const companyName = job?.company?.name || "Our Organization";
        const roleTitle = job?.title || "Software Engineer";
        const candidateName = candidate?.fullname || "Candidate";
        const candidateSkills = (candidate?.profile?.skills || []).join(", ") || "modern software engineering";
        const jobRequirements = (job?.requirements || []).join(", ") || "Full Stack Development";

        // Default templates per stage
        let defaultSubject = "";
        let defaultBody = "";
        const suggestedQuestions = [
            `Can you walk us through a challenging project where you applied ${candidate?.profile?.skills?.[0] || job?.requirements?.[0] || "your core tech stack"}?`,
            `How do you approach debugging, code quality, and performance optimization in ${roleTitle} workflows?`,
            `What excites you most about joining ${companyName} and contributing to our engineering roadmap?`
        ];

        if (actionType === "shortlist") {
            defaultSubject = `Application Shortlisted: ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nThank you for applying for the ${roleTitle} position at ${companyName}. Our hiring team has reviewed your profile and skills in ${candidateSkills}, and we are pleased to inform you that your application has been officially shortlisted!\n\nWe will be sharing the next steps—whether a technical assignment or your first interview round—shortly. Keep an eye on your inbox and JobPortal notification center.\n\nWarm regards,\nTalent Acquisition Team\n${companyName}`;
        } else if (actionType === "assignment") {
            defaultSubject = `Technical Assignment: ${roleTitle} Role at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nCongratulations on advancing to the technical evaluation stage for the ${roleTitle} position at ${companyName}!\n\nGiven your background in ${candidateSkills}, we have prepared a practical assignment ("${assignmentDetails.title || `${roleTitle} Take-Home Challenge`}") to evaluate your problem-solving and architecture skills.\n\nPlease review the instructions and submit your work before ${assignmentDetails.deadline || "the deadline"}. Feel free to reply directly to this email if you have any clarifying questions.\n\nBest regards,\nEngineering Hiring Team\n${companyName}`;
        } else if (actionType === "interview") {
            const roundLabel = interviewDetails.roundName || `Round ${interviewDetails.roundNumber || 1} Technical Interview`;
            defaultSubject = `Interview Invitation (${roundLabel}): ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nWe were impressed by your background in ${candidateSkills} and would love to invite you to the ${roundLabel} for the ${roleTitle} role at ${companyName}.\n\nYour interview is scheduled for ${interviewDetails.date || "the upcoming slot"} at ${interviewDetails.time || "the scheduled time"} (${interviewDetails.duration || 45} minutes) via ${interviewDetails.mode || "Google Meet"}. We have attached an iCalendar (.ics) invite so you can add this session directly to your calendar.\n\nWe look forward to speaking with you!\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
        } else if (actionType === "interview_passed") {
            defaultSubject = `Congratulations! You Cleared the Interview Round for ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nGreat news! Our interview panel thoroughly enjoyed speaking with you and was impressed with your technical depth in ${candidateSkills}.\n\nYou have successfully cleared this interview stage for the ${roleTitle} role at ${companyName}. We are now moving your profile forward for final evaluation / further rounds and will share the next update very soon.\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
        } else if (actionType === "offer_letter") {
            defaultSubject = `Official Offer of Employment: ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nCongratulations! On behalf of ${companyName}, we are thrilled to extend an official Offer of Employment for the position of ${roleTitle}.\n\nThroughout our interview process, your expertise in ${candidateSkills} and problem-solving approach stood out. Your offered annual compensation (CTC) is ${offerDetails.ctc || `${job?.salary || "Competitive"} LPA`}, with a proposed joining date of ${offerDetails.joiningDate || "flexible"} at ${offerDetails.location || job?.location || "our office"}.\n\nPlease review the offer summary below and confirm your acceptance so we can issue your formal Joining & Appointment Letter.\n\nWelcome aboard!\nHuman Resources & Leadership Team\n${companyName}`;
        } else if (actionType === "joining_letter") {
            defaultSubject = `Official Joining & Appointment Letter: ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nWe are delighted to officially welcome you to ${companyName} as a ${roleTitle}!\n\nFollowing your offer acceptance, please find your formal Joining & Onboarding instructions enclosed. You are scheduled to report on ${joiningDetails.joiningDate || "your start date"} at ${joiningDetails.reportingTime || "10:00 AM"} (${joiningDetails.workMode || "Hybrid"}) to ${joiningDetails.reportingManager || "your Engineering Manager"}.\n\nPlease keep your verification documents ready (${joiningDetails.documentsRequired || "Government ID, Educational Certificates, PAN & Bank details"}). We are excited to build the future together!\n\nWarmest welcome,\nPeople Operations Team\n${companyName}`;
        } else if (actionType === "rejection") {
            defaultSubject = `Update on Your Application for ${roleTitle} at ${companyName}`;
            defaultBody = `Dear ${candidateName},\n\nThank you for taking the time to apply and interview for the ${roleTitle} position at ${companyName}. We genuinely appreciated learning about your work with ${candidateSkills}.\n\nWhile your profile has many strengths, we have decided to move forward with candidates whose experience more closely aligns with our immediate depth requirements in ${jobRequirements}. We will keep your resume on file for future openings that match your skillset.\n\nWe wish you the very best in your career journey.\n\nSincerely,\nTalent Acquisition Team\n${companyName}`;
        }

        if (process.env.GROQ_API_KEY) {
            try {
                const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
                const prompt = `
                    You are an executive HR & Talent Acquisition AI assistant for "${companyName}".
                    Draft a personalized, professional email for the following hiring action: "${actionType}".
                    Candidate Name: ${candidateName}
                    Candidate Skills: ${candidateSkills}
                    Candidate Cover Note: ${application.coverNote || "N/A"}
                    Job Role: ${roleTitle}
                    Job Required Stack: ${jobRequirements}
                    Stage Metadata: ${JSON.stringify({ interviewDetails, assignmentDetails, offerDetails, joiningDetails })}

                    Return strictly valid JSON with keys:
                    {
                      "subject": "Email subject line",
                      "body": "Plain text email body with clean paragraphs (no markdown asterisks)",
                      "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
                    }
                `;

                const response = await axios.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        model: modelName,
                        messages: [
                            { role: "system", content: "Return strictly valid JSON with subject, body, and suggestedQuestions." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.4,
                        max_tokens: 700
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                        }
                    }
                );

                const raw = response.data?.choices?.[0]?.message?.content || "";
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.subject && parsed.body) {
                        return res.status(200).json({
                            success: true,
                            subject: parsed.subject,
                            body: parsed.body.replace(/[*#`]/g, ""),
                            suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : suggestedQuestions
                        });
                    }
                }
            } catch (err) {
                console.warn("[AI Hiring Draft] Falling back to structured template:", err.message);
            }
        }

        return res.status(200).json({
            success: true,
            subject: defaultSubject,
            body: defaultBody,
            suggestedQuestions
        });
    } catch (error) {
        console.error("[Draft Recruiter Email Error]:", error);
        return res.status(500).json({
            message: "Failed to draft communication.",
            success: false
        });
    }
};