/**
 * Real-Time Candidate-to-Job Matchmaking Engine
 * Uses parsed PDF/Word resume text, extracted skills, manual skills, projects, and location preferences.
 */
export const computeJobMatchForUser = (job, user) => {
    if (!job || !user || user.role === "recruiter") {
        return null;
    }

    const profile = user.profile || {};
    const skills = profile.skills || [];
    const extractedSkills = profile.extractedSkills || [];
    const parsedResumeText = profile.parsedResumeText || "";
    const projects = profile.projects || [];

    const hasCandidateData =
        skills.length > 0 ||
        extractedSkills.length > 0 ||
        parsedResumeText.trim().length > 10 ||
        projects.length > 0;

    if (!hasCandidateData) {
        return null;
    }

    const projectSkills = projects.flatMap((p) =>
        Array.isArray(p.techStack) ? p.techStack : String(p.techStack || "").split(",")
    );
    const projectText = projects.map((p) => `${p.title || ""} ${p.description || ""}`).join(" ");

    const candidateCorpus = [
        ...skills,
        ...extractedSkills,
        ...projectSkills,
        profile.headline || "",
        profile.bio || "",
        parsedResumeText,
        projectText
    ]
        .join(" ")
        .toLowerCase();

    const requirements = Array.isArray(job.requirements)
        ? job.requirements.flatMap((r) => String(r).split(",")).map((s) => s.trim()).filter(Boolean)
        : [];

    const matched = [];
    const missing = [];

    requirements.forEach((req) => {
        const clean = req.toLowerCase().replace(/\.js$/i, "").trim();
        if (!clean) return;
        if (candidateCorpus.includes(clean) || candidateCorpus.includes(req.toLowerCase())) {
            matched.push(req);
        } else {
            missing.push(req);
        }
    });

    let score = requirements.length > 0 ? Math.round((matched.length / requirements.length) * 100) : 65;

    // Bonus for job title overlap with resume/headline
    const titleTokens = String(job.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
    const titleHits = titleTokens.filter((t) => candidateCorpus.includes(t)).length;
    if (titleHits > 0) {
        score = Math.min(98, score + titleHits * 4);
    }

    // Location preference bonus
    const prefLocs = (profile.preferredLocations || []).map((l) => l.toLowerCase());
    const currentLoc = (profile.currentLocation || "").toLowerCase();
    const jobLoc = (job.location || "").toLowerCase();
    if (
        (currentLoc && jobLoc.includes(currentLoc)) ||
        prefLocs.some((pl) => pl && jobLoc.includes(pl))
    ) {
        score = Math.min(99, score + 3);
    }

    return {
        score: Math.max(15, Math.min(99, score)),
        matchedSkills: matched,
        missingSkills: missing,
        fromParsedResume: Boolean(parsedResumeText)
    };
};

/**
 * Calculates candidate profile completeness percentage (0 - 100%)
 */
export const calculateProfileCompleteness = (user) => {
    if (!user) return { percent: 0, missingItems: [] };
    const p = user.profile || {};
    const checks = [
        { label: "Basic Contact & Bio", done: Boolean(user.fullname && user.email && p.bio) },
        { label: "Technical Skills (3+)", done: (p.skills?.length || 0) >= 3 },
        { label: "Uploaded & Parsed Resume (PDF/Word)", done: Boolean(p.resume || p.parsedResumeText) },
        { label: "Portfolio Projects", done: (p.projects?.length || 0) >= 1 },
        { label: "Social Links (GitHub / LinkedIn)", done: Boolean(p.socialLinks?.github || p.socialLinks?.linkedin) },
        { label: "Work Experience or Education", done: (p.experience?.length || 0) > 0 || (p.education?.length || 0) > 0 }
    ];

    const completed = checks.filter((c) => c.done).length;
    const percent = Math.round((completed / checks.length) * 100);
    const missingItems = checks.filter((c) => !c.done).map((c) => c.label);

    return { percent, missingItems, checks };
};