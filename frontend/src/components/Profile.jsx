import React, { useState, useEffect } from 'react'
import Navbar from './shared/Navbar'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import {
    Mail, Phone, Pen, FileText, Briefcase,
    Award, CheckCircle2, Bookmark, Building2, Plus, Eye, Download, Printer
} from 'lucide-react'
import { Badge } from './ui/badge'
import AppliedJobTable from './AppliedJobTable'
import UpdateProfileDialog from './UpdateProfileDialog'
import Job from './Job'
import { useSelector } from 'react-redux'
import useGetAppliedJobs from '@/hooks/useGetAppliedJobs'
import useGetAllAdminJobs from '@/hooks/useGetAllAdminJobs'
import useGetAllCompanies from '@/hooks/useGetAllCompanies'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { useNavigate } from 'react-router-dom'
import { printCandidateCV } from '@/utils/printDocument'

const isRestrictedCloudinaryPdf = (url = "") => {
    return typeof url === "string" && url.includes("res.cloudinary.com") && url.includes("/image/upload/") && url.endsWith(".pdf");
};

const Profile = () => {
    useGetAppliedJobs();
    useGetAllAdminJobs();
    useGetAllCompanies();

    const [open, setOpen] = useState(false);
    const [resumePreviewOpen, setResumePreviewOpen] = useState(false);

    const { user } = useSelector(store => store.auth);
    const { allAdminJobs = [] } = useSelector(store => store.job);
    const { companies = [] } = useSelector(store => store.company);
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

    // Fetch saved jobs once per user login (no UI flicker when toggling bookmark)
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

    // Keep savedJobs list in sync when user unsaves a job from inside Profile without flashing loading state
    useEffect(() => {
        if (!user?.savedJobs) return;
        const savedIds = new Set(user.savedJobs.map(item => (typeof item === 'object' ? item?._id : item)));
        setSavedJobs(prev => prev.filter(job => savedIds.has(job._id)));
    }, [user?.savedJobs]);

    const profilePhoto = user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg";
    const resumeUrl = user?.profile?.resume || "";
    const isDataUriPdf = resumeUrl.startsWith("data:application/pdf");
    const canEmbedPdfDirectly = isDataUriPdf || (resumeUrl && !isRestrictedCloudinaryPdf(resumeUrl));

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />

            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-6'>

                {/* Main Profile Header Card */}
                <div className='bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden transition-all'>

                    {/* Decorative Header Banner */}
                    <div className='h-36 bg-gradient-to-r from-purple-600 via-[#6A38C2] to-indigo-700 relative px-6 pt-6'>
                        <div className='absolute right-6 top-6'>
                            <Button
                                onClick={() => setOpen(true)}
                                variant="secondary"
                                className="rounded-full bg-white/90 hover:bg-white text-gray-800 font-medium shadow-md gap-2 px-4 backdrop-blur-xs transition-all cursor-pointer"
                            >
                                <Pen className='w-4 h-4 text-[#6A38C2]' />
                                <span>Edit Profile</span>
                            </Button>
                        </div>
                    </div>

                    {/* Profile Information Body */}
                    <div className='px-6 sm:px-8 pb-8 relative'>

                        {/* Avatar positioned overlapping the banner */}
                        <div className='flex flex-col sm:flex-row sm:items-end justify-between -mt-16 mb-6 gap-4'>
                            <div className='flex items-end gap-5'>
                                <Avatar className="h-28 w-28 ring-4 ring-white shadow-xl bg-white shrink-0">
                                    <AvatarImage src={profilePhoto} alt="profile" className="object-cover" />
                                    <AvatarFallback className="bg-purple-100 text-[#6A38C2] text-2xl font-bold">
                                        {user?.fullname?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className='mb-1'>
                                    <div className='flex items-center gap-2'>
                                        <h1 className='text-2xl font-bold text-gray-900 leading-tight'>{user?.fullname || "User"}</h1>
                                        <CheckCircle2 className='w-5 h-5 text-blue-500 fill-blue-50' />
                                    </div>
                                    <p className='text-sm font-medium text-[#6A38C2] capitalize'>
                                        {isRecruiter ? "Enterprise Recruiter / Talent Acquisition" : (user?.role || "Job Seeker")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bio Section */}
                        <p className='text-gray-600 text-sm leading-relaxed max-w-2xl mb-6'>
                            {user?.profile?.bio || (isRecruiter
                                ? "No recruiter headline added yet. Click 'Edit Profile' to add your title, hiring specialization, and contact info."
                                : "No bio added yet. Click 'Edit Profile' to introduce yourself to potential recruiters.")}
                        </p>

                        {/* Contact Information Badges */}
                        <div className='flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600'>
                            <div className='flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100'>
                                <Mail className='w-4 h-4 text-[#6A38C2]' />
                                <span className='font-medium text-gray-700'>{user?.email || "Not provided"}</span>
                            </div>
                            <div className='flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100'>
                                <Phone className='w-4 h-4 text-[#6A38C2]' />
                                <span className='font-medium text-gray-700'>{user?.phoneNumber || "Not provided"}</span>
                            </div>
                        </div>

                        {/* Skills / Hiring Focus Section */}
                        <div className='mt-8 pt-6 border-t border-gray-100'>
                            <div className='flex items-center gap-2 mb-3'>
                                <Award className='w-4 h-4 text-[#6A38C2]' />
                                <h2 className='font-semibold text-gray-900'>
                                    {isRecruiter ? "Hiring Domains & Focus Areas" : "Skills & Expertise"}
                                </h2>
                            </div>
                            <div className='flex items-center flex-wrap gap-2'>
                                {
                                    user?.profile?.skills && user?.profile?.skills.length > 0 ? (
                                        user.profile.skills.map((item, index) => (
                                            <Badge
                                                key={index}
                                                className="bg-purple-50 text-[#6A38C2] hover:bg-purple-100 border border-purple-100 px-3 py-1.5 rounded-lg text-xs font-medium"
                                            >
                                                {item}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-sm text-muted-foreground italic'>
                                            {isRecruiter ? "No hiring focus tags added yet." : "No skills listed yet."}
                                        </span>
                                    )
                                }
                            </div>
                        </div>

                        {/* Resume Section (For Students) */}
                        {!isRecruiter && (
                            <div className='mt-8 pt-6 border-t border-gray-100'>
                                <div className='flex items-center gap-2 mb-3'>
                                    <FileText className='w-4 h-4 text-[#6A38C2]' />
                                    <h2 className='font-semibold text-gray-900'>Curriculum Vitae (Resume)</h2>
                                </div>
                                <div className='flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/80 rounded-2xl border border-gray-200/60 max-w-xl gap-3 group hover:border-purple-300 transition-all'>
                                    <div className='flex items-center gap-3 overflow-hidden'>
                                        <div className='w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 font-bold text-xs'>
                                            PDF
                                        </div>
                                        <div className='overflow-hidden'>
                                            <p className='text-sm font-semibold text-gray-900 truncate'>
                                                {user?.profile?.resumeOriginalName || `${user?.fullname?.replace(/\s+/g, "_") || "Candidate"}_Resume.pdf`}
                                            </p>
                                            <span className='text-xs text-muted-foreground'>
                                                {isDataUriPdf ? "Verified PDF Uploaded • Ready for Preview" : "Interactive CV & PDF Preview Ready"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2 shrink-0'>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => setResumePreviewOpen(true)}
                                            className='h-8 text-xs font-semibold bg-[#6A38C2] hover:bg-[#5b30a6] text-white rounded-xl cursor-pointer'
                                        >
                                            <Eye className='w-3.5 h-3.5 mr-1.5' />
                                            <span>Preview Resume</span>
                                        </Button>
                                        {isDataUriPdf && (
                                            <a
                                                href={resumeUrl}
                                                download={user?.profile?.resumeOriginalName || "Resume.pdf"}
                                                className='flex items-center gap-1 text-xs font-semibold text-[#6A38C2] hover:underline bg-white px-3 py-1.5 rounded-xl border border-purple-200'
                                            >
                                                <Download className='w-3.5 h-3.5' />
                                                <span>Download</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Recruiter Workspace Overview (If Recruiter) */}
                {isRecruiter ? (
                    <div className='bg-white border border-gray-100 rounded-3xl shadow-xs p-6 sm:p-8 space-y-6'>
                        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100'>
                            <div className='flex items-center gap-2.5'>
                                <div className='w-10 h-10 rounded-xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                                    <Building2 className='w-5 h-5' />
                                </div>
                                <div>
                                    <h2 className='font-bold text-lg text-gray-900'>Recruiter Workspace Overview</h2>
                                    <p className='text-xs text-muted-foreground'>Manage your registered organizations and active job pipelines.</p>
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

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div className='p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between'>
                                <div>
                                    <p className='text-xs font-semibold text-gray-500 uppercase'>Registered Companies</p>
                                    <h3 className='text-3xl font-extrabold text-gray-900 mt-1'>{companies.length}</h3>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => navigate("/admin/companies")} className="text-[#6A38C2] text-xs font-semibold">
                                    View All →
                                </Button>
                            </div>

                            <div className='p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between'>
                                <div>
                                    <p className='text-xs font-semibold text-gray-500 uppercase'>Active Job Postings</p>
                                    <h3 className='text-3xl font-extrabold text-gray-900 mt-1'>{allAdminJobs.length}</h3>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => navigate("/admin/jobs")} className="text-blue-600 text-xs font-semibold">
                                    Hiring Analytics →
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Saved Jobs Section Container */}
                        <div className='bg-white border border-gray-100 rounded-3xl shadow-xs p-6 sm:p-8'>
                            <div className='flex items-center gap-2 mb-6 pb-4 border-b border-gray-100'>
                                <div className='w-9 h-9 rounded-xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                                    <Bookmark className='w-5 h-5 fill-[#6A38C2]' />
                                </div>
                                <div>
                                    <h2 className='font-bold text-lg text-gray-900'>Saved Jobs</h2>
                                    <p className='text-xs text-muted-foreground'>Quickly access jobs you have bookmarked for later.</p>
                                </div>
                            </div>

                            {
                                loadingSavedJobs ? (
                                    <p className='text-sm text-muted-foreground text-center py-6'>Loading saved jobs...</p>
                                ) : savedJobs.length === 0 ? (
                                    <div className='text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200'>
                                        <Bookmark className='w-10 h-10 text-gray-300 mx-auto mb-2' />
                                        <p className='text-gray-700 font-medium text-sm'>No saved jobs yet.</p>
                                        <p className='text-xs text-muted-foreground mt-0.5'>Browse jobs and click 'Save For Later' to keep track of them here.</p>
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                        {
                                            savedJobs.map((job) => (
                                                <Job key={job._id} job={job} />
                                            ))
                                        }
                                    </div>
                                )
                            }
                        </div>

                        {/* Applied Jobs Section Container */}
                        <div className='bg-white border border-gray-100 rounded-3xl shadow-xs p-6 sm:p-8'>
                            <div className='flex items-center gap-2 mb-6 pb-4 border-b border-gray-100'>
                                <div className='w-9 h-9 rounded-xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                                    <Briefcase className='w-5 h-5' />
                                </div>
                                <div>
                                    <h2 className='font-bold text-lg text-gray-900'>Applied Job Applications</h2>
                                    <p className='text-xs text-muted-foreground'>Track the live status of your submitted applications, offers, and joining letters.</p>
                                </div>
                            </div>

                            <AppliedJobTable />
                        </div>
                    </>
                )}

            </div>

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