import React from 'react'
import { Badge } from './ui/badge'
import { useNavigate } from 'react-router-dom'
import { Building2, MapPin, Briefcase, ArrowUpRight } from 'lucide-react'

const LatestJobCards = ({ job }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            onClick={() => navigate(`/description/${job?._id}`)} 
            className='group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-xs hover:shadow-2xl hover:border-purple-200 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden'
        >
            {/* Soft decorative background glow effect on hover */}
            <div className='absolute -right-12 -top-12 w-32 h-32 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100/80 transition-all pointer-events-none' />

            <div>
                {/* Header: Company & Location */}
                <div className='flex items-center justify-between gap-3 mb-4'>
                    <div className='flex items-center gap-3'>
                        <div className='w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100/60 shadow-xs group-hover:scale-105 transition-transform'>
                            {job?.company?.logo ? (
                                <img src={job.company.logo} alt="logo" className='w-7 h-7 object-contain rounded-md' />
                            ) : (
                                <Building2 className='w-5 h-5 text-[#6A38C2]' />
                            )}
                        </div>
                        <div>
                            <h1 className='font-semibold text-gray-900 group-hover:text-[#6A38C2] transition-colors line-clamp-1'>
                                {job?.company?.name || "Company Name"}
                            </h1>
                            <div className='flex items-center gap-1 text-xs text-gray-500 mt-0.5'>
                                <MapPin className='w-3 h-3 text-gray-400' />
                                <span>{job?.location || "India"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Arrow Icon */}
                    <div className='w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#6A38C2] group-hover:text-white text-gray-400 flex items-center justify-center transition-all'>
                        <ArrowUpRight className='w-4 h-4' />
                    </div>
                </div>

                {/* Job Title & Description */}
                <div className='space-y-1.5 mb-5'>
                    <h1 className='font-bold text-lg text-gray-900 leading-snug group-hover:text-[#6A38C2] transition-colors line-clamp-1'>
                        {job?.title}
                    </h1>
                    <p className='text-sm text-gray-600 line-clamp-2 leading-relaxed'>
                        {job?.description || "Exciting opportunity to grow your career with a forward-thinking team."}
                    </p>
                </div>
            </div>

            {/* Badges Footer */}
            <div className='flex items-center flex-wrap gap-2 pt-4 border-t border-gray-100'>
                <Badge className='bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium px-3 py-1 rounded-lg text-xs'>
                    <Briefcase className='w-3 h-3 mr-1 inline' /> {job?.position} Positions
                </Badge>
                <Badge className='bg-orange-50 text-[#F83002] hover:bg-orange-100 border-none font-medium px-3 py-1 rounded-lg text-xs'>
                    {job?.jobType}
                </Badge>
                <Badge className='bg-purple-50 text-[#7209b7] hover:bg-purple-100 border-none font-semibold px-3 py-1 rounded-lg text-xs ml-auto'>
                    {job?.salary} LPA
                </Badge>
            </div>
        </div>
    )
}

export default LatestJobCards