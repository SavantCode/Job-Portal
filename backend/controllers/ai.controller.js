import { GoogleGenAI } from "@google/genai";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import dotenv from "dotenv";

dotenv.config();

const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("your_") || key.trim() === "") return null;
    try {
        return new GoogleGenAI({ apiKey: key });
    } catch {
        return null;
    }
};

/**
 * 1. Generate Cover Letter / Quick Pitch
 * Incorporates user's profile skills, parsed resume text, and projects
 */
export const generateCoverLetter = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.jobId;
        const { externalTitle, externalCompany, externalJobDescription } = req.body || {};

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        let jobTitle = externalTitle || "Software Engineer";
        let companyName = externalCompany || "your organization";
        let jobDescription = externalJobDescription || "";
        let jobRequirements = [];

        if (jobId) {
            const job = await Job.findById(jobId).populate("company");
            if (job) {
                jobTitle = job.title || jobTitle;
                companyName = job.company?.name || companyName;
                jobDescription = job.description || jobDescription;
                jobRequirements = job.requirements || [];
            }
        }

        const candidateSkills = [
            ...(user.profile?.skills || []),
            ...(user.profile?.extractedSkills || [])
        ].filter((v, i, a) => a.findIndex((t) => t.toLowerCase() === v.toLowerCase()) === i);

        const topProjects = (user.profile?.projects || [])
            .slice(0, 2)
            .map((p) => `${p.title} (${(p.techStack || []).join(", ")})`)
            .join("; ");

        const ai = getGeminiClient();
        if (ai) {
            try {
                const prompt = `Write a concise, high-impact 100-word cover letter / outreach pitch for ${user.fullname} applying for the ${jobTitle} role at ${companyName}.
Candidate Skills: ${candidateSkills.join(", ") || "Full Stack Development"}
Candidate Projects: ${topProjects || "Production web applications"}
Candidate Bio/Resume Context: ${(user.profile?.bio || user.profile?.parsedResumeText || "").slice(0, 500)}
Job Description: ${jobDescription.slice(0, 600)}
Return plain text only, professional and enthusiastic tone, around 90-110 words.`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt
                });
                const text = response?.text?.trim();
                if (text) {
                    return res.status(200).json({
                        success: true,
                        coverLetter: text
                    });
                }
            } catch (err) {
                console.log("Gemini fallback used for cover letter:", err.message);
            }
        }

        const skillsPhrase =
            candidateSkills.length > 0
                ? candidateSkills.slice(0, 5).join(", ")
                : jobRequirements.slice(0, 4).join(", ") || "modern software engineering, scalable architecture, and agile delivery";

        const projectSentence = topProjects
            ? ` Recently, I built ${topProjects}, demonstrating my ability to ship production-ready features.`
            : "";

        const fallbackPitch = `Dear Hiring Team at ${companyName},\n\nI am excited to apply for the ${jobTitle} position. With hands-on expertise in ${skillsPhrase}, I have a strong track record of building reliable, user-centric applications that align closely with your technical requirements.${projectSentence}\n\n${user.profile?.bio ? user.profile.bio + " " : ""}I would welcome the opportunity to bring my problem-solving mindset and engineering rigor to ${companyName} and contribute immediately to your roadmap.\n\nWarm regards,\n${user.fullname}`;

        return res.status(200).json({
            success: true,
            coverLetter: fallbackPitch
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to generate cover letter.",
            success: false
        });
    }
};

/**
 * 2. Live ATS Resume & Skill Matchmaking Engine
 * Uses profile skills + parsed PDF/Word resume text + candidate project tech stacks
 */
export const getAtsMatchScore = async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.params;

        const [user, job] = await Promise.all([
            User.findById(userId),
            Job.findById(jobId).populate("company")
        ]);

        if (!user || !job) {
            return res.status(404).json({
                success: false,
                message: "User or Job not found."
            });
        }

        const rawReqs = Array.isArray(job.requirements)
            ? job.requirements.flatMap((r) => String(r).split(",")).map((s) => s.trim()).filter(Boolean)
            : [];

        const projectTech = (user.profile?.projects || []).flatMap((p) => p.techStack || []);
        const projectDescriptions = (user.profile?.projects || [])
            .map((p) => `${p.title} ${p.description}`)
            .join(" ");

        const userCorpus = [
            ...(user.profile?.skills || []),
            ...(user.profile?.extractedSkills || []),
            ...projectTech,
            user.profile?.headline || "",
            user.profile?.bio || "",
            user.profile?.parsedResumeText || "",
            projectDescriptions
        ]
            .join(" ")
            .toLowerCase();

        const matchedSkills = [];
        const missingSkills = [];

        rawReqs.forEach((reqSkill) => {
            const cleanReq = reqSkill.toLowerCase().replace(/\.js$/i, "").trim();
            if (!cleanReq) return;
            if (userCorpus.includes(cleanReq) || userCorpus.includes(reqSkill.toLowerCase())) {
                matchedSkills.push(reqSkill);
            } else {
                missingSkills.push(reqSkill);
            }
        });

        let score = 0;
        if (rawReqs.length > 0) {
            score = Math.round((matchedSkills.length / rawReqs.length) * 100);
        } else {
            score = user.profile?.skills?.length > 0 || user.profile?.parsedResumeText ? 78 : 45;
        }

        const titleWords = (job.title || "")
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
        const titleOverlap = titleWords.filter((w) => userCorpus.includes(w)).length;
        if (titleOverlap > 0 && score < 95) {
            score = Math.min(98, score + titleOverlap * 4);
        }

        const usedParsedResume = Boolean(user.profile?.parsedResumeText);
        const summary =
            score >= 75
                ? `Strong ATS Match (${score}%)! Your ${usedParsedResume ? "parsed resume, projects & skills" : "profile skills"} closely align with ${job.company?.name || "this role"}.`
                : score >= 50
                ? `Moderate Match (${score}%). Adding ${missingSkills.slice(0, 3).join(", ") || "key role keywords"} to your resume or projects will boost your ranking.`
                : `Low Match (${score}%). Upload your latest PDF/Word resume or add ${missingSkills.slice(0, 3).join(", ")} to improve matchmaking.`;

        return res.status(200).json({
            success: true,
            score,
            matchedSkills,
            missingSkills,
            usedParsedResume,
            resumeFileName: user.profile?.resumeOriginalName || "",
            summary
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate ATS match score."
        });
    }
};

/**
 * 3. Generate Tailored XYZ Resume Bullet Points
 */
export const generateResumeBullets = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { missingSkills = [], matchedSkills = [] } = req.body || {};

        const job = await Job.findById(jobId).populate("company");
        const roleTitle = job?.title || "Software Engineer";
        const targetSkills = [...matchedSkills, ...missingSkills].slice(0, 5);
        const s1 = targetSkills[0] || "React.js";
        const s2 = targetSkills[1] || "Node.js";
        const s3 = targetSkills[2] || "Cloud & CI/CD";

        const bullets = [
            `Architected and shipped scalable ${roleTitle} features using ${s1} and ${s2}, reducing API latency by 34% and supporting 50K+ active users.`,
            `Engineered automated testing and deployment pipelines with ${s3}, cutting production release cycles by 40% while maintaining 99.9% uptime.`,
            `Collaborated across product and design teams to optimize core workflows in ${s1}, increasing user engagement and conversion metrics by 25%.`
        ];

        return res.status(200).json({
            success: true,
            bullets
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate resume bullets."
        });
    }
};

/**
 * 4. Recruiter AI Job Description & Tech Stack Generator
 */
export const generateJobDescription = async (req, res) => {
    try {
        const { title = "Software Engineer", companyName = "our company", jobType = "Full-Time", location = "Bengaluru" } = req.body || {};

        const lower = title.toLowerCase();
        let requirements = "JavaScript, TypeScript, React.js, Node.js, SQL, Git, REST APIs, AWS";
        let suggestedSalary = "10-15";
        let suggestedExperience = 2;

        if (lower.includes("frontend") || lower.includes("react") || lower.includes("ui")) {
            requirements = "React.js, TypeScript, Next.js, Tailwind CSS, Redux Toolkit, HTML5, CSS3, Jest";
            suggestedSalary = "10-15";
        } else if (lower.includes("backend") || lower.includes("node") || lower.includes("java")) {
            requirements = "Node.js, Express.js, PostgreSQL, MongoDB, Redis, Docker, Microservices, AWS";
            suggestedSalary = "15-25";
        } else if (lower.includes("data") || lower.includes("ai") || lower.includes("ml")) {
            requirements = "Python, PyTorch, TensorFlow, SQL, Pandas, Scikit-Learn, Docker, AWS";
            suggestedSalary = "15-25";
        } else if (lower.includes("devops") || lower.includes("cloud") || lower.includes("sre")) {
            requirements = "AWS, Kubernetes, Docker, Terraform, CI/CD, Linux, Prometheus, GitHub Actions";
            suggestedSalary = "15-25";
        } else if (lower.includes("intern") || lower.includes("fresher") || lower.includes("junior")) {
            suggestedSalary = "6-10";
            suggestedExperience = 0;
        } else if (lower.includes("senior") || lower.includes("lead") || lower.includes("staff")) {
            suggestedSalary = "25+";
            suggestedExperience = 5;
        }

        const description = `Role Overview:\nWe at ${companyName} are looking for a high-ownership ${title} (${jobType}, ${location}) to design, build, and scale mission-critical product capabilities.\n\nKey Responsibilities:\n• Architect, develop, and maintain modular, high-performance systems using ${requirements.split(",").slice(0, 4).join(",")}.\n• Collaborate closely with product managers, designers, and fellow engineers to deliver customer-facing features end-to-end.\n• Write clean, well-tested, and maintainable code while participating in code reviews and architectural discussions.\n• Optimize application performance, security, and observability in production environments.`;

        return res.status(200).json({
            success: true,
            description,
            requirements,
            suggestedSalary,
            suggestedExperience
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate job description."
        });
    }
};

/**
 * 5. AI Mock Interview Question Generator (5 Role-Specific Rounds)
 */
export const generateInterviewPrep = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId).populate("company");

        const role = job?.title || "Software Engineer";
        const company = job?.company?.name || "Enterprise Corp";
        const skills = Array.isArray(job?.requirements) && job.requirements.length > 0
            ? job.requirements.flatMap((r) => String(r).split(",")).map((s) => s.trim()).filter(Boolean)
            : ["React.js", "Node.js", "System Design", "SQL"];

        const s1 = skills[0] || "core architecture";
        const s2 = skills[1] || "API design";
        const s3 = skills[2] || "database optimization";

        const questions = [
            {
                type: "Technical Core",
                question: `In the context of ${role} at ${company}, how do you architect and optimize ${s1} workflows for high concurrency and maintainability?`,
                keyConcepts: [s1, "scalability", "modular architecture", "performance", "error handling"],
                tip: `Explain trade-offs, state/data flow, and cite a concrete metric or production bottleneck you solved using ${s1}.`,
                answer: `A strong architecture in ${s1} separates domain logic from I/O, uses caching/memoization for hot paths, enforces strict schema validation, and monitors p95 latency with structured observability.`
            },
            {
                type: "System Design & Bottlenecks",
                question: `Walk through how you would design a fault-tolerant integration between ${s1} and ${s2}, ensuring security, rate-limiting, and zero data loss under spike traffic.`,
                keyConcepts: [s2, "rate limiting", "idempotency", "caching", "security"],
                tip: "Cover API contracts, authentication, retry with exponential backoff, and database indexing.",
                answer: `Use stateless JWT/OAuth2 authentication, sliding-window rate limiting, idempotent request keys, read-replicas or Redis caching for heavy reads, and circuit breakers for downstream dependencies.`
            },
            {
                type: "Database & Performance",
                question: `Suppose a critical query or data pipeline involving ${s3} slows down by 5x as data grows to 10M+ records. How do you diagnose and resolve it?`,
                keyConcepts: [s3, "indexing", "query profiling", "pagination", "caching"],
                tip: "Mention execution plans (EXPLAIN), compound indexes, cursor pagination, and payload projection.",
                answer: `First inspect the query execution plan to eliminate full collection/table scans, add selective compound indexes, replace offset pagination with cursor-based pagination, and project only required fields.`
            },
            {
                type: "Debugging & Production Incident",
                question: `Describe a time a production issue or memory/performance regression occurred in a system you built. How did you isolate the root cause and prevent recurrence?`,
                keyConcepts: ["root cause", "monitoring", "logs", "automated tests", "postmortem"],
                tip: "Use the STAR framework (Situation, Task, Action, Result) and quantify recovery time.",
                answer: `Isolated the regression via error telemetry and profiling, rolled back/hotfixed the offending release within 15 minutes, and added regression tests plus CI performance gates.`
            },
            {
                type: "Behavioral (STAR Leadership)",
                question: `At ${company}, engineers often balance tight delivery deadlines with technical quality. Tell me about a trade-off you negotiated with stakeholders.`,
                keyConcepts: ["stakeholders", "prioritization", "trade-off", "delivery", "impact"],
                tip: "Show how you communicated risk clearly, shipped an iterative MVP, and scheduled tech-debt paydown.",
                answer: `Aligned with product on core P0 user flows for the initial launch while documenting security/scalability guardrails, delivering on schedule with zero critical bugs.`
            }
        ];

        return res.status(200).json({
            success: true,
            questions
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate mock interview questions."
        });
    }
};

/**
 * 6. AI Mock Interview Answer Evaluator (10-Point Rubric)
 */
export const evaluateInterviewAnswer = async (req, res) => {
    try {
        const { question = "", userAnswer = "", keyConcepts = [], idealAnswer = "" } = req.body || {};

        const cleanAns = String(userAnswer).trim();
        if (!cleanAns) {
            return res.status(400).json({
                success: false,
                message: "Please provide an answer to evaluate."
            });
        }

        const words = cleanAns.split(/\s+/).filter(Boolean);
        const lowerAns = cleanAns.toLowerCase();

        const matchedConcepts = [];
        const missingConcepts = [];
        (Array.isArray(keyConcepts) ? keyConcepts : []).forEach((concept) => {
            const c = String(concept).toLowerCase();
            if (lowerAns.includes(c) || c.split(/\s+/).some((w) => w.length > 3 && lowerAns.includes(w))) {
                matchedConcepts.push(concept);
            } else {
                missingConcepts.push(concept);
            }
        });

        const hasMetrics = /\d+%|\d+x|\d+\s*(ms|sec|users|requests|lpa|records)/i.test(cleanAns);
        const hasStructure = /first|second|because|therefore|result|implemented|designed|optimized|ensured/i.test(cleanAns);

        let technicalScore = Math.min(10, 4 + matchedConcepts.length * 1.3 + (words.length >= 35 ? 1.5 : 0));
        let clarityScore = Math.min(10, 5 + (words.length >= 25 ? 2 : 0) + (hasStructure ? 2 : 0) + (words.length >= 55 ? 1 : 0));
        let impactScore = Math.min(10, 4.5 + (hasMetrics ? 3 : 0) + (hasStructure ? 1.5 : 0) + (matchedConcepts.length > 0 ? 1 : 0));

        technicalScore = Number(technicalScore.toFixed(1));
        clarityScore = Number(clarityScore.toFixed(1));
        impactScore = Number(impactScore.toFixed(1));
        const overallScore = Number(((technicalScore + clarityScore + impactScore) / 3).toFixed(1));

        const verdictBadge =
            overallScore >= 8
                ? "Strong Hire Signal"
                : overallScore >= 6.5
                ? "Hire / Solid Response"
                : "Needs Deeper Examples";

        const strengths = [];
        const improvements = [];

        if (matchedConcepts.length > 0) {
            strengths.push(`Covered core concepts: ${matchedConcepts.join(", ")}.`);
        }
        if (hasMetrics) {
            strengths.push("Included quantifiable metrics/impact numbers.");
        }
        if (words.length >= 35) {
            strengths.push("Provided structured context and technical depth.");
        }
        if (strengths.length === 0) {
            strengths.push("Addressed the prompt directly.");
        }

        if (missingConcepts.length > 0) {
            improvements.push(`Explicitly discuss: ${missingConcepts.join(", ")}.`);
        }
        if (!hasMetrics) {
            improvements.push("Quantify your impact (e.g., 'reduced latency by 30%' or 'handled 10K RPS').");
        }
        if (words.length < 30) {
            improvements.push("Expand your explanation using the STAR method (Situation, Task, Action, Result).");
        }

        return res.status(200).json({
            success: true,
            evaluation: {
                overallScore,
                technicalScore,
                clarityScore,
                impactScore,
                verdictBadge,
                matchedConcepts,
                missingConcepts,
                strengths,
                improvements,
                idealAnswer: idealAnswer || `In production, combine ${keyConcepts.slice(0, 3).join(", ")} with clear observability and measurable SLAs.`
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to evaluate interview answer."
        });
    }
};

/**
 * 7. Recruiter AI Stage Communication & Official Letter Drafter
 * Exported as both `draftRecruiterCommunication` and `generateRecruiterStageLetter`
 * so `ai.route.js` and `ApplicantsTable.jsx` work seamlessly.
 */
export const draftRecruiterCommunication = async (req, res) => {
    try {
        const {
            stage = "offer_sent",
            candidateName = "Candidate",
            jobTitle = "Software Engineer",
            companyName = "Enterprise Corp",
            ctc = "15 LPA",
            joiningDate = "Next Month",
            location = "Bengaluru",
            interviewDetails = {},
            assignmentDetails = {},
            offerDetails = {},
            joiningDetails = {}
        } = req.body || {};

        const finalCtc = offerDetails?.ctc || ctc || "15 LPA";
        const finalJoinDate = joiningDetails?.joiningDate || offerDetails?.joiningDate || joiningDate || "Next Month";
        const finalLocation = offerDetails?.location || location || "Bengaluru";

        let subject = `Update on your application for ${jobTitle} at ${companyName}`;
        let body = "";

        if (stage === "offer_sent" || stage === "offer") {
            subject = `🎉 Official Employment Offer Letter: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nCongratulations! Following our technical and executive interview rounds, we are thrilled to extend an official Offer of Employment for the position of ${jobTitle} at ${companyName}.\n\nYour annual Total Target Compensation (CTC) will be ${finalCtc}, based out of our ${finalLocation} office, with a proposed start date of ${finalJoinDate}.\n\nWe were deeply impressed by your technical architecture skills, problem-solving depth, and cultural alignment. Please review the compensation terms in your Candidate Portal and sign digitally to confirm your acceptance.\n\nWarm regards,\nTalent Acquisition & Executive HR\n${companyName}`;
        } else if (stage === "hired" || stage === "joining") {
            subject = `🏛️ Official Appointment & Joining Letter: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nWelcome aboard to ${companyName}! Further to your acceptance of our employment offer, we are delighted to issue your Official Appointment & Joining Letter as ${jobTitle} effective ${finalJoinDate}.\n\nPlease report at ${joiningDetails?.reportingTime || "10:00 AM"} (${joiningDetails?.workMode || "Hybrid"}) to ${joiningDetails?.reportingManager || "your Engineering Manager"} along with your verification documents. Our engineering team is excited to build with you!\n\nSincerely,\nPeople Operations & HR Leadership\n${companyName}`;
        } else if (stage === "interview_scheduled" || stage === "interview") {
            subject = `📅 Interview Invitation: ${interviewDetails?.roundName || "Technical Round"} for ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nWe were impressed by your profile and would like to invite you to the ${interviewDetails?.roundName || "Technical & System Design Round"} for the ${jobTitle} role at ${companyName}.\n\n• Date: ${interviewDetails?.date || "TBD"}\n• Time: ${interviewDetails?.time || "TBD"}\n• Mode / Link: ${interviewDetails?.meetingLink || "Video Conference"}\n\nPlease confirm your availability and join the meeting link 5 minutes prior.\n\nBest regards,\nRecruitment Team, ${companyName}`;
        } else if (stage === "assignment_sent" || stage === "assignment") {
            subject = `📝 Technical Assessment: ${assignmentDetails?.title || jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nCongratulations on advancing to the technical assessment stage for ${jobTitle} at ${companyName}!\n\n• Assessment: ${assignmentDetails?.title || "Take-Home Engineering Challenge"}\n• Submission Deadline: ${assignmentDetails?.deadline || "Within 48 hours"}\n\nPlease review the instructions in your Candidate Portal and submit your GitHub repository / live deployment link before the deadline.\n\nBest regards,\nEngineering Hiring Team, ${companyName}`;
        } else if (stage === "shortlisted") {
            subject = `✨ Application Shortlisted: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nGreat news! Your application and resume for the ${jobTitle} position at ${companyName} have been shortlisted by our hiring panel. We will reach out shortly with the next steps in the interview pipeline.\n\nWarm regards,\nTalent Acquisition Team, ${companyName}`;
        } else if (stage === "rejected") {
            subject = `Update regarding your application for ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nThank you for taking the time to apply and interview for the ${jobTitle} role at ${companyName}. While we were impressed with your background, we have decided to move forward with other candidates whose experience more closely aligns with our current team needs.\n\nWe will keep your resume on file for future openings that match your skills.\n\nWishing you the very best,\nTalent Acquisition Team, ${companyName}`;
        } else {
            body = `Dear ${candidateName},\n\nThank you for your continued interest in the ${jobTitle} opportunity at ${companyName}. We are pleased to share the next update regarding your application pipeline.\n\nBest regards,\nRecruitment Team, ${companyName}`;
        }

        return res.status(200).json({
            success: true,
            subject,
            body,
            letterContent: body
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to draft recruiter communication."
        });
    }
};

export const generateRecruiterStageLetter = draftRecruiterCommunication;