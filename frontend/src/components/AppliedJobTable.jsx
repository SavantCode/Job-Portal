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
    ExternalLink, Calendar, Eye, Printer, CheckCircle2, XCircle, ShieldCheck
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { printA4Letterhead } from '@/utils/printDocument'

const STAGE_BADGES = {
    applied: { label: "Applied (Under Review)", cls: "bg-gray-100 text-gray-700" },
    shortlisted: { label: "Shortlisted", cls: "bg-blue-100 text-blue-800" },
    assignment_sent: { label: "Assignment Pending", cls: "bg-indigo-100 text-indigo-800" },
    interview_scheduled: { label: "Interview Scheduled", cls: "bg-purple-100 text-[#6A38C2]" },
    interview_passed: { label: "Interview Cleared", cls: "bg-emerald-100 text-emerald-800" },
    offer_sent: { label: "Offer Letter Received 🎉", cls: "bg-teal-100 text-teal-900" },
    offer_accepted: { label: "Offer Accepted ✍️", cls: "bg-emerald-100 text-emerald-900" },
    offer_declined: { label: "Offer Declined", cls: "bg-amber-100 text-amber-800" },
    hired: { label: "Joining Letter Issued 🏛️", cls: "bg-green-100 text-green-900" },
    rejected: { label: "Not Selected", cls: "bg-red-100 text-red-700" }
};

const AppliedJobTable = () => {
    const { allAppliedJobs = [] } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const [withdrawingId, setWithdrawingId] = useState(null);

    // Candidate Portal Modal States
    const [activeAppModal, setActiveAppModal] = useState(null);
    const [submissionLink, setSubmissionLink] = useState("");
    const [submittingAssignment, setSubmittingAssignment] = useState(false);

    // Two-Way Offer Acceptance / Rejection State
    const [signature, setSignature] = useState("");
    const [respondingOffer, setRespondingOffer] = useState(false);

    // Branded A4 Letterhead Print Modal
    const [letterheadApp, setLetterheadApp] = useState(null);
    const [letterheadType, setLetterheadType] = useState("offer"); // "offer" | "joining"

    const openApplicationModal = (appliedJob) => {
        setActiveAppModal(appliedJob);
        setSubmissionLink(appliedJob.assignmentDetails?.submissionLink || "");
        setSignature(appliedJob.offerDetails?.candidateSignature || user?.fullname || "");
    };

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

    const handleRespondOffer = async (decision, targetApp = activeAppModal) => {
        if (!targetApp) return;
        const finalSignature = (signature || user?.fullname || "Candidate").trim();
        if (decision === "accepted" && !finalSignature) {
            toast.error("Please type your full name as your digital signature to accept the offer.");
            return;
        }
        try {
            setRespondingOffer(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/${targetApp._id}/respond-offer`,
                { decision, signature: finalSignature },
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                const updatedApp = res.data.application;
                const updatedList = allAppliedJobs.map(item =>
                    item._id === targetApp._id
                        ? {
                            ...item,
                            status: updatedApp.status || item.status,
                            hiringStage: updatedApp.hiringStage,
                            offerDetails: updatedApp.offerDetails
                        }
                        : item
                );
                dispatch(setAllAppliedJobs(updatedList));
                if (activeAppModal && activeAppModal._id === targetApp._id) {
                    setActiveAppModal({
                        ...activeAppModal,
                        status: updatedApp.status || activeAppModal.status,
                        hiringStage: updatedApp.hiringStage,
                        offerDetails: updatedApp.offerDetails
                    });
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit offer response.");
        } finally {
            setRespondingOffer(false);
        }
    };

    const openA4Letterhead = (app, type = "offer") => {
        setLetterheadApp(app);
        setLetterheadType(type);
    };

    const hasOfferSection = (app) => {
        if (!app) return false;
        return Boolean(
            app.offerDetails?.ctc ||
            app.offerDetails?.letterContent ||
            ["offer_sent", "offer_accepted", "offer_declined"].includes(app.hiringStage)
        );
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
                            const isOfferPending = stageKey === "offer_sent" && appliedJob.offerDetails?.responseStatus !== "accepted" && appliedJob.offerDetails?.responseStatus !== "declined";
                            const canWithdraw = stageKey === "applied" || (appliedJob.status === "pending" && !["hired", "rejected", "offer_accepted"].includes(stageKey));

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
                                                    onClick={() => openApplicationModal(appliedJob)}
                                                    className="h-7 text-xs rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5 mr-1" />
                                                    {appliedJob.assignmentDetails?.submissionLink ? "Assignment Submitted ✓" : "Submit Assignment"}
                                                </Button>
                                            )}

                                            {isOfferPending && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => openApplicationModal(appliedJob)}
                                                    className="h-7 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
                                                >
                                                    <Award className="w-3.5 h-3.5 mr-1" />
                                                    Accept / Decline Offer
                                                </Button>
                                            )}

                                            {(hasOfferSection(appliedJob) || appliedJob.joiningDetails?.joiningDate || appliedJob.emailLogs?.length > 0) && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openApplicationModal(appliedJob)}
                                                    className="h-7 text-xs rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    View Letters & Updates
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {canWithdraw ? (
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

            {/* Candidate Application Hub Modal: View/Accept/Decline Offer Letter, Joining Letter, Assignment & Timeline */}
            <Dialog open={Boolean(activeAppModal)} onOpenChange={() => setActiveAppModal(null)}>
                <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                            <span>{activeAppModal?.job?.title} at {activeAppModal?.job?.company?.name}</span>
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
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openA4Letterhead(activeAppModal, "joining")}
                                                className="h-7 text-xs rounded-xl bg-white border-green-300 text-green-800 cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5 mr-1" /> Open A4 Letterhead / PDF
                                            </Button>
                                            <Badge className="bg-green-700 text-white">HIRED</Badge>
                                        </div>
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

                            {/* Official Offer Letter Card + Two-Way Digital Acceptance / Rejection */}
                            {hasOfferSection(activeAppModal) && (
                                <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                                            <Award className="w-4 h-4" /> Official Employment Offer Letter
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openA4Letterhead(activeAppModal, "offer")}
                                                className="h-7 text-xs rounded-xl bg-white border-teal-300 text-teal-900 cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5 mr-1" /> Open A4 Letterhead / PDF
                                            </Button>
                                            <Badge className="bg-teal-700 text-white">
                                                {activeAppModal.offerDetails?.responseStatus === "accepted" || activeAppModal.hiringStage === "offer_accepted"
                                                    ? "OFFER ACCEPTED"
                                                    : activeAppModal.offerDetails?.responseStatus === "declined" || activeAppModal.hiringStage === "offer_declined"
                                                    ? "OFFER DECLINED"
                                                    : "OFFER ISSUED"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3.5 rounded-xl border border-teal-100">
                                        <div><span className="text-gray-500">Offered CTC:</span> <strong className="text-gray-900">{activeAppModal.offerDetails?.ctc || `${activeAppModal.job?.salary || "As discussed"} LPA`}</strong></div>
                                        <div><span className="text-gray-500">Proposed Start:</span> <strong className="text-gray-900">{activeAppModal.offerDetails?.joiningDate || "Immediate / TBD"}</strong></div>
                                        <div><span className="text-gray-500">Location:</span> <strong className="text-gray-900">{activeAppModal.offerDetails?.location || activeAppModal.job?.location || "India"}</strong></div>
                                        <div><span className="text-gray-500">Probation:</span> <strong className="text-gray-900">{activeAppModal.offerDetails?.probationMonths || 3} Months</strong></div>
                                        <div className="col-span-2"><span className="text-gray-500">Benefits:</span> <strong className="text-gray-900">{activeAppModal.offerDetails?.benefits || "Standard Corporate Benefits & Health Insurance"}</strong></div>
                                    </div>

                                    {activeAppModal.offerDetails?.letterContent && (
                                        <div className="p-4 bg-white rounded-xl border border-teal-100 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                                            {activeAppModal.offerDetails.letterContent}
                                        </div>
                                    )}

                                    {/* Two-Way Candidate Offer Response Box */}
                                    {(activeAppModal.offerDetails?.responseStatus === "accepted" || activeAppModal.hiringStage === "offer_accepted") ? (
                                        <div className="p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-between text-xs text-emerald-950">
                                            <span className="font-semibold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                                Offer Digitally Signed & Accepted by <strong>{activeAppModal.offerDetails?.candidateSignature || user?.fullname}</strong>
                                            </span>
                                            <span className="text-[11px] text-emerald-800">Recruiter Notified ✓</span>
                                        </div>
                                    ) : (activeAppModal.offerDetails?.responseStatus === "declined" || activeAppModal.hiringStage === "offer_declined") ? (
                                        <div className="p-3.5 rounded-xl bg-amber-100/80 border border-amber-300 flex items-center justify-between text-xs text-amber-900 font-semibold">
                                            <span className="flex items-center gap-1.5">
                                                <XCircle className="w-4 h-4 text-amber-700" />
                                                You declined this offer letter.
                                            </span>
                                            <span className="text-[11px]">Recruiter Notified ✓</span>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-white border border-teal-200 space-y-3">
                                            <p className="text-xs font-bold text-gray-900">
                                                ✍️ Respond to Employment Offer (Accept or Decline)
                                            </p>
                                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                                <Input
                                                    value={signature}
                                                    onChange={(e) => setSignature(e.target.value)}
                                                    placeholder="Type your full legal name as digital signature..."
                                                    className="h-9 text-xs"
                                                />
                                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={respondingOffer}
                                                        onClick={() => handleRespondOffer("accepted")}
                                                        className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                                                    >
                                                        {respondingOffer ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                                        Accept Offer
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={respondingOffer}
                                                        onClick={() => handleRespondOffer("declined")}
                                                        className="h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                                                    >
                                                        {respondingOffer ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                                                        Decline Offer
                                                    </Button>
                                                </div>
                                            </div>
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

            {/* Branded A4 Company Letterhead Modal for Printing / Saving PDF */}
            <Dialog open={Boolean(letterheadApp)} onOpenChange={() => setLetterheadApp(null)}>
                <DialogContent className="sm:max-w-[780px] max-h-[92vh] overflow-y-auto rounded-3xl p-0">
                    {letterheadApp && (
                        <div className="p-8 sm:p-10 bg-white space-y-6">
                            {/* Official Letterhead Header */}
                            <div className="flex items-start justify-between border-b-2 border-[#6A38C2] pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden">
                                        {letterheadApp.job?.company?.logo ? (
                                            <img src={letterheadApp.job.company.logo} alt="logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-7 h-7 text-[#6A38C2]" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                            {letterheadApp.job?.company?.name || "Enterprise Corporation"}
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            {letterheadApp.job?.company?.location || letterheadApp.job?.location || "Corporate Headquarters"} • Official HR Document
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-500 space-y-1">
                                    <div className="inline-block px-3 py-1 rounded-full bg-purple-100 text-[#6A38C2] font-bold uppercase tracking-wider text-[10px]">
                                        {letterheadType === "joining" ? "Official Appointment & Joining Letter" : "Official Employment Offer Letter"}
                                    </div>
                                    <p>Ref ID: JP-{letterheadApp._id?.slice(-6).toUpperCase()}</p>
                                    <p>Date: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Recipient Block */}
                            <div className="text-xs text-gray-700 space-y-0.5">
                                <p className="font-bold text-gray-900 text-sm">To: {user?.fullname || "Candidate"}</p>
                                <p>Email: {user?.email}</p>
                                <p>Position: <strong>{letterheadApp.job?.title}</strong></p>
                            </div>

                            {/* Body Text */}
                            <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed py-2">
                                {letterheadType === "joining"
                                    ? letterheadApp.joiningDetails?.letterContent
                                    : letterheadApp.offerDetails?.letterContent}
                            </div>

                            {/* Structured Terms Table */}
                            {letterheadType === "joining" ? (
                                <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                                    <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200">
                                        Onboarding & Joining Schedule
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                                        <div className="p-3"><span className="text-gray-500">Joining Date:</span> <strong className="text-gray-900 ml-1">{letterheadApp.joiningDetails?.joiningDate}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Reporting Time:</span> <strong className="text-gray-900 ml-1">{letterheadApp.joiningDetails?.reportingTime}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Reporting Manager:</span> <strong className="text-gray-900 ml-1">{letterheadApp.joiningDetails?.reportingManager}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Work Mode:</span> <strong className="text-gray-900 ml-1">{letterheadApp.joiningDetails?.workMode}</strong></div>
                                        <div className="p-3 col-span-2"><span className="text-gray-500">Mandatory Documents:</span> <strong className="text-gray-900 ml-1">{letterheadApp.joiningDetails?.documentsRequired}</strong></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                                    <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200">
                                        Compensation & Employment Terms
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                                        <div className="p-3"><span className="text-gray-500">Annual Compensation (CTC):</span> <strong className="text-gray-900 ml-1">{letterheadApp.offerDetails?.ctc}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Proposed Start Date:</span> <strong className="text-gray-900 ml-1">{letterheadApp.offerDetails?.joiningDate}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Work Location:</span> <strong className="text-gray-900 ml-1">{letterheadApp.offerDetails?.location}</strong></div>
                                        <div className="p-3"><span className="text-gray-500">Probation Period:</span> <strong className="text-gray-900 ml-1">{letterheadApp.offerDetails?.probationMonths} Months</strong></div>
                                        <div className="p-3 col-span-2"><span className="text-gray-500">Benefits & Perks:</span> <strong className="text-gray-900 ml-1">{letterheadApp.offerDetails?.benefits}</strong></div>
                                    </div>
                                </div>
                            )}

                            {/* Signatures & Digital Stamp Footer */}
                            <div className="pt-8 border-t border-gray-200 flex items-end justify-between text-xs">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-[#6A38C2] font-bold">
                                        <ShieldCheck className="w-4 h-4" /> Digitally Verified by {letterheadApp.job?.company?.name} HR
                                    </div>
                                    <p className="text-gray-500">Authorized Signatory • Talent Acquisition</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="font-serif italic text-base text-gray-900">
                                        {letterheadApp.offerDetails?.candidateSignature || user?.fullname || "Candidate Signature"}
                                    </p>
                                    <p className="text-gray-500 border-t border-gray-300 pt-1">Candidate Digital Signature</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setLetterheadApp(null)} className="rounded-xl text-xs">
                                    Close Preview
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() =>
                                        printA4Letterhead({
                                            type: letterheadType,
                                            appId: letterheadApp._id,
                                            candidateName: user?.fullname || "Candidate",
                                            candidateEmail: user?.email || "",
                                            candidatePhone: user?.phoneNumber || "",
                                            candidateSignature: letterheadApp.offerDetails?.candidateSignature || user?.fullname || "",
                                            jobTitle: letterheadApp.job?.title || "Software Engineer",
                                            companyName: letterheadApp.job?.company?.name || "Enterprise Corporation",
                                            companyLogo: letterheadApp.job?.company?.logo || "",
                                            companyLocation: letterheadApp.job?.company?.location || letterheadApp.job?.location || "India",
                                            letterBody:
                                                letterheadType === "joining"
                                                    ? letterheadApp.joiningDetails?.letterContent
                                                    : letterheadApp.offerDetails?.letterContent,
                                            offerDetails: letterheadApp.offerDetails,
                                            joiningDetails: letterheadApp.joiningDetails
                                        })
                                    }
                                    className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs cursor-pointer"
                                >
                                    <Printer className="w-4 h-4 mr-1.5" /> Print / Save Clean A4 PDF
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AppliedJobTable