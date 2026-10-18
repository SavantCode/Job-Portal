import React, { useState, useEffect } from 'react'
import Navbar from './shared/Navbar'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Mail, Phone, Pen, FileText, ExternalLink, Briefcase, Award, CheckCircle2, Bookmark } from 'lucide-react'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import AppliedJobTable from './AppliedJobTable'
import UpdateProfileDialog from './UpdateProfileDialog'
import Job from './Job' 
import { useSelector } from 'react-redux'
import useGetAppliedJobs from '@/hooks/useGetAppliedJobs'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'

const Profile = () => {
    useGetAppliedJobs();
    const [open, setOpen] = useState(false);
    const { user } = useSelector(store => store.auth);

    // State to hold fully populated saved jobs fetched from backend
    const [savedJobs, setSavedJobs] = useState([]);
    const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);

    // Fetch saved jobs with populated details on component mount or user change
    useEffect(() => {
        const fetchSavedJobs = async () => {
            try {
                setLoadingSavedJobs(true);
                const res = await axios.get(`${USER_API_END_POINT}/job/saved`, { withCredentials: true });
                if (res.data.success) {
                    setSavedJobs(res.data.savedJobs);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoadingSavedJobs(false);
            }
        };

        fetchSavedJobs();
    }, [user]);

    // Fallback default avatar check
    const profilePhoto = user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg";

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            
            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-6'>
                
                {/* Main Profile Header Card */}
                <div className='bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden transition-all'>
                    
                    {/* Decorative Header Banner */}
                    <div className='h-36 bg-gradient-to-r from-purple-600 via-[#6A38C2] to-indigo-700 relative px-6 pt-6'>
                        <div className='absolute right-6 top-6'>
                            <Button 
                                onClick={() => setOpen(true)} 
                                variant="secondary" 
                                className="rounded-full bg-white/90 hover:bg-white text-gray-800 font-medium shadow-md gap-2 px-4 backdrop-blur-xs transition-all"
                            >
                                <Pen className='w-4 h-4 text-[#6A38C2]' />
                                <span>Edit Profile</span>
                            </Button>
                        </div>
                    </div>

                    {/* Profile Information Body */}
                    <div className='px-6 sm:px-8 pb-8 relative'>
                        
                        {/* Avatar positioned overlapping the banner */}
                        <div className='flex flex-col sm:flex-row sm:items-end justify-between -mt-16 mb-6 gap-4'>
                            <div className='flex items-end gap-5'>
                                <Avatar className="h-28 w-28 ring-4 ring-white shadow-xl bg-white shrink-0">
                                    <AvatarImage src={profilePhoto} alt="profile" className="object-cover" />
                                    <AvatarFallback className="bg-purple-100 text-[#6A38C2] text-2xl font-bold">
                                        {user?.fullname?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className='mb-1'>
                                    <div className='flex items-center gap-2'>
                                        <h1 className='text-2xl font-bold text-gray-900 leading-tight'>{user?.fullname || "Candidate"}</h1>
                                        <CheckCircle2 className='w-5 h-5 text-blue-500 fill-blue-50' />
                                    </div>
                                    <p className='text-sm font-medium text-[#6A38C2] capitalize'>{user?.role || "Job Seeker"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bio Section */}
                        <p className='text-gray-600 text-sm leading-relaxed max-w-2xl mb-6'>
                            {user?.profile?.bio || "No bio added yet. Click 'Edit Profile' to introduce yourself to potential recruiters."}
                        </p>

                        {/* Contact Information Badges */}
                        <div className='flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600'>
                            <div className='flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100'>
                                <Mail className='w-4 h-4 text-[#6A38C2]' />
                                <span className='font-medium text-gray-700'>{user?.email || "Not provided"}</span>
                            </div>
                            <div className='flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100'>
                                <Phone className='w-4 h-4 text-[#6A38C2]' />
                                <span className='font-medium text-gray-700'>{user?.phoneNumber || "Not provided"}</span>
                            </div>
                        </div>

                        {/* Skills Section */}
                        <div className='mt-8 pt-6 border-t border-gray-100'>
                            <div className='flex items-center gap-2 mb-3'>
                                <Award className='w-4 h-4 text-[#6A38C2]' />
                                <h2 className='font-semibold text-gray-900'>Skills & Expertise</h2>
                            </div>
                            <div className='flex items-center flex-wrap gap-2'>
                                {
                                    user?.profile?.skills && user?.profile?.skills.length > 0 ? (
                                        user.profile.skills.map((item, index) => (
                                            <Badge 
                                                key={index} 
                                                className="bg-purple-50 text-[#6A38C2] hover:bg-purple-100 border border-purple-100 px-3 py-1.5 rounded-lg text-xs font-medium"
                                            >
                                                {item}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-sm text-muted-foreground italic'>No skills listed yet.</span>
                                    )
                                }
                            </div>
                        </div>

                        {/* Resume Section */}
                        <div className='mt-8 pt-6 border-t border-gray-100'>
                            <div className='flex items-center gap-2 mb-3'>
                                <FileText className='w-4 h-4 text-[#6A38C2]' />
                                <h2 className='font-semibold text-gray-900'>Curriculum Vitae (Resume)</h2>
                            </div>
                            {
                                user?.profile?.resume ? (
                                    <div className='flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl border border-gray-200/60 max-w-md group hover:border-purple-300 transition-all'>
                                        <div className='flex items-center gap-3 overflow-hidden'>
                                            <div className='w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 font-bold text-xs'>
                                                PDF
                                            </div>
                                            <div className='overflow-hidden'>
                                                <p className='text-sm font-semibold text-gray-900 truncate'>
                                                    {user?.profile?.resumeOriginalName || "Resume.pdf"}
                                                </p>
                                                <span className='text-xs text-muted-foreground'>Ready for download</span>
                                            </div>
                                        </div>
                                        <a 
                                            target='_blank' 
                                            rel='noreferrer' 
                                            href={user?.profile?.resume} 
                                            className='flex items-center gap-1.5 text-xs font-semibold text-[#6A38C2] hover:underline bg-white px-3 py-2 rounded-xl shadow-xs border border-purple-100 shrink-0'
                                        >
                                            <span>View</span>
                                            <ExternalLink className='w-3 h-3' />
                                        </a>
                                    </div>
                                ) : (
                                    <p className='text-sm text-muted-foreground italic'>No resume uploaded yet.</p>
                                )
                            }
                        </div>

                    </div>
                </div>

                {/* Saved Jobs Section Container */}
                <div className='bg-white border border-gray-100 rounded-3xl shadow-xs p-6 sm:p-8'>
                    <div className='flex items-center gap-2 mb-6 pb-4 border-b border-gray-100'>
                        <div className='w-9 h-9 rounded-xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                            <Bookmark className='w-5 h-5 fill-[#6A38C2]' />
                        </div>
                        <div>
                            <h2 className='font-bold text-lg text-gray-900'>Saved Jobs</h2>
                            <p className='text-xs text-muted-foreground'>Quickly access jobs you have bookmarked for later.</p>
                        </div>
                    </div>

                    {
                        loadingSavedJobs ? (
                            <p className='text-sm text-muted-foreground text-center py-6'>Loading saved jobs...</p>
                        ) : savedJobs.length === 0 ? (
                            <div className='text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200'>
                                <Bookmark className='w-10 h-10 text-gray-300 mx-auto mb-2' />
                                <p className='text-gray-700 font-medium text-sm'>No saved jobs yet.</p>
                                <p className='text-xs text-muted-foreground mt-0.5'>Browse jobs and click 'Save For Later' to keep track of them here.</p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                {
                                    savedJobs.map((job) => (
                                        <Job key={job._id} job={job} />
                                    ))
                                }
                            </div>
                        )
                    }
                </div>

                {/* Applied Jobs Section Container */}
                <div className='bg-white border border-gray-100 rounded-3xl shadow-xs p-6 sm:p-8'>
                    <div className='flex items-center gap-2 mb-6 pb-4 border-b border-gray-100'>
                        <div className='w-9 h-9 rounded-xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                            <Briefcase className='w-5 h-5' />
                        </div>
                        <div>
                            <h2 className='font-bold text-lg text-gray-900'>Applied Job Applications</h2>
                            <p className='text-xs text-muted-foreground'>Track the live status of your submitted applications.</p>
                        </div>
                    </div>
                    
                    {/* Applied Job Table Component */}
                    <AppliedJobTable />
                </div>

            </div>

            {/* Profile Update Dialog Modal */}
            <UpdateProfileDialog open={open} setOpen={setOpen} />
        </div>
    )
}

export default Profile