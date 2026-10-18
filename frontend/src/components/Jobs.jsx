import React, { useEffect, useState } from 'react'
import Navbar from './shared/Navbar'
import FilterCard from './FilterCard'
import Job from './Job';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

const Jobs = () => {
    const { allJobs, searchedQuery } = useSelector(store => store.job);
    const [filterJobs, setFilterJobs] = useState(allJobs);

    useEffect(() => {
        if (searchedQuery) {
            const filteredJobs = allJobs.filter((job) => {
                return (
                    job?.title?.toLowerCase().includes(searchedQuery.toLowerCase()) ||
                    job?.description?.toLowerCase().includes(searchedQuery.toLowerCase()) ||
                    job?.location?.toLowerCase().includes(searchedQuery.toLowerCase()) ||
                    // Also allows filtering by salary range or experience level strings if searched
                    (typeof job?.salary === 'string' && job.salary.includes(searchedQuery))
                );
            });
            setFilterJobs(filteredJobs);
        } else {
            setFilterJobs(allJobs);
        }
    }, [allJobs, searchedQuery]);

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-7xl mx-auto px-4 sm:px-6 mt-6'>
                <div className='flex flex-col md:flex-row gap-5'>
                    
                    {/* Filter Sidebar */}
                    <div className='w-full md:w-[20%] shrink-0'>
                        <FilterCard />
                    </div>

                    {/* Job Cards Display Grid */}
                    {
                        filterJobs.length <= 0 ? (
                            <div className='flex-1 flex flex-col items-center justify-center h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-xs'>
                                <p className='text-gray-600 font-semibold text-lg'>No jobs found</p>
                                <p className='text-xs text-muted-foreground mt-1'>Try adjusting your search or filter criteria.</p>
                            </div>
                        ) : (
                            <div className='flex-1 h-[82vh] overflow-y-auto pr-2 pb-5'>
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                                    {
                                        filterJobs.map((job) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.3 }}
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