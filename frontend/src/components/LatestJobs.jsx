import React, { useMemo, useState } from 'react'
import LatestJobCards from './LatestJobCards';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { resetJobFilters } from '@/redux/jobSlice';
import { getJobSalaryLPA } from './FilterCard';
import {
    Briefcase, ArrowRight, Sparkles, Target, Mic, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';

const QUICK_TABS = [
    { id: "all", label: "All Recent" },
    { id: "remote", label: "Remote Friendly" },
    { id: "high_pay", label: "High Package (15+ LPA)" },
    { id: "fresher", label: "Fresher & Junior" }
];

const LatestJobs = () => {
    const { allJobs = [] } = useSelector(store => store.job);
    const [activeTab, setActiveTab] = useState("all");
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const displayedJobs = useMemo(() => {
        const filtered = allJobs.filter(job => {
            if (activeTab === "remote") {
                return (job?.location || "").toLowerCase().includes("remote");
            }
            if (activeTab === "high_pay") {
                return getJobSalaryLPA(job?.salary).max >= 15;
            }
            if (activeTab === "fresher") {
                return Number(job?.experienceLevel ?? 0) <= 1;
            }
            return true;
        });
        return filtered.slice(0, 6);
    }, [allJobs, activeTab]);

    const handleViewAllJobs = () => {
        dispatch(resetJobFilters());
        navigate("/jobs");
    };

    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 space-y-20'>
            {/* 1. Latest & Top Job Openings Section */}
            <section>
                <div className='flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4'>
                    <div>
                        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-900/60 text-[#6A38C2] dark:text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3'>
                            <Briefcase className='w-3.5 h-3.5' />
                            <span>Curated Opportunities</span>
                        </div>
                        <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white'>
                            <span className='text-[#6A38C2] dark:text-purple-400'>Latest & Top</span> Job Openings
                        </h2>
                    </div>

                    {/* Quick Filter Tabs + View All Button */}
                    <div className='flex flex-wrap items-center gap-2'>
                        <div className='flex flex-wrap items-center gap-1.5 bg-gray-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-slate-700'>
                            {QUICK_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        activeTab === tab.id
                                            ? 'bg-white dark:bg-slate-900 text-[#6A38C2] dark:text-purple-300 shadow-2xs'
                                            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={handleViewAllJobs}
                            variant="outline"
                            className="rounded-xl h-9 px-4 text-xs font-semibold border-gray-200 dark:border-slate-700 hover:border-[#6A38C2] dark:hover:border-purple-500 cursor-pointer"
                        >
                            <span>View All ({allJobs.length})</span>
                            <ArrowRight className='w-3.5 h-3.5 ml-1.5' />
                        </Button>
                    </div>
                </div>

                {/* Jobs Grid */}
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {displayedJobs.length <= 0 ? (
                        <div className='col-span-full flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 text-center'>
                            <Briefcase className='w-12 h-12 text-gray-300 dark:text-slate-600 mb-3' />
                            <p className='text-gray-800 dark:text-slate-200 font-semibold text-base'>No openings in this quick tab</p>
                            <p className='text-xs text-gray-500 dark:text-slate-400 mt-1'>Switch back to "All Recent" or explore all jobs.</p>
                            <Button
                                onClick={() => setActiveTab("all")}
                                variant="outline"
                                size="sm"
                                className="mt-4 rounded-xl text-xs cursor-pointer"
                            >
                                Show All Recent Jobs
                            </Button>
                        </div>
                    ) : (
                        displayedJobs.map((job) => <LatestJobCards key={job._id} job={job} />)
                    )}
                </div>
            </section>

            {/* 2. Built-In AI Career Copilot Bento Showcase */}
            <section className='relative rounded-3xl bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/70 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/30 border border-purple-100 dark:border-slate-800 p-6 sm:p-10 shadow-xs overflow-hidden'>
                <div className='flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4'>
                    <div>
                        <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6A38C2] text-white text-[11px] font-bold uppercase tracking-wider mb-3'>
                            <Sparkles className='w-3.5 h-3.5 text-amber-300' />
                            <span>AI Career Copilot Suite</span>
                        </div>
                        <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight'>
                            Stand Out 10x Faster with Built-In AI Tools
                        </h2>
                        <p className='text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 max-w-2xl'>
                            Every job listing on JobPortal includes live ATS skill analysis, an interactive voice/text mock interview simulator, and tailored cover letter generation.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate("/ai-cover-letter")}
                        className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold h-10 px-5 cursor-pointer shrink-0 self-start md:self-end"
                    >
                        <span>Launch AI Pitch Studio</span>
                        <ArrowRight className='w-4 h-4 ml-1.5' />
                    </Button>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                    {/* Card 1: ATS Match Score */}
                    <div
                        onClick={handleViewAllJobs}
                        className='group bg-white dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md'
                    >
                        <div className='space-y-3'>
                            <div className='w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
                                <Target className='w-5 h-5' />
                            </div>
                            <h3 className='font-bold text-base text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-300 transition-colors'>
                                1. Live ATS Resume & Skill Matcher
                            </h3>
                            <p className='text-xs text-gray-600 dark:text-slate-400 leading-relaxed'>
                                Open any job description to see your instant 0–100% ATS compatibility score, matched skills, missing keywords, and 1-click XYZ resume bullets.
                            </p>
                        </div>
                        <div className='flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2'>
                            <CheckCircle2 className='w-3.5 h-3.5' />
                            <span>Active on every job page →</span>
                        </div>
                    </div>

                    {/* Card 2: Voice + Text AI Mock Interview */}
                    <div
                        onClick={handleViewAllJobs}
                        className='group bg-white dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md'
                    >
                        <div className='space-y-3'>
                            <div className='w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-[#6A38C2] dark:text-purple-400 flex items-center justify-center'>
                                <Mic className='w-5 h-5' />
                            </div>
                            <h3 className='font-bold text-base text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-300 transition-colors'>
                                2. Voice & Text AI Mock Interviewer
                            </h3>
                            <p className='text-xs text-gray-600 dark:text-slate-400 leading-relaxed'>
                                Practice 5 role-specific technical & STAR behavioral rounds using your microphone or keyboard, graded on a 10-point rubric with A4 PDF reports.
                            </p>
                        </div>
                        <div className='flex items-center gap-1.5 text-xs font-bold text-[#6A38C2] dark:text-purple-400 pt-2'>
                            <Sparkles className='w-3.5 h-3.5' />
                            <span>Practice on any job role →</span>
                        </div>
                    </div>

                    {/* Card 3: AI Cover Pitch Generator */}
                    <div
                        onClick={() => navigate("/ai-cover-letter")}
                        className='group bg-white dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md'
                    >
                        <div className='space-y-3'>
                            <div className='w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
                                <FileText className='w-5 h-5' />
                            </div>
                            <h3 className='font-bold text-base text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-300 transition-colors'>
                                3. 1-Click AI Cover Pitch Studio
                            </h3>
                            <p className='text-xs text-gray-600 dark:text-slate-400 leading-relaxed'>
                                Generate a personalized, 100-word executive cover note tailored to your skills and the target company's job description in seconds.
                            </p>
                        </div>
                        <div className='flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 pt-2'>
                            <span>Open AI Cover Letter Tool →</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default LatestJobs