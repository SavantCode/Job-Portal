import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Bookmark, Building2, MapPin, Briefcase, Clock, IndianRupee, ArrowUpRight, Check } from 'lucide-react'
import { Badge } from './ui/badge'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

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

    const daysAgoFunction = (mongodbTime) => {
        if (!mongodbTime) return 0;
        const createdAt = new Date(mongodbTime);
        const currentTime = new Date();
        const timeDifference = currentTime - createdAt;
        return Math.max(0, Math.floor(timeDifference / (1000 * 24 * 60 * 60)));
    };

    const daysAgo = daysAgoFunction(job?.createdAt);
    const postedLabel = daysAgo === 0 ? "Posted Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;

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
    const expLabel = expYears === 0 ? "Fresher" : `${expYears}+ Yrs`;
    const positionsCount = Number(job?.position || 1);
    const positionsLabel = `${positionsCount} ${positionsCount === 1 ? 'Position' : 'Positions'}`;

    return (
        <div
            onClick={() => navigate(`/description/${job?._id}`)}
            className={`group relative bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700/80 transition-all duration-200 cursor-pointer flex ${
                viewMode === "list" ? "flex-col sm:flex-row sm:items-center justify-between gap-5" : "flex-col justify-between h-full"
            }`}
        >
            <div className={viewMode === "list" ? "flex-1 space-y-3" : "space-y-4"}>
                {/* Header: Company Logo, Name, Location & Bookmark */}
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3.5 min-w-0'>
                        <div className='w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-purple-200 transition-colors'>
                            {job?.company?.logo ? (
                                <img
                                    src={job.company.logo}
                                    alt={job?.company?.name || "Company"}
                                    className='w-full h-full object-contain rounded-lg'
                                />
                            ) : (
                                <Building2 className='w-6 h-6 text-[#6A38C2] dark:text-purple-400' />
                            )}
                        </div>
                        <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                                <h3 className='font-semibold text-sm text-gray-700 dark:text-slate-300 truncate'>
                                    {job?.company?.name || "Enterprise Partner"}
                                </h3>
                                <span className='text-[11px] text-gray-400 dark:text-slate-500 font-medium shrink-0'>
                                    • {postedLabel}
                                </span>
                            </div>
                            <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-0.5'>
                                <MapPin className='w-3.5 h-3.5 text-gray-400 shrink-0' />
                                <span className='truncate'>{job?.location || "India"}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={saveJobHandler}
                        disabled={loading}
                        aria-label="Save Job"
                        className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            isSaved
                                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-[#6A38C2] dark:text-purple-300'
                                : 'bg-gray-50/70 dark:bg-slate-800/70 border-gray-200/70 dark:border-slate-700 text-gray-400 hover:text-[#6A38C2] hover:border-purple-200'
                        }`}
                    >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                </div>

                {/* Job Role Title & Clean Summary */}
                <div className='space-y-1.5'>
                    <h2 className='font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors line-clamp-1'>
                        {job?.title}
                    </h2>
                    <p className='text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                        {job?.description?.replace(/^Role Overview:\s*/i, "") || "Join our engineering team to build scalable, high-impact products."}
                    </p>
                </div>

                {/* Key Metadata Pills (Single Clean Row) */}
                <div className='flex items-center flex-wrap gap-1.5 pt-1'>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'>
                        <IndianRupee className='w-3 h-3' />
                        {job?.salary} LPA
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/50 text-[#6A38C2] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'>
                        {job?.jobType || "Full-Time"}
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'>
                        <Clock className='w-3 h-3' />
                        {expLabel}
                    </span>
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'>
                        <Briefcase className='w-3 h-3' />
                        {positionsLabel}
                    </span>
                </div>

                {/* Tech Stack Chips */}
                {skills.length > 0 && (
                    <div className='flex items-center flex-wrap gap-1.5 pt-0.5'>
                        {skills.slice(0, 3).map((skill, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className='bg-gray-100/90 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 border-none font-medium px-2 py-0.5 rounded-md text-[11px]'
                            >
                                {skill}
                            </Badge>
                        ))}
                        {skills.length > 3 && (
                            <span className='text-[11px] font-medium text-gray-400 dark:text-slate-500 pl-0.5'>
                                +{skills.length - 3} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Card Footer Actions */}
            <div className={`flex items-center gap-2.5 ${
                viewMode === "list"
                    ? "sm:flex-col sm:w-44 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800"
                    : "pt-4 mt-5 border-t border-gray-100 dark:border-slate-800"
            }`}>
                <Button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/description/${job?._id}`);
                    }}
                    variant="outline"
                    className="flex-1 w-full h-9 rounded-xl border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                >
                    <span>View Details</span>
                    <ArrowUpRight className='w-3.5 h-3.5 ml-1 opacity-70' />
                </Button>
                <Button
                    type="button"
                    onClick={saveJobHandler}
                    disabled={loading}
                    className={`flex-1 w-full h-9 rounded-xl font-semibold text-xs shadow-2xs text-white cursor-pointer transition-all ${
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