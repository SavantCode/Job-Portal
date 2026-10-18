import React, { useEffect, useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';
import { setSingleJob } from '@/redux/jobSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Briefcase, MapPin, IndianRupee, Clock, Users, Building2, CheckCircle2, Calendar } from 'lucide-react';
import Navbar from './shared/Navbar';

const JobDescription = () => {
    const { singleJob } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);
    const isIntiallyApplied = singleJob?.applications?.some(application => application.applicant === user?._id) || false;
    const [isApplied, setIsApplied] = useState(isIntiallyApplied);
    const [loading, setLoading] = useState(false);

    const params = useParams();
    const jobId = params.id;
    const dispatch = useDispatch();

    const applyJobHandler = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${APPLICATION_API_END_POINT}/apply/${jobId}`, { withCredentials: true });
            
            if (res.data.success) {
                setIsApplied(true);
                const updatedSingleJob = {
                    ...singleJob, 
                    applications: [...(singleJob.applications || []), { applicant: user?._id }]
                };
                dispatch(setSingleJob(updatedSingleJob));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Failed to apply for job.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const fetchSingleJob = async () => {
            try {
                const res = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`, { withCredentials: true });
                if (res.data.success) {
                    dispatch(setSingleJob(res.data.job));
                    setIsApplied(res.data.job.applications.some(application => application.applicant === user?._id));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchSingleJob(); 
    }, [jobId, dispatch, user?._id]);

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            
            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-10 space-y-8'>
                
                {/* Top Job Header Card */}
                <div className='bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs transition-all'>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
                        
                        {/* Company Logo & Title info */}
                        <div className='flex items-start gap-4'>
                            <div className='w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs'>
                                {singleJob?.company?.logo ? (
                                    <img src={singleJob.company.logo} alt="logo" className='w-full h-full object-cover' />
                                ) : (
                                    <Building2 className='w-8 h-8 text-[#6A38C2]' />
                                )}
                            </div>
                            <div className='space-y-1'>
                                <span className='text-xs font-semibold text-[#6A38C2] uppercase tracking-wider'>
                                    {singleJob?.company?.name || "Company Details"}
                                </span>
                                <h1 className='text-2xl font-bold text-gray-900 leading-tight'>{singleJob?.title}</h1>
                                <div className='flex items-center gap-2 text-xs text-muted-foreground pt-1'>
                                    <MapPin className='w-3.5 h-3.5 text-gray-400' />
                                    <span>{singleJob?.location || "India"}</span>
                                    <span>•</span>
                                    <Calendar className='w-3.5 h-3.5 text-gray-400' />
                                    <span>Posted {singleJob?.createdAt ? singleJob.createdAt.split("T")[0] : 'Recently'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Apply Action Button */}
                        <div>
                            <Button 
                                onClick={isApplied ? null : applyJobHandler}
                                disabled={isApplied || loading}
                                className={`h-11 px-8 rounded-full font-semibold shadow-md transition-all ${
                                    isApplied 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 cursor-not-allowed shadow-none' 
                                        : 'bg-[#7209b7] hover:bg-[#5f32ad] text-white shadow-purple-500/20'
                                }`}
                            >
                                {isApplied ? (
                                    <span className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                                        Applied Successfully
                                    </span>
                                ) : (
                                    'Apply Now'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Quick Overview Badges */}
                    <div className='flex items-center flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100'>
                        <Badge className='bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.postion || singleJob?.position} Open Positions
                        </Badge>
                        <Badge className='bg-orange-50 text-[#F83002] hover:bg-orange-100 border-none font-medium px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.jobType}
                        </Badge>
                        <Badge className='bg-purple-50 text-[#7209b7] hover:bg-purple-100 border-none font-semibold px-3.5 py-1.5 rounded-xl text-xs'>
                            {singleJob?.salary} LPA
                        </Badge>
                    </div>
                </div>

                {/* Key Metrics / Highlights Grid */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Clock className='w-4 h-4 text-[#6A38C2]' />
                            <span>Experience</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.experienceLevel || singleJob?.experience || 0} Years</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <IndianRupee className='w-4 h-4 text-[#6A38C2]' />
                            <span>Salary Package</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.salary} LPA</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Users className='w-4 h-4 text-[#6A38C2]' />
                            <span>Total Applicants</span>
                        </div>
                        <p className='text-base font-bold text-gray-900'>{singleJob?.applications?.length || 0} Candidates</p>
                    </div>

                    <div className='bg-white p-4 rounded-2xl border border-gray-100 shadow-xs'>
                        <div className='flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1'>
                            <Briefcase className='w-4 h-4 text-[#6A38C2]' />
                            <span>Job Role</span>
                        </div>
                        <p className='text-base font-bold text-gray-900 truncate'>{singleJob?.title}</p>
                    </div>
                </div>

                {/* Detailed Description Section */}
                <div className='bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6'>
                    <div>
                        <h2 className='text-lg font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-[#6A38C2]' />
                            Job Description & Requirements
                        </h2>
                    </div>

                    <div className='space-y-4 text-sm text-gray-600 leading-relaxed'>
                        <p className='whitespace-pre-line'>
                            {singleJob?.description || "No specific description provided for this role."}
                        </p>
                    </div>

                    {/* Requirements bullet list if available */}
                    {singleJob?.requirements && singleJob.requirements.length > 0 && (
                        <div className='pt-4 border-t border-gray-100 space-y-3'>
                            <h3 className='font-semibold text-gray-900 text-sm'>Key Requirements & Skills:</h3>
                            <ul className='list-disc pl-5 space-y-1.5 text-sm text-gray-600'>
                                {singleJob.requirements.map((req, index) => (
                                    <li key={index}>{req}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

export default JobDescription