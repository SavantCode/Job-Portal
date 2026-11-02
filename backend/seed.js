import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./utils/db.js";
import { User } from "./models/user.model.js";
import { Company } from "./models/company.model.js";
import { Job } from "./models/job.model.js";
import { Application } from "./models/application.model.js";
import { Notification } from "./models/notification.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "./.env") });

const seedDatabase = async () => {
    try {
        const connected = await connectDB();
        if (!connected || mongoose.connection.readyState !== 1) {
            console.error(
                "\n❌ Cannot seed database because MongoDB is not reachable.\n👉 Please start your local MongoDB service OR set a valid MONGO_URI in backend/.env and re-run `node backend/seed.js`.\n"
            );
            process.exit(1);
        }

        console.log("🧹 Clearing existing collections for a fresh, consistent seed...");
        await Promise.all([
            Notification.deleteMany({}),
            Application.deleteMany({}),
            Job.deleteMany({}),
            Company.deleteMany({}),
            User.deleteMany({})
        ]);

        const hashedPassword = await bcrypt.hash("password123", 10);

        // ============================================================================
        // 1. CREATE RECRUITERS (Primary Demo Recruiter: recruiter@google.com)
        // ============================================================================
        const recruiters = await User.insertMany([
            {
                fullname: "Vikramaditya Rao",
                email: "recruiter@google.com",
                phoneNumber: "9876543210",
                password: hashedPassword,
                role: "recruiter",
                profile: {
                    headline: "Principal Technical Recruiter • Cloud, Distributed Systems & AI",
                    bio: "Primary Demo Recruiter Account — Manages Google India & Stripe with candidates in every Kanban hiring stage (Applied, Shortlisted, Assignment, Interview, Offer Sent, Offer Accepted, Hired, Rejected).",
                    skills: ["Technical Recruiting", "System Design", "Full Stack", "Cloud Architecture", "AI/ML"],
                    currentLocation: "Bengaluru",
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikramaditya"
                }
            },
            {
                fullname: "Ananya Deshmukh",
                email: "recruiter@microsoft.com",
                phoneNumber: "9876543211",
                password: hashedPassword,
                role: "recruiter",
                profile: {
                    headline: "Senior Engineering Talent Partner • Enterprise SaaS & Developer Tools",
                    bio: "Hiring top-tier Frontend, Backend, and DevOps engineers for Microsoft Azure and Atlassian engineering hubs.",
                    skills: ["Engineering Hiring", "Frontend", "Backend", "DevOps", "Product Management"],
                    currentLocation: "Hyderabad",
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya"
                }
            },
            {
                fullname: "Rohan Mehta",
                email: "recruiter@razorpay.com",
                phoneNumber: "9876543212",
                password: hashedPassword,
                role: "recruiter",
                profile: {
                    headline: "VP Talent Acquisition • High-Growth FinTech & Quick Commerce",
                    bio: "Scaling engineering and data teams at Razorpay and Zepto.",
                    skills: ["FinTech Hiring", "Golang", "React.js", "Node.js", "Data Science"],
                    currentLocation: "Bengaluru",
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan"
                }
            }
        ]);

        const [recruiterGoogle, recruiterMicrosoft, recruiterRazorpay] = recruiters;

        // ============================================================================
        // 2. CREATE COMPANIES (6 Realistic Tech Companies)
        // ============================================================================
        const companies = await Company.insertMany([
            {
                name: "Google India",
                description: "Organizing the world's information and building planetary-scale Cloud, Search, and Gemini AI products.",
                website: "https://careers.google.com",
                location: "Bengaluru",
                logo: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png",
                userId: recruiterGoogle._id
            },
            {
                name: "Stripe",
                description: "Financial infrastructure platform for the internet, powering global payments, billing, and treasury APIs.",
                website: "https://stripe.com/jobs",
                location: "Bengaluru",
                logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Stripe",
                userId: recruiterGoogle._id
            },
            {
                name: "Microsoft",
                description: "Empowering every person and every organization on the planet to achieve more through Azure, Copilot, and Developer Tools.",
                website: "https://careers.microsoft.com",
                location: "Hyderabad",
                logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Microsoft",
                userId: recruiterMicrosoft._id
            },
            {
                name: "Atlassian",
                description: "Unleashing the potential of every team with Jira, Confluence, Bitbucket, and AI-powered collaboration tools.",
                website: "https://www.atlassian.com/company/careers",
                location: "Remote",
                logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Atlassian",
                userId: recruiterMicrosoft._id
            },
            {
                name: "Razorpay",
                description: "India's leading full-stack financial solutions company enabling seamless payments, banking, and payroll for millions of businesses.",
                website: "https://razorpay.com/jobs",
                location: "Bengaluru",
                logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Razorpay",
                userId: recruiterRazorpay._id
            },
            {
                name: "Zepto",
                description: "India's fastest-growing quick-commerce engineering organization delivering groceries and essentials in 10 minutes through real-time supply chain AI.",
                website: "https://www.zeptonow.com",
                location: "Mumbai",
                logo: "https://api.dicebear.com/7.x/identicon/svg?seed=Zepto",
                userId: recruiterRazorpay._id
            }
        ]);

        const [googleComp, stripeComp, microsoftComp, atlassianComp, razorpayComp, zeptoComp] = companies;

        // ============================================================================
        // 3. CREATE STUDENTS / JOB SEEKERS (5 Rich Candidate Profiles + Parsed Resumes)
        // ============================================================================
        const students = await User.insertMany([
            {
                fullname: "Aarav Sharma",
                email: "aarav@student.com",
                phoneNumber: "9123456780",
                password: hashedPassword,
                role: "student",
                profile: {
                    headline: "Full Stack Engineer • React.js, Node.js, TypeScript & AWS",
                    bio: "Full-stack software developer with 2+ years of experience building scalable MERN & Next.js web applications, microservices, and real-time dashboards.",
                    skills: ["React.js", "Node.js", "TypeScript", "JavaScript", "MongoDB", "PostgreSQL", "Express.js", "Docker", "AWS", "Tailwind CSS", "Redux"],
                    extractedSkills: ["React.js", "Node.js", "TypeScript", "MongoDB", "PostgreSQL", "Docker", "AWS", "Redis", "GraphQL"],
                    currentLocation: "Bengaluru",
                    preferredLocations: ["Bengaluru", "Hyderabad", "Remote"],
                    experienceYears: 2,
                    expectedCtc: "18 - 24 LPA",
                    noticePeriod: "Immediate",
                    openToWork: true,
                    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    resumeOriginalName: "Aarav_Sharma_FullStack_Resume.pdf",
                    resumeMimeType: "application/pdf",
                    resumeAtsScore: 94,
                    resumeParsedAt: new Date(),
                    parsedResumeText: `AARAV SHARMA\nFull Stack Software Engineer | Bengaluru, India\nGitHub: https://github.com/aaravsharma | LinkedIn: https://linkedin.com/in/aaravsharma\n\nSUMMARY\nResults-driven Full Stack Developer with 2+ years of experience architecting high-concurrency web applications using React.js, Next.js, Node.js, TypeScript, MongoDB, PostgreSQL, Redis, and AWS.\n\nEXPERIENCE\nSoftware Engineer — CloudScale Labs (2023 - Present)\n• Engineered microservices in Node.js, Express.js, and PostgreSQL handling 40,000+ RPM with 99.95% uptime.\n• Built modular React.js & TypeScript dashboards, reducing page load latency by 38%.\n• Automated CI/CD pipelines using Docker, GitHub Actions, and AWS ECS.\n\nPROJECTS\n1. AI Job Portal & ATS Matchmaker (React.js, Node.js, MongoDB, Gemini AI)\n• Built a full-stack recruitment ecosystem with PDF/Word resume parsing and voice mock interviews.\n2. FinFlow Realtime Ledger (TypeScript, Next.js, PostgreSQL, Redis)\n• Designed an idempotent payment webhook processor handling 2,500 TPS.`,
                    projects: [
                        {
                            title: "AI Job Portal & ATS Matchmaker",
                            description: "Built an enterprise hiring platform featuring PDF/DOCX resume parsing, real-time ATS skill scoring, and voice-enabled AI mock interviews.",
                            techStack: ["React.js", "Node.js", "MongoDB", "Tailwind CSS", "Express.js"],
                            liveUrl: "https://jobportal-demo.vercel.app",
                            githubUrl: "https://github.com/aaravsharma/ai-job-portal"
                        },
                        {
                            title: "FinFlow Distributed Payment Ledger",
                            description: "Engineered a fault-tolerant double-entry ledger and webhook dispatcher with Redis rate-limiting and PostgreSQL ACID transactions.",
                            techStack: ["TypeScript", "Next.js", "PostgreSQL", "Redis", "Docker"],
                            liveUrl: "https://finflow-demo.vercel.app",
                            githubUrl: "https://github.com/aaravsharma/finflow-ledger"
                        }
                    ],
                    experience: [
                        {
                            role: "Software Engineer (Full Stack)",
                            company: "CloudScale Labs",
                            duration: "Jul 2023 - Present",
                            description: "Shipped customer-facing React.js & Node.js modules serving 120K+ monthly active users and cut API p95 latency by 38%."
                        },
                        {
                            role: "Full Stack Developer Intern",
                            company: "NexGen FinTech",
                            duration: "Jan 2023 - Jun 2023",
                            description: "Developed reusable UI components in React & Tailwind CSS and wrote REST APIs with Express and MongoDB."
                        }
                    ],
                    education: [
                        {
                            degree: "B.Tech in Computer Science & Engineering",
                            institution: "National Institute of Technology (NIT)",
                            year: "2019 - 2023",
                            grade: "8.9 CGPA"
                        }
                    ],
                    socialLinks: {
                        github: "https://github.com/aaravsharma",
                        linkedin: "https://linkedin.com/in/aaravsharma",
                        portfolio: "https://aaravsharma.dev",
                        leetcode: "https://leetcode.com/u/aaravsharma",
                        twitter: "https://x.com/aaravsharma"
                    },
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav"
                }
            },
            {
                fullname: "Priya Nair",
                email: "priya@student.com",
                phoneNumber: "9123456781",
                password: hashedPassword,
                role: "student",
                profile: {
                    headline: "AI / Machine Learning Engineer • Python, PyTorch, LLMs & FastAPI",
                    bio: "AI Engineer specializing in Retrieval-Augmented Generation (RAG), NLP pipelines, PyTorch model fine-tuning, and production FastAPI microservices.",
                    skills: ["Python", "PyTorch", "TensorFlow", "Machine Learning", "NLP", "LLM", "GenAI", "FastAPI", "Docker", "SQL", "AWS"],
                    extractedSkills: ["Python", "PyTorch", "TensorFlow", "Machine Learning", "NLP", "LLM", "GenAI", "FastAPI", "Docker", "SQL"],
                    currentLocation: "Hyderabad",
                    preferredLocations: ["Hyderabad", "Bengaluru", "Remote"],
                    experienceYears: 2,
                    expectedCtc: "20 - 28 LPA",
                    noticePeriod: "15 Days",
                    openToWork: true,
                    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    resumeOriginalName: "Priya_Nair_AI_ML_Resume.pdf",
                    resumeMimeType: "application/pdf",
                    resumeAtsScore: 92,
                    resumeParsedAt: new Date(),
                    parsedResumeText: `PRIYA NAIR\nAI & Machine Learning Engineer | Hyderabad, India\nSkills: Python, PyTorch, TensorFlow, LLM, GenAI, NLP, FastAPI, Docker, SQL, AWS`,
                    projects: [
                        {
                            title: "Enterprise Multi-Doc RAG Copilot",
                            description: "Built a hybrid semantic + BM25 search and question-answering engine over 50,000+ technical PDFs using Python, PyTorch, and FastAPI.",
                            techStack: ["Python", "PyTorch", "FastAPI", "LLM", "Docker"],
                            liveUrl: "https://rag-copilot.demo.ai",
                            githubUrl: "https://github.com/priyanair/enterprise-rag"
                        }
                    ],
                    experience: [
                        {
                            role: "Machine Learning Engineer",
                            company: "DeepSight AI",
                            duration: "Aug 2023 - Present",
                            description: "Designed production NLP classification and LLM retrieval pipelines handling 1M+ daily queries."
                        }
                    ],
                    education: [
                        {
                            degree: "M.Tech in Artificial Intelligence",
                            institution: "IIIT Hyderabad",
                            year: "2021 - 2023",
                            grade: "9.2 CGPA"
                        }
                    ],
                    socialLinks: {
                        github: "https://github.com/priyanair",
                        linkedin: "https://linkedin.com/in/priyanair",
                        portfolio: "https://priyanair.ai",
                        leetcode: "https://leetcode.com/u/priyanair"
                    },
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                }
            },
            {
                fullname: "Kabir Verma",
                email: "kabir@student.com",
                phoneNumber: "9123456782",
                password: hashedPassword,
                role: "student",
                profile: {
                    headline: "Backend & Cloud DevOps Engineer • Go, Kubernetes, AWS & Microservices",
                    bio: "Backend and Platform Engineer focused on high-throughput Golang/Node.js services, Kubernetes cluster automation, Terraform IaC, and distributed databases.",
                    skills: ["Go", "Node.js", "Kubernetes", "Docker", "AWS", "Terraform", "PostgreSQL", "Redis", "Microservices", "CI/CD", "Linux"],
                    extractedSkills: ["Go", "Node.js", "Kubernetes", "Docker", "AWS", "Terraform", "PostgreSQL", "Redis", "Microservices", "CI/CD"],
                    currentLocation: "Pune",
                    preferredLocations: ["Pune", "Bengaluru", "Remote"],
                    experienceYears: 3,
                    expectedCtc: "22 - 30 LPA",
                    noticePeriod: "30 Days",
                    openToWork: true,
                    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    resumeOriginalName: "Kabir_Verma_Backend_DevOps_Resume.docx",
                    resumeMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    resumeAtsScore: 90,
                    resumeParsedAt: new Date(),
                    parsedResumeText: `KABIR VERMA\nSenior Backend & Cloud Engineer | Pune, India\nSkills: Go, Golang, Node.js, Kubernetes, Docker, AWS, Terraform, PostgreSQL, Redis, Microservices, CI/CD, Linux`,
                    projects: [
                        {
                            title: "KubePulse Auto-Scaler & Observability Mesh",
                            description: "Custom Kubernetes operator and Prometheus metrics aggregator written in Go for zero-downtime pod scaling.",
                            techStack: ["Go", "Kubernetes", "Docker", "AWS", "Terraform"],
                            liveUrl: "https://kubepulse.dev",
                            githubUrl: "https://github.com/kabirverma/kubepulse"
                        }
                    ],
                    experience: [
                        {
                            role: "Backend & Infrastructure Engineer",
                            company: "InfraCore Systems",
                            duration: "2022 - Present",
                            description: "Managed AWS EKS clusters and Golang payment microservices with 99.99% SLA."
                        }
                    ],
                    education: [
                        {
                            degree: "B.E. in Information Technology",
                            institution: "PICT Pune",
                            year: "2018 - 2022",
                            grade: "8.7 CGPA"
                        }
                    ],
                    socialLinks: {
                        github: "https://github.com/kabirverma",
                        linkedin: "https://linkedin.com/in/kabirverma",
                        portfolio: "https://kabirverma.io"
                    },
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir"
                }
            },
            {
                fullname: "Sneha Kulkarni",
                email: "sneha@student.com",
                phoneNumber: "9123456783",
                password: hashedPassword,
                role: "student",
                profile: {
                    headline: "Frontend & Design Systems Engineer • React, Next.js, TypeScript & Figma",
                    bio: "Frontend specialist crafting accessible, 60fps web experiences and design systems using React.js, Next.js, TypeScript, Tailwind CSS, and Figma.",
                    skills: ["React.js", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "HTML5", "CSS3", "Redux", "Figma", "UI/UX", "Jest"],
                    extractedSkills: ["React.js", "Next.js", "TypeScript", "Tailwind CSS", "Figma", "UI/UX", "Redux"],
                    currentLocation: "Mumbai",
                    preferredLocations: ["Mumbai", "Bengaluru", "Remote"],
                    experienceYears: 1,
                    expectedCtc: "12 - 16 LPA",
                    noticePeriod: "Immediate",
                    openToWork: true,
                    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    resumeOriginalName: "Sneha_Kulkarni_Frontend_Resume.pdf",
                    resumeMimeType: "application/pdf",
                    resumeAtsScore: 88,
                    resumeParsedAt: new Date(),
                    parsedResumeText: `SNEHA KULKARNI\nFrontend Engineer & UI/UX Specialist | Mumbai\nSkills: React.js, Next.js, TypeScript, Tailwind CSS, Redux, HTML5, CSS3, Figma, UI/UX, Jest.`,
                    projects: [
                        {
                            title: "Prism UI — Accessible React Design System",
                            description: "Published 35+ WCAG-AA compliant React + Tailwind CSS components with dark mode and keyboard navigation.",
                            techStack: ["React.js", "TypeScript", "Tailwind CSS", "Figma"],
                            liveUrl: "https://prism-ui-demo.vercel.app",
                            githubUrl: "https://github.com/snehakulkarni/prism-ui"
                        }
                    ],
                    education: [
                        {
                            degree: "B.Tech in Computer Engineering",
                            institution: "VJTI Mumbai",
                            year: "2020 - 2024",
                            grade: "9.0 CGPA"
                        }
                    ],
                    socialLinks: {
                        github: "https://github.com/snehakulkarni",
                        linkedin: "https://linkedin.com/in/snehakulkarni",
                        portfolio: "https://snehakulkarni.design"
                    },
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha"
                }
            },
            {
                fullname: "Rohit Gupta",
                email: "rohit@student.com",
                phoneNumber: "9123456784",
                password: hashedPassword,
                role: "student",
                profile: {
                    headline: "Software Engineering Graduate (Fresher) • Java, Spring Boot, React & SQL",
                    bio: "Final-year Computer Science graduate with strong foundations in Data Structures, Algorithms, Java, Spring Boot, React.js, and SQL.",
                    skills: ["Java", "Spring Boot", "React.js", "SQL", "MySQL", "JavaScript", "Git", "Data Structures", "Algorithms"],
                    extractedSkills: ["Java", "Spring Boot", "React.js", "SQL", "MySQL", "Data Structures", "Algorithms"],
                    currentLocation: "Delhi NCR",
                    preferredLocations: ["Bengaluru", "Hyderabad", "Delhi NCR", "Remote"],
                    experienceYears: 0,
                    expectedCtc: "8 - 12 LPA",
                    noticePeriod: "Immediate",
                    openToWork: true,
                    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    resumeOriginalName: "Rohit_Gupta_SDE_Fresher_Resume.pdf",
                    resumeMimeType: "application/pdf",
                    resumeAtsScore: 84,
                    resumeParsedAt: new Date(),
                    parsedResumeText: `ROHIT GUPTA\nSoftware Engineer (Fresher) | Delhi NCR\nSolved 450+ DSA problems on LeetCode. Proficient in Java, Spring Boot, React.js, MySQL, REST APIs, and System Design fundamentals.`,
                    projects: [
                        {
                            title: "SwiftCart Microservice E-Commerce API",
                            description: "Built a Spring Boot + MySQL + React e-commerce platform with JWT auth and role-based inventory management.",
                            techStack: ["Java", "Spring Boot", "React.js", "MySQL", "REST API"],
                            githubUrl: "https://github.com/rohitgupta/swiftcart"
                        }
                    ],
                    education: [
                        {
                            degree: "B.Tech in Computer Science",
                            institution: "DTU Delhi",
                            year: "2021 - 2025",
                            grade: "8.6 CGPA"
                        }
                    ],
                    socialLinks: {
                        github: "https://github.com/rohitgupta",
                        linkedin: "https://linkedin.com/in/rohitgupta",
                        leetcode: "https://leetcode.com/u/rohitgupta"
                    },
                    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit"
                }
            }
        ]);

        const [aarav, priya, kabir, sneha, rohit] = students;

        // ============================================================================
        // 4. CREATE JOBS (12 Realistic Openings Across All Categories & Experience Levels)
        // ============================================================================
        const jobs = await Job.insertMany([
            {
                title: "Senior Full Stack Engineer",
                description:
                    "Role Overview:\nJoin Google India's Cloud Console & Developer Experience team in Bengaluru. You will architect and scale full-stack TypeScript, React.js, and Node.js services used by millions of enterprise developers globally.\n\nKey Responsibilities:\n• Design modular, high-performance frontend workflows in React.js and TypeScript.\n• Build resilient backend APIs and microservices using Node.js, PostgreSQL, and Google Cloud / AWS.\n• Mentor junior engineers and drive system design best practices.",
                requirements: ["React.js", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS", "System Design"],
                salary: "25+",
                experienceLevel: 2,
                location: "Bengaluru",
                jobType: "Full-Time",
                position: 3,
                company: googleComp._id,
                created_by: recruiterGoogle._id
            },
            {
                title: "AI / Machine Learning Engineer (GenAI & LLMs)",
                description:
                    "Role Overview:\nGoogle Research & Cloud AI in Bengaluru is hiring an AI/ML Engineer to build next-generation Retrieval-Augmented Generation (RAG) and agentic workflows.\n\nKey Responsibilities:\n• Fine-tune and evaluate PyTorch & Transformer models for enterprise reasoning tasks.\n• Deploy low-latency Python & FastAPI inference services on cloud GPU clusters.",
                requirements: ["Python", "PyTorch", "Machine Learning", "LLM", "GenAI", "NLP", "FastAPI", "Docker"],
                salary: "25+",
                experienceLevel: 2,
                location: "Bengaluru",
                jobType: "Full-Time",
                position: 2,
                company: googleComp._id,
                created_by: recruiterGoogle._id
            },
            {
                title: "Backend Distributed Systems Engineer",
                description:
                    "Role Overview:\nStripe's Core Payments Infrastructure team in Bengaluru is looking for a Backend Engineer to build ultra-reliable payment routing, ledger, and settlement APIs.\n\nKey Responsibilities:\n• Design idempotent, high-throughput services in Go, Node.js, or Java.\n• Optimize PostgreSQL and Redis data pipelines with 99.999% availability.",
                requirements: ["Go", "Node.js", "PostgreSQL", "Redis", "Microservices", "Docker", "AWS"],
                salary: "25+",
                experienceLevel: 2,
                location: "Bengaluru",
                jobType: "Full-Time",
                position: 4,
                company: stripeComp._id,
                created_by: recruiterGoogle._id
            },
            {
                title: "Full Stack Developer (SDE-1)",
                description:
                    "Role Overview:\nRazorpay is seeking a high-ownership Full Stack Developer (SDE-1) in Bengaluru to build merchant checkout experiences, real-time analytics dashboards, and payment links.\n\nKey Responsibilities:\n• Build responsive web interfaces using React.js, Redux, and Tailwind CSS.\n• Develop scalable REST & GraphQL APIs with Node.js, Express.js, and MongoDB.",
                requirements: ["React.js", "Node.js", "Express.js", "MongoDB", "JavaScript", "TypeScript", "Tailwind CSS"],
                salary: "15-25",
                experienceLevel: 1,
                location: "Bengaluru",
                jobType: "Full-Time",
                position: 5,
                company: razorpayComp._id,
                created_by: recruiterRazorpay._id
            },
            {
                title: "Frontend Engineer — Design Systems",
                description:
                    "Role Overview:\nAtlassian is hiring a remote Frontend Engineer to craft ultra-fast collaborative interfaces and accessible design system primitives for Jira and Confluence.\n\nKey Responsibilities:\n• Build reusable UI components with React.js, Next.js, TypeScript, and Tailwind CSS.\n• Partner closely with UI/UX designers in Figma to deliver pixel-perfect experiences.",
                requirements: ["React.js", "Next.js", "TypeScript", "Tailwind CSS", "Redux", "Figma", "UI/UX", "Jest"],
                salary: "15-25",
                experienceLevel: 1,
                location: "Remote",
                jobType: "Full-Time",
                position: 3,
                company: atlassianComp._id,
                created_by: recruiterMicrosoft._id
            },
            {
                title: "Cloud & DevOps Platform Engineer",
                description:
                    "Role Overview:\nMicrosoft Azure Core team in Hyderabad is looking for a DevOps & Cloud Platform Engineer to automate multi-region Kubernetes infrastructure and CI/CD pipelines.",
                requirements: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD", "Linux", "Go", "Python"],
                salary: "15-25",
                experienceLevel: 2,
                location: "Hyderabad",
                jobType: "Full-Time",
                position: 2,
                company: microsoftComp._id,
                created_by: recruiterMicrosoft._id
            },
            {
                title: "Software Development Engineer (Fresher / New Grad)",
                description:
                    "Role Overview:\nMicrosoft IDC Hyderabad invites applications from passionate 2024/2025 graduates for the Software Development Engineer (Fresher) role.",
                requirements: ["Java", "Spring Boot", "React.js", "SQL", "Data Structures", "Algorithms", "Git"],
                salary: "15-25",
                experienceLevel: 0,
                location: "Hyderabad",
                jobType: "Full-Time",
                position: 8,
                company: microsoftComp._id,
                created_by: recruiterMicrosoft._id
            },
            {
                title: "Quick-Commerce Backend Engineer (Node.js / Go)",
                description:
                    "Role Overview:\nZepto's Real-Time Supply Chain & Dark-Store Engineering team in Mumbai is hiring a Backend Engineer to power 10-minute delivery dispatch algorithms.",
                requirements: ["Node.js", "Go", "PostgreSQL", "Redis", "Microservices", "Docker", "AWS"],
                salary: "15-25",
                experienceLevel: 1,
                location: "Mumbai",
                jobType: "Full-Time",
                position: 4,
                company: zeptoComp._id,
                created_by: recruiterRazorpay._id
            },
            {
                title: "Data Scientist & Analytics Engineer",
                description:
                    "Role Overview:\nZepto Mumbai is hiring a Data Scientist to optimize demand forecasting, dynamic pricing, and delivery ETA prediction models.",
                requirements: ["Python", "SQL", "Data Science", "Machine Learning", "Pandas", "Scikit-Learn", "Tableau"],
                salary: "10-15",
                experienceLevel: 1,
                location: "Mumbai",
                jobType: "Full-Time",
                position: 2,
                company: zeptoComp._id,
                created_by: recruiterRazorpay._id
            },
            {
                title: "Full Stack Engineering Intern",
                description:
                    "Role Overview:\n6-month stipend-backed Full Stack Engineering Internship at Razorpay Bengaluru with PPO opportunity for top performers.",
                requirements: ["React.js", "Node.js", "JavaScript", "MongoDB", "HTML5", "CSS3", "Git"],
                salary: "6-10",
                experienceLevel: 0,
                location: "Bengaluru",
                jobType: "Internship",
                position: 6,
                company: razorpayComp._id,
                created_by: recruiterRazorpay._id
            },
            {
                title: "QA Automation & SDET Engineer",
                description:
                    "Role Overview:\nAtlassian Remote team is hiring an SDET / QA Automation Engineer to build end-to-end Playwright, Cypress, and API test suites.",
                requirements: ["Cypress", "Playwright", "Selenium", "TypeScript", "JavaScript", "Jest", "CI/CD"],
                salary: "10-15",
                experienceLevel: 1,
                location: "Remote",
                jobType: "Full-Time",
                position: 2,
                company: atlassianComp._id,
                created_by: recruiterMicrosoft._id
            },
            {
                title: "Mobile App Engineer (React Native)",
                description:
                    "Role Overview:\nStripe is expanding its mobile SDK and merchant companion app team in Pune.",
                requirements: ["React Native", "React.js", "TypeScript", "JavaScript", "iOS", "Android", "REST API"],
                salary: "15-25",
                experienceLevel: 2,
                location: "Pune",
                jobType: "Full-Time",
                position: 2,
                company: stripeComp._id,
                created_by: recruiterGoogle._id
            }
        ]);

        const [
            jobGoogleFullStack,
            jobGoogleAI,
            jobStripeBackend,
            jobRazorpayFullStack,
            jobAtlassianFrontend,
            jobMicrosoftDevOps,
            jobMicrosoftFresher,
            jobZeptoBackend,
            jobZeptoData,
            jobRazorpayIntern,
            ,
            jobStripeMobile
        ] = jobs;

        // Bookmark saved jobs for students
        aarav.savedJobs = [jobGoogleFullStack._id, jobStripeBackend._id, jobAtlassianFrontend._id];
        priya.savedJobs = [jobGoogleAI._id, jobZeptoData._id];
        kabir.savedJobs = [jobStripeBackend._id, jobMicrosoftDevOps._id];
        sneha.savedJobs = [jobAtlassianFrontend._id, jobRazorpayFullStack._id];
        rohit.savedJobs = [jobMicrosoftFresher._id, jobRazorpayIntern._id];

        await Promise.all([aarav.save(), priya.save(), kabir.save(), sneha.save(), rohit.save()]);

        // ============================================================================
        // 5. CREATE MULTI-STAGE APPLICATIONS
        // `recruiter@google.com` -> "Senior Full Stack Engineer" has ALL 5 students
        // across different Kanban stages so 1 job shows the full pipeline!
        // ============================================================================

        // 1. Aarav -> Google Senior Full Stack (OFFER SENT)
        const appGoogle1 = await Application.create({
            job: jobGoogleFullStack._id,
            applicant: aarav._id,
            status: "accepted",
            hiringStage: "offer_sent",
            coverNote:
                "Dear Google Cloud Hiring Team, I have 2+ years of experience building high-concurrency React.js, TypeScript, and Node.js systems and would love to contribute to the Cloud Console team.",
            recruiterNotes: "Scored 9.4/10 in System Design & React Architecture round. Strong bar-raiser hire.",
            interviewDetails: {
                date: "2025-03-10",
                time: "11:00 AM IST",
                mode: "Google Meet",
                meetingLink: "https://meet.google.com/abc-defg-hij",
                roundName: "Final System Design & Bar-Raiser Round",
                notes: "Completed with Strong Hire verdict."
            },
            offerDetails: {
                ctc: "28 LPA (₹22L Base + ₹4L Bonus + ₹2L Google Stock Units)",
                joiningDate: "2025-04-15",
                location: "Bengaluru (Bagmane Constellation Tech Park)",
                probationMonths: 3,
                benefits: "Comprehensive Medical Insurance, Free Gourmet Meals, Hybrid Work Allowance, Annual Learning Grant",
                letterContent: `Dear Aarav Sharma,\n\nCongratulations! Following your outstanding performance across our technical and system design rounds, we are thrilled to extend an official Offer of Employment for the position of Senior Full Stack Engineer at Google India.\n\nYour Total Target Annual Compensation (CTC) will be 28 LPA, based out of our Bengaluru campus, with a proposed start date of 2025-04-15.\n\nPlease review the compensation breakdown below and sign digitally in your Candidate Portal to confirm your acceptance.\n\nWarm regards,\nVikramaditya Rao\nPrincipal Technical Recruiter, Google India`,
                issuedAt: new Date(),
                responseStatus: "pending"
            },
            emailLogs: [
                {
                    stage: "offer_sent",
                    subject: "🎉 Official Employment Offer Letter: Senior Full Stack Engineer at Google India",
                    body: "Congratulations Aarav! Your official employment offer letter has been issued.",
                    sentAt: new Date()
                }
            ]
        });

        // 2. Kabir -> Google Senior Full Stack (HIRED — Official Joining Letter Issued)
        const appGoogle2 = await Application.create({
            job: jobGoogleFullStack._id,
            applicant: kabir._id,
            status: "accepted",
            hiringStage: "hired",
            coverNote: "3 years of production distributed systems, Go, Node.js, and Kubernetes experience.",
            recruiterNotes: "Offer accepted and onboarding initiated.",
            offerDetails: {
                ctc: "30 LPA",
                joiningDate: "2025-04-10",
                location: "Bengaluru",
                probationMonths: 3,
                benefits: "Google Stock Units, Medical Insurance, Relocation Bonus",
                letterContent: "Official Offer Letter for Senior Full Stack Engineer at Google India (30 LPA).",
                issuedAt: new Date(Date.now() - 4 * 86400000),
                responseStatus: "accepted",
                candidateSignature: "Kabir Verma",
                respondedAt: new Date(Date.now() - 2 * 86400000)
            },
            joiningDetails: {
                joiningDate: "2025-04-10",
                reportingTime: "09:30 AM IST",
                reportingManager: "Sundar Krishnan (Director of Engineering)",
                workMode: "Hybrid (Bengaluru Campus)",
                documentsRequired: "Passport/PAN, Degree Certificates, Prior Experience Letters",
                letterContent: `Dear Kabir Verma,\n\nWelcome aboard to Google India! Your Official Appointment & Joining Letter as Senior Full Stack Engineer is confirmed for 2025-04-10 at 09:30 AM IST.\n\nSincerely,\nVikramaditya Rao\nPrincipal Technical Recruiter, Google India`,
                issuedAt: new Date()
            }
        });

        // 3. Sneha -> Google Senior Full Stack (ASSIGNMENT SENT with Submitted Link)
        const appGoogle3 = await Application.create({
            job: jobGoogleFullStack._id,
            applicant: sneha._id,
            status: "accepted",
            hiringStage: "assignment_sent",
            coverNote: "Frontend & Design Systems specialist with React, Next.js, and TypeScript expertise.",
            assignmentDetails: {
                title: "Cloud Console Telemetry Widget & Virtualized Log Viewer",
                instructions: "Build a React + TypeScript virtualized log stream viewer capable of rendering 100,000 log lines smoothly.",
                deadline: "2025-03-28",
                referenceLink: "https://cloud.google.com",
                submissionLink: "https://github.com/snehakulkarni/cloud-log-viewer",
                submittedAt: new Date()
            }
        });

        // 4. Priya -> Google Senior Full Stack (INTERVIEW SCHEDULED)
        const appGoogle4 = await Application.create({
            job: jobGoogleFullStack._id,
            applicant: priya._id,
            status: "accepted",
            hiringStage: "interview_scheduled",
            coverNote: "Experienced in full-stack AI applications with Python, FastAPI, and React.",
            interviewDetails: {
                date: "2025-03-26",
                time: "04:00 PM IST",
                mode: "Google Meet",
                meetingLink: "https://meet.google.com/ggl-fullstack-priya",
                roundName: "Round 1: Full Stack Architecture & Live Coding"
            }
        });

        // 5. Rohit -> Google Senior Full Stack (APPLIED)
        const appGoogle5 = await Application.create({
            job: jobGoogleFullStack._id,
            applicant: rohit._id,
            status: "pending",
            hiringStage: "applied",
            coverNote: "Strong DSA problem solver (450+ LeetCode) with Java, Spring Boot, and React projects."
        });

        // Additional Applications across other jobs for rich student & recruiter views
        const appRazorpayHired = await Application.create({
            job: jobRazorpayFullStack._id,
            applicant: aarav._id,
            status: "accepted",
            hiringStage: "hired",
            coverNote: "Excited to bring my FinFlow payment ledger and MERN stack experience to Razorpay.",
            offerDetails: {
                ctc: "21 LPA",
                joiningDate: "2025-04-01",
                location: "Bengaluru (SJR Cyber Laskar)",
                probationMonths: 3,
                benefits: "Health Insurance, MacBook Pro M3, ESOPs, Wellness Stipend",
                letterContent: "Dear Aarav Sharma, We are delighted to offer you the Full Stack Developer (SDE-1) role at Razorpay with an annual CTC of 21 LPA.",
                issuedAt: new Date(Date.now() - 5 * 86400000),
                responseStatus: "accepted",
                candidateSignature: "Aarav Sharma",
                respondedAt: new Date(Date.now() - 3 * 86400000)
            },
            joiningDetails: {
                joiningDate: "2025-04-01",
                reportingTime: "10:00 AM IST",
                reportingManager: "Siddharth Menon (VP Engineering — Checkout)",
                workMode: "Hybrid (3 Days Office)",
                documentsRequired: "PAN Card, Aadhaar / Passport, B.Tech Degree Certificate, Relieving Letter",
                letterContent: `Dear Aarav Sharma,\n\nWelcome aboard to Razorpay! Further to your digital acceptance of our employment offer, we are delighted to issue your Official Appointment & Joining Letter as Full Stack Developer (SDE-1) effective 2025-04-01.\n\nSincerely,\nRohan Mehta\nVP Talent Acquisition, Razorpay`,
                issuedAt: new Date(Date.now() - 1 * 86400000)
            }
        });

        const appAtlassianAssignment = await Application.create({
            job: jobAtlassianFrontend._id,
            applicant: aarav._id,
            status: "accepted",
            hiringStage: "assignment_sent",
            coverNote: "Built Prism UI and multiple TypeScript + React design systems.",
            assignmentDetails: {
                title: "Build an Accessible Kanban Board with Drag-and-Drop & Keyboard Shortcuts",
                instructions: "Create a responsive React + TypeScript Kanban board supporting keyboard navigation and dark mode.",
                deadline: "Within 48 Hours",
                referenceLink: "https://www.atlassian.com/engineering"
            }
        });

        const appGoogleAI = await Application.create({
            job: jobGoogleAI._id,
            applicant: priya._id,
            status: "accepted",
            hiringStage: "interview_scheduled",
            coverNote: "M.Tech in AI from IIIT-H with production PyTorch & Enterprise RAG experience.",
            interviewDetails: {
                date: "2025-03-25",
                time: "03:30 PM IST",
                mode: "Google Meet",
                meetingLink: "https://meet.google.com/xyz-ai-round",
                roundName: "Round 2: LLM Architecture & PyTorch Coding"
            }
        });

        const appStripeOfferAccepted = await Application.create({
            job: jobStripeBackend._id,
            applicant: kabir._id,
            status: "accepted",
            hiringStage: "offer_accepted",
            coverNote: "3 years of production Golang, Kubernetes, PostgreSQL, and distributed ledger experience.",
            offerDetails: {
                ctc: "32 LPA",
                joiningDate: "2025-04-20",
                location: "Bengaluru",
                probationMonths: 3,
                benefits: "Global Equity, Health Cover, Remote Setup Stipend",
                letterContent: "Dear Kabir Verma, We are pleased to extend an offer for Backend Distributed Systems Engineer at Stripe with a CTC of 32 LPA.",
                issuedAt: new Date(Date.now() - 2 * 86400000),
                responseStatus: "accepted",
                candidateSignature: "Kabir Verma",
                respondedAt: new Date()
            }
        });

        const appStripeMobile = await Application.create({
            job: jobStripeMobile._id,
            applicant: sneha._id,
            status: "accepted",
            hiringStage: "shortlisted",
            coverNote: "Experienced in React Native and TypeScript mobile UI systems."
        });

        // Link application IDs back to their respective Job documents
        jobGoogleFullStack.applications.push(
            appGoogle1._id,
            appGoogle2._id,
            appGoogle3._id,
            appGoogle4._id,
            appGoogle5._id
        );
        jobRazorpayFullStack.applications.push(appRazorpayHired._id);
        jobAtlassianFrontend.applications.push(appAtlassianAssignment._id);
        jobGoogleAI.applications.push(appGoogleAI._id);
        jobStripeBackend.applications.push(appStripeOfferAccepted._id);
        jobStripeMobile.applications.push(appStripeMobile._id);

        await Promise.all([
            jobGoogleFullStack.save(),
            jobRazorpayFullStack.save(),
            jobAtlassianFrontend.save(),
            jobGoogleAI.save(),
            jobStripeBackend.save(),
            jobStripeMobile.save()
        ]);

        // ============================================================================
        // 6. CREATE REAL-TIME NOTIFICATIONS FOR STUDENTS & RECRUITERS
        // ============================================================================
        await Notification.insertMany([
            {
                recipient: aarav._id,
                sender: recruiterGoogle._id,
                job: jobGoogleFullStack._id,
                application: appGoogle1._id,
                type: "offer_letter",
                title: "🎉 Official Offer Letter Received — Google India",
                message: "Google India has issued an official Offer of Employment (28 LPA) for Senior Full Stack Engineer. Open your Profile to review, print the A4 PDF, or sign digitally!",
                isRead: false
            },
            {
                recipient: aarav._id,
                sender: recruiterRazorpay._id,
                job: jobRazorpayFullStack._id,
                application: appRazorpayHired._id,
                type: "joining_letter",
                title: "🏛️ Official Joining Letter Issued — Razorpay",
                message: "Your Official Appointment & Joining Letter for Full Stack Developer (SDE-1) at Razorpay is ready for A4 PDF download.",
                isRead: false
            },
            {
                recipient: recruiterGoogle._id,
                sender: kabir._id,
                job: jobStripeBackend._id,
                application: appStripeOfferAccepted._id,
                type: "offer_letter",
                title: "✍️ Candidate Accepted Offer — Kabir Verma",
                message: "Kabir Verma digitally signed and accepted the 32 LPA offer for Backend Distributed Systems Engineer at Stripe.",
                isRead: false
            },
            {
                recipient: recruiterGoogle._id,
                sender: sneha._id,
                job: jobGoogleFullStack._id,
                application: appGoogle3._id,
                type: "assignment",
                title: "📝 Technical Assignment Submitted — Sneha Kulkarni",
                message: "Sneha Kulkarni submitted her GitHub repository for the Cloud Console Telemetry Widget challenge.",
                isRead: false
            }
        ]);

        console.log("\n==================================================================");
        console.log("✅ DATABASE SEEDED SUCCESSFULLY WITH RICH PRODUCTION TEST DATA!");
        console.log("==================================================================");
        console.log("🔑 All accounts use password: password123\n");
        console.log("🏆 BEST ALL-IN-ONE DEMO RECRUITER ACCOUNT:");
        console.log("   👉 Email: recruiter@google.com  |  Password: password123");
        console.log("      (Manages Google India & Stripe • Click 'Applicants' on");
        console.log("       'Senior Full Stack Engineer' to see 5 candidates across");
        console.log("       Applied, Assignment, Interview, Offer Sent & Hired stages!)\n");
        console.log("🏆 BEST ALL-IN-ONE DEMO STUDENT ACCOUNT:");
        console.log("   👉 Email: aarav@student.com     |  Password: password123");
        console.log("      (Has 94% Parsed Resume, Projects, Social Links, Pending");
        console.log("       Google Offer Letter to Sign, Razorpay Joining Letter PDF,");
        console.log("       and Atlassian Technical Assignment!)\n");
        console.log("👨‍🎓 OTHER STUDENT ACCOUNTS:");
        console.log("   • priya@student.com   (AI/ML Engineer)");
        console.log("   • kabir@student.com   (Backend/DevOps Engineer)");
        console.log("   • sneha@student.com   (Frontend/UI Engineer)");
        console.log("   • rohit@student.com   (SDE Fresher)\n");
        console.log("🏢 OTHER RECRUITER ACCOUNTS:");
        console.log("   • recruiter@microsoft.com  (Microsoft & Atlassian)");
        console.log("   • recruiter@razorpay.com   (Razorpay & Zepto)");
        console.log("==================================================================\n");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();