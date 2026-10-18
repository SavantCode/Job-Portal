import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/user.model.js";       //[cite: 4]
import { Company } from "./models/company.model.js"; //[cite: 2]
import { Job } from "./models/job.model.js";         //[cite: 3]
import { Application } from "./models/application.model.js"; //[cite: 1]

// Your MongoDB connection string
const MONGO_URI="mongodb+srv://rahulkcoding2023_db_user:Skd6D3LIJSAkhxg9@cluster0.5d7g2pi.mongodb.net/jobPortalData?compressors=zlib"

// --- DUMMY DATA SETS ---

const dummyRecruiters = [
    {
        fullname: "Sarah Jenkins",
        email: "sarah.hr@techflow.com",
        phoneNumber: 9876543210,
        role: "recruiter",
        bio: "Lead Technical Recruiter at TechFlow Solutions, hunting for top tier engineering talent."
    },
    {
        fullname: "Michael Chang",
        email: "mchang@cloudscale.io",
        phoneNumber: 9876543211,
        role: "recruiter",
        bio: "Head of Talent Acquisition at CloudScale. Passionate about distributed systems."
    },
    {
        fullname: "Priya Sharma",
        email: "priya@innovatelabs.in",
        phoneNumber: 9876543212,
        role: "recruiter",
        bio: "HR Manager at Innovate Labs. Building the future of AI and Web3."
    }
];

const dummyStudents = [
    {
        fullname: "Alex Rivera",
        email: "alex.dev@gmail.com",
        phoneNumber: 9123456780,
        role: "student",
        bio: "Full Stack Engineer specialized in Node.js, React, and cloud architectures.",
        skills: ["JavaScript", "React", "Node.js", "MongoDB", "Express", "Git"]
    },
    {
        fullname: "Neha Gupta",
        email: "neha.code@yahoo.com",
        phoneNumber: 9123456781,
        role: "student",
        bio: "Computer Science undergrad with a deep love for backend systems and algorithms.",
        skills: ["Java", "Spring Boot", "SQL", "Data Structures", "Docker"]
    },
    {
        fullname: "David Smith",
        email: "david.dev@outlook.com",
        phoneNumber: 9123456782,
        role: "student",
        bio: "Frontend developer building responsive, clean user interfaces with modern frameworks.",
        skills: ["HTML", "CSS", "JavaScript", "React", "Tailwind CSS", "Redux"]
    },
    {
        fullname: "Ananya Patel",
        email: "ananya.data@gmail.com",
        phoneNumber: 9123456783,
        role: "student",
        bio: "Data enthusiast looking for backend or data engineering entry-level roles.",
        skills: ["Python", "SQL", "Pandas", "Node.js", "MongoDB"]
    }
];

const dummyCompanies = [
    {
        name: "TechFlow Solutions",
        description: "A fast-growing enterprise software development company specializing in workflow automation.",
        website: "https://techflowsolutions.com",
        location: "San Francisco, CA (Remote Friendly)"
    },
    {
        name: "CloudScale Systems",
        description: "Cloud infrastructure and high-performance computing startup backed by top-tier investors.",
        website: "https://cloudscale.io",
        location: "New York, NY"
    },
    {
        name: "Innovate Labs",
        description: "An R&D hub focused on artificial intelligence, modern web applications, and developer tools.",
        website: "https://innovatelabs.in",
        location: "Bangalore, India"
    }
];

const dummyJobs = [
    {
        title: "Full Stack Software Engineer",
        description: "We are looking for a versatile Full Stack Developer to help build our core enterprise workflow products. You will work closely with product and design teams.",
        requirements: ["JavaScript", "React", "Node.js", "MongoDB", "REST APIs"],
        salary: 120000,
        experienceLevel: 2,
        location: "San Francisco, CA",
        jobType: "Full-time",
        position: 3
    },
    {
        title: "Backend Java Developer",
        description: "Looking for an expert backend engineer proficient in Java and scalable microservices architectures to power our cloud infrastructure platform.",
        requirements: ["Java", "Spring Boot", "SQL", "Microservices", "Docker"],
        salary: 135000,
        experienceLevel: 3,
        location: "New York, NY",
        jobType: "Full-time",
        position: 2
    },
    {
        title: "Frontend React Developer",
        description: "Seeking a creative Frontend Developer who breathes clean UI/UX design and has deep expertise in React state management and component optimization.",
        requirements: ["React", "JavaScript", "HTML", "CSS", "Tailwind CSS"],
        salary: 95000,
        experienceLevel: 1,
        location: "Bangalore, India",
        jobType: "Full-time",
        position: 4
    },
    {
        title: "Junior Backend Developer - Intern",
        description: "An exciting internship opportunity for students eager to learn scalable API design, database modeling, and server-side logic.",
        requirements: ["Node.js", "Express", "MongoDB", "JavaScript"],
        salary: 45000,
        experienceLevel: 0,
        location: "Remote",
        jobType: "Internship",
        position: 5
    }
];

// --- SEED EXECUTION SCRIPT ---

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for custom seeding...");

        // 1. Wipe existing data to avoid unique constraint crashes
        await Application.deleteMany({});
        await Job.deleteMany({});
        await Company.deleteMany({});
        await User.deleteMany({});
        console.log("Cleared old database records.");

        const hashedPassword = await bcrypt.hash("Password@123", 10);

        // 2. Insert Recruiters
        const createdRecruiters = [];
        for (let recData of dummyRecruiters) {
            const user = await User.create({
                ...recData,
                password: hashedPassword
            });
            createdRecruiters.push(user);
        }
        console.log(`Created ${createdRecruiters.length} recruiters.`);

        // 3. Insert Students
        const createdStudents = [];
        for (let stuData of dummyStudents) {
            const user = await User.create({
                ...stuData,
                password: hashedPassword,
                profile: {
                    bio: stuData.bio,
                    skills: stuData.skills
                }
            });
            createdStudents.push(user);
        }
        console.log(`Created ${createdStudents.length} students.`);

        // 4. Insert Companies (Link each to a specific recruiter)
        const createdCompanies = [];
        for (let i = 0; i < dummyCompanies.length; i++) {
            const assignedRecruiter = createdRecruiters[i % createdRecruiters.length];
            const company = await Company.create({
                ...dummyCompanies[i],
                userId: assignedRecruiter._id //[cite: 2]
            });
            
            // Optionally update recruiter profile with company reference
            assignedRecruiter.profile.company = company._id;
            await assignedRecruiter.save();

            createdCompanies.push(company);
        }
        console.log(`Created ${createdCompanies.length} companies and linked them to recruiters.`);

        // 5. Insert Jobs (Link to companies and creating recruiters)
        const createdJobs = [];
        for (let i = 0; i < dummyJobs.length; i++) {
            const company = createdCompanies[i % createdCompanies.length];
            // Find the recruiter who owns this company
            const recruiter = createdRecruiters.find(r => r.profile.company && r.profile.company.toString() === company._id.toString()) || createdRecruiters[0];

            const job = await Job.create({
                ...dummyJobs[i],
                company: company._id,       //[cite: 3]
                created_by: recruiter._id   //[cite: 3]
            });
            createdJobs.push(job);
        }
        console.log(`Created ${createdJobs.length} detailed job postings.`);

        // 6. Insert Applications (Link students to jobs with different statuses)
        const statuses = ["pending", "accepted", "rejected"]; //[cite: 1]
        let applicationCount = 0;

        for (let i = 0; i < createdStudents.length; i++) {
            const student = createdStudents[i];
            // Each student applies to 2 different jobs
            for (let j = 0; j < 2; j++) {
                const job = createdJobs[(i + j) % createdJobs.length];
                const status = statuses[(i + j) % statuses.length];

                const application = await Application.create({
                    job: job._id,         //[cite: 1]
                    applicant: student._id, //[cite: 1]
                    status: status        //[cite: 1]
                });

                // Push application reference inside the Job document array[cite: 3]
                job.applications.push(application._id);
                await job.save();
                applicationCount++;
            }
        }
        console.log(`Created ${applicationCount} realistic job applications linking students to active job postings.`);

        console.log("Database seeded successfully with fully linked dummy data!");
    } catch (error) {
        console.error("Error running seed script:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
};

seedDatabase();