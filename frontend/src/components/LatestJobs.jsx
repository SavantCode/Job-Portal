import React from 'react'
import LatestJobCards from './LatestJobCards';
import { useSelector } from 'react-redux'; 
import { Briefcase } from 'lucide-react';

const LatestJobs = () => {
    const { allJobs } = useSelector(store => store.job);
   
    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-24'>
            {/* Section Header */}
            <div className='flex flex-col md:flex-row md:items-end justify-between mb-12'>
                <div>
                    <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#6A38C2] text-xs font-semibold uppercase tracking-wider mb-3'>
                        <Briefcase className='w-3.5 h-3.5' />
                        <span>Opportunities</span>
                    </div>
                    <h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
                        <span className='text-[#6A38C2]'>Latest & Top</span> Job Openings
                    </h1>
                </div>
                <p className='text-muted-foreground text-sm max-w-md mt-2 md:mt-0'>
                    Explore the most recent listings from top companies and find your dream career path today.
                </p>
            </div>

            {/* Jobs Grid */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                {
                    allJobs.length <= 0 ? (
                        <div className='col-span-full flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200'>
                            <Briefcase className='w-12 h-12 text-gray-300 mb-3' />
                            <p className='text-gray-700 font-semibold text-lg'>No Job Openings Available</p>
                            <p className='text-sm text-muted-foreground mt-1'>Check back later for new listings or explore other categories.</p>
                        </div>
                    ) : (
                        allJobs?.slice(0, 6).map((job) => <LatestJobCards key={job._id} job={job} />)
                    )
                }
            </div>
        </div>
    )
}

export default LatestJobs