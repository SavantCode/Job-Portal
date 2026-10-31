import React, { useMemo, useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MoreHorizontal, FileText, ExternalLink, Eye } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import axios from 'axios';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { setAllApplicants } from '@/redux/applicationSlice';

const shortlistingStatus = ["Accepted", "Rejected"];

const ApplicantsTable = ({ skillQuery = "", statusFilter = "all" }) => {
    const { applicants } = useSelector(store => store.application);
    const dispatch = useDispatch();
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    const statusHandler = async (status, id) => {
        try {
            axios.defaults.withCredentials = true;
            const res = await axios.post(`${APPLICATION_API_END_POINT}/status/${id}/update`, { status });
            if (res.data.success) {
                toast.success(res.data.message);
                if (applicants?.applications) {
                    const updatedApplications = applicants.applications.map(app =>
                        app._id === id ? { ...app, status: status.toLowerCase() } : app
                    );
                    dispatch(setAllApplicants({ ...applicants, applications: updatedApplications }));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update status.");
        }
    };

    const filteredApplications = useMemo(() => {
        const list = applicants?.applications || [];
        return list.filter(item => {
            const st = (item?.status || "pending").toLowerCase();
            if (statusFilter !== "all" && st !== statusFilter) return false;

            if (skillQuery.trim()) {
                const q = skillQuery.trim().toLowerCase();
                const nameMatch = item?.applicant?.fullname?.toLowerCase().includes(q);
                const emailMatch = item?.applicant?.email?.toLowerCase().includes(q);
                const skills = (item?.applicant?.profile?.skills || []).join(" ").toLowerCase();
                if (!nameMatch && !emailMatch && !skills.includes(q)) return false;
            }
            return true;
        });
    }, [applicants, skillQuery, statusFilter]);

    return (
        <div>
            <Table>
                <TableCaption>A list of your recent applied users</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead>Resume & Note</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        filteredApplications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No applicants match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : filteredApplications.map((item) => (
                            <TableRow key={item._id}>
                                <TableCell>
                                    <div className="font-semibold text-gray-900">{item?.applicant?.fullname}</div>
                                    <div className="text-xs text-gray-500">{item?.applicant?.email} • {item?.applicant?.phoneNumber}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {item?.applicant?.profile?.skills?.length > 0 ? (
                                            item.applicant.profile.skills.slice(0, 4).map((s, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5">
                                                    {s}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No skills listed</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedCandidate(item)}
                                        className="h-8 text-xs rounded-lg border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                        Inspect / Resume
                                    </Button>
                                </TableCell>
                                <TableCell>{item?.createdAt?.split("T")[0] || item?.applicant?.createdAt?.split("T")[0]}</TableCell>
                                <TableCell>
                                    <Badge className={`${item?.status === "rejected" ? 'bg-red-400' : item?.status === 'accepted' ? 'bg-green-500' : 'bg-gray-400'}`}>
                                        {(item?.status || 'pending').toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right cursor-pointer">
                                    <Popover>
                                        <PopoverTrigger>
                                            <MoreHorizontal />
                                        </PopoverTrigger>
                                        <PopoverContent className="w-32">
                                            {
                                                shortlistingStatus.map((status, index) => (
                                                    <div
                                                        onClick={() => statusHandler(status, item?._id)}
                                                        key={index}
                                                        className='flex w-fit items-center my-2 cursor-pointer hover:text-[#6A38C2] font-medium text-sm'
                                                    >
                                                        <span>{status}</span>
                                                    </div>
                                                ))
                                            }
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>

            {/* Candidate & Resume Preview Modal */}
            <Dialog open={Boolean(selectedCandidate)} onOpenChange={() => setSelectedCandidate(null)}>
                <DialogContent className="sm:max-w-[680px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {selectedCandidate?.applicant?.fullname} — Application Profile
                        </DialogTitle>
                    </DialogHeader>

                    {selectedCandidate && (
                        <div className="space-y-4 text-sm">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                <p className="text-xs text-gray-500 font-semibold uppercase">Bio & Skills</p>
                                <p className="text-gray-700 text-xs">{selectedCandidate.applicant?.profile?.bio || "No bio provided."}</p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(selectedCandidate.applicant?.profile?.skills || []).map((skill, idx) => (
                                        <Badge key={idx} className="bg-purple-100 text-[#6A38C2] border-none text-xs">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {selectedCandidate.coverNote && (
                                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-1">
                                    <p className="text-xs font-bold text-[#6A38C2]">Submitted Cover Note:</p>
                                    <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                                        {selectedCandidate.coverNote}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-[#6A38C2]" />
                                        Resume ({selectedCandidate.applicant?.profile?.resumeOriginalName || "Document"})
                                    </span>
                                    {selectedCandidate.applicant?.profile?.resume && (
                                        <a
                                            href={selectedCandidate.applicant.profile.resume}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-[#6A38C2] hover:underline flex items-center gap-1"
                                        >
                                            Open Full Tab <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>

                                {selectedCandidate.applicant?.profile?.resume ? (
                                    <iframe
                                        src={selectedCandidate.applicant.profile.resume}
                                        title="Candidate Resume Preview"
                                        className="w-full h-80 rounded-xl border border-gray-200 bg-gray-50"
                                    />
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                                        Candidate has not uploaded a PDF resume yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ApplicantsTable