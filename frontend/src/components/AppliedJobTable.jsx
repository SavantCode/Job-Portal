import React, { useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useDispatch, useSelector } from 'react-redux'
import { APPLICATION_API_END_POINT } from '@/utils/constant'
import axios from 'axios'
import { toast } from 'sonner'
import { setAllAppliedJobs } from '@/redux/jobSlice'
import { Loader2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const AppliedJobTable = () => {
    const { allAppliedJobs = [] } = useSelector(store => store.job);
    const dispatch = useDispatch();
    const [withdrawingId, setWithdrawingId] = useState(null);

    const handleWithdraw = async (applicationId) => {
        try {
            setWithdrawingId(applicationId);
            const res = await axios.delete(`${APPLICATION_API_END_POINT}/withdraw/${applicationId}`, {
                withCredentials: true
            });
            if (res.data.success) {
                toast.success(res.data.message);
                const updated = allAppliedJobs.filter(item => item._id !== applicationId);
                dispatch(setAllAppliedJobs(updated));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to withdraw application.");
        } finally {
            setWithdrawingId(null);
        }
    };

    return (
        <div>
            <Table>
                <TableCaption>A list of your applied jobs</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job Role</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Cover Note</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        allAppliedJobs.length <= 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                                    You haven't applied to any job yet.
                                </TableCell>
                            </TableRow>
                        ) : allAppliedJobs.map((appliedJob) => (
                            <TableRow key={appliedJob._id}>
                                <TableCell>{appliedJob?.createdAt?.split("T")[0]}</TableCell>
                                <TableCell className="font-medium">
                                    {appliedJob.job?._id ? (
                                        <Link to={`/description/${appliedJob.job._id}`} className="hover:text-[#6A38C2] hover:underline">
                                            {appliedJob.job?.title}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 italic">Job Removed</span>
                                    )}
                                </TableCell>
                                <TableCell>{appliedJob.job?.company?.name || "N/A"}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs text-gray-500">
                                    {appliedJob.coverNote || <span className="italic text-gray-400">None</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge className={`${appliedJob?.status === "rejected" ? 'bg-red-400' : appliedJob.status === 'pending' ? 'bg-gray-400' : 'bg-green-500'}`}>
                                        {(appliedJob.status || 'pending').toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {appliedJob.status === 'pending' ? (
                                        <Button
                                            onClick={() => handleWithdraw(appliedJob._id)}
                                            disabled={withdrawingId === appliedJob._id}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                                        >
                                            {withdrawingId === appliedJob._id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <><Trash2 className="w-3.5 h-3.5 mr-1" /> Withdraw</>
                                            )}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-gray-400">Locked</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </div>
    )
}

export default AppliedJobTable