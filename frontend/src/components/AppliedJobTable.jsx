import React, { useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { useDispatch, useSelector } from 'react-redux'
import { APPLICATION_API_END_POINT } from '@/utils/constant'
import axios from 'axios'
import { toast } from 'sonner'
import { setAllAppliedJobs } from '@/redux/jobSlice'
import {
    Loader2, Trash2, Video, ClipboardList, Award, Building2,
    ExternalLink, Calendar, Eye, Printer
} from 'lucide-react'
import { Link } from 'react-router-dom'

const STAGE_BADGES = {
    applied: { label: "Applied (Under Review)", cls: "bg-gray-100 text-gray-700" },
    shortlisted: { label: "Shortlisted", cls: "bg-blue-100 text-blue-800" },
    assignment_sent: { label: "Assignment Pending", cls: "bg-indigo-100 text-indigo-800" },
    interview_scheduled: { label: "Interview Scheduled", cls: "bg-purple-100 text-[#6A38C2]" },
    interview_passed: { label: "Interview Cleared", cls: "bg-emerald-100 text-emerald-800" },
    offer_sent: { label: "Offer Letter Received 🎉", cls: "bg-teal-100 text-teal-900" },
    hired: { label: "Joining Letter Issued 🏛️", cls: "bg-green-100 text-green-900" },
    rejected: { label: "Not Selected", cls: "bg-red-100 text-red-700" }
};

const AppliedJobTable = () => {
    const { allAppliedJobs = [] } = useSelector(store => store.job);
    const dispatch = useDispatch();
    const [withdrawingId, setWithdrawingId] = useState(null);

    // Candidate Portal Modal States
    const [activeAppModal, setActiveAppModal] = useState(null);
    const [submissionLink, setSubmissionLink] = useState("");
    const [submittingAssignment, setSubmittingAssignment] = useState(false);

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

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault();
        if (!activeAppModal) return;
        try {
            setSubmittingAssignment(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/${activeAppModal._id}/submit-assignment`,
                { submissionLink },
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                const updated = allAppliedJobs.map(item =>
                    item._id === activeAppModal._id ? { ...item, assignmentDetails: res.data.application.assignmentDetails } : item
                );
                dispatch(setAllAppliedJobs(updated));
                setActiveAppModal({ ...activeAppModal, assignmentDetails: res.data.application.assignmentDetails });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit assignment.");
        } finally {
            setSubmittingAssignment(false);
        }
    };

    const printLetter = () => {
        window.print();
    };

    return (
        <div>
            <Table>
                <TableCaption>Track your live hiring pipeline, interviews, assignments, and official letters</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job Role & Company</TableHead>
                        <TableHead>Hiring Stage</TableHead>
                        <TableHead>Next Step / Portal Actions</TableHead>
                        <TableHead className="text-right">Manage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        allAppliedJobs.length <= 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                                    You haven't applied to any job yet.
                                </TableCell>
                            </TableRow>
                        ) : allAppliedJobs.map((appliedJob) => {
                            const stageKey = appliedJob.hiringStage || (appliedJob.status === "accepted" ? "shortlisted" : appliedJob.status === "rejected" ? "rejected" : "applied");
                            const badgeMeta = STAGE_BADGES[stageKey] || STAGE_BADGES.applied;

                            return (
                                <TableRow key={appliedJob._id}>
                                    <TableCell className="text-xs text-gray-500">{appliedJob?.createdAt?.split("T")[0]}</TableCell>
                                    <TableCell>
                                        {appliedJob.job?._id ? (
                                            <Link to={`/description/${appliedJob.job._id}`} className="font-semibold text-gray-900 hover:text-[#6A38C2] hover:underline block">
                                                {appliedJob.job?.title}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400 italic">Job Removed</span>
                                        )}
                                        <span className="text-xs text-gray-500">{appliedJob.job?.company?.name || "N/A"}</span>
                                    </TableCell>

                                    <TableCell>
                                        <Badge className={`${badgeMeta.cls} border-none font-semibold text-xs px-2.5 py-1 rounded-lg`}>
                                            {badgeMeta.label}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {appliedJob.interviewDetails?.date && (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[11px] border-purple-200 text-[#6A38C2] bg-purple-50/50">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        {appliedJob.interviewDetails.roundName || "Interview"}: {appliedJob.interviewDetails.date} ({appliedJob.interviewDetails.time})
                                                    </Badge>
                                                    {appliedJob.interviewDetails.meetingLink && (
                                                        <a
                                                            href={appliedJob.interviewDetails.meetingLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6A38C2] text-white text-xs font-semibold hover:bg-[#5b30a6]"
                                                        >
                                                            <Video className="w-3 h-3" /> Join Meeting
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {appliedJob.assignmentDetails?.title && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setActiveAppModal(appliedJob);
                                                        setSubmissionLink(appliedJob.assignmentDetails?.submissionLink || "");
                                                    }}
                                                    className="h-7 text-xs rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5 mr-1" />
                                                    {appliedJob.assignmentDetails?.submissionLink ? "Assignment Submitted ✓" : "Submit Assignment"}
                                                </Button>
                                            )}

                                            {(appliedJob.offerDetails?.ctc || appliedJob.joiningDetails?.joiningDate || appliedJob.emailLogs?.length > 0) && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setActiveAppModal(appliedJob);
                                                        setSubmissionLink(appliedJob.assignmentDetails?.submissionLink || "");
                                                    }}
                                                    className="h-7 text-xs rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    View Letters & Updates
                                                </Button>
                                            )}
                                        </div>
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
                                            <span className="text-xs text-gray-400">Active Pipeline</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    }
                </TableBody>
            </Table>

            {/* Candidate Application Hub Modal: View Offer Letter, Joining Letter, Assignment & Timeline */}
            <Dialog open={Boolean(activeAppModal)} onOpenChange={() => setActiveAppModal(null)}>
                <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                            <span>{activeAppModal?.job?.title} at {activeAppModal?.job?.company?.name}</span>
                            {(activeAppModal?.offerDetails?.ctc || activeAppModal?.joiningDetails?.joiningDate) && (
                                <Button type="button" size="sm" variant="outline" onClick={printLetter} className="h-8 text-xs rounded-xl">
                                    <Printer className="w-3.5 h-3.5 mr-1" /> Print / Save PDF
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {activeAppModal && (
                        <div className="space-y-5 text-sm">
                            {/* Official Joining Letter Card */}
                            {activeAppModal.joiningDetails?.joiningDate && (
                                <div className="p-5 rounded-2xl bg-green-50/80 border border-green-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4" /> Official Joining & Appointment Letter
                                        </span>
                                        <Badge className="bg-green-700 text-white">HIRED</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3.5 rounded-xl border border-green-100">
                                        <div><span className="text-gray-500">Joining Date:</span> <strong className="text-gray-900">{activeAppModal.joiningDetails.joiningDate}</strong></div>
                                        <div><span className="text-gray-500">Reporting Time:</span> <strong className="text-gray-900">{activeAppModal.joiningDetails.reportingTime}</strong></div>
                                        <div><span className="text-gray-500">Reporting Manager:</span> <strong className="text-gray-900">{activeAppModal.joiningDetails.reportingManager}</strong></div>
                                        <div><span className="text-gray-500">Work Mode:</span> <strong className="text-gray-900">{activeAppModal.joiningDetails.workMode}</strong></div>
                                        <div className="col-span-2"><span className="text-gray-500">Documents Required:</span> <strong className="text-gray-900">{activeAppModal.joiningDetails.documentsRequired}</strong></div>
                                    </div>
                                    {activeAppModal.joiningDetails.letterContent && (
                                        <div className="p-4 bg-white rounded-xl border border-green-100 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                                            {activeAppModal.joiningDetails.letterContent}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Official Offer Letter Card */}
                            {activeAppModal.offerDetails?.ctc && (
                                <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                                            <Award className="w-4 h-4" /> Official Employment Offer Letter
                                        </span>
                                        <Badge className="bg-teal-700 text-white">OFFER ISSUED</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3.5 rounded-xl border border-teal-100">
                                        <div><span className="text-gray-500">Offered CTC:</span> <strong className="text-gray-900">{activeAppModal.offerDetails.ctc}</strong></div>
                                        <div><span className="text-gray-500">Proposed Start:</span> <strong className="text-gray-900">{activeAppModal.offerDetails.joiningDate}</strong></div>
                                        <div><span className="text-gray-500">Location:</span> <strong className="text-gray-900">{activeAppModal.offerDetails.location}</strong></div>
                                        <div><span className="text-gray-500">Probation:</span> <strong className="text-gray-900">{activeAppModal.offerDetails.probationMonths} Months</strong></div>
                                        <div className="col-span-2"><span className="text-gray-500">Benefits:</span> <strong className="text-gray-900">{activeAppModal.offerDetails.benefits}</strong></div>
                                    </div>
                                    {activeAppModal.offerDetails.letterContent && (
                                        <div className="p-4 bg-white rounded-xl border border-teal-100 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                                            {activeAppModal.offerDetails.letterContent}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Technical Assignment Submission Box */}
                            {activeAppModal.assignmentDetails?.title && (
                                <form onSubmit={handleAssignmentSubmit} className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                                            📝 Technical Assignment: {activeAppModal.assignmentDetails.title}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-700">
                                            Due: {activeAppModal.assignmentDetails.deadline}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-700 whitespace-pre-line">{activeAppModal.assignmentDetails.instructions}</p>
                                    {activeAppModal.assignmentDetails.referenceLink && (
                                        <a
                                            href={activeAppModal.assignmentDetails.referenceLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                                        >
                                            Open Assignment Starter / Brief <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Input
                                            value={submissionLink}
                                            onChange={(e) => setSubmissionLink(e.target.value)}
                                            placeholder="Paste your GitHub repo / live deployment URL..."
                                            className="h-9 text-xs bg-white"
                                            required
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={submittingAssignment}
                                            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0 cursor-pointer"
                                        >
                                            {submittingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Work"}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Communication History */}
                            {activeAppModal.emailLogs?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-700 uppercase">All Messages from Recruiter</p>
                                    <div className="space-y-2">
                                        {activeAppModal.emailLogs.slice().reverse().map((log, index) => (
                                            <div key={index} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-gray-900">{log.subject}</span>
                                                    {log.previewUrl && (
                                                        <a
                                                            href={log.previewUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[11px] font-semibold text-[#6A38C2] hover:underline flex items-center gap-1"
                                                        >
                                                            View Email Copy <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{log.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setActiveAppModal(null)} className="rounded-xl">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AppliedJobTable