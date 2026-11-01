import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Bookmark, Building2, MapPin } from 'lucide-react'
import { Badge } from './ui/badge'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

const Job = ({ job }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);

    // Check if the job is already saved in the user's savedJobs array
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.savedJobs) {
            const checkIfSaved = user.savedJobs.some(savedId =>
                (typeof savedId === 'object' ? savedId?._id === job?._id : savedId === job?._id)
            );
            setIsSaved(checkIfSaved);
        } else {
            setIsSaved(false);
        }
    }, [user, job?._id]);

    const daysAgoFunction = (mongodbTime) => {
        if (!mongodbTime) return 0;
        const createdAt = new Date(mongodbTime);
        const currentTime = new Date();
        const timeDifference = currentTime - createdAt;
        return Math.floor(timeDifference / (1000 * 24 * 60 * 60));
    };

    const daysAgo = daysAgoFunction(job?.createdAt);

    // Handler to toggle save/unsave job
    const saveJobHandler = async () => {
        if (!user) {
            toast.error("Please login to save jobs for later.");
            navigate("/login");
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/job/save/${job?._id}`, {}, { withCredentials: true });

            if (res.data.success) {
                setIsSaved(res.data.saved);
                toast.success(res.data.message);

                // Update Redux global user state immediately so Profile & other components sync
                let updatedSavedJobs = [...(user.savedJobs || [])];
                if (res.data.saved) {
                    updatedSavedJobs.push(job?._id);
                } else {
                    updatedSavedJobs = updatedSavedJobs.filter(id =>
                        (typeof id === 'object' ? id?._id !== job?._id : id !== job?._id)
                    );
                }
                dispatch(setUser({ ...user, savedJobs: updatedSavedJobs }));
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between overflow-hidden'>
            {/* Subtle background glow effect on hover */}
            <div className='absolute -right-12 -top-12 w-32 h-32 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100/80 transition-all pointer-events-none' />

            <div>
                {/* Top Row: Date posted & Bookmark button */}
                <div className='flex items-center justify-between mb-4'>
                    <span className='text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md'>
                        {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}
                    </span>
                    <Button
                        onClick={saveJobHandler}
                        disabled={loading}
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full transition-colors ${isSaved ? 'text-[#6A38C2] bg-purple-50' : 'text-gray-400 hover:text-[#6A38C2] hover:bg-purple-50'}`}
                    >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#6A38C2]' : ''}`} />
                    </Button>
                </div>

                {/* Company Info Row */}
                <div className='flex items-center gap-3 mb-4'>
                    <div className='w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100/60 shadow-xs shrink-0 overflow-hidden group-hover:scale-105 transition-transform'>
                        {job?.company?.logo ? (
                            <img src={job.company.logo} alt="logo" className='w-full h-full object-cover' />
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

                {/* Title & Description */}
                <div className='space-y-1.5 mb-5'>
                    <h1 className='font-bold text-lg text-gray-900 leading-snug group-hover:text-[#6A38C2] transition-colors line-clamp-1'>
                        {job?.title}
                    </h1>
                    <p className='text-sm text-gray-600 line-clamp-2 leading-relaxed'>
                        {job?.description || "Exciting opportunity to grow your career with a forward-thinking team."}
                    </p>
                </div>
            </div>

            <div>
                {/* Badges Footer */}
                <div className='flex items-center flex-wrap gap-2 pt-4 border-t border-gray-100 mb-5'>
                    <Badge className='bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium px-3 py-1 rounded-lg text-xs'>
                        {job?.position} Positions
                    </Badge>
                    <Badge className='bg-orange-50 text-[#F83002] hover:bg-orange-100 border-none font-medium px-3 py-1 rounded-lg text-xs'>
                        {job?.jobType}
                    </Badge>
                    <Badge className='bg-purple-50 text-[#7209b7] hover:bg-purple-100 border-none font-semibold px-3 py-1 rounded-lg text-xs ml-auto'>
                        {job?.salary} LPA
                    </Badge>
                </div>

                {/* Action Buttons */}
                <div className='flex items-center gap-3'>
                    <Button
                        onClick={() => navigate(`/description/${job?._id}`)}
                        variant="outline"
                        className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50 hover:text-gray-900 font-medium cursor-pointer"
                    >
                        Details
                    </Button>
                    <Button
                        onClick={saveJobHandler}
                        disabled={loading}
                        className={`flex-1 rounded-xl font-medium shadow-xs text-white cursor-pointer ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#7209b7] hover:bg-[#5b0792]'}`}
                    >
                        {isSaved ? "Saved" : "Save For Later"}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default Job