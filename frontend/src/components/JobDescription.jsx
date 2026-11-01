import React, { useEffect, useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AI_API_END_POINT, APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';
import { setAllAppliedJobs, setSingleJob } from '@/redux/jobSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
    Briefcase, MapPin, IndianRupee, Clock, Users, Building2,
    CheckCircle2, Calendar, Sparkles, Loader2, Target, AlertCircle,
    RotateCcw, Copy, Check, FileText, Award
} from 'lucide-react';
import Navbar from './shared/Navbar';
import MockInterviewSimulator from './MockInterviewSimulator';

const JobDescription = () => {
    const { singleJob, allAppliedJobs = [] } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    const params = useParams();
    const jobId = params.id;
    const dispatch = useDispatch();

    const isMatchingJob = singleJob?._id === jobId;
    const userApplication = isMatchingJob
        ? singleJob?.applications?.find(app => (app.applicant?._id || app.applicant) === user?._id)
        : null;

    const [isApplied, setIsApplied] = useState(Boolean(userApplication));
    const [loading, setLoading] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    // Apply Modal with Cover Note & One-Click AI Cover Letter
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [coverNote, setCoverNote] = useState("");
    const [generatingNote, setGeneratingNote] = useState(false);
    const [copiedNote, setCopiedNote] = useState(false);

    // ATS Match Score + AI Resume Bullet Improver State
    const [atsData, setAtsData] = useState(null);
    const [loadingAts, setLoadingAts] = useState(false);
    const [resumeBullets, setResumeBullets] = useState([]);
    const [loadingBullets, setLoadingBullets] = useState(false);
    const [copiedBulletIdx, setCopiedBulletIdx] = useState(-1);

    // AI Mock Interview Simulator State
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [loadingInterview, setLoadingInterview] = useState(false);

    useEffect(() => {
        // Reset per-job transient state when navigating between job IDs
        setAtsData(null);
        setResumeBullets([]);
        setInterviewQuestions([]);
        setCoverNote("");

        const fetchSingleJob = async () => {
            try {
                const res = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`, { withCredentials: true });
                if (res.data.success) {
                    dispatch(setSingleJob(res.data.job));
                    const applied = res.data.job.applications?.some(
                        app => (app.applicant?._id || app.applicant) === user?._id
                    );
                    setIsApplied(applied);
                }
            } catch (error) {
                console.log(error);
            }
        };

        const fetchAtsScore = async () => {
            if (!user) return;
            try {
                setLoadingAts(true);
                const res = await axios.get(`${AI_API_END_POINT}/ats-match/${jobId}`, { withCredentials: true });
                if (res.data.success) {
                    setAtsData(res.data);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoadingAts(false);
            }
        };

        fetchSingleJob();
        fetchAtsScore();
    }, [jobId, dispatch, user?._id]);

    const requireAuth = () => {
        if (!user) {
            toast.error("Please login first to continue.");
            navigate("/login");
            return false;
        }
        return true;
    };

    const generateJobCoverLetter = async () => {
        if (!requireAuth()) return;
        try {
            setGeneratingNote(true);
            const res = await axios.post(`${AI_API_END_POINT}/generate-cover-letter/${jobId}`, {}, { withCredentials: true });
            if (res.data.success && res.data.coverLetter) {
                setCoverNote(res.data.coverLetter);
                toast.success("AI Cover Letter tailored for this job!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate cover letter.");
        } finally {
            setGeneratingNote(false);
        }
    };

    const handleGenerateResumeBullets = async () => {
        if (!requireAuth()) return;
        try {
            setLoadingBullets(true);
            const res = await axios.post(
                `${AI_API_END_POINT}/resume-bullets/${jobId}`,
                {
                    missingSkills: atsData?.missingSkills || [],
                    matchedSkills: atsData?.matchedSkills || []
                },
                { withCredentials: true }
            );
            if (res.data.success) {
                setResumeBullets(res.data.bullets || []);
                toast.success("✨ Generated 3 ATS-optimized resume bullet points!");
            }
        } catch (error) {
            toast.error("Failed to generate resume bullet points.");
        } finally {
            setLoadingBullets(false);
        }
    };

    const submitApplicationHandler = async () => {
        if (!requireAuth()) return;
        try {
            setLoading(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/apply/${jobId}`,
                { coverNote },
                { withCredentials: true }
            );

            if (res.data.success) {
                setIsApplied(true);
                setApplyModalOpen(false);
                const newApp = res.data.application || { applicant: user?._id, status: 'pending', hiringStage: 'applied', coverNote };
                const updatedSingleJob = {
                    ...singleJob,
                    applications: [...(singleJob?.applications || []), newApp]
                };
                dispatch(setSingleJob(updatedSingleJob));
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to apply for job.");
        } finally {
            setLoading(false);
        }
    };

    const withdrawJobHandler = async () => {
        if (!requireAuth()) return;
        try {
            setWithdrawing(true);
            const targetId = userApplication?._id || jobId;
            const res = await axios.delete(`${APPLICATION_API_END_POINT}/withdraw/${targetId}`, { withCredentials: true });
            if (res.data.success) {
                setIsApplied(false);
                const updatedSingleJob = {
                    ...singleJob,
                    applications: (singleJob?.applications || []).filter(
                        app => (app.applicant?._id || app.applicant) !== user?._id
                    )
                };
                dispatch(setSingleJob(updatedSingleJob));
                if (allAppliedJobs.length > 0) {
                    dispatch(setAllAppliedJobs(allAppliedJobs.filter(a => a._id !== userApplication?._id && (a.job?._id || a.job) !== jobId)));
                }
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not withdraw application.");
        } finally {
            setWithdrawing(false);
        }
    };

    const handleGenerateInterviewPrep = async () => {
        if (!requireAuth()) return;
        try {
            setLoadingInterview(true);
            const res = await axios.post(`${AI_API_END_POINT}/interview-prep/${jobId}`, {}, { withCredentials: true });
            if (res.data.success) {
                setInterviewQuestions(res.data.questions || []);
                toast.success("Loaded 5 interactive mock interview questions!");
            }
        } catch (error) {
            toast.error("Failed to generate interview questions.");
        } finally {
            setLoadingInterview(false);
        }
    };

    const copyCoverNote = () => {
        if (!coverNote) return;
        navigator.clipboard.writeText(coverNote);
        setCopiedNote(true);
        toast.success("Copied cover letter!");
        setTimeout(() => setCopiedNote(false), 2000);
    };

    const currentStage = userApplication?.hiringStage || userApplication?.status || 'pending';
    const canWithdraw = isApplied && (!userApplication?.status || userApplication?.status === 'pending') && (!userApplication?.hiringStage || userApplication?.hiringStage === 'applied');

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />

            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-10 space-y-6'>

                {/* Top Job Header Card */}
                <div className='bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs transition-all'>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>

                        {/* Company Logo & Title info */}
                        <div className='flex items-start gap-4'>
                            <div className='w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs'>
                                {singleJob?.company?.logo ? (
                                    <img src={singleJob.company.logo} alt="logo" className='w-full h-full object-cover' />
                                ) : (
                                    <Building2 className='w-8 h-8 text-[#6A38C2]' />
                                )}
                            </div>
                            <div className='space-y-1'>
                                <span className='text-xs font-semibold text-[#6A38C2] uppercase tracking-wider'>
                                    {singleJob?.company?.name || "Company Details"}
                                </span>
                                <h1 className='text-2xl font-bold text-gray-900 leading-tight'>{singleJob?.title}</h1>
                                <div className='flex items-center gap-2 text-xs text-muted-foreground pt-1'>
                                    <MapPin className='w-3.5 h-3.5 text-gray-400' />
                                    <span>{singleJob?.location || "India"}</span>
                                    <span>•</span>
                                    <Calendar className='w-3.5 h-3.5 text-gray-400' />
                                    <span>Posted {singleJob?.createdAt ? singleJob.createdAt.split("T")[0] : 'Recently'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Apply / Withdraw / Offer Response Action Buttons */}
                        <div className='flex flex-wrap items-center gap-2.5'>
                            {!isApplied ? (
                                <Button
                                    onClick={() => {
                                        if (requireAuth()) setApplyModalOpen(true);
                                    }}
                                    disabled={loading}
                                    className='h-11 px-7 rounded-full font-semibold bg-[#7209b7] hover:bg-[#5f32ad] text-white shadow-md shadow-purple-500/20 cursor-pointer'
                                >
                                    Apply Now
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        disabled
                                        className='h-10 px-5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    >
                                        <CheckCircle2 className='w-4 h-4 text-emerald-600 mr-1.5' />
                                        Applied ({String(currentStage).replace(/_/g, " ").toUpperCase()})
                                    </Button>
                                    {userApplication?.hiringStage === 'offer_sent' && (
                                        <Button
                                            onClick={() => navigate("/profile")}
                                            className="h-10 px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                                        >
                                            <Award className="w-3.5 h-3.5 mr-1.5" /> Respond to Offer
                                        </Button>
                                    )}
                                    {canWithdraw && (
                                        <Button
                                            onClick={withdrawJobHandler}
                                            disabled={withdrawing}
                                            variant="outline"
                                            className="h-10 px-4 rounded-full border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                                        >
                                            {withdrawing ? <Loader2 className='w-3.5 h-3.5 animate-spin mr-1' /> : <RotateCcw className='w-3.5 h-3.5 mr-1' />}
                                            Withdraw
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Quick Overview Badges */}
                    <div className='flex items-center flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100'>
                        <Badge className='bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.position} Open Positions
                        </Badge>
                        <Badge className='bg-orange-50 text-[#F83002] hover:bg-orange-100 border-none font-medium px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.jobType}
                        </Badge>
                        <Badge className='bg-purple-50 text-[#7209b7] hover:bg-purple-100 border-none font-semibold px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.salary} LPA
                        </Badge>
                    </div>
                </div>

                {/* AI Resume Matcher / ATS Score Checker + AI Resume Bullet Improver Card */}
                {user && user?.role !== 'recruiter' && (
                    <div className='bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/60 border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5'>
                        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                            <div className='flex items-center gap-3.5'>
                                <div className='w-12 h-12 rounded-2xl bg-[#6A38C2] text-white flex items-center justify-center shrink-0 shadow-sm'>
                                    <Target className='w-6 h-6' />
                                </div>
                                <div>
                                    <div className='flex items-center gap-2'>
                                        <h2 className='text-base font-bold text-gray-900'>AI Resume & Skill Match (ATS Score)</h2>
                                        <Badge className='bg-purple-100 text-[#6A38C2] border-none text-[10px] font-bold'>LIVE</Badge>
                                    </div>
                                    <p className='text-xs text-gray-600 mt-0.5'>
                                        {loadingAts ? "Analyzing your profile against job requirements..." : atsData?.summary}
                                    </p>
                                </div>
                            </div>

                            {/* Score Pill */}
                            <div className='flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-purple-100 shadow-2xs shrink-0'>
                                <div className='text-right'>
                                    <span className='text-[10px] uppercase tracking-wider font-bold text-gray-400 block'>Match Score</span>
                                    <span className={`text-2xl font-extrabold ${
                                        (atsData?.score || 0) >= 75 ? 'text-emerald-600' : (atsData?.score || 0) >= 50 ? 'text-amber-600' : 'text-rose-600'
                                    }`}>
                                        {atsData?.score ?? 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className='w-full bg-gray-200/70 h-2.5 rounded-full overflow-hidden'>
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                    (atsData?.score || 0) >= 75 ? 'bg-emerald-500' : (atsData?.score || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${atsData?.score || 0}%` }}
                            />
                        </div>

                        {/* Matched vs Missing Skills */}
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1'>
                            <div className='bg-white/90 p-3.5 rounded-2xl border border-emerald-100'>
                                <p className='text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mb-2'>
                                    <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                                    Matched Skills ({atsData?.matchedSkills?.length || 0})
                                </p>
                                <div className='flex flex-wrap gap-1.5'>
                                    {atsData?.matchedSkills?.length > 0 ? (
                                        atsData.matchedSkills.map((skill, idx) => (
                                            <Badge key={idx} className='bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]'>
                                                {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-xs text-gray-400 italic'>No direct skill overlap detected yet.</span>
                                    )}
                                </div>
                            </div>

                            <div className='bg-white/90 p-3.5 rounded-2xl border border-amber-100'>
                                <div className='flex items-center justify-between mb-2'>
                                    <p className='text-xs font-semibold text-amber-800 flex items-center gap-1.5'>
                                        <AlertCircle className='w-3.5 h-3.5 text-amber-600' />
                                        Missing / Recommended Skills ({atsData?.missingSkills?.length || 0})
                                    </p>
                                </div>
                                <div className='flex flex-wrap gap-1.5'>
                                    {atsData?.missingSkills?.length > 0 ? (
                                        atsData.missingSkills.map((skill, idx) => (
                                            <Badge key={idx} className='bg-amber-50 text-amber-800 border border-amber-200 text-[11px]'>
                                                + {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-xs text-emerald-600 font-medium'>You cover all listed requirements!</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI Resume Bullet Point Improver */}
                        <div className='pt-2 border-t border-purple-100/80 space-y-3'>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
                                <p className='text-xs text-gray-600 font-medium'>
                                    Want to boost your ATS score for this role? Generate 3 quantifiable resume bullet points tailored to these skills:
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={loadingBullets}
                                    onClick={handleGenerateResumeBullets}
                                    className="h-8 text-xs rounded-xl bg-white border-purple-200 text-[#6A38C2] hover:bg-purple-50 font-semibold shrink-0 cursor-pointer"
                                >
                                    {loadingBullets ? (
                                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Writing Bullets...</>
                                    ) : (
                                        <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate ATS Resume Bullets</>
                                    )}
                                </Button>
                            </div>

                            {resumeBullets.length > 0 && (
                                <div className='space-y-2 bg-white p-4 rounded-2xl border border-purple-100'>
                                    <p className='text-[11px] font-bold uppercase tracking-wider text-[#6A38C2] flex items-center gap-1.5'>
                                        <FileText className="w-3.5 h-3.5" /> Tailored Resume Bullet Points (Click to Copy)
                                    </p>
                                    {resumeBullets.map((b, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                navigator.clipboard.writeText(b);
                                                setCopiedBulletIdx(idx);
                                                toast.success("Copied bullet point to clipboard!");
                                                setTimeout(() => setCopiedBulletIdx(-1), 1800);
                                            }}
                                            className='p-2.5 rounded-xl bg-purple-50/40 hover:bg-purple-50 border border-purple-100/80 text-xs text-gray-800 flex items-start justify-between gap-3 cursor-pointer transition-all'
                                        >
                                            <span className="leading-relaxed">• {b}</span>
                                            {copiedBulletIdx === idx ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Key Metrics / Highlights Grid */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Clock className='w-4 h-4 text-[#6A38C2]' />
                            <span>Experience</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.experienceLevel ?? 0} Years</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <IndianRupee className='w-4 h-4 text-[#6A38C2]' />
                            <span>Salary Package</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.salary} LPA</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Users className='w-4 h-4 text-[#6A38C2]' />
                            <span>Total Applicants</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.applications?.length || 0} Candidates</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Briefcase className='w-4 h-4 text-[#6A38C2]' />
                            <span>Job Role</span>
                        </div>
                        <p className='text-base font-bold text-gray-900 truncate'>{singleJob?.title}</p>
                    </div>
                </div>

                {/* Detailed Description Section */}
                <div className='bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6'>
                    <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
                        <h2 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-[#6A38C2]' />
                            Job Description & Requirements
                        </h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (!requireAuth()) return;
                                setApplyModalOpen(true);
                                if (!coverNote) generateJobCoverLetter();
                            }}
                            className="rounded-xl text-xs border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                        >
                            <Sparkles className='w-3.5 h-3.5 mr-1.5' />
                            One-Click AI Cover Letter
                        </Button>
                    </div>

                    <div className='space-y-4 text-sm text-gray-600 leading-relaxed'>
                        <p className='whitespace-pre-line'>
                            {singleJob?.description || "No specific description provided for this role."}
                        </p>
                    </div>

                    {singleJob?.requirements && singleJob.requirements.length > 0 && (
                        <div className='pt-4 border-t border-gray-100 space-y-3'>
                            <h3 className='font-semibold text-gray-900 text-sm'>Key Requirements & Skills:</h3>
                            <div className='flex flex-wrap gap-2'>
                                {singleJob.requirements.map((req, index) => (
                                    <Badge key={index} variant="secondary" className="px-3 py-1 text-xs rounded-lg">
                                        {req}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Interactive AI Mock Interview Simulator (Voice + Text Q&A with Instant Grading) */}
                <MockInterviewSimulator
                    jobId={jobId}
                    jobTitle={singleJob?.title || "Software Engineer"}
                    companyName={singleJob?.company?.name || "Enterprise Corp"}
                    candidateName={user?.fullname || "Candidate"}
                    questions={interviewQuestions}
                    loadingQuestions={loadingInterview}
                    onGenerateQuestions={handleGenerateInterviewPrep}
                    requireAuth={requireAuth}
                />

            </div>

            {/* Apply Modal with One-Click AI Cover Letter */}
            <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Apply for {singleJob?.title} at {singleJob?.company?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Cover Note / Pitch (Optional)</span>
                            <div className="flex items-center gap-2">
                                {coverNote && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={copyCoverNote}
                                        className="h-7 text-xs rounded-lg"
                                    >
                                        {copiedNote ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                                        {copiedNote ? "Copied" : "Copy"}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={generateJobCoverLetter}
                                    disabled={generatingNote}
                                    className="h-7 text-xs rounded-lg bg-purple-100 hover:bg-purple-200 text-[#6A38C2] font-semibold cursor-pointer"
                                >
                                    {generatingNote ? (
                                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Sparkles className="w-3 h-3 mr-1" /> Auto-Write with AI</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <textarea
                            rows="6"
                            value={coverNote}
                            onChange={(e) => setCoverNote(e.target.value)}
                            placeholder="Write a brief note to the hiring manager or click 'Auto-Write with AI' to generate a tailored cover letter..."
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2] text-gray-800 resize-none"
                        />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        {!isApplied && (
                            <Button
                                type="button"
                                onClick={submitApplicationHandler}
                                disabled={loading}
                                className="rounded-xl bg-[#7209b7] hover:bg-[#5f32ad] text-white font-semibold cursor-pointer"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Submitting...</> : "Submit Application"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default JobDescription