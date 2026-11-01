import React, { useState, useEffect, useMemo } from 'react'
import Navbar from './shared/Navbar'
import Footer from './shared/Footer'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import {
    Mail, Phone, Pen, FileText, Briefcase,
    Award, CheckCircle2, Bookmark, Building2, Plus, Eye, Download, Printer,
    Sparkles, Copy, Check, TrendingUp, Calendar, Layers, ArrowUpRight, X, ShieldCheck
} from 'lucide-react'
import { Badge } from './ui/badge'
import AppliedJobTable from './AppliedJobTable'
import UpdateProfileDialog from './UpdateProfileDialog'
import Job from './Job'
import { useDispatch, useSelector } from 'react-redux'
import useGetAppliedJobs from '@/hooks/useGetAppliedJobs'
import useGetAllAdminJobs from '@/hooks/useGetAllAdminJobs'
import useGetAllCompanies from '@/hooks/useGetAllCompanies'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { useNavigate } from 'react-router-dom'
import { printCandidateCV } from '@/utils/printDocument'
import { toast } from 'sonner'

const isRestrictedCloudinaryPdf = (url = "") => {
    return typeof url === "string" && url.includes("res.cloudinary.com") && url.includes("/image/upload/") && url.endsWith(".pdf");
};

const Profile = () => {
    useGetAppliedJobs();
    useGetAllAdminJobs();
    useGetAllCompanies();

    const [open, setOpen] = useState(false);
    const [resumePreviewOpen, setResumePreviewOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("applications"); // "applications" | "saved" | "resume"
    const [copiedField, setCopiedField] = useState("");
    const [quickSkill, setQuickSkill] = useState("");
    const [savingSkill, setSavingSkill] = useState(false);

    const { user } = useSelector(store => store.auth);
    const { allAppliedJobs = [], allAdminJobs = [] } = useSelector(store => store.job);
    const { companies = [] } = useSelector(store => store.company);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const isRecruiter = user?.role === 'recruiter';

    const [savedJobs, setSavedJobs] = useState([]);
    const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);

    // Redirect unauthenticated visitors to login
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    // Fetch saved jobs once per user login
    useEffect(() => {
        if (!user?._id || isRecruiter) {
            setLoadingSavedJobs(false);
            return;
        }
        const fetchSavedJobs = async () => {
            try {
                setLoadingSavedJobs(true);
                const res = await axios.get(`${USER_API_END_POINT}/job/saved`, { withCredentials: true });
                if (res.data.success) {
                    setSavedJobs(res.data.savedJobs);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoadingSavedJobs(false);
            }
        };

        fetchSavedJobs();
    }, [user?._id, isRecruiter]);

    // Keep savedJobs list in sync when user unsaves a job from inside Profile
    useEffect(() => {
        if (!user?.savedJobs) return;
        const savedIds = new Set(user.savedJobs.map(item => (typeof item === 'object' ? item?._id : item)));
        setSavedJobs(prev => prev.filter(job => savedIds.has(job._id)));
    }, [user?.savedJobs]);

    const profilePhoto = user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg";
    const resumeUrl = user?.profile?.resume || "";
    const isDataUriPdf = resumeUrl.startsWith("data:application/pdf");
    const canEmbedPdfDirectly = isDataUriPdf || (resumeUrl && !isRestrictedCloudinaryPdf(resumeUrl));

    // Calculate Profile Completeness & Missing Actionable Steps
    const profileHealth = useMemo(() => {
        const checks = [
            { label: "Full Name & Contact", done: Boolean(user?.fullname && user?.email && user?.phoneNumber), weight: 25 },
            { label: isRecruiter ? "Recruiter Headline" : "Professional Bio", done: Boolean(user?.profile?.bio?.trim()), weight: 25 },
            { label: isRecruiter ? "Hiring Focus Tags" : "Technical Skills (3+)", done: (user?.profile?.skills?.length || 0) >= 3, weight: 25 },
            {
                label: isRecruiter ? "Registered Company" : "Uploaded Resume / CV",
                done: isRecruiter ? companies.length > 0 : Boolean(user?.profile?.resume || user?.profile?.resumeOriginalName),
                weight: 25
            }
        ];
        const score = checks.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
        const missing = checks.filter(c => !c.done);
        return { score, checks, missing };
    }, [user, isRecruiter, companies.length]);

    // Candidate Application Metrics
    const candidateStats = useMemo(() => {
        let total = allAppliedJobs.length;
        let inPipeline = 0;
        let offers = 0;

        allAppliedJobs.forEach(app => {
            const st = app?.hiringStage || app?.status || 'pending';
            if (['shortlisted', 'assignment_sent', 'interview_scheduled', 'interview_passed'].includes(st) || app?.status === 'accepted') {
                inPipeline++;
            }
            if (['offer_sent', 'offer_accepted', 'hired'].includes(st)) {
                offers++;
            }
        });

        return {
            total,
            inPipeline,
            offers,
            saved: savedJobs.length
        };
    }, [allAppliedJobs, savedJobs.length]);

    // Recruiter Metrics
    const recruiterStats = useMemo(() => {
        let totalApplicants = 0;
        let shortlisted = 0;
        allAdminJobs.forEach(j => {
            const apps = j?.applications || [];
            totalApplicants += apps.length;
            apps.forEach(a => {
                if (typeof a === 'object' && (a.status === 'accepted' || (a.hiringStage && !['applied', 'rejected'].includes(a.hiringStage)))) {
                    shortlisted++;
                }
            });
        });
        return {
            companies: companies.length,
            jobs: allAdminJobs.length,
            totalApplicants,
            shortlisted
        };
    }, [companies.length, allAdminJobs]);

    const handleCopyText = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(String(text));
        setCopiedField(label);
        toast.success(`${label} copied to clipboard!`);
        setTimeout(() => setCopiedField(""), 1800);
    };

    // Quick inline skill add/remove without opening dialog
    const handleUpdateSkillsInline = async (updatedSkillsArray) => {
        try {
            setSavingSkill(true);
            const formData = new FormData();
            formData.append("fullname", user?.fullname || "");
            formData.append("email", user?.email || "");
            formData.append("phoneNumber", user?.phoneNumber || "");
            formData.append("bio", user?.profile?.bio || "");
            formData.append("skills", updatedSkillsArray.join(", "));
            if (user?.profile?.profilePhoto) {
                formData.append("profilePhotoUrl", user.profile.profilePhoto);
            }

            const res = await axios.post(`${USER_API_END_POINT}/profile/update`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                setQuickSkill("");
                toast.success("Skills updated!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update skills.");
        } finally {
            setSavingSkill(false);
        }
    };

    const handleAddQuickSkill = (e) => {
        e.preventDefault();
        const trimmed = quickSkill.trim();
        if (!trimmed) return;
        const current = user?.profile?.skills || [];
        if (current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Skill already exists on your profile.");
            return;
        }
        handleUpdateSkillsInline([...current, trimmed]);
    };

    const handleRemoveSkill = (skillToRemove) => {
        const current = user?.profile?.skills || [];
        const nextSkills = current.filter(s => s !== skillToRemove);
        handleUpdateSkillsInline(nextSkills);
    };

    return (
        <div className='min-h-screen bg-gray-50/60 dark:bg-[#0b1120] flex flex-col justify-between transition-colors'>
            <div>
                <Navbar />

                <main className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-8 space-y-7'>

                    {/* 1. HERO PROFILE HEADER CARD */}
                    <section className='bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden transition-all'>

                        {/* Aesthetic Mesh Banner */}
                        <div className='h-36 sm:h-44 bg-gradient-to-r from-[#6A38C2] via-purple-600 to-indigo-600 relative overflow-hidden'>
                            <div className='absolute -top-12 -right-12 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none' />
                            <div className='absolute bottom-0 left-1/3 w-72 h-28 rounded-full bg-amber-400/15 blur-2xl pointer-events-none' />

                            {/* Top Right Quick Actions */}
                            <div className='absolute right-4 sm:right-6 top-4 sm:top-6 flex items-center gap-2.5'>
                                {!isRecruiter && (
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            printCandidateCV({
                                                fullname: user?.fullname,
                                                email: user?.email,
                                                phoneNumber: user?.phoneNumber,
                                                bio: user?.profile?.bio,
                                                skills: user?.profile?.skills || []
                                            })
                                        }
                                        variant="secondary"
                                        className="rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 font-semibold text-xs h-9 px-4 backdrop-blur-md cursor-pointer hidden sm:flex items-center gap-1.5"
                                    >
                                        <Printer className='w-3.5 h-3.5' />
                                        <span>Export A4 CV</span>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={() => setOpen(true)}
                                    variant="secondary"
                                    className="rounded-full bg-white hover:bg-gray-50 text-gray-900 font-semibold text-xs h-9 px-4 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <Pen className='w-3.5 h-3.5 text-[#6A38C2]' />
                                    <span>Edit Profile</span>
                                </Button>
                            </div>
                        </div>

                        {/* Profile Main Content */}
                        <div className='px-6 sm:px-8 pb-8 relative'>

                            {/* Avatar + Identity + Role Badge */}
                            <div className='flex flex-col md:flex-row md:items-end justify-between -mt-14 sm:-mt-16 mb-6 gap-5'>
                                <div className='flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5'>
                                    <div className='relative group w-fit'>
                                        <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-white dark:ring-slate-900 shadow-xl bg-white shrink-0">
                                            <AvatarImage src={profilePhoto} alt={user?.fullname || "profile"} className="object-cover" />
                                            <AvatarFallback className="bg-purple-100 text-[#6A38C2] text-3xl font-extrabold">
                                                {user?.fullname?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <button
                                            type="button"
                                            onClick={() => setOpen(true)}
                                            title="Change avatar"
                                            className='absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#6A38C2] text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer ring-2 ring-white dark:ring-slate-900'
                                        >
                                            <Pen className='w-3.5 h-3.5' />
                                        </button>
                                    </div>

                                    <div className='space-y-1.5 pt-1'>
                                        <div className='flex items-center flex-wrap gap-2'>
                                            <h1 className='text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight'>
                                                {user?.fullname || "User"}
                                            </h1>
                                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/80 text-[#6A38C2] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800'>
                                                <ShieldCheck className='w-3.5 h-3.5' />
                                                {isRecruiter ? "Verified Recruiter" : "Verified Candidate"}
                                            </span>
                                        </div>
                                        <p className='text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-2xl leading-relaxed'>
                                            {user?.profile?.bio || (isRecruiter
                                                ? "Talent Acquisition & Engineering Hiring Partner — Click 'Edit Profile' to add your headline."
                                                : "No professional bio added yet. Add a concise summary to stand out to hiring managers and boost your ATS score.")}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick AI Studio / Workspace CTA */}
                                <div className='flex items-center gap-2 self-start md:self-end'>
                                    {!isRecruiter ? (
                                        <Button
                                            type="button"
                                            onClick={() => navigate("/ai-cover-letter")}
                                            className="rounded-xl bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 text-[#6A38C2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 font-semibold text-xs h-9 px-3.5 cursor-pointer"
                                        >
                                            <Sparkles className='w-3.5 h-3.5 mr-1.5' />
                                            <span>AI Pitch Studio</span>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={() => navigate("/admin/jobs/create")}
                                            className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-semibold text-xs h-9 px-4 cursor-pointer"
                                        >
                                            <Plus className='w-3.5 h-3.5 mr-1.5' />
                                            <span>Post New Job</span>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Interactive Contact Chips + Profile Strength Meter Grid */}
                            <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 border-t border-gray-100 dark:border-slate-800'>

                                {/* Left: Copyable Contact Info & Quick Resume Pill */}
                                <div className='lg:col-span-7 flex flex-wrap items-center gap-2.5'>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(user?.email, "Email")}
                                        className='group flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800/80 hover:bg-purple-50/60 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-200/70 dark:border-slate-700/80 transition-all cursor-pointer text-xs'
                                        title="Click to copy email"
                                    >
                                        <Mail className='w-4 h-4 text-[#6A38C2] dark:text-purple-400 shrink-0' />
                                        <span className='font-semibold text-gray-700 dark:text-slate-200'>{user?.email || "Not provided"}</span>
                                        {copiedField === "Email" ? (
                                            <Check className='w-3.5 h-3.5 text-emerald-600' />
                                        ) : (
                                            <Copy className='w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(user?.phoneNumber, "Phone")}
                                        className='group flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800/80 hover:bg-purple-50/60 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-200/70 dark:border-slate-700/80 transition-all cursor-pointer text-xs'
                                        title="Click to copy phone number"
                                    >
                                        <Phone className='w-4 h-4 text-[#6A38C2] dark:text-purple-400 shrink-0' />
                                        <span className='font-semibold text-gray-700 dark:text-slate-200'>{user?.phoneNumber || "Not provided"}</span>
                                        {copiedField === "Phone" ? (
                                            <Check className='w-3.5 h-3.5 text-emerald-600' />
                                        ) : (
                                            <Copy className='w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                                        )}
                                    </button>

                                    {!isRecruiter && (
                                        <button
                                            type="button"
                                            onClick={() => setResumePreviewOpen(true)}
                                            className='flex items-center gap-2 bg-purple-50/80 dark:bg-purple-950/60 hover:bg-purple-100/80 text-[#6A38C2] dark:text-purple-300 px-3.5 py-2 rounded-xl border border-purple-200/70 dark:border-purple-800/70 transition-all cursor-pointer text-xs font-semibold'
                                        >
                                            <FileText className='w-4 h-4 shrink-0' />
                                            <span className='truncate max-w-[180px]'>
                                                {user?.profile?.resumeOriginalName || "Preview Resume / CV"}
                                            </span>
                                            <Eye className='w-3.5 h-3.5 ml-0.5' />
                                        </button>
                                    )}
                                </div>

                                {/* Right: Profile Completeness Meter */}
                                <div className='lg:col-span-5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-gray-200/60 dark:border-slate-800 space-y-2.5'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5'>
                                            <TrendingUp className='w-3.5 h-3.5 text-[#6A38C2] dark:text-purple-400' />
                                            Profile Strength
                                        </span>
                                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                                            profileHealth.score === 100
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-purple-100 text-[#6A38C2] dark:bg-purple-950 dark:text-purple-300'
                                        }`}>
                                            {profileHealth.score}% {profileHealth.score === 100 ? "All-Star" : "Complete"}
                                        </span>
                                    </div>

                                    <div className='w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden'>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                profileHealth.score === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#6A38C2] to-indigo-500'
                                            }`}
                                            style={{ width: `${profileHealth.score}%` }}
                                        />
                                    </div>

                                    {profileHealth.missing.length > 0 ? (
                                        <div className='flex items-center flex-wrap gap-1.5 pt-0.5'>
                                            <span className='text-[11px] text-gray-500 dark:text-slate-400'>Next up:</span>
                                            {profileHealth.missing.map((m, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setOpen(true)}
                                                    className='text-[11px] font-semibold text-[#6A38C2] dark:text-purple-300 hover:underline cursor-pointer'
                                                >
                                                    + {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className='text-[11px] text-emerald-600 dark:text-emerald-400 font-medium'>
                                            ✓ Your profile is 100% complete and optimized for recruiters!
                                        </p>
                                    )}
                                </div>

                            </div>

                            {/* Skills / Hiring Focus Strip with Quick Inline Adder */}
                            <div className='mt-6 pt-5 border-t border-gray-100 dark:border-slate-800'>
                                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3'>
                                    <div className='flex items-center gap-2'>
                                        <Award className='w-4 h-4 text-[#6A38C2] dark:text-purple-400' />
                                        <h2 className='font-bold text-sm text-gray-900 dark:text-white'>
                                            {isRecruiter ? "Hiring Domains & Focus Areas" : "Core Technical Skills & Competencies"}
                                        </h2>
                                        <span className='text-xs text-gray-400 font-medium'>
                                            ({user?.profile?.skills?.length || 0})
                                        </span>
                                    </div>

                                    {/* Quick 1-Click Skill Adder */}
                                    <form onSubmit={handleAddQuickSkill} className='flex items-center gap-1.5'>
                                        <input
                                            type="text"
                                            value={quickSkill}
                                            onChange={(e) => setQuickSkill(e.target.value)}
                                            placeholder={isRecruiter ? "Add focus (e.g. Cloud)..." : "Quick add skill (e.g. Docker)..."}
                                            className='h-8 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:border-[#6A38C2] w-48'
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={savingSkill || !quickSkill.trim()}
                                            className="h-8 px-3 rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer"
                                        >
                                            <Plus className='w-3.5 h-3.5 mr-1' /> Add
                                        </Button>
                                    </form>
                                </div>

                                <div className='flex items-center flex-wrap gap-2'>
                                    {user?.profile?.skills && user.profile.skills.length > 0 ? (
                                        user.profile.skills.map((item, index) => (
                                            <Badge
                                                key={index}
                                                className="group bg-purple-50/90 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 hover:bg-purple-100 border border-purple-200/70 dark:border-purple-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                                            >
                                                <span>{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSkill(item)}
                                                    title={`Remove ${item}`}
                                                    className='opacity-50 group-hover:opacity-100 hover:text-red-500 transition-opacity cursor-pointer'
                                                >
                                                    <X className='w-3 h-3' />
                                                </button>
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-xs text-muted-foreground italic'>
                                            {isRecruiter
                                                ? "No hiring focus tags added yet. Use the quick box above to add domains."
                                                : "No skills listed yet. Add skills above so our AI ATS Matcher can score job openings for you."}
                                        </span>
                                    )}
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* 2. BENTO STATS ROW */}
                    {!isRecruiter ? (
                        <section className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                            <div
                                onClick={() => setActiveTab("applications")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center shrink-0'>
                                    <Briefcase className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Applied Jobs</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{candidateStats.total}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => setActiveTab("applications")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0'>
                                    <Calendar className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Active Pipeline</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{candidateStats.inPipeline}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => setActiveTab("applications")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                                    <Award className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Offers & Hired</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{candidateStats.offers}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => setActiveTab("saved")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
                                    <Bookmark className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Saved Bookmarks</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{candidateStats.saved}</h3>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                            <div
                                onClick={() => navigate("/admin/companies")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center shrink-0'>
                                    <Building2 className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Organizations</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{recruiterStats.companies}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => navigate("/admin/jobs")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0'>
                                    <Briefcase className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Active Postings</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{recruiterStats.jobs}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => navigate("/admin/jobs")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0'>
                                    <Layers className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Total Applicants</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{recruiterStats.totalApplicants}</h3>
                                </div>
                            </div>

                            <div
                                onClick={() => navigate("/admin/jobs")}
                                className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-4'
                            >
                                <div className='w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                                    <CheckCircle2 className='w-6 h-6' />
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500 dark:text-slate-400 font-medium'>Shortlisted / Hired</p>
                                    <h3 className='text-2xl font-extrabold text-gray-900 dark:text-white'>{recruiterStats.shortlisted}</h3>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 3. WORKSPACE BODY: CANDIDATE TABS OR RECRUITER HUB */}
                    {isRecruiter ? (
                        <section className='bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 sm:p-8 space-y-6'>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center'>
                                        <Building2 className='w-5 h-5' />
                                    </div>
                                    <div>
                                        <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Recruiter Command Center</h2>
                                        <p className='text-xs text-muted-foreground'>Jump straight to your organizations, job pipelines, or AI job writer.</p>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <Button
                                        onClick={() => navigate("/admin/companies")}
                                        variant="outline"
                                        className="rounded-xl text-xs h-9 cursor-pointer"
                                    >
                                        Manage Companies ({companies.length})
                                    </Button>
                                    <Button
                                        onClick={() => navigate("/admin/jobs/create")}
                                        className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs h-9 cursor-pointer"
                                    >
                                        <Plus className='w-3.5 h-3.5 mr-1' /> Post New Job
                                    </Button>
                                </div>
                            </div>

                            {allAdminJobs.length > 0 ? (
                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between'>
                                        <h3 className='text-xs font-bold uppercase tracking-wider text-gray-500'>Recent Active Job Postings</h3>
                                        <button
                                            type="button"
                                            onClick={() => navigate("/admin/jobs")}
                                            className='text-xs font-semibold text-[#6A38C2] hover:underline cursor-pointer'
                                        >
                                            View All Analytics →
                                        </button>
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        {allAdminJobs.slice(0, 4).map((job) => (
                                            <div
                                                key={job._id}
                                                onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)}
                                                className='p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 hover:border-purple-300 transition-all cursor-pointer flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/40'
                                            >
                                                <div className='min-w-0'>
                                                    <h4 className='font-bold text-sm text-gray-900 dark:text-white truncate'>{job.title}</h4>
                                                    <p className='text-xs text-gray-500 truncate mt-0.5'>
                                                        {job.company?.name} • {job.location}
                                                    </p>
                                                </div>
                                                <Badge className="bg-purple-50 text-[#6A38C2] border border-purple-200 shrink-0 text-xs">
                                                    {job.applications?.length || 0} Applicants →
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className='text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200'>
                                    <Briefcase className='w-10 h-10 text-gray-300 mx-auto mb-2' />
                                    <p className='text-sm font-semibold text-gray-700'>No job postings created yet</p>
                                    <p className='text-xs text-gray-500 mt-1'>Create your first job opening with our 1-click AI Job Description writer.</p>
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className='space-y-5'>

                            {/* Modern Segmented Pill Navigation */}
                            <div className='flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs'>
                                <div className='flex flex-wrap items-center gap-1.5'>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("applications")}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                            activeTab === "applications"
                                                ? "bg-[#6A38C2] text-white shadow-xs"
                                                : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <Briefcase className='w-3.5 h-3.5' />
                                        <span>Applied Jobs & Pipeline</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            activeTab === "applications" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                                        }`}>
                                            {allAppliedJobs.length}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("saved")}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                            activeTab === "saved"
                                                ? "bg-[#6A38C2] text-white shadow-xs"
                                                : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <Bookmark className='w-3.5 h-3.5' />
                                        <span>Saved Jobs</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            activeTab === "saved" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                                        }`}>
                                            {savedJobs.length}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("resume")}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                            activeTab === "resume"
                                                ? "bg-[#6A38C2] text-white shadow-xs"
                                                : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <FileText className='w-3.5 h-3.5' />
                                        <span>Resume & CV Studio</span>
                                    </button>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate("/jobs")}
                                    className="text-xs font-semibold text-[#6A38C2] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                                >
                                    <span>Explore More Jobs</span>
                                    <ArrowUpRight className='w-3.5 h-3.5 ml-1' />
                                </Button>
                            </div>

                            {/* TAB 1: APPLIED JOBS & HIRING PIPELINE */}
                            {activeTab === "applications" && (
                                <div className='bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 sm:p-8'>
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800'>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center'>
                                                <Briefcase className='w-5 h-5' />
                                            </div>
                                            <div>
                                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Applied Job Applications</h2>
                                                <p className='text-xs text-muted-foreground'>
                                                    Track live hiring stages, submit technical assignments, and download official Offer & Joining Letters.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <AppliedJobTable />
                                </div>
                            )}

                            {/* TAB 2: SAVED JOBS */}
                            {activeTab === "saved" && (
                                <div className='bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 sm:p-8'>
                                    <div className='flex items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800'>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center'>
                                                <Bookmark className='w-5 h-5 fill-current' />
                                            </div>
                                            <div>
                                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Saved & Bookmarked Jobs</h2>
                                                <p className='text-xs text-muted-foreground'>
                                                    Opportunities you have bookmarked for quick comparison and application.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {loadingSavedJobs ? (
                                        <p className='text-sm text-muted-foreground text-center py-10'>Loading saved jobs...</p>
                                    ) : savedJobs.length === 0 ? (
                                        <div className='text-center py-14 bg-gray-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-3'>
                                            <Bookmark className='w-11 h-11 text-gray-300 mx-auto' />
                                            <div>
                                                <p className='text-gray-800 dark:text-slate-200 font-bold text-base'>No bookmarked jobs yet</p>
                                                <p className='text-xs text-muted-foreground mt-1 max-w-sm mx-auto'>
                                                    Click the bookmark icon on any job card while browsing to save it here for later.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => navigate("/jobs")}
                                                className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer mt-2"
                                            >
                                                Browse Open Roles
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                            {savedJobs.map((job) => (
                                                <Job key={job._id} job={job} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: RESUME & EXECUTIVE CV STUDIO */}
                            {activeTab === "resume" && (
                                <div className='bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 sm:p-8 space-y-6'>
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-slate-800'>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center'>
                                                <FileText className='w-5 h-5' />
                                            </div>
                                            <div>
                                                <h2 className='font-bold text-lg text-gray-900 dark:text-white'>Curriculum Vitae & Resume Studio</h2>
                                                <p className='text-xs text-muted-foreground'>
                                                    Preview your uploaded PDF resume or generate a clean A4 Executive CV directly from your profile.
                                                </p>
                                            </div>
                                        </div>

                                        <div className='flex flex-wrap items-center gap-2'>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setOpen(true)}
                                                className="rounded-xl text-xs h-9 cursor-pointer"
                                            >
                                                <Pen className='w-3.5 h-3.5 mr-1.5' />
                                                Upload New PDF
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    printCandidateCV({
                                                        fullname: user?.fullname,
                                                        email: user?.email,
                                                        phoneNumber: user?.phoneNumber,
                                                        bio: user?.profile?.bio,
                                                        skills: user?.profile?.skills || []
                                                    })
                                                }
                                                className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs h-9 cursor-pointer"
                                            >
                                                <Printer className='w-3.5 h-3.5 mr-1.5' />
                                                Download Clean A4 CV
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Uploaded File Card */}
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-purple-50/50 dark:bg-slate-800/60 rounded-2xl border border-purple-100 dark:border-slate-700 gap-4'>
                                        <div className='flex items-center gap-3.5 overflow-hidden'>
                                            <div className='w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 font-extrabold text-xs border border-red-200/60'>
                                                PDF
                                            </div>
                                            <div className='overflow-hidden'>
                                                <p className='text-sm font-bold text-gray-900 dark:text-white truncate'>
                                                    {user?.profile?.resumeOriginalName || `${user?.fullname?.replace(/\s+/g, "_") || "Candidate"}_Resume.pdf`}
                                                </p>
                                                <p className='text-xs text-muted-foreground mt-0.5'>
                                                    {isDataUriPdf ? "Verified PDF Document • Ready for instant in-app preview" : "Interactive Executive CV & PDF Preview Ready"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-2 shrink-0'>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => setResumePreviewOpen(true)}
                                                className='h-9 px-4 text-xs font-semibold bg-[#6A38C2] hover:bg-[#5b30a6] text-white rounded-xl cursor-pointer'
                                            >
                                                <Eye className='w-3.5 h-3.5 mr-1.5' />
                                                <span>Full-Screen Preview</span>
                                            </Button>
                                            {isDataUriPdf && (
                                                <a
                                                    href={resumeUrl}
                                                    download={user?.profile?.resumeOriginalName || "Resume.pdf"}
                                                    className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#6A38C2] hover:underline bg-white px-3.5 py-2 rounded-xl border border-purple-200'
                                                >
                                                    <Download className='w-3.5 h-3.5' />
                                                    <span>Download</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Live Executive CV Preview Card */}
                                    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl space-y-6 text-sm shadow-2xs">
                                        <div className="border-b-2 border-[#6A38C2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{user?.fullname}</h3>
                                                <p className="text-xs font-semibold text-[#6A38C2] dark:text-purple-400 uppercase tracking-wider mt-0.5">
                                                    Verified Candidate Profile & Curriculum Vitae
                                                </p>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-slate-400 space-y-1 sm:text-right">
                                                <p><strong>Email:</strong> {user?.email}</p>
                                                <p><strong>Phone:</strong> {user?.phoneNumber}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Professional Summary</h4>
                                            <p className="text-gray-800 dark:text-slate-200 leading-relaxed text-sm">
                                                {user?.profile?.bio || "Results-driven software professional experienced in building modern, scalable web applications and collaborating across agile engineering teams."}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Core Technical Competencies</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(user?.profile?.skills || []).length > 0 ? (
                                                    user.profile.skills.map((skill, idx) => (
                                                        <Badge key={idx} className="bg-purple-50 text-[#6A38C2] border border-purple-200 px-3 py-1 text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">Full Stack Development, Problem Solving, Agile Delivery</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </section>
                    )}

                </main>
            </div>

            <Footer />

            {/* In-App Resume Preview & Executive CV Generator Modal */}
            <Dialog open={resumePreviewOpen} onOpenChange={setResumePreviewOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-lg font-bold text-gray-900">
                            <span>{user?.profile?.resumeOriginalName || `${user?.fullname} — Curriculum Vitae`}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {canEmbedPdfDirectly ? (
                        <div className="space-y-3">
                            <iframe
                                src={resumeUrl}
                                title="Resume PDF Preview"
                                className="w-full h-[520px] rounded-2xl border border-gray-200 bg-gray-50"
                            />
                        </div>
                    ) : (
                        <div className="p-8 bg-white border border-gray-200 rounded-2xl space-y-6 text-sm shadow-2xs">
                            <div className="border-b-2 border-[#6A38C2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-gray-900">{user?.fullname}</h2>
                                    <p className="text-xs font-semibold text-[#6A38C2] uppercase tracking-wider mt-0.5">
                                        Verified Candidate Profile & Curriculum Vitae
                                    </p>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1 sm:text-right">
                                    <p><strong>Email:</strong> {user?.email}</p>
                                    <p><strong>Phone:</strong> {user?.phoneNumber}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Professional Summary</h3>
                                <p className="text-gray-800 leading-relaxed text-sm">
                                    {user?.profile?.bio || "Results-driven software professional experienced in building modern, scalable web applications and collaborating across agile engineering teams."}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Core Technical Competencies</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(user?.profile?.skills || []).length > 0 ? (
                                        user.profile.skills.map((skill, idx) => (
                                            <Badge key={idx} className="bg-purple-50 text-[#6A38C2] border border-purple-200 px-3 py-1 text-xs">
                                                {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400">Full Stack Development, Problem Solving, Agile Delivery</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-gray-600">
                                💡 <strong>Tip:</strong> To replace this generated CV with your own custom PDF file, click <strong>Edit Profile</strong> and upload any PDF under 4.5MB — it will render directly inside this viewer!
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setResumePreviewOpen(false);
                                setOpen(true);
                            }}
                            className="rounded-xl text-xs cursor-pointer"
                        >
                            <Pen className="w-3.5 h-3.5 mr-1.5" /> Upload New PDF Resume
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    printCandidateCV({
                                        fullname: user?.fullname,
                                        email: user?.email,
                                        phoneNumber: user?.phoneNumber,
                                        bio: user?.profile?.bio,
                                        skills: user?.profile?.skills || []
                                    })
                                }
                                className="rounded-xl text-xs cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save Clean A4 PDF
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setResumePreviewOpen(false)}
                                className="rounded-xl bg-[#6A38C2] text-white text-xs cursor-pointer"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UpdateProfileDialog open={open} setOpen={setOpen} />
        </div>
    )
}

export default Profile