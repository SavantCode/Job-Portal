import React, { useMemo } from 'react'
import Navbar from './shared/Navbar'
import FilterCard from './FilterCard'
import Job from './Job';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Search, X, Briefcase } from 'lucide-react';
import { resetJobFilters, setJobFilters } from '@/redux/jobSlice';
import useGetAllJobs from '@/hooks/useGetAllJobs';

const Jobs = () => {
    useGetAllJobs();
    const dispatch = useDispatch();
    const { allJobs = [], searchedQuery = "", jobFilters = {} } = useSelector(store => store.job);

    const filterJobs = useMemo(() => {
        return allJobs.filter((job) => {
            const combinedKeyword = (jobFilters.keyword || searchedQuery || "").trim().toLowerCase();

            // 1. Keyword match (title, description, company name, or requirements)
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

            // 2. Location match
            if (jobFilters.location) {
                const loc = jobFilters.location.toLowerCase();
                const jobLoc = (job?.location || "").toLowerCase();
                const isBangaloreMatch = (loc === "bengaluru" || loc === "bangalore") &&
                    (jobLoc.includes("bengaluru") || jobLoc.includes("bangalore"));
                if (!isBangaloreMatch && !jobLoc.includes(loc)) return false;
            }

            // 3. Industry / Role match
            if (jobFilters.industry) {
                const ind = jobFilters.industry.toLowerCase();
                const titleAndDesc = `${job?.title || ""} ${job?.description || ""} ${(job?.requirements || []).join(" ")}`.toLowerCase();
                if (!titleAndDesc.includes(ind)) return false;
            }

            // 4. Job Type match
            if (jobFilters.jobType) {
                const jt = (job?.jobType || "").toLowerCase();
                if (jt !== jobFilters.jobType.toLowerCase()) return false;
            }

            // 5. Experience Level match
            if (jobFilters.experience) {
                const exp = Number(job?.experienceLevel ?? 0);
                if (jobFilters.experience === "0" && exp !== 0) return false;
                if (jobFilters.experience === "1-2" && (exp < 1 || exp > 2)) return false;
                if (jobFilters.experience === "3-4" && (exp < 3 || exp > 4)) return false;
                if (jobFilters.experience === "5+" && exp < 5) return false;
            }

            // 6. Salary Range match
            if (jobFilters.salary) {
                const jobSal = String(job?.salary || "");
                if (!jobSal.includes(jobFilters.salary)) return false;
            }

            return true;
        });
    }, [allJobs, searchedQuery, jobFilters]);

    const activeFilterEntries = Object.entries(jobFilters).filter(([, val]) => Boolean(val));

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6'>

                {/* Top Live Search Bar & Active Filter Pills */}
                <div className='bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4'>
                    <div className='relative w-full sm:max-w-md'>
                        <Search className='w-4 h-4 text-gray-400 absolute left-3.5 top-3' />
                        <Input
                            type="text"
                            placeholder="Search by job title, tech stack, or company..."
                            value={jobFilters.keyword || ""}
                            onChange={(e) => dispatch(setJobFilters({ keyword: e.target.value }))}
                            className="pl-10 h-10 rounded-xl border-gray-200"
                        />
                    </div>

                    <div className='flex items-center flex-wrap gap-2 w-full sm:w-auto justify-between sm:justify-end'>
                        {activeFilterEntries.map(([key, val]) => (
                            <Badge
                                key={key}
                                className="bg-purple-50 text-[#6A38C2] hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                            >
                                <span className='capitalize'>{key}: {val}</span>
                                <X
                                    className='w-3 h-3 cursor-pointer'
                                    onClick={() => dispatch(setJobFilters({ [key]: "" }))}
                                />
                            </Badge>
                        ))}
                        <span className='text-xs font-semibold text-gray-500 ml-2'>
                            Showing {filterJobs.length} of {allJobs.length} jobs
                        </span>
                    </div>
                </div>

                <div className='flex flex-col md:flex-row gap-6'>
                    {/* Filter Sidebar */}
                    <div className='w-full md:w-[24%] shrink-0'>
                        <FilterCard />
                    </div>

                    {/* Job Cards Display Grid */}
                    {
                        filterJobs.length <= 0 ? (
                            <div className='flex-1 flex flex-col items-center justify-center h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-xs p-6 text-center'>
                                <Briefcase className='w-12 h-12 text-gray-300 mb-3' />
                                <p className='text-gray-800 font-bold text-lg'>No matching jobs found</p>
                                <p className='text-xs text-muted-foreground mt-1 max-w-sm'>
                                    No openings match all of your active filters. Try clearing one or more filter criteria.
                                </p>
                                <Button
                                    onClick={() => dispatch(resetJobFilters())}
                                    variant="outline"
                                    className="mt-4 rounded-xl text-xs"
                                >
                                    Clear All Filters
                                </Button>
                            </div>
                        ) : (
                            <div className='flex-1 h-[82vh] overflow-y-auto pr-1 pb-5'>
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                                    {
                                        filterJobs.map((job) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.25 }}
                                                key={job?._id}
                                            >
                                                <Job job={job} />
                                            </motion.div>
                                        ))
                                    }
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    )
}

export default Jobs