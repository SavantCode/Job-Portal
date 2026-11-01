import React, { useEffect, useMemo, useState } from 'react'
import Navbar from './shared/Navbar'
import Footer from './shared/Footer'
import Job from './Job'
import { useDispatch, useSelector } from 'react-redux'
import { setSearchedQuery } from '@/redux/jobSlice'
import useGetAllJobs from '@/hooks/useGetAllJobs'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Search, X, Briefcase, Compass } from 'lucide-react'

const POPULAR_CATEGORIES = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack",
    "Data Science",
    "AI/ML",
    "DevOps",
    "Cloud",
    "Product Manager"
];

/**
 * Browse Page Component
 * - Displays category & keyword search results with a responsive 1/2/3-column grid
 * - Shows active category/keyword badge and quick category pills
 * - Provides a clean empty state with 1-click reset when no jobs match
 */
const Browse = () => {
    useGetAllJobs();
    const { allJobs = [], searchedQuery = "" } = useSelector(store => store.job);
    const dispatch = useDispatch();
    const [localSearch, setLocalSearch] = useState(searchedQuery || "");

    useEffect(() => {
        setLocalSearch(searchedQuery || "");
    }, [searchedQuery]);

    useEffect(() => {
        return () => {
            dispatch(setSearchedQuery(""));
        }
    }, [dispatch]);

    // Client-side filter refinement so typing or clicking category pills updates results immediately
    const displayedJobs = useMemo(() => {
        const q = (localSearch || "").trim().toLowerCase();
        if (!q) return allJobs;
        return allJobs.filter(job => {
            const reqText = Array.isArray(job?.requirements) ? job.requirements.join(" ").toLowerCase() : "";
            return (
                job?.title?.toLowerCase().includes(q) ||
                job?.description?.toLowerCase().includes(q) ||
                job?.company?.name?.toLowerCase().includes(q) ||
                job?.location?.toLowerCase().includes(q) ||
                reqText.includes(q)
            );
        });
    }, [allJobs, localSearch]);

    const handleCategorySelect = (cat) => {
        const nextVal = localSearch.toLowerCase() === cat.toLowerCase() ? "" : cat;
        setLocalSearch(nextVal);
        dispatch(setSearchedQuery(nextVal));
    };

    const handleClearSearch = () => {
        setLocalSearch("");
        dispatch(setSearchedQuery(""));
    };

    return (
        <div className='min-h-screen bg-gray-50/40 flex flex-col justify-between'>
            <div>
                <Navbar />
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 space-y-8'>

                    {/* Search & Category Header Card */}
                    <div className='bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-5'>
                        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                            <div className='flex items-center gap-3'>
                                <div className='w-11 h-11 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center shrink-0'>
                                    <Compass className='w-6 h-6' />
                                </div>
                                <div>
                                    <h1 className='font-extrabold text-xl sm:text-2xl text-gray-900'>
                                        Browse Opportunities ({displayedJobs.length})
                                    </h1>
                                    <p className='text-xs text-muted-foreground mt-0.5'>
                                        Explore openings by category, skill stack, role title, or company name.
                                    </p>
                                </div>
                            </div>

                            {/* Live Search Input */}
                            <div className='flex items-center gap-2 w-full md:w-96'>
                                <div className='relative flex-1'>
                                    <Search className='w-4 h-4 text-gray-400 absolute left-3.5 top-3' />
                                    <Input
                                        type="text"
                                        value={localSearch}
                                        onChange={(e) => {
                                            setLocalSearch(e.target.value);
                                            dispatch(setSearchedQuery(e.target.value));
                                        }}
                                        placeholder="Search category, role, or skill..."
                                        className="pl-10 h-10 rounded-xl border-gray-200"
                                    />
                                </div>
                                {localSearch && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearSearch}
                                        className="h-10 rounded-xl text-xs cursor-pointer"
                                    >
                                        <X className='w-3.5 h-3.5 mr-1' /> Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Quick Category Pills */}
                        <div className='flex items-center flex-wrap gap-2 pt-2 border-t border-gray-100'>
                            <span className='text-xs font-semibold text-gray-400 mr-1'>Popular Categories:</span>
                            {POPULAR_CATEGORIES.map((cat) => {
                                const active = localSearch.toLowerCase() === cat.toLowerCase();
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => handleCategorySelect(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                                            active
                                                ? "bg-[#6A38C2] text-white border-[#6A38C2]"
                                                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-200 hover:text-[#6A38C2]"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Filter Indicator */}
                    {localSearch && (
                        <div className='flex items-center gap-2'>
                            <span className='text-xs text-gray-500'>Active Filter:</span>
                            <Badge className="bg-purple-100 text-[#6A38C2] border-none text-xs px-3 py-1 flex items-center gap-1.5">
                                <span>"{localSearch}"</span>
                                <X className='w-3 h-3 cursor-pointer' onClick={handleClearSearch} />
                            </Badge>
                        </div>
                    )}

                    {/* Responsive Results Grid or Empty State */}
                    {displayedJobs.length === 0 ? (
                        <div className='bg-white rounded-3xl border border-gray-100 p-14 text-center space-y-3 shadow-xs'>
                            <Briefcase className='w-12 h-12 text-gray-300 mx-auto' />
                            <h3 className='font-bold text-gray-800 text-lg'>
                                No jobs found matching "{localSearch}"
                            </h3>
                            <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                                Try selecting another category pill above or reset your search query to view all active openings.
                            </p>
                            <Button
                                type="button"
                                onClick={handleClearSearch}
                                className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs cursor-pointer mt-2"
                            >
                                Show All Jobs ({allJobs.length})
                            </Button>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {displayedJobs.map((job) => (
                                <Job key={job._id} job={job} />
                            ))}
                        </div>
                    )}

                </div>
            </div>
            <Footer />
        </div>
    )
}

export default Browse