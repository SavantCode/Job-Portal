import { GoogleGenAI } from "@google/genai";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

/**
 * Multi-Provider LLM Engine:
 * 1. Primary: Groq Cloud API (`GROQ_API_KEY` + `GROQ_MODEL`, e.g., `openai/gpt-oss-20b`, fallback `llama-3.3-70b-versatile`)
 * 2. Secondary: Google Gemini API (`GEMINI_API_KEY` — validated to start with `AIza` to prevent 401 ACCESS_TOKEN_TYPE_UNSUPPORTED errors)
 * 3. Tertiary: Deterministic, zero-latency domain fallback so features never fail offline
 */
let geminiAuthFailed = false;

const getValidGeminiClient = () => {
    if (geminiAuthFailed) return null;
    const key = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    // Valid Google Gemini API keys always begin with "AIza"
    if (!key || !key.startsWith("AIza") || key.includes("your_")) {
        return null;
    }
    return new GoogleGenAI({ apiKey: key });
};

const getGroqConfig = () => {
    const apiKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    const preferredModel = (process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim().replace(/^["']|["']$/g, "");
    if (!apiKey || apiKey.includes("your_")) {
        return null;
    }
    return {
        apiKey,
        models: Array.from(new Set([preferredModel, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"])).filter(Boolean)
    };
};

/**
 * Calls Groq first (using GROQ_MODEL=openai/gpt-oss-20b), then Gemini if valid, returning plain text or null.
 */
const generateTextWithLLM = async (prompt, { systemPrompt = "You are an expert technical recruiter and career coach.", maxTokens = 450, temperature = 0.6 } = {}) => {
    // 1. Try Groq API first
    const groq = getGroqConfig();
    if (groq) {
        for (const modelName of groq.models) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8500);

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${groq.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                        temperature,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                });

                clearTimeout(timer);

                if (response.ok) {
                    const data = await response.json();
                    const content = data?.choices?.[0]?.message?.content?.trim();
                    if (content) {
                        // Strip <think>...</think> reasoning blocks if returned by reasoning models
                        const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
                        if (cleaned) return cleaned;
                    }
                } else if (response.status === 401 || response.status === 403) {
                    // Invalid Groq key; stop trying other Groq models
                    break;
                }
            } catch {
                // Continue to fallback Groq model or Gemini
            }
        }
    }

    // 2. Try Google Gemini API if a valid AIza* key is configured
    const gemini = getValidGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `${systemPrompt}\n\n${prompt}`
            });
            const text = response?.text?.trim();
            if (text) return text;
        } catch (err) {
            const msg = String(err?.message || "");
            if (msg.includes("401") || msg.includes("403") || msg.includes("API key not valid") || msg.includes("UNAUTHENTICATED")) {
                geminiAuthFailed = true;
            }
        }
    }

    return null;
};

/**
 * 1. Generate Cover Letter / Quick Pitch
 * Uses Groq (GROQ_MODEL=openai/gpt-oss-20b) -> Gemini -> Deterministic Fallback
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

        const prompt = `Write a concise, high-impact 100-word cover letter / outreach pitch for ${user.fullname} applying for the ${jobTitle} role at ${companyName}.
Candidate Skills: ${candidateSkills.join(", ") || "Full Stack Development"}
Candidate Projects: ${topProjects || "Production web applications"}
Candidate Bio/Resume Context: ${(user.profile?.bio || user.profile?.parsedResumeText || "").slice(0, 500)}
Job Description: ${jobDescription.slice(0, 600)}
Return plain text only (no markdown headings or placeholders), professional and enthusiastic tone, around 90-115 words.`;

        const aiPitch = await generateTextWithLLM(prompt, {
            systemPrompt: "You write concise, executive-ready 100-word candidate cover letters tailored to the role and company. Output only the cover letter text.",
            maxTokens: 350
        });

        if (aiPitch) {
            return res.status(200).json({
                success: true,
                coverLetter: aiPitch
            });
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
            const clean = reqSkill.toLowerCase().replace(/\.js$/i, "").trim();
            if (!clean) return;
            if (userCorpus.includes(clean) || userCorpus.includes(reqSkill.toLowerCase())) {
                matchedSkills.push(reqSkill);
            } else {
                missingSkills.push(reqSkill);
            }
        });

        let score = rawReqs.length > 0 ? Math.round((matchedSkills.length / rawReqs.length) * 100) : 70;
        if (user.profile?.parsedResumeText) {
            score = Math.min(98, score + 5);
        }
        score = Math.max(15, Math.min(99, score));

        let summary = "";
        if (score >= 75) {
            summary = `Strong ATS alignment (${score}%)! Your profile & parsed resume match ${matchedSkills.length} of ${rawReqs.length} core requirements for ${job.title}.`;
        } else if (score >= 50) {
            summary = `Moderate match (${score}%). Highlighting ${missingSkills.slice(0, 3).join(", ")} in your resume or projects will boost your shortlist probability.`;
        } else {
            summary = `Low keyword overlap (${score}%). Add missing skills like ${missingSkills.slice(0, 3).join(", ")} and upload your latest PDF/Word resume.`;
        }

        return res.status(200).json({
            success: true,
            score,
            matchedSkills,
            missingSkills,
            summary
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute ATS match score."
        });
    }
};

/**
 * 3. AI Resume Bullet Point Improver (XYZ Formula)
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

        const prompt = `Write exactly 3 high-impact, quantifiable resume bullet points using Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]") for a ${roleTitle} candidate.
Incorporate these technical skills naturally: ${targetSkills.join(", ") || "React.js, Node.js, AWS"}.
Return ONLY 3 lines, one bullet point per line, without numbering or markdown symbols.`;

        const llmText = await generateTextWithLLM(prompt, {
            systemPrompt: "You write ATS-optimized engineering resume bullet points with concrete metrics.",
            maxTokens: 300
        });

        if (llmText) {
            const parsedBullets = llmText
                .split(/\r?\n/)
                .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
                .filter((line) => line.length > 25)
                .slice(0, 3);

            if (parsedBullets.length === 3) {
                return res.status(200).json({
                    success: true,
                    bullets: parsedBullets
                });
            }
        }

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
            requirements = "AWS, Docker, Kubernetes, Terraform, CI/CD, Linux, Prometheus, Python";
            suggestedSalary = "15-25";
        } else if (lower.includes("intern") || lower.includes("fresher") || lower.includes("junior")) {
            suggestedSalary = "6-10";
            suggestedExperience = 0;
        } else if (lower.includes("senior") || lower.includes("lead") || lower.includes("staff")) {
            suggestedSalary = "25+";
            suggestedExperience = 5;
        }

        let description = `Role Overview:\nWe at ${companyName} are looking for a high-ownership ${title} (${jobType}, ${location}) to design, build, and scale mission-critical product capabilities.\n\nKey Responsibilities:\n• Architect, develop, and maintain modular, high-performance systems using ${requirements.split(",").slice(0, 4).join(",")}.\n• Collaborate closely with product managers, designers, and fellow engineers to deliver customer-facing features end-to-end.\n• Write clean, well-tested, and maintainable code while participating in code reviews and architectural discussions.\n• Optimize application performance, security, and observability in production environments.`;

        const prompt = `Write a professional job description for "${title}" at "${companyName}" (${jobType}, ${location}).
Include a 2-sentence "Role Overview:" followed by "Key Responsibilities:" with 4 bullet points using "•".
Keep it under 140 words and plain text only.`;

        const aiDescription = await generateTextWithLLM(prompt, {
            systemPrompt: "You are a senior technical recruiter writing clear, structured job descriptions.",
            maxTokens: 320
        });

        if (aiDescription && aiDescription.length > 60) {
            description = aiDescription;
        }

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
                keyConcepts: [s1, "scalability", "modularity", "caching", "error handling"],
                tip: `Focus on how you structure ${s1} in production, handle edge cases, and measure latency.`,
                answer: `A strong production approach for ${s1} separates business logic from transport layers, uses bounded caching and idempotency keys, and instruments P95 latency metrics.`
            },
            {
                type: "System Design & Architecture",
                question: `Design a fault-tolerant service for ${company} that integrates ${s1} and ${s2} under a 10x traffic spike. Where are the bottlenecks?`,
                keyConcepts: [s2, "load balancing", "database indexing", "queue", "rate limiting"],
                tip: "Discuss horizontal scaling, read/write separation, asynchronous queues, and graceful degradation.",
                answer: `Introduce stateless API nodes behind a load balancer, offload heavy writes to an asynchronous worker queue, add read-through LRU/Redis caching, and enforce sliding-window rate limits.`
            },
            {
                type: "Database & Performance",
                question: `How do you diagnose and resolve slow queries or data consistency issues when working with ${s3}?`,
                keyConcepts: [s3, "indexing", "ACID transactions", "query plan", "pagination"],
                tip: "Mention compound B-tree indexes (ESR rule), cursor pagination, and ACID transaction boundaries.",
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
            if (lowerAns.includes(c) || c.split(/\s+/).some((tok) => tok.length > 3 && lowerAns.includes(tok))) {
                matchedConcepts.push(concept);
            } else {
                missingConcepts.push(concept);
            }
        });

        const conceptRatio = keyConcepts.length > 0 ? matchedConcepts.length / keyConcepts.length : 0.6;
        const lengthFactor = Math.min(1, words.length / 45);
        const hasMetrics = /\d+%|\d+x|\d+\s*(ms|sec|users|rps|mins)/i.test(cleanAns);

        const technicalScore = Math.max(3, Math.min(10, Math.round(conceptRatio * 7 + lengthFactor * 3)));
        const clarityScore = Math.max(4, Math.min(10, Math.round(lengthFactor * 8 + (cleanAns.includes(".") ? 2 : 0))));
        const impactScore = Math.max(3, Math.min(10, Math.round(lengthFactor * 6 + (hasMetrics ? 4 : 2))));
        const overallScore = Math.round(((technicalScore + clarityScore + impactScore) / 3) * 10) / 10;

        let verdictBadge = "Needs More Depth";
        if (overallScore >= 8) verdictBadge = "Strong Hire Signal";
        else if (overallScore >= 6.5) verdictBadge = "Solid / On Track";

        const strengths = [];
        const improvements = [];

        if (matchedConcepts.length > 0) {
            strengths.push(`Covered key concepts: ${matchedConcepts.join(", ")}.`);
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
            subject = `🎉 Official Employment Offer: ${jobTitle} at ${companyName}`;
            body = `Dear ${candidateName},\n\nCongratulations! Following your exceptional performance across our technical and leadership interview rounds, we are thrilled to extend an Official Offer of Employment for the position of ${jobTitle} at ${companyName}.\n\n• Annual Compensation (CTC): ${finalCtc}\n• Proposed Joining Date: ${finalJoinDate}\n• Work Location: ${finalLocation}\n• Probation Period: ${offerDetails?.probationMonths || 3} Months\n\nWe are confident that your technical expertise and ownership mindset will make a significant impact on our engineering organization. Please review the formal terms and sign digitally via your Candidate Portal.\n\nWarm regards,\nTalent Acquisition & HR Leadership\n${companyName}`;
        } else if (stage === "hired" || stage === "joining") {
            subject = `🏢 Official Appointment & Joining Letter: ${jobTitle} at ${companyName}`;
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