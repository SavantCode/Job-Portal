import React from 'react'
import { Badge } from './ui/badge'
import { useNavigate } from 'react-router-dom'
import { Building2, MapPin, Briefcase, ArrowUpRight, IndianRupee, Clock } from 'lucide-react'

const LatestJobCards = ({ job }) => {
    const navigate = useNavigate();

    const skills = Array.isArray(job?.requirements)
        ? job.requirements.flatMap(r => String(r).split(",")).map(s => s.trim()).filter(Boolean)
        : [];

    const expYears = job?.experienceLevel ?? 0;
    const expLabel = expYears === 0 ? "Fresher" : `${expYears}+ Yrs`;

    return (
        <div
            onClick={() => navigate(`/description/${job?._id}`)}
            className='group relative bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700/80 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden'
        >
            <div>
                {/* Header: Company & Location */}
                <div className='flex items-center justify-between gap-3 mb-4'>
                    <div className='flex items-center gap-3 min-w-0'>
                        <div className='w-11 h-11 rounded-xl bg-white dark:bg-slate-800 p-1.5 flex items-center justify-center border border-gray-200/80 dark:border-slate-700 shadow-2xs shrink-0 group-hover:scale-105 transition-transform'>
                            {job?.company?.logo ? (
                                <img src={job.company.logo} alt={job?.company?.name || "logo"} className='w-full h-full object-contain rounded-md' />
                            ) : (
                                <Building2 className='w-5 h-5 text-[#6A38C2] dark:text-purple-400' />
                            )}
                        </div>
                        <div className='min-w-0'>
                            <h3 className='font-semibold text-sm text-gray-900 dark:text-slate-100 group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors truncate'>
                                {job?.company?.name || "Company Name"}
                            </h3>
                            <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-0.5'>
                                <MapPin className='w-3 h-3 text-gray-400 shrink-0' />
                                <span className='truncate'>{job?.location || "India"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Arrow Icon */}
                    <div className='w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 group-hover:bg-[#6A38C2] group-hover:text-white text-gray-400 dark:text-slate-400 flex items-center justify-center shrink-0 transition-all'>
                        <ArrowUpRight className='w-4 h-4' />
                    </div>
                </div>

                {/* Job Title & Description */}
                <div className='space-y-1.5 mb-4'>
                    <h2 className='font-bold text-lg text-gray-900 dark:text-white leading-snug group-hover:text-[#6A38C2] dark:group-hover:text-purple-400 transition-colors line-clamp-1'>
                        {job?.title}
                    </h2>
                    <p className='text-xs sm:text-sm text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                        {job?.description?.replace(/^Role Overview:\s*/i, "") || "Exciting opportunity to grow your career with a forward-thinking team."}
                    </p>
                </div>

                {/* Top Skill Chips */}
                {skills.length > 0 && (
                    <div className='flex items-center flex-wrap gap-1.5 mb-4'>
                        {skills.slice(0, 3).map((s, idx) => (
                            <span
                                key={idx}
                                className='px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-[11px] font-medium'
                            >
                                {s}
                            </span>
                        ))}
                        {skills.length > 3 && (
                            <span className='text-[11px] text-gray-400 dark:text-slate-500 font-medium'>
                                +{skills.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Badges Footer */}
            <div className='flex items-center flex-wrap gap-1.5 pt-4 border-t border-gray-100 dark:border-slate-800'>
                <Badge className='bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/50 dark:border-emerald-800/50 font-semibold px-2.5 py-1 rounded-lg text-xs flex items-center gap-0.5'>
                    <IndianRupee className='w-3 h-3' />
                    {job?.salary} LPA
                </Badge>
                <Badge className='bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 hover:bg-purple-100 border border-purple-200/50 dark:border-purple-800/50 font-medium px-2.5 py-1 rounded-lg text-xs'>
                    {job?.jobType}
                </Badge>
                <Badge className='bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/50 dark:border-blue-800/50 font-medium px-2.5 py-1 rounded-lg text-xs flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {expLabel}
                </Badge>
                <Badge className='bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/50 dark:border-amber-800/50 font-medium px-2.5 py-1 rounded-lg text-xs ml-auto'>
                    <Briefcase className='w-3 h-3 mr-1 inline' /> {job?.position}
                </Badge>
            </div>
        </div>
    )
}

export default LatestJobCards