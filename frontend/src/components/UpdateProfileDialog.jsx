import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import {
    Loader2, Upload, User, Mail, Phone, FileText, Sparkles,
    FolderGit2, Globe, Plus, Trash2, Briefcase, GraduationCap, MapPin
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

const UpdateProfileDialog = ({ open, setOpen, initialTab = "basic" }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab); // "basic" | "projects" | "links" | "experience"
    const { user } = useSelector(store => store.auth);
    const isRecruiter = user?.role === 'recruiter';
    const dispatch = useDispatch();

    const [input, setInput] = useState({
        fullname: "",
        email: "",
        phoneNumber: "",
        headline: "",
        bio: "",
        skills: "",
        currentLocation: "",
        preferredLocations: "",
        experienceYears: 0,
        expectedCtc: "",
        noticePeriod: "Immediate",
        openToWork: true,
        profilePhotoUrl: "",
        file: null
    });

    const [projects, setProjects] = useState([]);
    const [experience, setExperience] = useState([]);
    const [education, setEducation] = useState([]);
    const [socialLinks, setSocialLinks] = useState({
        github: "",
        linkedin: "",
        portfolio: "",
        leetcode: "",
        twitter: ""
    });

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab, open]);

    useEffect(() => {
        if (user) {
            setInput({
                fullname: user.fullname || "",
                email: user.email || "",
                phoneNumber: user.phoneNumber || "",
                headline: user?.profile?.headline || "",
                bio: user?.profile?.bio || "",
                skills: user?.profile?.skills?.join(", ") || "",
                currentLocation: user?.profile?.currentLocation || "",
                preferredLocations: user?.profile?.preferredLocations?.join(", ") || "",
                experienceYears: user?.profile?.experienceYears ?? 0,
                expectedCtc: user?.profile?.expectedCtc || "",
                noticePeriod: user?.profile?.noticePeriod || "Immediate",
                openToWork: user?.profile?.openToWork !== false,
                profilePhotoUrl: user?.profile?.profilePhoto || "",
                file: null
            });
            setProjects(
                Array.isArray(user?.profile?.projects)
                    ? user.profile.projects.map(p => ({
                          title: p.title || "",
                          description: p.description || "",
                          techStack: Array.isArray(p.techStack) ? p.techStack.join(", ") : (p.techStack || ""),
                          liveUrl: p.liveUrl || "",
                          githubUrl: p.githubUrl || ""
                      }))
                    : []
            );
            setExperience(
                Array.isArray(user?.profile?.experience)
                    ? user.profile.experience.map(e => ({
                          role: e.role || "",
                          company: e.company || "",
                          duration: e.duration || "",
                          description: e.description || ""
                      }))
                    : []
            );
            setEducation(
                Array.isArray(user?.profile?.education)
                    ? user.profile.education.map(ed => ({
                          degree: ed.degree || "",
                          institution: ed.institution || "",
                          year: ed.year || "",
                          grade: ed.grade || ""
                      }))
                    : []
            );
            setSocialLinks({
                github: user?.profile?.socialLinks?.github || "",
                linkedin: user?.profile?.socialLinks?.linkedin || "",
                portfolio: user?.profile?.socialLinks?.portfolio || "",
                leetcode: user?.profile?.socialLinks?.leetcode || "",
                twitter: user?.profile?.socialLinks?.twitter || ""
            });
        }
    }, [user, open]);

    const changeEventHandler = (e) => {
        const { name, value, type, checked } = e.target;
        setInput({ ...input, [name]: type === "checkbox" ? checked : value });
    };

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        setInput({ ...input, file });
    };

    // Project Helpers
    const addProject = () => {
        setProjects([...projects, { title: "", description: "", techStack: "", liveUrl: "", githubUrl: "" }]);
    };
    const updateProject = (idx, field, val) => {
        setProjects(projects.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
    };
    const removeProject = (idx) => {
        setProjects(projects.filter((_, i) => i !== idx));
    };

    // Experience Helpers
    const addExp = () => {
        setExperience([...experience, { role: "", company: "", duration: "", description: "" }]);
    };
    const updateExp = (idx, field, val) => {
        setExperience(experience.map((e, i) => (i === idx ? { ...e, [field]: val } : e)));
    };
    const removeExp = (idx) => {
        setExperience(experience.filter((_, i) => i !== idx));
    };

    // Education Helpers
    const addEdu = () => {
        setEducation([...education, { degree: "", institution: "", year: "", grade: "" }]);
    };
    const updateEdu = (idx, field, val) => {
        setEducation(education.map((ed, i) => (i === idx ? { ...ed, [field]: val } : ed)));
    };
    const removeEdu = (idx) => {
        setEducation(education.filter((_, i) => i !== idx));
    };

    const parsedSkills = input.skills
        ? input.skills.split(",").map(s => s.trim()).filter(Boolean)
        : [];

    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("fullname", input.fullname);
        formData.append("email", input.email);
        formData.append("phoneNumber", input.phoneNumber);
        formData.append("headline", input.headline);
        formData.append("bio", input.bio);
        formData.append("skills", input.skills);
        formData.append("currentLocation", input.currentLocation);
        formData.append("preferredLocations", input.preferredLocations);
        formData.append("experienceYears", String(input.experienceYears || 0));
        formData.append("expectedCtc", input.expectedCtc);
        formData.append("noticePeriod", input.noticePeriod);
        formData.append("openToWork", String(input.openToWork));

        if (input.profilePhotoUrl) {
            formData.append("profilePhotoUrl", input.profilePhotoUrl);
        }

        formData.append("projects", JSON.stringify(projects));
        formData.append("experience", JSON.stringify(experience));
        formData.append("education", JSON.stringify(education));
        formData.append("socialLinks", JSON.stringify(socialLinks));

        if (input.file) {
            formData.append("file", input.file);
        }

        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/profile/update`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                toast.success(res.data.message);
                setOpen(false);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const avatarPreview = input.profilePhotoUrl || user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7" onInteractOutside={() => setOpen(false)}>
                <DialogHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <DialogTitle className="text-xl font-extrabold text-gray-900 dark:text-white">
                        Edit {isRecruiter ? "Recruiter" : "Candidate Portfolio & Resume"} Profile
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Upload a PDF or Word (.docx, .doc) resume to auto-parse skills for matchmaking, or showcase your projects & social links.
                    </DialogDescription>

                    {/* Navigation Tabs */}
                    {!isRecruiter && (
                        <div className="flex flex-wrap gap-1.5 pt-3">
                            {[
                                { id: "basic", label: "Basic & Resume", icon: User },
                                { id: "projects", label: `Projects (${projects.length})`, icon: FolderGit2 },
                                { id: "experience", label: "Work & Education", icon: Briefcase },
                                { id: "links", label: "Social Links & Prefs", icon: Globe }
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            activeTab === tab.id
                                                ? "bg-[#6A38C2] text-white shadow-xs"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </DialogHeader>

                <form onSubmit={submitHandler} className="space-y-5 pt-2">
                    {/* TAB 1: BASIC INFO & RESUME PARSER UPLOAD */}
                    {(activeTab === "basic" || isRecruiter) && (
                        <div className="space-y-4">
                            <div className='flex items-center gap-4 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700'>
                                <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-slate-800 shadow-md shrink-0 bg-white">
                                    <AvatarImage src={avatarPreview} alt="Avatar preview" className="object-cover" />
                                    <AvatarFallback className="bg-purple-100 text-[#6A38C2] font-bold">
                                        {input.fullname?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className='flex-1 space-y-1'>
                                    <Label htmlFor="profilePhotoUrl" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                                        Profile Photo Image URL
                                    </Label>
                                    <Input
                                        id="profilePhotoUrl"
                                        name="profilePhotoUrl"
                                        type="text"
                                        placeholder="https://example.com/your-photo.jpg"
                                        value={input.profilePhotoUrl}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <div className='space-y-1.5'>
                                    <Label htmlFor="fullname" className="text-xs font-semibold flex items-center gap-1.5">
                                        <User className='w-3.5 h-3.5 text-[#6A38C2]' /> Full Name
                                    </Label>
                                    <Input
                                        id="fullname"
                                        name="fullname"
                                        type="text"
                                        value={input.fullname}
                                        onChange={changeEventHandler}
                                        className="h-10 rounded-xl text-sm"
                                        required
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label htmlFor="phoneNumber" className="text-xs font-semibold flex items-center gap-1.5">
                                        <Phone className='w-3.5 h-3.5 text-[#6A38C2]' /> Phone Number
                                    </Label>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="text"
                                        value={input.phoneNumber}
                                        onChange={changeEventHandler}
                                        className="h-10 rounded-xl text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <div className='space-y-1.5'>
                                    <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                                        <Mail className='w-3.5 h-3.5 text-[#6A38C2]' /> Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={input.email}
                                        onChange={changeEventHandler}
                                        className="h-10 rounded-xl text-sm"
                                        required
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label htmlFor="headline" className="text-xs font-semibold flex items-center gap-1.5">
                                        <Sparkles className='w-3.5 h-3.5 text-[#6A38C2]' /> Professional Headline
                                    </Label>
                                    <Input
                                        id="headline"
                                        name="headline"
                                        type="text"
                                        placeholder="e.g. Full Stack Engineer • React & Node.js"
                                        value={input.headline}
                                        onChange={changeEventHandler}
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className='space-y-1.5'>
                                <Label htmlFor="bio" className="text-xs font-semibold flex items-center gap-1.5">
                                    <FileText className='w-3.5 h-3.5 text-[#6A38C2]' /> {isRecruiter ? "Recruiter Bio" : "Professional Summary / Bio"}
                                </Label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    rows="3"
                                    placeholder={isRecruiter ? "e.g. Lead Technical Recruiter hiring across Full-Stack, Cloud & AI teams." : "Summarize your experience, key achievements, and career goals..."}
                                    value={input.bio}
                                    onChange={changeEventHandler}
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2] resize-none"
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor="skills" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Sparkles className='w-3.5 h-3.5 text-[#6A38C2]' /> {isRecruiter ? "Hiring Focus Areas (comma separated)" : "Technical Skills (comma separated — auto-enriched when you upload a resume)"}
                                </Label>
                                <Input
                                    id="skills"
                                    name="skills"
                                    type="text"
                                    placeholder={isRecruiter ? "Engineering, AI/ML, Product, Cloud" : "React.js, Node.js, TypeScript, MongoDB, AWS"}
                                    value={input.skills}
                                    onChange={changeEventHandler}
                                    className="h-10 rounded-xl text-sm"
                                />
                                {parsedSkills.length > 0 && (
                                    <div className='flex flex-wrap gap-1.5 pt-1'>
                                        {parsedSkills.slice(0, 14).map((s, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-[11px] bg-purple-50 text-[#6A38C2] border border-purple-200/60">
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PDF / Word Resume Upload with Auto-Parser */}
                            <div className='p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/70 border border-purple-200/70 dark:border-slate-700 space-y-2'>
                                <Label htmlFor="file" className="text-xs font-bold text-[#6A38C2] dark:text-purple-300 flex items-center gap-1.5">
                                    <Upload className='w-4 h-4' />
                                    {isRecruiter
                                        ? "Upload Profile Photo"
                                        : "Upload Resume (PDF, Word .docx / .doc) — Auto-Parses & Saves for Job Matchmaking"}
                                </Label>
                                <Input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept={
                                        isRecruiter
                                            ? "image/*"
                                            : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                                    }
                                    onChange={fileChangeHandler}
                                    className="cursor-pointer text-xs rounded-xl bg-white dark:bg-slate-900 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-[#6A38C2]"
                                />
                                {!isRecruiter && (
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                        Supports <strong>.pdf</strong>, <strong>.docx</strong>, and <strong>.doc</strong> files. Our resume parser automatically extracts your skills, links, and text for instant ATS job matchmaking.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PROJECTS SHOWCASE */}
                    {activeTab === "projects" && !isRecruiter && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Candidate Projects Showcase</h4>
                                    <p className="text-xs text-gray-500">Add key projects — their tech stacks are also used in AI Job Matchmaking and shown to recruiters.</p>
                                </div>
                                <Button type="button" size="sm" onClick={addProject} className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs cursor-pointer">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Project
                                </Button>
                            </div>

                            {projects.length === 0 ? (
                                <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-xs text-gray-500">
                                    No projects added yet. Click "Add Project" to showcase your work!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {projects.map((proj, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <Input
                                                    placeholder="Project Title (e.g. AI Job Portal)"
                                                    value={proj.title}
                                                    onChange={(e) => updateProject(idx, "title", e.target.value)}
                                                    className="h-9 text-xs font-semibold bg-white dark:bg-slate-900"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeProject(idx)}
                                                    className="text-red-500 hover:text-red-700 h-8 px-2 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <Input
                                                placeholder="Tech Stack (comma separated: React, Node.js, MongoDB, Docker)"
                                                value={proj.techStack}
                                                onChange={(e) => updateProject(idx, "techStack", e.target.value)}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input
                                                    placeholder="GitHub Repo URL (https://github.com/...)"
                                                    value={proj.githubUrl}
                                                    onChange={(e) => updateProject(idx, "githubUrl", e.target.value)}
                                                    className="h-9 text-xs bg-white dark:bg-slate-900"
                                                />
                                                <Input
                                                    placeholder="Live Demo URL (https://...)"
                                                    value={proj.liveUrl}
                                                    onChange={(e) => updateProject(idx, "liveUrl", e.target.value)}
                                                    className="h-9 text-xs bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <textarea
                                                rows="2"
                                                placeholder="Brief description & measurable impact..."
                                                value={proj.description}
                                                onChange={(e) => updateProject(idx, "description", e.target.value)}
                                                className="w-full rounded-xl border border-input bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#6A38C2] resize-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: WORK EXPERIENCE & EDUCATION */}
                    {activeTab === "experience" && !isRecruiter && (
                        <div className="space-y-6">
                            {/* Work Experience */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4 text-[#6A38C2]" /> Work Experience & Internships
                                    </h4>
                                    <Button type="button" size="sm" variant="outline" onClick={addExp} className="rounded-xl text-xs h-8 cursor-pointer">
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Experience
                                    </Button>
                                </div>
                                {experience.map((exp, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <Input
                                                placeholder="Role (e.g. SDE Intern)"
                                                value={exp.role}
                                                onChange={(e) => updateExp(idx, "role", e.target.value)}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                            <Input
                                                placeholder="Company Name"
                                                value={exp.company}
                                                onChange={(e) => updateExp(idx, "company", e.target.value)}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    placeholder="Duration (e.g. 2023 - Present)"
                                                    value={exp.duration}
                                                    onChange={(e) => updateExp(idx, "duration", e.target.value)}
                                                    className="h-9 text-xs bg-white dark:bg-slate-900"
                                                />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeExp(idx)} className="text-red-500 h-8 px-2">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <textarea
                                            rows="2"
                                            placeholder="Key responsibilities & achievements..."
                                            value={exp.description}
                                            onChange={(e) => updateExp(idx, "description", e.target.value)}
                                            className="w-full rounded-xl border border-input bg-white dark:bg-slate-900 px-3 py-1.5 text-xs resize-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Education */}
                            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <GraduationCap className="w-4 h-4 text-[#6A38C2]" /> Education
                                    </h4>
                                    <Button type="button" size="sm" variant="outline" onClick={addEdu} className="rounded-xl text-xs h-8 cursor-pointer">
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Education
                                    </Button>
                                </div>
                                {education.map((ed, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                                        <Input
                                            placeholder="Degree (e.g. B.Tech CS)"
                                            value={ed.degree}
                                            onChange={(e) => updateEdu(idx, "degree", e.target.value)}
                                            className="h-9 text-xs bg-white dark:bg-slate-900"
                                        />
                                        <Input
                                            placeholder="Institution / University"
                                            value={ed.institution}
                                            onChange={(e) => updateEdu(idx, "institution", e.target.value)}
                                            className="h-9 text-xs bg-white dark:bg-slate-900"
                                        />
                                        <Input
                                            placeholder="Year (e.g. 2021 - 2025)"
                                            value={ed.year}
                                            onChange={(e) => updateEdu(idx, "year", e.target.value)}
                                            className="h-9 text-xs bg-white dark:bg-slate-900"
                                        />
                                        <div className="flex items-center gap-1">
                                            <Input
                                                placeholder="CGPA / Grade"
                                                value={ed.grade}
                                                onChange={(e) => updateEdu(idx, "grade", e.target.value)}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeEdu(idx)} className="text-red-500 h-8 px-2">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SOCIAL LINKS & CAREER PREFERENCES */}
                    {activeTab === "links" && !isRecruiter && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Globe className="w-4 h-4 text-[#6A38C2]" /> Social & Coding Profiles
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">GitHub URL</Label>
                                    <Input
                                        placeholder="https://github.com/username"
                                        value={socialLinks.github}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">LinkedIn URL</Label>
                                    <Input
                                        placeholder="https://linkedin.com/in/username"
                                        value={socialLinks.linkedin}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Portfolio / Personal Website</Label>
                                    <Input
                                        placeholder="https://yourportfolio.dev"
                                        value={socialLinks.portfolio}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, portfolio: e.target.value })}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">LeetCode / Coding Profile</Label>
                                    <Input
                                        placeholder="https://leetcode.com/u/username"
                                        value={socialLinks.leetcode}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, leetcode: e.target.value })}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                                <MapPin className="w-4 h-4 text-[#6A38C2]" /> Career & Job Preferences
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Current City / Location</Label>
                                    <Input
                                        name="currentLocation"
                                        placeholder="e.g. Bengaluru"
                                        value={input.currentLocation}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Preferred Work Locations (comma separated)</Label>
                                    <Input
                                        name="preferredLocations"
                                        placeholder="e.g. Bengaluru, Hyderabad, Remote"
                                        value={input.preferredLocations}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Total Experience (Years)</Label>
                                    <Input
                                        name="experienceYears"
                                        type="number"
                                        min="0"
                                        max="40"
                                        value={input.experienceYears}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Expected CTC (LPA)</Label>
                                    <Input
                                        name="expectedCtc"
                                        placeholder="e.g. 12 - 18 LPA"
                                        value={input.expectedCtc}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Notice Period</Label>
                                    <Input
                                        name="noticePeriod"
                                        placeholder="e.g. Immediate / 15 Days / 30 Days"
                                        value={input.noticePeriod}
                                        onChange={changeEventHandler}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        id="openToWork"
                                        name="openToWork"
                                        type="checkbox"
                                        checked={input.openToWork}
                                        onChange={changeEventHandler}
                                        className="w-4 h-4 accent-[#6A38C2] cursor-pointer"
                                    />
                                    <Label htmlFor="openToWork" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                                        Show "Open to Work" Badge to Recruiters
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-3 border-t border-gray-100 dark:border-slate-800 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="rounded-xl text-xs h-10 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        {loading ? (
                            <Button disabled className="rounded-xl h-10 bg-[#6A38C2] text-white text-xs">
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Saving & Parsing...
                            </Button>
                        ) : (
                            <Button type="submit" className="rounded-xl h-10 bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer px-6">
                                Save Profile & Sync Matchmaking
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default UpdateProfileDialog