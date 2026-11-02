import React, { useEffect, useMemo, useState } from 'react'
import Navbar from './shared/Navbar'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import {
    Contact, Mail, Pen, FileText, Bookmark, Briefcase, ExternalLink,
    Printer, Building2, Sparkles, Eye, Upload, FolderGit2, Github,
    Linkedin, Globe, Code2, GraduationCap, MapPin, CheckCircle2, Loader2
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import AppliedJobTable from './AppliedJobTable'
import UpdateProfileDialog from './UpdateProfileDialog'
import { useDispatch, useSelector } from 'react-redux'
import useGetAppliedJobs from '@/hooks/useGetAppliedJobs'
import useGetAllJobs from '@/hooks/useGetAllJobs'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import Job from './Job'
import { printCandidateCV } from '@/utils/printDocument'
import { computeJobMatchForUser, calculateProfileCompleteness } from '@/utils/matchmaking'
import { toast } from 'sonner'

const Profile = () => {
    useGetAppliedJobs();
    useGetAllJobs();
    const [open, setOpen] = useState(false);
    const [editTab, setEditTab] = useState("basic");
    const [resumeViewerOpen, setResumeViewerOpen] = useState(false);
    const [resumeViewerTab, setResumeViewerTab] = useState("parsed"); // "parsed" | "document"
    const [uploadingQuickResume, setUploadingQuickResume] = useState(false);
    const [savedJobsData, setSavedJobsData] = useState([]);

    const { user } = useSelector(store => store.auth);
    const { allJobs = [] } = useSelector(store => store.job);
    const dispatch = useDispatch();
    const isRecruiter = user?.role === 'recruiter';

    useEffect(() => {
        const fetchSavedJobs = async () => {
            try {
                const res = await axios.get(`${USER_API_END_POINT}/saved-jobs`, { withCredentials: true });
                if (res.data.success) {
                    setSavedJobsData(res.data.savedJobs);
                }
            } catch (error) {
                console.log("Failed to load saved jobs", error);
            }
        };
        if (user && !isRecruiter) fetchSavedJobs();
    }, [user?.savedJobs, user, isRecruiter]);

    const completeness = useMemo(() => calculateProfileCompleteness(user), [user]);

    // Top Recommended Jobs based on Parsed Resume + Skills + Projects
    const recommendedJobs = useMemo(() => {
        if (!user || isRecruiter) return [];
        return allJobs
            .map(job => ({ job, match: computeJobMatchForUser(job, user) }))
            .filter(item => item.match && item.match.score >= 45)
            .sort((a, b) => b.match.score - a.match.score)
            .slice(0, 3)
            .map(item => item.job);
    }, [allJobs, user, isRecruiter]);

    const openEditDialog = (tab = "basic") => {
        setEditTab(tab);
        setOpen(true);
    };

    // Quick 1-click PDF / Word (.docx/.doc) Resume Upload & Parse
    const handleQuickResumeUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploadingQuickResume(true);
            const res = await axios.post(`${USER_API_END_POINT}/resume/parse`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                toast.success(res.data.message);
                setResumeViewerOpen(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to parse resume.");
        } finally {
            setUploadingQuickResume(false);
            e.target.value = "";
        }
    };

    const hasResume = Boolean(user?.profile?.resume || user?.profile?.parsedResumeText);
    const canEmbedDocument =
        user?.profile?.resume &&
        (user.profile.resume.startsWith("data:application/pdf") ||
            user.profile.resume.endsWith(".pdf"));

    return (
        <div className='min-h-screen bg-gray-50/50 dark:bg-[#0b1120] pb-20 transition-colors'>
            <Navbar />

            <div className='max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8'>

                {/* 1. Profile Completeness & Resume Matchmaking Banner (Students) */}
                {!isRecruiter && (
                    <div className='bg-gradient-to-r from-purple-50/90 via-white to-indigo-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-purple-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
                        <div className='space-y-2 flex-1'>
                            <div className='flex items-center gap-2'>
                                <span className='text-xs font-extrabold uppercase tracking-wider text-[#6A38C2] dark:text-purple-400 flex items-center gap-1'>
                                    <Sparkles className='w-3.5 h-3.5' /> Profile & Matchmaking Readiness: {completeness.percent}%
                                </span>
                                {user?.profile?.openToWork !== false && (
                                    <Badge className='bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold'>
                                        ● OPEN TO WORK
                                    </Badge>
                                )}
                            </div>
                            <div className='w-full bg-gray-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden'>
                                <div
                                    className='bg-gradient-to-r from-[#6A38C2] to-emerald-500 h-full rounded-full transition-all duration-500'
                                    style={{ width: `${completeness.percent}%` }}
                                />
                            </div>
                            {completeness.missingItems.length > 0 ? (
                                <p className='text-xs text-gray-600 dark:text-slate-400'>
                                    Next steps to boost recruiter visibility: <strong>{completeness.missingItems.join(" • ")}</strong>
                                </p>
                            ) : (
                                <p className='text-xs text-emerald-700 dark:text-emerald-400 font-medium'>
                                    Your profile, parsed resume, and portfolio projects are 100% complete!
                                </p>
                            )}
                        </div>

                        {/* Quick Upload PDF/Word Resume Button */}
                        <div className='flex items-center gap-2 shrink-0'>
                            <label className='inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold shadow-sm cursor-pointer transition-all'>
                                {uploadingQuickResume ? (
                                    <><Loader2 className='w-3.5 h-3.5 animate-spin' /> Parsing Resume...</>
                                ) : (
                                    <><Upload className='w-3.5 h-3.5' /> Upload & Parse Resume (PDF/Word)</>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleQuickResumeUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* 2. Main Profile Info Card */}
                <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-all'>
                    <div className='flex flex-col sm:flex-row justify-between items-start gap-6'>
                        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-5'>
                            <Avatar className="h-24 w-24 ring-4 ring-purple-50 dark:ring-slate-800 shadow-md">
                                <AvatarImage
                                    src={user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg"}
                                    alt="profile"
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-purple-100 text-[#6A38C2] text-2xl font-bold">
                                    {user?.fullname?.charAt(0) || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className='space-y-1.5'>
                                <div className='flex items-center flex-wrap gap-2'>
                                    <h1 className='font-bold text-2xl text-gray-900 dark:text-white tracking-tight'>{user?.fullname}</h1>
                                    <Badge className="bg-purple-100 text-[#6A38C2] border-none text-[11px] uppercase">
                                        {isRecruiter ? "Recruiter" : "Candidate"}
                                    </Badge>
                                </div>
                                {user?.profile?.headline && (
                                    <p className='text-sm font-semibold text-[#6A38C2] dark:text-purple-400'>
                                        {user.profile.headline}
                                    </p>
                                )}
                                <p className='text-muted-foreground text-sm max-w-xl leading-relaxed'>
                                    {user?.profile?.bio || "No professional bio added yet. Click Edit Profile to introduce yourself."}
                                </p>

                                {/* Location, Experience, Notice Period Pills */}
                                {!isRecruiter && (
                                    <div className='flex items-center flex-wrap gap-3 pt-1 text-xs text-gray-500 dark:text-slate-400'>
                                        {user?.profile?.currentLocation && (
                                            <span className='inline-flex items-center gap-1'>
                                                <MapPin className='w-3.5 h-3.5 text-[#6A38C2]' /> {user.profile.currentLocation}
                                            </span>
                                        )}
                                        {user?.profile?.experienceYears !== undefined && (
                                            <span>• {user.profile.experienceYears} Yrs Exp</span>
                                        )}
                                        {user?.profile?.noticePeriod && (
                                            <span>• Notice: {user.profile.noticePeriod}</span>
                                        )}
                                        {user?.profile?.expectedCtc && (
                                            <span>• Expected: {user.profile.expectedCtc}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='flex items-center gap-2 self-end sm:self-start'>
                            {!isRecruiter && (
                                <Button
                                    onClick={() =>
                                        printCandidateCV({
                                            fullname: user?.fullname || "Candidate",
                                            email: user?.email || "",
                                            phoneNumber: user?.phoneNumber || "",
                                            bio: user?.profile?.bio || "",
                                            skills: user?.profile?.skills || []
                                        })
                                    }
                                    variant="outline"
                                    className="rounded-xl border-purple-200 text-[#6A38C2] hover:bg-purple-50 gap-2 cursor-pointer text-xs"
                                >
                                    <Printer className='w-4 h-4' />
                                    <span>Export A4 CV</span>
                                </Button>
                            )}
                            <Button
                                onClick={() => openEditDialog("basic")}
                                variant="outline"
                                className="rounded-xl border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 gap-2 text-gray-700 dark:text-slate-200 cursor-pointer text-xs"
                            >
                                <Pen className='w-4 h-4' />
                                <span>Edit Profile</span>
                            </Button>
                        </div>
                    </div>

                    {/* Contact Info & Social Links Row */}
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-6 pt-6 border-t border-gray-100 dark:border-slate-800'>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div className='flex items-center gap-3 text-gray-600 dark:text-slate-300 text-sm'>
                                <div className='p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400'>
                                    <Mail className='w-4 h-4' />
                                </div>
                                <div>
                                    <p className='text-xs text-muted-foreground'>Email Address</p>
                                    <span className='font-medium text-gray-900 dark:text-white'>{user?.email}</span>
                                </div>
                            </div>
                            <div className='flex items-center gap-3 text-gray-600 dark:text-slate-300 text-sm'>
                                <div className='p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400'>
                                    <Contact className='w-4 h-4' />
                                </div>
                                <div>
                                    <p className='text-xs text-muted-foreground'>Phone Number</p>
                                    <span className='font-medium text-gray-900 dark:text-white'>{user?.phoneNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* Social & Coding Links */}
                        <div className='flex items-center flex-wrap gap-2'>
                            {user?.profile?.socialLinks?.github && (
                                <a
                                    href={user.profile.socialLinks.github}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-purple-50 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-colors"
                                >
                                    <Github className="w-3.5 h-3.5" /> GitHub
                                </a>
                            )}
                            {user?.profile?.socialLinks?.linkedin && (
                                <a
                                    href={user.profile.socialLinks.linkedin}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-colors"
                                >
                                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                                </a>
                            )}
                            {user?.profile?.socialLinks?.portfolio && (
                                <a
                                    href={user.profile.socialLinks.portfolio}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-xs font-semibold text-[#6A38C2] dark:text-purple-300 transition-colors"
                                >
                                    <Globe className="w-3.5 h-3.5" /> Portfolio
                                </a>
                            )}
                            {user?.profile?.socialLinks?.leetcode && (
                                <a
                                    href={user.profile.socialLinks.leetcode}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-colors"
                                >
                                    <Code2 className="w-3.5 h-3.5" /> Coding Profile
                                </a>
                            )}
                            {!user?.profile?.socialLinks?.github && !user?.profile?.socialLinks?.linkedin && !isRecruiter && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog("links")}
                                    className="text-xs text-[#6A38C2] cursor-pointer"
                                >
                                    + Add GitHub / LinkedIn / Portfolio Links
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div className='my-6'>
                        <h2 className='text-xs font-bold uppercase tracking-wider text-gray-400 mb-3'>
                            {isRecruiter ? "Hiring Focus Areas" : "Verified Technical & Resume Skills"}
                        </h2>
                        <div className='flex items-center gap-2 flex-wrap'>
                            {user?.profile?.skills?.length > 0 ? (
                                user.profile.skills.map((item, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="px-3 py-1 text-xs font-medium rounded-lg bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 hover:bg-purple-100 border border-purple-200/60 dark:border-purple-800/60"
                                    >
                                        {item}
                                    </Badge>
                                ))
                            ) : (
                                <span className='text-sm text-muted-foreground italic'>No skills added yet — upload a resume or edit profile.</span>
                            )}
                        </div>
                    </div>

                    {/* Convenient Resume & ATS Parser Hub Section (Students Only) */}
                    {!isRecruiter && (
                        <div className='pt-6 border-t border-gray-100 dark:border-slate-800'>
                            <div className='flex items-center justify-between mb-2'>
                                <h2 className='text-xs font-bold uppercase tracking-wider text-gray-400'>
                                    Uploaded Resume & Parsed ATS Profile
                                </h2>
                                {user?.profile?.resumeAtsScore > 0 && (
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                                        Resume ATS Readiness: {user.profile.resumeAtsScore}%
                                    </Badge>
                                )}
                            </div>

                            {hasResume ? (
                                <div className='flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-purple-50/50 dark:bg-slate-800/70 border border-purple-100 dark:border-slate-700 gap-3'>
                                    <div className='flex items-center gap-3 overflow-hidden'>
                                        <div className='w-10 h-10 rounded-xl bg-[#6A38C2] text-white flex items-center justify-center shrink-0'>
                                            <FileText className='w-5 h-5' />
                                        </div>
                                        <div className='min-w-0'>
                                            <span className='text-sm font-bold text-gray-900 dark:text-white truncate block'>
                                                {user?.profile?.resumeOriginalName || "Candidate_Resume.pdf"}
                                            </span>
                                            <span className='text-xs text-gray-500 dark:text-slate-400'>
                                                {user?.profile?.extractedSkills?.length > 0
                                                    ? `Parsed & indexed ${user.profile.extractedSkills.length} skills for automatic job matchmaking`
                                                    : "Saved and ready for recruiter review"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className='flex items-center gap-2 shrink-0'>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => setResumeViewerOpen(true)}
                                            className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer"
                                        >
                                            <Eye className='w-3.5 h-3.5 mr-1.5' /> View Resume & Parsed ATS Data
                                        </Button>
                                        {user?.profile?.resume && !user.profile.resume.startsWith("parsed://") && (
                                            <a
                                                target='_blank'
                                                rel="noreferrer"
                                                href={user?.profile?.resume}
                                                download={user?.profile?.resumeOriginalName || "Resume"}
                                                className='inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 bg-white dark:bg-slate-900 text-xs font-semibold text-[#6A38C2] hover:bg-purple-50'
                                            >
                                                <span>Open / Download</span>
                                                <ExternalLink className='w-3.5 h-3.5' />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className='p-5 rounded-2xl border border-dashed border-purple-200 dark:border-slate-700 bg-purple-50/30 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4'>
                                    <div className='text-xs text-gray-600 dark:text-slate-400'>
                                        <p className='font-bold text-gray-900 dark:text-white text-sm'>No resume uploaded yet</p>
                                        <p>Upload a PDF (`.pdf`) or Word (`.docx`, `.doc`) resume to automatically extract skills and unlock personalized job match scores.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => openEditDialog("basic")}
                                        className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs cursor-pointer shrink-0"
                                    >
                                        <Upload className='w-3.5 h-3.5 mr-1.5' /> Upload PDF / Word Resume
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Candidate Projects Showcase Section */}
                {!isRecruiter && (
                    <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2.5'>
                                <div className='p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400'>
                                    <FolderGit2 className='w-5 h-5' />
                                </div>
                                <div>
                                    <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Projects & Engineering Portfolio</h2>
                                    <p className='text-xs text-muted-foreground'>Showcased to recruiters and indexed by our AI matchmaking engine</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog("projects")}
                                className="rounded-xl text-xs cursor-pointer"
                            >
                                + Add / Edit Projects
                            </Button>
                        </div>

                        {user?.profile?.projects?.length > 0 ? (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {user.profile.projects.map((proj, idx) => (
                                    <div key={idx} className='p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-800/40 flex flex-col justify-between space-y-3'>
                                        <div className='space-y-2'>
                                            <div className='flex items-start justify-between gap-2'>
                                                <h3 className='font-bold text-base text-gray-900 dark:text-white'>{proj.title}</h3>
                                                <div className='flex items-center gap-2 shrink-0'>
                                                    {proj.githubUrl && (
                                                        <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-600 hover:text-[#6A38C2] flex items-center gap-1">
                                                            <Github className="w-3.5 h-3.5" /> Code
                                                        </a>
                                                    )}
                                                    {proj.liveUrl && (
                                                        <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#6A38C2] hover:underline flex items-center gap-1">
                                                            <ExternalLink className="w-3.5 h-3.5" /> Live
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <p className='text-xs text-gray-600 dark:text-slate-400 leading-relaxed'>
                                                {proj.description || "Full-stack engineering project."}
                                            </p>
                                        </div>
                                        {proj.techStack?.length > 0 && (
                                            <div className='flex flex-wrap gap-1.5 pt-2'>
                                                {proj.techStack.map((tech, tIdx) => (
                                                    <Badge key={tIdx} variant="secondary" className="text-[10px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                                                        {tech}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='text-center py-8 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800'>
                                <p className='text-sm text-gray-600 dark:text-slate-300 font-medium'>No portfolio projects added yet</p>
                                <p className='text-xs text-muted-foreground mt-1'>Adding 2–3 projects with GitHub/live links increases recruiter shortlist rates by 3x.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Work Experience & Education Section */}
                {!isRecruiter && ((user?.profile?.experience?.length || 0) > 0 || (user?.profile?.education?.length || 0) > 0) && (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4'>
                            <div className='flex items-center justify-between'>
                                <h3 className='font-bold text-base text-gray-900 dark:text-white flex items-center gap-2'>
                                    <Briefcase className='w-4 h-4 text-[#6A38C2]' /> Work Experience
                                </h3>
                                <button type="button" onClick={() => openEditDialog("experience")} className="text-xs text-[#6A38C2] font-semibold hover:underline cursor-pointer">
                                    Edit
                                </button>
                            </div>
                            {user?.profile?.experience?.length > 0 ? (
                                <div className='space-y-3'>
                                    {user.profile.experience.map((exp, i) => (
                                        <div key={i} className='p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-bold text-sm text-gray-900 dark:text-white'>{exp.role}</span>
                                                <span className='text-[11px] text-gray-500'>{exp.duration}</span>
                                            </div>
                                            <p className='text-xs font-semibold text-[#6A38C2] dark:text-purple-400'>{exp.company}</p>
                                            {exp.description && <p className='text-xs text-gray-600 dark:text-slate-400'>{exp.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className='text-xs text-gray-400 italic'>No work experience entries listed.</p>
                            )}
                        </div>

                        <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4'>
                            <div className='flex items-center justify-between'>
                                <h3 className='font-bold text-base text-gray-900 dark:text-white flex items-center gap-2'>
                                    <GraduationCap className='w-4 h-4 text-[#6A38C2]' /> Education
                                </h3>
                                <button type="button" onClick={() => openEditDialog("experience")} className="text-xs text-[#6A38C2] font-semibold hover:underline cursor-pointer">
                                    Edit
                                </button>
                            </div>
                            {user?.profile?.education?.length > 0 ? (
                                <div className='space-y-3'>
                                    {user.profile.education.map((ed, i) => (
                                        <div key={i} className='p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-bold text-sm text-gray-900 dark:text-white'>{ed.degree}</span>
                                                <span className='text-[11px] text-gray-500'>{ed.year}</span>
                                            </div>
                                            <p className='text-xs text-gray-600 dark:text-slate-300'>{ed.institution}</p>
                                            {ed.grade && <Badge variant="secondary" className="text-[10px]">Grade: {ed.grade}</Badge>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className='text-xs text-gray-400 italic'>No education entries listed.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. AI Recommended Jobs Based on Parsed Resume & Projects */}
                {!isRecruiter && recommendedJobs.length > 0 && (
                    <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5'>
                        <div className='flex items-center gap-2.5'>
                            <div className='p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'>
                                <Sparkles className='w-5 h-5' />
                            </div>
                            <div>
                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Top Job Matches for Your Resume</h2>
                                <p className='text-xs text-muted-foreground'>Automatically ranked using your parsed resume, extracted skills, and project portfolio</p>
                            </div>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                            {recommendedJobs.map(job => (
                                <Job key={job._id} job={job} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recruiter Quick Actions Card */}
                {isRecruiter && (
                    <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                                <Building2 className='w-6 h-6' />
                            </div>
                            <div>
                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Recruiter Command Center</h2>
                                <p className='text-xs text-muted-foreground'>Manage registered companies, post new openings, and issue official offer/joining letters.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Applied Jobs Section (Students Only) */}
                {!isRecruiter && (
                    <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs'>
                        <div className='flex items-center gap-2.5 mb-6'>
                            <div className='p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2]'>
                                <Briefcase className='w-5 h-5' />
                            </div>
                            <div>
                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Applied Jobs</h2>
                                <p className='text-xs text-muted-foreground'>Track all your job applications and current status</p>
                            </div>
                        </div>
                        <AppliedJobTable />
                    </div>
                )}

                {/* 7. Saved Jobs Section (Students Only) */}
                {!isRecruiter && (
                    <div className='bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs'>
                        <div className='flex items-center gap-2.5 mb-6'>
                            <div className='p-2 rounded-xl bg-amber-50 text-amber-600'>
                                <Bookmark className='w-5 h-5' />
                            </div>
                            <div>
                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Saved Jobs ({savedJobsData.length})</h2>
                                <p className='text-xs text-muted-foreground'>Jobs you have bookmarked to apply later</p>
                            </div>
                        </div>

                        {savedJobsData.length <= 0 ? (
                            <div className='text-center py-12 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800'>
                                <Bookmark className='w-8 h-8 text-gray-400 mx-auto mb-2 stroke-[1.5]' />
                                <p className='text-sm text-gray-600 dark:text-slate-300 font-medium'>No saved jobs yet</p>
                                <p className='text-xs text-muted-foreground mt-0.5'>Bookmark jobs while browsing to see them here.</p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                {savedJobsData.map((job) => (
                                    <Job key={job._id} job={job} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Convenient In-App Resume & ATS Parser Viewer Modal */}
            <Dialog open={resumeViewerOpen} onOpenChange={setResumeViewerOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2 text-lg font-extrabold">
                            <span className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#6A38C2]" />
                                {user?.profile?.resumeOriginalName || "Candidate Resume & ATS Insights"}
                            </span>
                            {user?.profile?.resumeAtsScore > 0 && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs">
                                    ATS Score: {user.profile.resumeAtsScore}/100
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setResumeViewerTab("parsed")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                                        resumeViewerTab === "parsed"
                                            ? "bg-[#6A38C2] text-white"
                                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                                    }`}
                                >
                                    Parsed ATS Text & Extracted Skills
                                </button>
                                {canEmbedDocument && (
                                    <button
                                        type="button"
                                        onClick={() => setResumeViewerTab("document")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                                            resumeViewerTab === "document"
                                                ? "bg-[#6A38C2] text-white"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                                        }`}
                                    >
                                        Original PDF Preview
                                    </button>
                                )}
                            </div>

                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#6A38C2] hover:bg-purple-100 text-xs font-semibold cursor-pointer">
                                <Upload className="w-3.5 h-3.5" /> Replace PDF/Word File
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleQuickResumeUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {resumeViewerTab === "document" && canEmbedDocument ? (
                            <iframe
                                src={user.profile.resume}
                                title="Resume Preview"
                                className="w-full h-[500px] rounded-2xl border border-gray-200"
                            />
                        ) : (
                            <div className="space-y-4">
                                {/* Auto-Extracted Skills */}
                                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700 space-y-2">
                                    <p className="text-xs font-bold text-[#6A38C2] dark:text-purple-300 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> Auto-Extracted Skills Used for Job Matchmaking ({user?.profile?.extractedSkills?.length || user?.profile?.skills?.length || 0})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(user?.profile?.extractedSkills?.length > 0 ? user.profile.extractedSkills : user?.profile?.skills || []).map((sk, i) => (
                                            <Badge key={i} className="bg-white dark:bg-slate-900 text-[#6A38C2] dark:text-purple-300 border border-purple-200 text-xs">
                                                {sk}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Parsed Text */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Extracted Resume Content (Indexed by ATS)
                                    </p>
                                    <div className="max-h-72 overflow-y-auto p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                                        {user?.profile?.parsedResumeText || user?.profile?.bio || "Upload a PDF or Word (.docx) resume to view extracted text here."}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setResumeViewerOpen(false)} className="rounded-xl text-xs">
                            Close Viewer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UpdateProfileDialog open={open} setOpen={setOpen} initialTab={editTab} />
        </div>
    )
}

export default Profile