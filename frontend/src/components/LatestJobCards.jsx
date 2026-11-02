import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Building2, MapPin, Briefcase, ArrowUpRight, IndianRupee, Clock, Sparkles } from 'lucide-react'
import { computeJobMatchForUser } from '@/utils/matchmaking'

const LatestJobCards = ({ job }) => {
    const navigate = useNavigate();
    const { user } = useSelector(store => store.auth);

    const matchInfo = useMemo(() => computeJobMatchForUser(job, user), [job, user]);

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
            className='group relative bg-white dark:bg-slate-900 border border-gray-200/85 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-purple-300 dark:hover:border-purple-700/80 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full overflow-hidden'
        >
            <div className='space-y-4'>
                {/* Header: Company Identity + Match Pill & Arrow */}
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3.5 min-w-0 flex-1'>
                        <div className='w-12 h-12 rounded-xl bg-gray-50/80 dark:bg-slate-800 p-2 flex items-center justify-center border border-gray-200/80 dark:border-slate-700 shadow-2xs shrink-0 group-hover:border-purple-200 transition-colors'>
                            {job?.company?.logo ? (
                                <img src={job.company.logo} alt={job?.company?.name || "logo"} className='w-full h-full object-contain rounded-md' />
                            ) : (
                                <Building2 className='w-6 h-6 text-[#6A38C2] dark:text-purple-400' />
                            )}
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h3 className='font-bold text-sm text-gray-900 dark:text-slate-100 group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors truncate'>
                                {job?.company?.name || "Enterprise Partner"}
                            </h3>
                            <div className='flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-0.5'>
                                <MapPin className='w-3.5 h-3.5 text-gray-400 shrink-0' />
                                <span className='truncate'>{job?.location || "India"}</span>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                        {matchInfo && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                                matchInfo.score >= 75
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : matchInfo.score >= 50
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            }`}>
                                <Sparkles className='w-3 h-3 shrink-0' />
                                <span>{matchInfo.score}% Match</span>
                            </span>
                        )}
                        <div className='w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 group-hover:bg-[#6A38C2] group-hover:text-white text-gray-400 dark:text-slate-400 border border-gray-200/70 dark:border-slate-700 flex items-center justify-center shrink-0 transition-all'>
                            <ArrowUpRight className='w-4 h-4' />
                        </div>
                    </div>
                </div>

                {/* Job Title & Description */}
                <div className='space-y-1.5'>
                    <h2 className='font-extrabold text-[17px] text-gray-900 dark:text-white leading-snug group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors line-clamp-1'>
                        {job?.title}
                    </h2>
                    <p className='text-xs sm:text-[13px] text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                        {job?.description?.replace(/^Role Overview:\s*/i, "") || "Exciting opportunity to grow your career with a forward-thinking team."}
                    </p>
                </div>

                {/* Top Skill Chips */}
                {skills.length > 0 && (
                    <div className='flex items-center flex-wrap gap-1.5'>
                        {skills.slice(0, 4).map((s, idx) => {
                            const isMatchedSkill = matchInfo?.matchedSkills?.includes(s);
                            return (
                                <span
                                    key={idx}
                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                                        isMatchedSkill
                                            ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800"
                                            : "bg-gray-100/80 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200/60 dark:border-slate-700"
                                    }`}
                                >
                                    {isMatchedSkill ? `✓ ${s}` : s}
                                </span>
                            );
                        })}
                        {skills.length > 4 && (
                            <span className='px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 border border-gray-200/60 dark:border-slate-700'>
                                +{skills.length - 4} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Structured Footer Highlights */}
            <div className='flex items-center flex-wrap gap-2 pt-4 mt-5 border-t border-gray-100 dark:border-slate-800'>
                <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'>
                    <IndianRupee className='w-3 h-3' />
                    {salaryText}
                </span>
                <span className='inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50/90 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'>
                    {job?.jobType || "Full-Time"}
                </span>
                <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'>
                    <Clock className='w-3 h-3' />
                    {expLabel}
                </span>
                <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 ml-auto'>
                    <Briefcase className='w-3 h-3' />
                    {positionsLabel}
                </span>
            </div>
        </div>
    )
}

export default LatestJobCards