import React, { useMemo, useState } from 'react'
import Navbar from './shared/Navbar'
import FilterCard, { matchesSalaryFilter, matchesExperienceFilter, getJobSalaryLPA } from './FilterCard'
import Job from './Job';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Search, X, Briefcase, LayoutGrid, List, ArrowUpDown, Sparkles } from 'lucide-react';
import { resetJobFilters, setJobFilters } from '@/redux/jobSlice';
import useGetAllJobs from '@/hooks/useGetAllJobs';

const Jobs = () => {
    useGetAllJobs();
    const dispatch = useDispatch();
    const { allJobs = [], searchedQuery = "", jobFilters = {} } = useSelector(store => store.job);

    const [sortBy, setSortBy] = useState("newest"); // "newest" | "salary_high" | "positions"
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

    const filterJobs = useMemo(() => {
        const filtered = allJobs.filter((job) => {
            const combinedKeyword = (jobFilters.keyword || searchedQuery || "").trim().toLowerCase();

            // 1. Keyword match (title, description, company name, location, or requirements)
            if (combinedKeyword) {
                const reqText = Array.isArray(job?.requirements) ? job.requirements.join(" ").toLowerCase() : "";
                const matchesKeyword =
                    job?.title?.toLowerCase().includes(combinedKeyword) ||
                    job?.description?.toLowerCase().includes(combinedKeyword) ||
                    job?.company?.name?.toLowerCase().includes(combinedKeyword) ||
                    job?.location?.toLowerCase().includes(combinedKeyword) ||
                    reqText.includes(combinedKeyword);
                if (!matchesKeyword) return false;
            }

            // 2. Dynamic City / Location match (handles Bengaluru/Bangalore synonyms + any city)
            if (jobFilters.location) {
                const loc = jobFilters.location.toLowerCase().trim();
                const jobLoc = (job?.location || "").toLowerCase();
                const isBangaloreMatch =
                    (loc === "bengaluru" || loc === "bangalore") &&
                    (jobLoc.includes("bengaluru") || jobLoc.includes("bangalore"));
                if (!isBangaloreMatch && !jobLoc.includes(loc)) return false;
            }

            // 3. Dynamic Role / Skill match
            if (jobFilters.industry) {
                const ind = jobFilters.industry.toLowerCase().trim();
                const titleAndDesc = `${job?.title || ""} ${job?.description || ""} ${(job?.requirements || []).join(" ")}`.toLowerCase();
                const searchToken = ind.replace(/\s*\/\s*/, "|");
                const regex = new RegExp(searchToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\|/g, '|'), "i");
                if (!regex.test(titleAndDesc) && !titleAndDesc.includes(ind)) return false;
            }

            // 4. Dynamic Job Type match
            if (jobFilters.jobType) {
                const jt = (job?.jobType || "").toLowerCase().trim();
                if (jt !== jobFilters.jobType.toLowerCase().trim()) return false;
            }

            // 5. Experience Level match
            if (jobFilters.experience) {
                if (!matchesExperienceFilter(job?.experienceLevel, jobFilters.experience)) return false;
            }

            // 6. Dynamic Salary Range match
            if (jobFilters.salary) {
                if (!matchesSalaryFilter(job?.salary, jobFilters.salary)) return false;
            }

            return true;
        });

        // Apply Sorting
        return [...filtered].sort((a, b) => {
            if (sortBy === "salary_high") {
                return getJobSalaryLPA(b.salary).max - getJobSalaryLPA(a.salary).max;
            }
            if (sortBy === "positions") {
                return Number(b.position || 0) - Number(a.position || 0);
            }
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [allJobs, searchedQuery, jobFilters, sortBy]);

    const activeFilterEntries = Object.entries(jobFilters).filter(([, val]) => Boolean(val));

    return (
        <div className='min-h-screen bg-gray-50/60 dark:bg-[#0b1120] pb-20 transition-colors'>
            <Navbar />

            {/* Clean Discovery Header Banner */}
            <div className='bg-white dark:bg-slate-900/90 border-b border-gray-200/70 dark:border-slate-800'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
                    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
                        <div>
                            <div className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#6A38C2] dark:text-purple-400 mb-1'>
                                <Sparkles className='w-3.5 h-3.5' />
                                <span>Verified Career Opportunities</span>
                            </div>
                            <h1 className='text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight'>
                                Explore Open Roles
                            </h1>
                        </div>

                        {/* Search Bar + Sort + View Switcher */}
                        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto'>
                            <div className='relative flex-1 sm:w-80'>
                                <Search className='w-4 h-4 text-gray-400 absolute left-3.5 top-3' />
                                <Input
                                    type="text"
                                    placeholder="Search role, skill (React, Python), or company..."
                                    value={jobFilters.keyword || ""}
                                    onChange={(e) => dispatch(setJobFilters({ keyword: e.target.value }))}
                                    className="pl-10 pr-8 h-10 rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/80 text-sm"
                                />
                                {jobFilters.keyword && (
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setJobFilters({ keyword: "" }))}
                                        className="absolute right-2.5 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className='flex items-center gap-2'>
                                {/* Sort Dropdown */}
                                <div className='relative flex items-center'>
                                    <ArrowUpDown className='w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none' />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        aria-label="Sort jobs"
                                        className='h-10 pl-8 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#6A38C2] cursor-pointer'
                                    >
                                        <option value="newest">Sort: Newest First</option>
                                        <option value="salary_high">Sort: Highest Salary</option>
                                        <option value="positions">Sort: Most Openings</option>
                                    </select>
                                </div>

                                {/* Grid / List View Toggle */}
                                <div className='hidden sm:flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/60 dark:border-slate-700'>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("grid")}
                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                            viewMode === "grid"
                                                ? "bg-white dark:bg-slate-700 text-[#6A38C2] dark:text-purple-300 shadow-2xs"
                                                : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
                                        }`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid className='w-4 h-4' />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("list")}
                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                            viewMode === "list"
                                                ? "bg-white dark:bg-slate-700 text-[#6A38C2] dark:text-purple-300 shadow-2xs"
                                                : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
                                        }`}
                                        title="Compact List View"
                                    >
                                        <List className='w-4 h-4' />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Chips Bar */}
                    {activeFilterEntries.length > 0 && (
                        <div className='flex items-center flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800'>
                            <span className='text-xs font-medium text-gray-500 dark:text-slate-400 mr-1'>Active Filters:</span>
                            {activeFilterEntries.map(([key, val]) => (
                                <Badge
                                    key={key}
                                    className="bg-purple-50 dark:bg-purple-950/70 text-[#6A38C2] dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                                >
                                    <span className='capitalize font-semibold'>{key}: {val}</span>
                                    <X
                                        className='w-3 h-3 cursor-pointer hover:text-red-500'
                                        onClick={() => dispatch(setJobFilters({ [key]: "" }))}
                                    />
                                </Badge>
                            ))}
                            <button
                                type="button"
                                onClick={() => dispatch(resetJobFilters())}
                                className='text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline ml-2 cursor-pointer'
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Layout: Sticky Filter Sidebar + Natural Window Scroll Grid */}
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8'>
                <div className='flex flex-col lg:flex-row items-start gap-7'>
                    {/* Left Sticky Dynamic Filter Sidebar */}
                    <div className='w-full lg:w-72 shrink-0 lg:sticky lg:top-24'>
                        <FilterCard />
                    </div>

                    {/* Right Job Cards Area */}
                    <div className='flex-1 w-full min-w-0'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400'>
                                Showing <span className='font-bold text-gray-900 dark:text-white'>{filterJobs.length}</span> of{" "}
                                <span className='font-bold text-gray-900 dark:text-white'>{allJobs.length}</span> available positions
                            </p>
                        </div>

                        {filterJobs.length <= 0 ? (
                            <div className='flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-2xs text-center'>
                                <div className='w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-[#6A38C2] dark:text-purple-400 mb-4'>
                                    <Briefcase className='w-7 h-7' />
                                </div>
                                <h3 className='text-gray-900 dark:text-white font-bold text-lg'>No matching jobs found</h3>
                                <p className='text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md'>
                                    We couldn't find any roles matching all of your active filter criteria. Try removing a filter or searching a broader keyword.
                                </p>
                                <Button
                                    onClick={() => dispatch(resetJobFilters())}
                                    className="mt-5 rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold px-5 cursor-pointer"
                                >
                                    Reset All Filters
                                </Button>
                            </div>
                        ) : (
                            <div
                                className={
                                    viewMode === "list"
                                        ? "flex flex-col gap-4"
                                        : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                                }
                            >
                                {filterJobs.map((job) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        key={job?._id}
                                        className="h-full"
                                    >
                                        <Job job={job} viewMode={viewMode} />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Jobs