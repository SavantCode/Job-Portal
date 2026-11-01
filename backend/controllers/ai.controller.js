import axios from "axios";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";

/**
 * Helper: Safely resolve the authenticated user ID from either req.id
 * (set by isAuthenticated middleware) or the JWT cookie if called on a semi-public route.
 */
const resolveUserId = (req) => {
    if (req.id) return req.id;
    try {
        const token = req.cookies?.token;
        if (!token || !process.env.SECRET_KEY) return null;
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        return decoded?.userId || null;
    } catch {
        return null;
    }
};

/**
 * Helper: Call Groq Cloud LLM API (llama-3.3-70b-versatile) when GROQ_API_KEY is configured.
 * Returns null if no key is set or if the request fails, allowing callers to use deterministic fallbacks.
 */
const callGroqChatCompletion = async ({ systemPrompt, userPrompt, temperature = 0.5, jsonMode = false }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    try {
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature
        };

        if (jsonMode) {
            payload.response_format = { type: "json_object" };
        }

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            payload,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 12000
            }
        );

        return response.data?.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.warn("[Groq AI Fallback Triggered]:", error.message);
        return null;
    }
};

/**
 * 1. Generate AI Cover Letter / Quick Pitch
 * Route: POST /api/v1/ai/generate-cover-letter/:jobId?
 */
export const generateCoverLetter = async (req, res) => {
    try {
        const userId = resolveUserId(req);
        const user = userId ? await User.findById(userId) : null;
        const { jobId } = req.params;
        const { externalTitle, externalCompany, externalJobDescription } = req.body || {};

        let jobTitle = externalTitle || "Software Engineer";
        let companyName = externalCompany || "your organization";
        let jobDesc = externalJobDescription || "";
        let jobRequirements = [];

        if (jobId) {
            const job = await Job.findById(jobId).populate("company");
            if (job) {
                jobTitle = job.title || jobTitle;
                companyName = job.company?.name || companyName;
                jobDesc = job.description || jobDesc;
                jobRequirements = Array.isArray(job.requirements) ? job.requirements : [];
            }
        }

        const candidateName = user?.fullname || "an experienced software professional";
        const candidateSkills = user?.profile?.skills?.length
            ? user.profile.skills.join(", ")
            : jobRequirements.slice(0, 4).join(", ") || "Full Stack Development, React, Node.js, and Problem Solving";
        const candidateBio = user?.profile?.bio || "building scalable, user-centric web applications";

        const systemPrompt =
            "You are an expert executive career coach. Write a concise, high-impact 95-120 word cover note / outreach pitch in first-person ('I'). No placeholders like [Your Name]. Sign off with the candidate's actual name.";
        const userPrompt = `Candidate Name: ${candidateName}
Candidate Skills: ${candidateSkills}
Candidate Bio: ${candidateBio}
Target Role: ${jobTitle}
Target Company: ${companyName}
Job Description & Requirements: ${jobDesc} ${jobRequirements.join(", ")}`;

        const aiText = await callGroqChatCompletion({ systemPrompt, userPrompt, temperature: 0.6 });

        const fallbackPitch = `Dear Hiring Team at ${companyName},\n\nI am excited to apply for the ${jobTitle} position. With hands-on expertise in ${candidateSkills} and a strong track record of ${candidateBio}, I am confident in my ability to contribute immediately to your engineering goals.\n\nWhat excites me most about this opportunity at ${companyName} is the focus on building reliable, high-impact solutions. In my recent projects, I have architected responsive interfaces, optimized backend APIs, and collaborated closely across agile teams to deliver clean, maintainable code.\n\nI would welcome the opportunity to discuss how my technical background aligns with your team's roadmap.\n\nWarm regards,\n${candidateName}`;

        return res.status(200).json({
            success: true,
            coverLetter: aiText ? aiText.trim() : fallbackPitch
        });
    } catch (error) {
        console.error("[Generate Cover Letter Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate cover letter."
        });
    }
};

/**
 * 2. Live ATS Resume & Skill Match Analyzer
 * Route: GET /api/v1/ai/ats-match/:jobId
 */
export const getAtsMatchScore = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = resolveUserId(req);

        const job = await Job.findById(jobId).populate("company");
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }

        const user = userId ? await User.findById(userId) : null;
        const userSkillsRaw = user?.profile?.skills || [];
        const userBio = (user?.profile?.bio || "").toLowerCase();

        // Normalize required skills from job.requirements
        const requiredSkills = (job.requirements || [])
            .flatMap(r => String(r).split(","))
            .map(s => s.trim())
            .filter(Boolean);

        const normalizedUserSkills = userSkillsRaw.map(s => String(s).toLowerCase().trim());

        const matchedSkills = [];
        const missingSkills = [];

        requiredSkills.forEach(reqSkill => {
            const reqLower = reqSkill.toLowerCase();
            const isMatched =
                normalizedUserSkills.some(
                    us => us.includes(reqLower) || reqLower.includes(us)
                ) || userBio.includes(reqLower);

            if (isMatched) {
                matchedSkills.push(reqSkill);
            } else {
                missingSkills.push(reqSkill);
            }
        });

        const totalReqs = requiredSkills.length;
        const score = totalReqs > 0
            ? Math.round((matchedSkills.length / totalReqs) * 100)
            : (normalizedUserSkills.length > 0 ? 80 : 50);

        let summary = "";
        if (!user) {
            summary = "Log in and add your technical skills in your Profile to see your personalized ATS match score.";
        } else if (score >= 75) {
            summary = `Strong match! Your profile covers ${matchedSkills.length} of ${totalReqs} core requirements for ${job.title}.`;
        } else if (score >= 45) {
            summary = `Moderate match (${score}%). Consider adding projects or experience with ${missingSkills.slice(0, 3).join(", ")} to boost your ranking.`;
        } else {
            summary = `Low skill overlap (${score}%). Tailor your profile skills and resume bullets toward ${missingSkills.slice(0, 3).join(", ")} before applying.`;
        }

        return res.status(200).json({
            success: true,
            score,
            matchedSkills,
            missingSkills,
            summary
        });
    } catch (error) {
        console.error("[ATS Match Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate ATS match score."
        });
    }
};

/**
 * 3. Generate 5 Role-Specific Mock Interview Questions
 * Route: POST /api/v1/ai/interview-prep/:jobId
 */
export const generateInterviewPrep = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId).populate("company");

        const title = job?.title || "Software Engineer";
        const companyName = job?.company?.name || "the company";
        const reqs = Array.isArray(job?.requirements) && job.requirements.length > 0
            ? job.requirements
            : ["React", "Node.js", "System Design", "APIs", "Database Optimization"];

        const primarySkill = reqs[0] || "Core Engineering";
        const secondarySkill = reqs[1] || "Backend Architecture";
        const tertiarySkill = reqs[2] || "Performance Optimization";

        const systemPrompt = `You are a Principal Technical Interviewer at ${companyName}. Return a JSON object with a "questions" array containing exactly 5 interview questions tailored for a ${title} role requiring ${reqs.join(", ")}.
Each item in "questions" must have:
- "id": number (1 to 5)
- "type": one of "Technical Depth", "Architecture & Design", "Debugging & Problem Solving", "Practical Scenario", "Behavioral (STAR)"
- "question": string (specific, realistic interview question)
- "answer": string (strong 3-4 sentence senior-level sample answer strategy)
- "tip": string (actionable interviewer tip)
- "keyConcepts": array of 3-5 important technical keywords/concepts the candidate should mention.`;

        const aiJsonRaw = await callGroqChatCompletion({
            systemPrompt,
            userPrompt: `Generate 5 structured interview questions for ${title} at ${companyName}. Required stack: ${reqs.join(", ")}.`,
            temperature: 0.5,
            jsonMode: true
        });

        if (aiJsonRaw) {
            try {
                const parsed = JSON.parse(aiJsonRaw);
                if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                    return res.status(200).json({
                        success: true,
                        questions: parsed.questions
                    });
                }
            } catch {
                // Fall through to deterministic questions below
            }
        }

        // Deterministic High-Quality 5-Question Set tailored to the Job's exact requirements
        const fallbackQuestions = [
            {
                id: 1,
                type: "Technical Depth",
                question: `How have you architected and optimized production features using ${primarySkill} in a ${title} role, and what trade-offs did you manage?`,
                answer: `Start by explaining how you structure ${primarySkill} modules for maintainability and performance. Mention specific profiling tools, state/data flow patterns, and how you reduced latency or bundle/query overhead by a measurable percentage.`,
                tip: `Cite concrete metrics (e.g., 'reduced API/render latency by 35%') and mention edge-case handling in ${primarySkill}.`,
                keyConcepts: [primarySkill, "optimization", "scalability", "trade-offs", "metrics"]
            },
            {
                id: 2,
                type: "Architecture & Design",
                question: `When integrating ${primarySkill} with ${secondarySkill}, how do you ensure data consistency, security, and fault tolerance under high traffic?`,
                answer: `Discuss request validation, idempotency, authentication/authorization boundaries, caching strategies, and graceful degradation when downstream services experience spikes.`,
                tip: `Draw a clear mental boundary between client/service responsibilities, error retries, and schema validation.`,
                keyConcepts: [secondarySkill, "validation", "security", "caching", "fault tolerance"]
            },
            {
                id: 3,
                type: "Debugging & Problem Solving",
                question: `Walk me through a time you diagnosed a critical production bottleneck or memory/performance regression involving ${tertiarySkill} or ${primarySkill}.`,
                answer: `Use a structured debugging workflow: reproducing the issue, inspecting logs/telemetry, isolating the root cause in ${tertiarySkill}, rolling out a targeted fix, and adding automated regression tests.`,
                tip: `Interviewers at ${companyName} look for systematic root-cause analysis rather than guesswork.`,
                keyConcepts: [tertiarySkill, "debugging", "root cause", "monitoring", "testing"]
            },
            {
                id: 4,
                type: "Practical Scenario",
                question: `If you joined ${companyName} as a ${title} tomorrow and needed to design a scalable module using ${reqs.slice(0, 3).join(", ")}, how would you structure your first 30 days?`,
                answer: `Outline how you would audit the existing codebase, review architectural ADRs, ship a small high-visibility bugfix or feature in week one, and propose measurable reliability improvements.`,
                tip: `Demonstrate ownership, code-review discipline, and alignment with business KPIs.`,
                keyConcepts: ["architecture", "ownership", "code review", "testing", "scalability"]
            },
            {
                id: 5,
                type: "Behavioral (STAR)",
                question: `Tell me about a time you faced conflicting technical requirements or a tight deadline while delivering a project. How did you align stakeholders and ship on time?`,
                answer: `Structure your response using Situation, Task, Action, and Result (STAR). Highlight how you communicated trade-offs transparently, prioritized the critical path, and delivered a reliable release.`,
                tip: `Always end your STAR story with the quantifiable business impact and what you learned.`,
                keyConcepts: ["situation", "action", "result", "stakeholders", "prioritization"]
            }
        ];

        return res.status(200).json({
            success: true,
            questions: fallbackQuestions
        });
    } catch (error) {
        console.error("[Interview Prep Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate interview questions."
        });
    }
};

/**
 * 4. Interactive AI Mock Interview Answer Evaluator (Voice & Text Q&A Grader)
 * Route: POST /api/v1/ai/evaluate-interview-answer
 *
 * Evaluates a candidate's spoken (transcribed) or typed answer against:
 * - The target Job Title, Company & Required Tech Stack
 * - The specific Interview Question & Question Type
 * - Returns a 10-point enterprise rubric:
 *   - overallScore (0-10)
 *   - technicalAccuracy (0-10)
 *   - clarityAndStructure (0-10)
 *   - starAndDepth (0-10)
 *   - verdictBadge (e.g., "Strong Hire Signal", "Solid Response", "Needs More Depth")
 *   - strengths (array of strings)
 *   - improvements (array of strings)
 *   - idealAnswer (polished 10/10 reference answer)
 */
export const evaluateInterviewAnswer = async (req, res) => {
    try {
        const {
            jobId,
            question,
            questionType = "Technical Depth",
            expectedAnswer = "",
            keyConcepts = [],
            userAnswer = "",
            answerMode = "text" // "voice" | "text"
        } = req.body || {};

        const trimmedAnswer = String(userAnswer || "").trim();
        if (!trimmedAnswer) {
            return res.status(400).json({
                success: false,
                message: "Please provide or speak an answer before submitting for evaluation."
            });
        }

        let jobTitle = "Software Engineer";
        let companyName = "Enterprise Tech";
        let requirements = ["React", "Node.js", "System Design", "APIs"];

        if (jobId) {
            const job = await Job.findById(jobId).populate("company");
            if (job) {
                jobTitle = job.title || jobTitle;
                companyName = job.company?.name || companyName;
                if (Array.isArray(job.requirements) && job.requirements.length > 0) {
                    requirements = job.requirements;
                }
            }
        }

        // 1. Try LLM-based structured JSON evaluation first (if GROQ_API_KEY is available)
        const systemPrompt = `You are a Principal Engineering Hiring Bar-Raiser at ${companyName} evaluating a candidate's ${answerMode} interview response for the ${jobTitle} position.
Grade the candidate's answer honestly and constructively on a 0 to 10 scale.
Return ONLY a valid JSON object with these exact keys:
{
  "overallScore": number (0 to 10, one decimal place, e.g. 8.2),
  "technicalAccuracy": number (0 to 10),
  "clarityAndStructure": number (0 to 10),
  "starAndDepth": number (0 to 10),
  "verdictBadge": string ("Strong Hire Signal" | "Hire - Solid Answer" | "Borderline - Needs Depth" | "Needs Practice"),
  "feedbackSummary": string (2-sentence executive summary of the response quality),
  "strengths": [string, string] (2-3 specific things the candidate did well),
  "improvements": [string, string] (2-3 specific missing concepts, metrics, or structural improvements),
  "idealAnswer": string (a concise, senior-level 10/10 sample answer in first-person that the candidate can learn from)
}`;

        const userPrompt = `Role: ${jobTitle} at ${companyName}
Required Tech Stack: ${requirements.join(", ")}
Question Type: ${questionType}
Interview Question: ${question}
Reference Strategy: ${expectedAnswer}
Candidate's Answer (${answerMode.toUpperCase()} mode): "${trimmedAnswer}"`;

        const aiJsonRaw = await callGroqChatCompletion({
            systemPrompt,
            userPrompt,
            temperature: 0.3,
            jsonMode: true
        });

        if (aiJsonRaw) {
            try {
                const parsed = JSON.parse(aiJsonRaw);
                if (typeof parsed.overallScore === "number") {
                    return res.status(200).json({
                        success: true,
                        evaluation: {
                            overallScore: Number(Math.min(10, Math.max(1, parsed.overallScore)).toFixed(1)),
                            technicalAccuracy: Number(Math.min(10, Math.max(1, parsed.technicalAccuracy ?? parsed.overallScore)).toFixed(1)),
                            clarityAndStructure: Number(Math.min(10, Math.max(1, parsed.clarityAndStructure ?? parsed.overallScore)).toFixed(1)),
                            starAndDepth: Number(Math.min(10, Math.max(1, parsed.starAndDepth ?? parsed.overallScore)).toFixed(1)),
                            verdictBadge: parsed.verdictBadge || "Hire - Solid Answer",
                            feedbackSummary: parsed.feedbackSummary || "Your answer was evaluated against the role requirements.",
                            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                            idealAnswer: parsed.idealAnswer || expectedAnswer,
                            answerMode
                        }
                    });
                }
            } catch {
                // Fall through to deterministic rubric engine below
            }
        }

        // 2. Deterministic Enterprise Rubric Analyzer (100% Free, Zero-Latency Fallback)
        const words = trimmedAnswer.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const lowerAns = trimmedAnswer.toLowerCase();

        // Check technical & domain keyword coverage
        const targetKeywords = [
            ...requirements.map(r => String(r).toLowerCase().trim()),
            ...(Array.isArray(keyConcepts) ? keyConcepts.map(k => String(k).toLowerCase().trim()) : []),
            "architecture", "performance", "scalability", "latency", "security",
            "database", "api", "testing", "cache", "production", "optimize", "design"
        ].filter(Boolean);

        const uniqueKeywords = [...new Set(targetKeywords)];
        const matchedKeywords = uniqueKeywords.filter(kw => kw.length > 2 && lowerAns.includes(kw));

        // Check STAR / structure & quantifiable impact signals
        const hasMetrics = /(\d+%|\d+x|\d+\s*(ms|seconds|users|requests|days|hours|months))/i.test(trimmedAnswer);
        const hasStructureMarkers = /(first|second|finally|for example| specifically|because|resulted in|implemented|designed|architected|resolved|improved)/i.test(trimmedAnswer);
        const sentenceCount = trimmedAnswer.split(/[.!?]+/).filter(s => s.trim().length > 3).length;

        // Compute sub-scores (0 - 10)
        // A. Technical Accuracy
        let technicalAccuracy = 4.0 + Math.min(4.2, matchedKeywords.length * 0.9);
        if (wordCount < 15) technicalAccuracy = Math.min(technicalAccuracy, 3.5);
        if (hasMetrics) technicalAccuracy += 0.8;
        technicalAccuracy = Number(Math.min(9.8, Math.max(2.0, technicalAccuracy)).toFixed(1));

        // B. Clarity & Structure
        let clarityAndStructure = 4.5;
        if (wordCount >= 35 && wordCount <= 180) clarityAndStructure += 2.8;
        else if (wordCount >= 20) clarityAndStructure += 1.5;
        else clarityAndStructure -= 1.5;
        if (hasStructureMarkers) clarityAndStructure += 1.4;
        if (sentenceCount >= 3) clarityAndStructure += 0.8;
        clarityAndStructure = Number(Math.min(9.8, Math.max(2.0, clarityAndStructure)).toFixed(1));

        // C. STAR & Practical Depth
        let starAndDepth = 4.0;
        if (wordCount >= 50) starAndDepth += 2.2;
        else if (wordCount >= 25) starAndDepth += 1.0;
        if (hasMetrics) starAndDepth += 1.8;
        if (hasStructureMarkers) starAndDepth += 1.2;
        starAndDepth = Number(Math.min(9.8, Math.max(2.0, starAndDepth)).toFixed(1));

        const overallScore = Number(((technicalAccuracy * 0.4) + (clarityAndStructure * 0.3) + (starAndDepth * 0.3)).toFixed(1));

        let verdictBadge = "Needs Practice";
        if (overallScore >= 8.0) verdictBadge = "Strong Hire Signal";
        else if (overallScore >= 6.5) verdictBadge = "Hire - Solid Answer";
        else if (overallScore >= 5.0) verdictBadge = "Borderline - Needs Depth";

        const strengths = [];
        const improvements = [];

        if (matchedKeywords.length > 0) {
            strengths.push(`Referenced relevant technical concepts (${matchedKeywords.slice(0, 4).join(", ")}).`);
        } else {
            improvements.push(`Explicitly mention core technologies from the job stack (${requirements.slice(0, 3).join(", ")}).`);
        }

        if (wordCount >= 40) {
            strengths.push(`Provided a well-developed ${wordCount}-word explanation with clear context.`);
        } else {
            improvements.push(`Your response is brief (${wordCount} words). Aim for 60–120 words to cover context, action, and outcome.`);
        }

        if (hasMetrics) {
            strengths.push("Included quantifiable metrics/numbers to prove real-world engineering impact.");
        } else {
            improvements.push("Add at least one measurable metric (e.g., 'reduced latency by 30%' or 'handled 10k concurrent requests').");
        }

        if (hasStructureMarkers) {
            strengths.push("Used action-oriented engineering verbs and logical cause-and-effect transitions.");
        } else {
            improvements.push("Structure your delivery using the STAR framework (Situation → Task → Action → Result).");
        }

        const idealAnswer = expectedAnswer
            ? `In my previous work with ${requirements.slice(0, 2).join(" and ")}, I approached this by first defining clear architectural boundaries and performance benchmarks. ${expectedAnswer} As a result, we improved system reliability and reduced response latency by over 30% in production.`
            : `When tackling this in a ${jobTitle} role at ${companyName}, I start by analyzing the bottlenecks and designing a modular solution using ${requirements.slice(0, 2).join(" and ")}. In a recent project, I implemented request validation, caching, and automated tests, which reduced error rates by 40% and improved developer velocity.`;

        const feedbackSummary =
            overallScore >= 8.0
                ? `Excellent ${answerMode} response! You demonstrated strong technical command and structured communication for ${jobTitle}.`
                : overallScore >= 6.5
                ? `Good foundation (${overallScore}/10). Adding one concrete production metric and deeper trade-off analysis will push this to a 9+/10.`
                : `Your response (${overallScore}/10) touches on the topic but needs deeper technical specifics around ${requirements.slice(0, 2).join(" & ")} and a structured STAR example.`;

        return res.status(200).json({
            success: true,
            evaluation: {
                overallScore,
                technicalAccuracy,
                clarityAndStructure,
                starAndDepth,
                verdictBadge,
                feedbackSummary,
                strengths,
                improvements,
                idealAnswer,
                answerMode
            }
        });
    } catch (error) {
        console.error("[Evaluate Interview Answer Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to evaluate interview answer."
        });
    }
};

/**
 * 5. Generate 3 Quantifiable ATS Resume Bullet Points
 * Route: POST /api/v1/ai/resume-bullets/:jobId
 */
export const generateResumeBullets = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { missingSkills = [], matchedSkills = [] } = req.body || {};
        const job = await Job.findById(jobId).populate("company");

        const title = job?.title || "Software Engineer";
        const targetSkills = [...missingSkills, ...matchedSkills, ...(job?.requirements || [])].slice(0, 5);
        const s1 = targetSkills[0] || "React.js";
        const s2 = targetSkills[1] || "Node.js";
        const s3 = targetSkills[2] || "REST APIs";

        const systemPrompt = `Return a JSON object with a "bullets" array containing exactly 3 high-impact resume bullet points using Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]") tailored for a ${title} role and incorporating: ${targetSkills.join(", ")}.`;

        const aiJsonRaw = await callGroqChatCompletion({
            systemPrompt,
            userPrompt: `Write 3 quantifiable resume bullets for ${title} using skills: ${targetSkills.join(", ")}.`,
            temperature: 0.5,
            jsonMode: true
        });

        if (aiJsonRaw) {
            try {
                const parsed = JSON.parse(aiJsonRaw);
                if (Array.isArray(parsed.bullets) && parsed.bullets.length > 0) {
                    return res.status(200).json({
                        success: true,
                        bullets: parsed.bullets.slice(0, 3)
                    });
                }
            } catch {
                // Fall through
            }
        }

        const bullets = [
            `Architected and shipped scalable ${title} features using ${s1} and ${s2}, reducing page/API load latency by 38% across 50,000+ monthly active users.`,
            `Designed fault-tolerant backend workflows and ${s3} integrations with automated validation and caching, improving system throughput by 45%.`,
            `Collaborated across cross-functional engineering sprints to refactor legacy modules into reusable ${s1} components, cutting bug regressions by 30%.`
        ];

        return res.status(200).json({
            success: true,
            bullets
        });
    } catch (error) {
        console.error("[Generate Resume Bullets Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate resume bullets."
        });
    }
};

/**
 * 6. Recruiter AI Communication Drafter (Shortlist, Assignment, Interview, Offer, Joining)
 * Route: POST /api/v1/ai/draft-hiring-email
 */
export const draftRecruiterCommunication = async (req, res) => {
    try {
        const {
            actionType = "shortlisted",
            candidateName = "Candidate",
            jobTitle = "Software Engineer",
            companyName = "our organization",
            interviewDetails = {},
            assignmentDetails = {},
            offerDetails = {},
            joiningDetails = {}
        } = req.body || {};

        let subject = `Update on your ${jobTitle} application at ${companyName}`;
        let body = "";

        if (actionType === "shortlisted") {
            subject = `🎉 Profile Shortlisted: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nWe are pleased to inform you that our hiring team at ${companyName} has reviewed your application for the ${jobTitle} role and shortlisted your profile for the next stage of our evaluation pipeline.\n\nOur talent acquisition team will share the upcoming technical assessment / interview schedule with you shortly.\n\nWarm regards,\nTalent Acquisition Team\n${companyName}`;
        } else if (actionType === "assignment_sent") {
            subject = `📝 Technical Assignment: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nCongratulations on advancing to the technical assessment stage for the ${jobTitle} position at ${companyName}.\n\nAssignment Title: ${assignmentDetails.title || "Technical Case Study"}\nSubmission Deadline: ${assignmentDetails.deadline || "Within 48 hours"}\nInstructions: ${assignmentDetails.instructions || "Please complete the implementation and share your repository/live link via your candidate portal."}\n\nPlease submit your work directly from your JobPortal Candidate Dashboard.\n\nBest regards,\nEngineering Hiring Team\n${companyName}`;
        } else if (actionType === "interview_scheduled") {
            subject = `📅 Interview Invitation (${interviewDetails.roundName || "Technical Round"}): ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nWe are excited to invite you to the ${interviewDetails.roundName || "Technical Interview"} for the ${jobTitle} role at ${companyName}.\n\nDate: ${interviewDetails.date || "TBD"}\nTime: ${interviewDetails.time || "TBD"} (${interviewDetails.duration || "45"} mins)\nMeeting Link: ${interviewDetails.meetingLink || "Available in your portal"}\n\nAn official calendar invite (.ics) has been attached to this notification for your convenience.\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
        } else if (actionType === "offer_sent") {
            subject = `🎉 Official Employment Offer Letter: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nCongratulations! Following your strong performance throughout our interview process, we are thrilled to extend an official offer of employment for the position of ${jobTitle} at ${companyName}.\n\nOffered Annual Compensation (CTC): ${offerDetails.ctc || "As discussed"}\nProposed Joining Date: ${offerDetails.joiningDate || "TBD"}\nWork Location: ${offerDetails.location || "Corporate Office / Hybrid"}\nProbation Period: ${offerDetails.probationMonths || 3} Months\n\nPlease review the full terms in your Candidate Portal and submit your digital signature to accept this offer.\n\nWelcome aboard!\nHR & Talent Acquisition\n${companyName}`;
        } else if (actionType === "hired") {
            subject = `🏛️ Official Appointment & Joining Letter: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nThank you for accepting our employment offer! We are delighted to issue your official Appointment & Joining Letter as ${jobTitle} at ${companyName}.\n\nOfficial Joining Date: ${joiningDetails.joiningDate || "TBD"} at ${joiningDetails.reportingTime || "10:00 AM"}\nReporting Manager: ${joiningDetails.reportingManager || "Engineering Manager"}\nWork Mode: ${joiningDetails.workMode || "Hybrid"}\nMandatory Onboarding Documents: ${joiningDetails.documentsRequired || "Government ID, PAN, Educational Certificates"}\n\nWe look forward to welcoming you on your first day!\n\nSincerely,\nPeople Operations & HR\n${companyName}`;
        } else if (actionType === "rejected") {
            subject = `Application Status Update: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nThank you for taking the time to apply and interview for the ${jobTitle} position at ${companyName}. While we were impressed with your background, we have decided to move forward with other candidates whose experience more closely aligns with our current team needs.\n\nWe will keep your resume on file for future openings and wish you the very best in your career.\n\nWarm regards,\nTalent Acquisition Team\n${companyName}`;
        } else {
            body = `Dear ${candidateName},\n\nHere is an update regarding your application for ${jobTitle} at ${companyName}.\n\nBest regards,\n${companyName} Hiring Team`;
        }

        return res.status(200).json({
            success: true,
            subject,
            body
        });
    } catch (error) {
        console.error("[Draft Recruiter Email Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to draft communication."
        });
    }
};

/**
 * 7. Auto-Write Job Description & Requirements for Recruiters
 * Route: POST /api/v1/ai/generate-job-description
 */
export const generateJobPostWithAI = async (req, res) => {
    try {
        const {
            title = "Software Engineer",
            companyName = "our organization",
            jobType = "Full-Time",
            experience = "1",
            location = "Bengaluru"
        } = req.body || {};

        const systemPrompt = `Return a JSON object with keys:
- "description": a compelling 3-paragraph job description (Role Overview, Key Responsibilities, What We Offer)
- "requirements": comma-separated string of 6-8 specific technical skills
- "suggestedSalary": one of "3-6", "6-10", "10-15", "15-25", "25+"
- "suggestedExperience": string ("0", "1", "2", "3", or "5")`;

        const aiJsonRaw = await callGroqChatCompletion({
            systemPrompt,
            userPrompt: `Write a job posting for ${title} at ${companyName} (${jobType}, ${location}, ~${experience} years experience).`,
            temperature: 0.5,
            jsonMode: true
        });

        if (aiJsonRaw) {
            try {
                const parsed = JSON.parse(aiJsonRaw);
                if (parsed.description && parsed.requirements) {
                    return res.status(200).json({
                        success: true,
                        description: parsed.description,
                        requirements: Array.isArray(parsed.requirements) ? parsed.requirements.join(", ") : parsed.requirements,
                        suggestedSalary: parsed.suggestedSalary || "10-15",
                        suggestedExperience: String(parsed.suggestedExperience ?? experience ?? "1")
                    });
                }
            } catch {
                // Fall through
            }
        }

        const description = `About the Role:\n${companyName} is seeking a talented ${title} (${jobType}) based in ${location} to join our core product engineering team. You will design, build, and scale high-performance web services and intuitive user experiences.\n\nKey Responsibilities:\n• Architect, develop, and maintain modular full-stack features from conception to production deployment.\n• Collaborate closely with product managers, designers, and fellow engineers in an agile environment.\n• Optimize application performance, database queries, and API reliability.\n• Write clean, well-tested code and participate actively in peer code reviews.`;

        const requirements = "JavaScript, TypeScript, React.js, Node.js, REST APIs, MongoDB/SQL, Git, System Design";

        return res.status(200).json({
            success: true,
            description,
            requirements,
            suggestedSalary: Number(experience) >= 3 ? "15-25" : "10-15",
            suggestedExperience: String(experience || "1")
        });
    } catch (error) {
        console.error("[Generate Job Post AI Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate job description."
        });
    }
};