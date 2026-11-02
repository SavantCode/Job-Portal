import zlib from "zlib";

/**
 * Production Resume Parser & Matchmaking Extractor
 * Supports PDF (.pdf), Word (.docx, .doc), and Plain Text / RTF resumes
 * without requiring native binary dependencies.
 */

export const KNOWN_SKILLS_DICTIONARY = [
    "React.js", "React", "Next.js", "Redux", "TypeScript", "JavaScript", "HTML5", "CSS3",
    "Tailwind CSS", "Node.js", "Express.js", "Python", "Django", "FastAPI", "Flask",
    "Java", "Spring Boot", "C++", "C#", ".NET", "Go", "Golang", "Rust", "PHP", "Ruby",
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQL", "GraphQL", "REST API", "Microservices",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Jenkins", "Terraform", "Linux",
    "Git", "GitHub", "GitLab", "Jest", "Cypress", "Selenium", "Playwright",
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Scikit-Learn", "NLP",
    "LLM", "GenAI", "Data Science", "Pandas", "NumPy", "Power BI", "Tableau",
    "Figma", "UI/UX", "Agile", "Scrum", "System Design", "Data Structures", "Algorithms",
    "React Native", "Flutter", "Swift", "Kotlin", "Android", "iOS", "Cybersecurity", "OAuth", "JWT"
];

/**
 * Clean and normalize extracted raw text
 */
const cleanExtractedText = (raw = "") => {
    return String(raw)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/[^\x20-\x7E\n\r]/g, " ")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

/**
 * Extracts text from a PDF buffer by decompressing FlateDecode streams
 * and parsing PDF text operators (Tj, TJ, ')
 */
const extractTextFromPdfBuffer = (buffer) => {
    const rawLatin = buffer.toString("latin1");
    const collectedChunks = [];

    const extractPdfTextOperators = (content) => {
        // Match text inside (...) Tj
        const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
        let match;
        while ((match = tjRegex.exec(content)) !== null) {
            if (match[1]) collectedChunks.push(match[1]);
        }

        // Match text arrays [...] TJ
        const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
        while ((match = tjArrayRegex.exec(content)) !== null) {
            const inner = match[1];
            const strRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
            let sub;
            const lineParts = [];
            while ((sub = strRegex.exec(inner)) !== null) {
                if (sub[1]) lineParts.push(sub[1]);
            }
            if (lineParts.length > 0) {
                collectedChunks.push(lineParts.join(""));
            }
        }
    };

    // 1. Scan uncompressed text operators
    extractPdfTextOperators(rawLatin);

    // 2. Locate stream ... endstream blocks and inflate FlateDecode streams
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(rawLatin)) !== null) {
        try {
            const streamBytes = Buffer.from(streamMatch[1], "latin1");
            const inflated = zlib.inflateSync(streamBytes).toString("latin1");
            extractPdfTextOperators(inflated);
        } catch {
            // Stream might not be zlib-compressed or uses different filter; ignore safely
        }
    }

    // 3. Fallback: extract readable ASCII strings if PDF used custom font encodings
    if (collectedChunks.join(" ").trim().length < 40) {
        const readableMatches = rawLatin.match(/[A-Za-z0-9][A-Za-z0-9 ,.&@:/+\-_#()]{4,}/g) || [];
        const filtered = readableMatches.filter(
            (line) =>
                !/^\/?(Type|Font|Page|Catalog|Outlines|Parent|Resources|ProcSet|MediaBox|Filter|FlateDecode|Length|Subtype|BaseFont|Encoding)/i.test(
                    line.trim()
                )
        );
        collectedChunks.push(...filtered);
    }

    return cleanExtractedText(collectedChunks.join(" "));
};

/**
 * Extracts text from a .docx buffer by reading the ZIP local file entries,
 * inflating word/document.xml, and stripping XML tags.
 */
const extractTextFromDocxBuffer = (buffer) => {
    try {
        let offset = 0;
        const xmlParts = [];

        while (offset + 30 <= buffer.length) {
            const signature = buffer.readUInt32LE(offset);
            if (signature !== 0x04034b50) {
                offset += 1;
                continue;
            }

            const compressionMethod = buffer.readUInt16LE(offset + 8);
            const compressedSize = buffer.readUInt32LE(offset + 18);
            const fileNameLength = buffer.readUInt16LE(offset + 26);
            const extraFieldLength = buffer.readUInt16LE(offset + 28);

            const fileNameStart = offset + 30;
            const fileName = buffer.slice(fileNameStart, fileNameStart + fileNameLength).toString("utf8");
            const dataStart = fileNameStart + fileNameLength + extraFieldLength;
            const dataEnd = dataStart + compressedSize;

            if (fileName.startsWith("word/") && fileName.endsWith(".xml") && dataEnd <= buffer.length) {
                const compressedData = buffer.slice(dataStart, dataEnd);
                let xmlContent = "";
                if (compressionMethod === 0) {
                    xmlContent = compressedData.toString("utf8");
                } else if (compressionMethod === 8) {
                    xmlContent = zlib.inflateRawSync(compressedData).toString("utf8");
                }
                if (xmlContent) {
                    const plain = xmlContent
                        .replace(/<\/w:p>/g, "\n")
                        .replace(/<w:tab\/>/g, " ")
                        .replace(/<[^>]+>/g, " ")
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"');
                    xmlParts.push(plain);
                }
            }

            offset = dataEnd > offset + 30 ? dataEnd : offset + 30;
        }

        if (xmlParts.length > 0) {
            return cleanExtractedText(xmlParts.join("\n"));
        }
    } catch {
        // Fallback below
    }

    // Fallback for legacy .doc or unusual .docx containers
    const rawUtf8 = buffer.toString("utf8");
    const asciiMatches = rawUtf8.match(/[A-Za-z0-9][A-Za-z0-9 ,.&@:/+\-_#()\n]{5,}/g) || [];
    return cleanExtractedText(asciiMatches.join(" "));
};

/**
 * Analyzes resume text and extracts structured candidate insights for matchmaking
 */
export const analyzeResumeText = (rawText = "", fileName = "") => {
    const text = cleanExtractedText(rawText);
    const lowerText = text.toLowerCase();

    // 1. Extract technical skills
    const detectedSkills = new Set();
    for (const skill of KNOWN_SKILLS_DICTIONARY) {
        const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
        if (regex.test(lowerText)) {
            // Normalize React / React.js duplicates
            if (skill === "React" && detectedSkills.has("React.js")) continue;
            if (skill === "Golang" && detectedSkills.has("Go")) continue;
            detectedSkills.add(skill);
        }
    }

    // 2. Detect social links inside resume text
    const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
    const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+/i);
    const portfolioMatch = text.match(/https?:\/\/(?!github\.com|linkedin\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s)]*)?/i);

    // 3. Estimate experience years if mentioned (e.g. "3+ years of experience")
    const expMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs)\s+(?:of\s+)?experience/i);
    const estimatedExperienceYears = expMatch ? Math.min(30, Number(expMatch[1])) : null;

    // 4. Extract brief summary or objective line
    const lines = text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 25 && l.length < 300);

    const extractedSummary = lines.slice(0, 3).join(" ").slice(0, 420);
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 5. Calculate Resume ATS Completeness Score (0 - 100)
    let atsReadinessScore = 35;
    if (detectedSkills.size >= 3) atsReadinessScore += 20;
    if (detectedSkills.size >= 6) atsReadinessScore += 15;
    if (wordCount >= 80) atsReadinessScore += 15;
    if (githubMatch || linkedinMatch) atsReadinessScore += 10;
    if (/project|experience|education|achieved|built|developed|engineered/i.test(text)) {
        atsReadinessScore += 5;
    }
    atsReadinessScore = Math.min(100, atsReadinessScore);

    return {
        parsedText: text.slice(0, 15000), // Cap stored text to 15KB for MongoDB efficiency
        extractedSkills: Array.from(detectedSkills),
        extractedSummary,
        estimatedExperienceYears,
        detectedLinks: {
            github: githubMatch ? githubMatch[0] : "",
            linkedin: linkedinMatch ? linkedinMatch[0] : "",
            portfolio: portfolioMatch ? portfolioMatch[0] : ""
        },
        wordCount,
        atsReadinessScore,
        fileName,
        parsedAt: new Date()
    };
};

/**
 * Main entry point to parse an uploaded Multer file (.pdf, .docx, .doc, .txt)
 */
export const parseResumeFile = (file) => {
    if (!file || !file.buffer) {
        return analyzeResumeText("", "");
    }

    const originalName = file.originalname || "resume";
    const ext = originalName.toLowerCase().split(".").pop();
    const mime = (file.mimetype || "").toLowerCase();

    let rawText = "";

    if (ext === "pdf" || mime.includes("pdf")) {
        rawText = extractTextFromPdfBuffer(file.buffer);
    } else if (ext === "docx" || mime.includes("officedocument.wordprocessingml")) {
        rawText = extractTextFromDocxBuffer(file.buffer);
    } else if (ext === "doc" || mime.includes("msword") || ext === "txt" || ext === "rtf") {
        const ascii = file.buffer.toString("utf8").match(/[A-Za-z0-9][A-Za-z0-9 ,.&@:/+\-_#()\n]{4,}/g) || [];
        rawText = ascii.join(" ");
    }

    // If binary PDF/DOCX used compressed outline fonts with minimal inline text, enrich from filename
    if (rawText.trim().length < 20) {
        rawText = `${originalName.replace(/[_.-]/g, " ")} ${rawText}`;
    }

    return analyzeResumeText(rawText, originalName);
};