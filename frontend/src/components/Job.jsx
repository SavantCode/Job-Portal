import React, { useState, useEffect, useMemo } from 'react'
import { Button } from './ui/button'
import { Bookmark, Building2, MapPin, Briefcase, Clock, IndianRupee, ArrowUpRight, Check, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'
import { computeJobMatchForUser } from '@/utils/matchmaking'

const Job = ({ job, viewMode = "grid" }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);

    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.savedJobs) {
            const checkIfSaved = user.savedJobs.some(savedId =>
                (typeof savedId === 'object' ? savedId?._id === job?._id : savedId === job?._id)
            );
            setIsSaved(checkIfSaved);
        }
    }, [user, job?._id]);

    const matchInfo = useMemo(() => computeJobMatchForUser(job, user), [job, user]);

    const daysAgoFunction = (mongodbTime) => {
        if (!mongodbTime) return 0;
        const createdAt = new Date(mongodbTime);
        const currentTime = new Date();
        const timeDifference = currentTime - createdAt;
        return Math.max(0, Math.floor(timeDifference / (1000 * 24 * 60 * 60)));
    };

    const daysAgo = daysAgoFunction(job?.createdAt);
    const postedLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;

    const saveJobHandler = async (e) => {
        if (e) e.stopPropagation();
        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/job/save/${job?._id}`, {}, { withCredentials: true });

            if (res.data.success) {
                setIsSaved(res.data.saved);
                toast.success(res.data.message);

                if (user) {
                    let updatedSavedJobs = [...(user.savedJobs || [])];
                    if (res.data.saved) {
                        updatedSavedJobs.push(job?._id);
                    } else {
                        updatedSavedJobs = updatedSavedJobs.filter(id =>
                            (typeof id === 'object' ? id?._id !== job?._id : id !== job?._id)
                        );
                    }
                    dispatch(setUser({ ...user, savedJobs: updatedSavedJobs }));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Please login to bookmark jobs.");
        } finally {
            setLoading(false);
        }
    };

    const skills = Array.isArray(job?.requirements)
        ? job.requirements.flatMap(r => String(r).split(",")).map(s => s.trim()).filter(Boolean)
        : [];

    const expYears = job?.experienceLevel ?? 0;
    const expLabel = expYears === 0 ? "Fresher" : `${expYears}+ Yrs Exp`;
    const positionsCount = Number(job?.position || 1);
    const positionsLabel = `${positionsCount} ${positionsCount === 1 ? 'Opening' : 'Openings'}`;
    const salaryText = String(job?.salary || "").toUpperCase().includes("LPA")
        ? job.salary
        : `${job?.salary || "Competitive"} LPA`;

    return (
        <div
            onClick={() => navigate(`/description/${job?._id}`)}
            className={`group relative bg-white dark:bg-slate-900 border border-gray-200/85 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-purple-300 dark:hover:border-purple-700/80 transition-all duration-200 cursor-pointer flex ${
                viewMode === "list"
                    ? "flex-col md:flex-row md:items-center justify-between gap-6"
                    : "flex-col justify-between h-full"
            }`}
        >
            <div className={viewMode === "list" ? "flex-1 space-y-4 min-w-0" : "space-y-4"}>

                {/* Row 1: Company Identity (Left) + Match Pill & Bookmark (Right) */}
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3.5 min-w-0 flex-1'>
                        <div className='w-12 h-12 rounded-xl bg-gray-50/80 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-purple-200 transition-colors'>
                            {job?.company?.logo ? (
                                <img
                                    src={job.company.logo}
                                    alt={job?.company?.name || "Company"}
                                    className='w-full h-full object-contain rounded-md'
                                />
                            ) : (
                                <Building2 className='w-6 h-6 text-[#6A38C2] dark:text-purple-400' />
                            )}
                        </div>

                        <div className='min-w-0 flex-1'>
                            <h3 className='font-bold text-sm text-gray-900 dark:text-slate-100 truncate group-hover:text-[#6A38C2] dark:group-hover:text-purple-300 transition-colors'>
                                {job?.company?.name || "Enterprise Partner"}
                            </h3>
                            <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5'>
                                <span className='inline-flex items-center gap-1 truncate'>
                                    <MapPin className='w-3.5 h-3.5 text-gray-400 shrink-0' />
                                    <span className='truncate'>{job?.location || "India"}</span>
                                </span>
                                <span className='text-gray-300 dark:text-slate-600 shrink-0'>•</span>
                                <span className='text-[11px] text-gray-400 dark:text-slate-500 font-medium shrink-0'>
                                    {postedLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Actions: Match % Badge + Save Icon */}
                    <div className='flex items-center gap-2 shrink-0'>
                        {matchInfo && (
                            <span
                                title={matchInfo.fromParsedResume ? "Calculated from your parsed resume & skills" : "Calculated from your profile skills"}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                                    matchInfo.score >= 75
                                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                        : matchInfo.score >= 50
                                        ? "bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                }`}
                            >
                                <Sparkles className='w-3 h-3 shrink-0' />
                                <span>{matchInfo.score}% Match</span>
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={saveJobHandler}
                            disabled={loading}
                            aria-label="Save Job"
                            className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isSaved
                                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-[#6A38C2] dark:text-purple-300'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 hover:text-[#6A38C2] hover:border-purple-200'
                            }`}
                        >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Row 2: Role Title & Clean 2-Line Description */}
                <div className='space-y-1.5 pt-0.5'>
                    <h2 className='font-extrabold text-[17px] leading-snug text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors line-clamp-1'>
                        {job?.title}
                    </h2>
                    <p className='text-xs sm:text-[13px] text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                        {job?.description?.replace(/^Role Overview:\s*/i, "") || "Join our engineering team to build scalable, high-impact products."}
                    </p>
                </div>

                {/* Row 3: Structured Metadata Strip (High Contrast, No Overlap) */}
                <div className='grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1'>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'>
                        <IndianRupee className='w-3 h-3 shrink-0' />
                        <span className='truncate'>{salaryText}</span>
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50/90 dark:bg-purple-950/50 text-[#6A38C2] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60'>
                        <span className='truncate'>{job?.jobType || "Full-Time"}</span>
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'>
                        <Clock className='w-3 h-3 shrink-0' />
                        <span className='truncate'>{expLabel}</span>
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'>
                        <Briefcase className='w-3 h-3 shrink-0' />
                        <span className='truncate'>{positionsLabel}</span>
                    </span>
                </div>

                {/* Row 4: Tech Stack Chips (Inline +N counter) */}
                {skills.length > 0 && (
                    <div className='flex items-center flex-wrap gap-1.5 pt-0.5'>
                        {skills.slice(0, 4).map((skill, idx) => {
                            const isMatchedSkill = matchInfo?.matchedSkills?.includes(skill);
                            return (
                                <span
                                    key={idx}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                                        isMatchedSkill
                                            ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800"
                                            : "bg-gray-100/80 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200/60 dark:border-slate-700"
                                    }`}
                                >
                                    {isMatchedSkill ? `✓ ${skill}` : skill}
                                </span>
                            );
                        })}
                        {skills.length > 4 && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 border border-gray-200/60 dark:border-slate-700'>
                                +{skills.length - 4} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Card Footer Actions */}
            <div className={`flex items-center gap-3 ${
                viewMode === "list"
                    ? "md:flex-col md:w-44 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-800"
                    : "pt-4 mt-5 border-t border-gray-100 dark:border-slate-800"
            }`}>
                <Button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/description/${job?._id}`);
                    }}
                    variant="outline"
                    className="flex-1 w-full h-10 rounded-xl border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                >
                    <span>View Details</span>
                    <ArrowUpRight className='w-3.5 h-3.5 ml-1 opacity-70' />
                </Button>
                <Button
                    type="button"
                    onClick={saveJobHandler}
                    disabled={loading}
                    className={`flex-1 w-full h-10 rounded-xl font-semibold text-xs shadow-2xs text-white cursor-pointer transition-all ${
                        isSaved
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-[#6A38C2] hover:bg-[#5b30a6]'
                    }`}
                >
                    {isSaved ? (
                        <span className='flex items-center gap-1'>
                            <Check className='w-3.5 h-3.5' /> Saved
                        </span>
                    ) : (
                        "Save Job"
                    )}
                </Button>
            </div>
        </div>
    )
}

export default Job