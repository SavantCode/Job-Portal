import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Edit2, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../ui/badge'
import axios from 'axios'
import { JOB_API_END_POINT } from '@/utils/constant'
import { setAllAdminJobs } from '@/redux/jobSlice'
import { toast } from 'sonner'

const AdminJobsTable = () => {
    const { allAdminJobs = [], searchJobByText } = useSelector(store => store.job);
    const [filterJobs, setFilterJobs] = useState(allAdminJobs);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const filteredJobs = allAdminJobs.filter((job) => {
            if (!searchJobByText) {
                return true;
            }
            return (
                job?.title?.toLowerCase().includes(searchJobByText.toLowerCase()) ||
                job?.company?.name?.toLowerCase().includes(searchJobByText.toLowerCase())
            );
        });
        setFilterJobs(filteredJobs);
    }, [allAdminJobs, searchJobByText]);

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this job posting?")) return;
        try {
            const res = await axios.delete(`${JOB_API_END_POINT}/delete/${jobId}`, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                const updated = allAdminJobs.filter(j => j._id !== jobId);
                dispatch(setAllAdminJobs(updated));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete job.");
        }
    };

    return (
        <div>
            <Table>
                <TableCaption>A list of your recent posted jobs</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Location & Type</TableHead>
                        <TableHead>Applicants</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        filterJobs?.map((job) => (
                            <TableRow key={job._id}>
                                <TableCell className="font-medium">{job?.company?.name}</TableCell>
                                <TableCell className="font-semibold text-gray-900">{job?.title}</TableCell>
                                <TableCell>
                                    <span className='text-xs text-gray-600'>{job?.location} • {job?.jobType}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="rounded-lg">
                                        {job?.applications?.length || 0} Applicants
                                    </Badge>
                                </TableCell>
                                <TableCell>{job?.createdAt?.split("T")[0]}</TableCell>
                                <TableCell className="text-right cursor-pointer">
                                    <Popover>
                                        <PopoverTrigger><MoreHorizontal /></PopoverTrigger>
                                        <PopoverContent className="w-40 space-y-2">
                                            <div
                                                onClick={() => navigate(`/admin/jobs/${job._id}/edit`)}
                                                className='flex items-center gap-2 w-full cursor-pointer hover:text-[#6A38C2] text-sm font-medium'
                                            >
                                                <Edit2 className='w-4 h-4' />
                                                <span>Edit Job</span>
                                            </div>
                                            <div
                                                onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)}
                                                className='flex items-center w-full gap-2 cursor-pointer hover:text-[#6A38C2] text-sm font-medium'
                                            >
                                                <Eye className='w-4 h-4' />
                                                <span>Applicants ({job?.applications?.length || 0})</span>
                                            </div>
                                            <div
                                                onClick={() => handleDeleteJob(job._id)}
                                                className='flex items-center w-full gap-2 cursor-pointer text-red-600 hover:text-red-700 text-sm font-medium pt-1 border-t border-gray-100'
                                            >
                                                <Trash2 className='w-4 h-4' />
                                                <span>Delete Job</span>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </div>
    )
}

export default AdminJobsTable