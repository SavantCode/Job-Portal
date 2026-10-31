import React, { useMemo, useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
    FileText, ExternalLink, Eye, Sparkles, Mail, Calendar, Send,
    CheckCircle2, XCircle, ClipboardList, Award, Building2, Loader2, ArrowRight
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { AI_API_END_POINT, APPLICATION_API_END_POINT } from '@/utils/constant';
import axios from 'axios';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { setAllApplicants } from '@/redux/applicationSlice';

const STAGE_META = {
    applied: { label: "Applied (Pending)", color: "bg-gray-100 text-gray-700 border-gray-200" },
    shortlisted: { label: "1. Shortlisted", color: "bg-blue-50 text-blue-700 border-blue-200" },
    assignment_sent: { label: "2. Assignment Sent", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    interview_scheduled: { label: "3. Interview Scheduled", color: "bg-purple-50 text-[#6A38C2] border-purple-200" },
    interview_passed: { label: "4. Interview Cleared", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    offer_sent: { label: "5. Offer Letter Sent", color: "bg-teal-50 text-teal-800 border-teal-200" },
    hired: { label: "6. Joining Letter Issued", color: "bg-green-100 text-green-800 border-green-300" },
    rejected: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" }
};

/**
 * Returns available next hiring pipeline actions based on current candidate stage
 * Enforces sequential hiring logic:
 * Accept Application -> Assignment / Schedule Interview -> Next Interview Round / Pass Interview -> Offer Letter -> Joining Letter
 */
const getAvailableStageActions = (item) => {
    const stage = item?.hiringStage || (item?.status === 'accepted' ? 'shortlisted' : item?.status === 'rejected' ? 'rejected' : 'applied');
    const round = item?.currentRound || 0;

    if (stage === "applied") {
        return [
            { key: "shortlist", label: "1. Accept & Shortlist Application", icon: CheckCircle2, primary: true },
            { key: "rejection", label: "Reject Application", icon: XCircle, danger: true }
        ];
    }

    if (stage === "shortlisted" || stage === "assignment_sent") {
        return [
            { key: "assignment", label: "Send Technical Assignment", icon: ClipboardList },
            { key: "interview", label: "Schedule Round 1 Interview (.ics)", icon: Calendar, primary: true },
            { key: "rejection", label: "Send Constructive Rejection", icon: XCircle, danger: true }
        ];
    }

    if (stage === "interview_scheduled") {
        return [
            { key: "interview_passed", label: `Mark Round ${round || 1} Cleared`, icon: CheckCircle2, primary: true },
            { key: "interview", label: `Schedule Round ${(round || 1) + 1} / Next Interview`, icon: Calendar },
            { key: "offer_letter", label: "Fast-Track: Send Offer Letter", icon: Award },
            { key: "rejection", label: "Reject After Interview", icon: XCircle, danger: true }
        ];
    }

    if (stage === "interview_passed") {
        return [
            { key: "offer_letter", label: "Send Official Offer Letter", icon: Award, primary: true },
            { key: "interview", label: `Schedule Further Round (Round ${(round || 1) + 1})`, icon: Calendar },
            { key: "rejection", label: "Send Rejection Feedback", icon: XCircle, danger: true }
        ];
    }

    if (stage === "offer_sent") {
        return [
            { key: "joining_letter", label: "Send Official Joining Letter", icon: Building2, primary: true },
            { key: "offer_letter", label: "Resend / Revise Offer Letter", icon: Award }
        ];
    }

    if (stage === "hired") {
        return [
            { key: "joining_letter", label: "Resend Joining Letter", icon: Building2 }
        ];
    }

    if (stage === "rejected") {
        return [
            { key: "shortlist", label: "Reconsider & Shortlist Candidate", icon: CheckCircle2 }
        ];
    }

    return [];
};

const ApplicantsTable = ({ skillQuery = "", statusFilter = "all" }) => {
    const { applicants } = useSelector(store => store.application);
    const dispatch = useDispatch();

    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Hiring Pipeline Studio Modal State
    const [studioCandidate, setStudioCandidate] = useState(null);
    const [actionType, setActionType] = useState("shortlist");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [draftingAI, setDraftingAI] = useState(false);
    const [sendingAction, setSendingAction] = useState(false);
    const [lastPreviewUrl, setLastPreviewUrl] = useState("");

    // Stage-Specific Form Inputs
    const [interviewForm, setInterviewForm] = useState({
        roundName: "Round 1: Technical Interview",
        roundNumber: 1,
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "11:00",
        duration: 45,
        mode: "Google Meet",
        meetingLink: "https://meet.google.com/new",
        notes: "Please have your IDE and portfolio ready for live screen sharing."
    });

    const [assignmentForm, setAssignmentForm] = useState({
        title: "Full-Stack Feature Implementation Challenge",
        instructions: "Build a clean, modular solution for the problem statement and share your GitHub repository + live deployment link.",
        referenceLink: "https://github.com/",
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
    });

    const [offerForm, setOfferForm] = useState({
        ctc: `${applicants?.salary || "12"} LPA`,
        joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        location: applicants?.location || "Bengaluru (Hybrid)",
        probationMonths: 3,
        benefits: "Comprehensive Health Insurance, MacBook Pro, Learning & Wellness Allowance"
    });

    const [joiningForm, setJoiningForm] = useState({
        joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        reportingTime: "10:00 AM",
        reportingManager: "VP of Engineering & People Ops",
        workMode: "Hybrid",
        documentsRequired: "Aadhaar/Passport, PAN Card, Educational Certificates, Previous Relieving Letters, Bank Account Details"
    });

    const openHiringStudio = async (item, chosenAction) => {
        setStudioCandidate(item);
        setActionType(chosenAction);
        setLastPreviewUrl("");

        const nextRound = (item?.currentRound || 0) + 1;
        const updatedInterview = {
            ...interviewForm,
            roundNumber: chosenAction === "interview" ? nextRound : (item?.currentRound || 1),
            roundName: nextRound === 1
                ? "Round 1: Technical Screening"
                : nextRound === 2
                ? "Round 2: System Design & Architecture"
                : `Round ${nextRound}: Final Managerial / HR Round`
        };
        setInterviewForm(updatedInterview);

        const updatedOffer = {
            ...offerForm,
            ctc: item?.offerDetails?.ctc || `${applicants?.salary || "12"} LPA`,
            location: item?.offerDetails?.location || applicants?.location || "Bengaluru"
        };
        setOfferForm(updatedOffer);

        await handleDraftWithAI(item._id, chosenAction, updatedInterview, assignmentForm, updatedOffer, joiningForm);
    };

    const handleDraftWithAI = async (
        appId = studioCandidate?._id,
        act = actionType,
        intDetails = interviewForm,
        assDetails = assignmentForm,
        offDetails = offerForm,
        joinDetails = joiningForm
    ) => {
        if (!appId) return;
        try {
            setDraftingAI(true);
            const res = await axios.post(
                `${AI_API_END_POINT}/draft-hiring-email`,
                {
                    applicationId: appId,
                    actionType: act,
                    interviewDetails: intDetails,
                    assignmentDetails: assDetails,
                    offerDetails: offDetails,
                    joiningDetails: joinDetails
                },
                { withCredentials: true }
            );
            if (res.data.success) {
                setSubject(res.data.subject);
                setBody(res.data.body);
                setSuggestedQuestions(res.data.suggestedQuestions || []);
            }
        } catch (error) {
            toast.error("Failed to auto-draft message.");
        } finally {
            setDraftingAI(false);
        }
    };

    const handleExecuteHiringAction = async (e) => {
        e.preventDefault();
        if (!studioCandidate) return;
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and message body are required.");
            return;
        }

        try {
            setSendingAction(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/${studioCandidate._id}/hiring-action`,
                {
                    actionType,
                    subject,
                    body,
                    sendEmail: true,
                    interviewDetails: interviewForm,
                    assignmentDetails: assignmentForm,
                    offerDetails: offerForm,
                    joiningDetails: joiningForm
                },
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success(res.data.message);
                if (res.data.previewUrl) {
                    setLastPreviewUrl(res.data.previewUrl);
                }

                // Update Redux state with updated application
                if (applicants?.applications) {
                    const updatedApps = applicants.applications.map(app =>
                        app._id === studioCandidate._id ? { ...res.data.application, applicant: studioCandidate.applicant } : app
                    );
                    dispatch(setAllApplicants({ ...applicants, applications: updatedApps }));
                    setStudioCandidate({ ...res.data.application, applicant: studioCandidate.applicant });
                }

                if (!res.data.previewUrl) {
                    setStudioCandidate(null);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to execute hiring stage action.");
        } finally {
            setSendingAction(false);
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
                <TableCaption>Enterprise Hiring Pipeline — Sequential Stage Actions & AI Email Dispatcher</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead>Profile & Audit</TableHead>
                        <TableHead>Current Hiring Stage</TableHead>
                        <TableHead className="text-right">Next Pipeline Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        filteredApplications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No applicants match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : filteredApplications.map((item) => {
                            const stageKey = item?.hiringStage || (item?.status === 'accepted' ? 'shortlisted' : item?.status === 'rejected' ? 'rejected' : 'applied');
                            const stageInfo = STAGE_META[stageKey] || STAGE_META.applied;
                            const availableActions = getAvailableStageActions(item);

                            return (
                                <TableRow key={item._id}>
                                    <TableCell>
                                        <div className="font-semibold text-gray-900">{item?.applicant?.fullname}</div>
                                        <div className="text-xs text-gray-500">{item?.applicant?.email} • {item?.applicant?.phoneNumber}</div>
                                        {item?.assignmentDetails?.submissionLink && (
                                            <a
                                                href={item.assignmentDetails.submissionLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                            >
                                                <ClipboardList className="w-3 h-3" /> View Submitted Assignment
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
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
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedCandidate(item)}
                                                className="h-8 text-xs rounded-lg border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                Resume & Logs ({item?.emailLogs?.length || 0})
                                            </Button>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge className={`border font-semibold text-xs px-2.5 py-1 rounded-lg ${stageInfo.color}`}>
                                            {stageInfo.label}
                                        </Badge>
                                        {item?.interviewDetails?.date && stageKey === 'interview_scheduled' && (
                                            <div className="text-[11px] text-gray-500 mt-1">
                                                📅 {item.interviewDetails.roundName}: {item.interviewDetails.date} ({item.interviewDetails.time})
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {availableActions.map((act) => {
                                                const Icon = act.icon;
                                                return (
                                                    <Button
                                                        key={act.key}
                                                        type="button"
                                                        size="sm"
                                                        variant={act.danger ? "outline" : act.primary ? "default" : "outline"}
                                                        onClick={() => openHiringStudio(item, act.key)}
                                                        className={`h-8 text-xs rounded-xl cursor-pointer ${
                                                            act.primary
                                                                ? "bg-[#6A38C2] hover:bg-[#5b30a6] text-white"
                                                                : act.danger
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "border-purple-200 text-[#6A38C2] hover:bg-purple-50"
                                                        }`}
                                                    >
                                                        <Icon className="w-3.5 h-3.5 mr-1" />
                                                        {act.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    }
                </TableBody>
            </Table>

            {/* Candidate Resume & Communication Audit Trail Modal */}
            <Dialog open={Boolean(selectedCandidate)} onOpenChange={() => setSelectedCandidate(null)}>
                <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {selectedCandidate?.applicant?.fullname} — Candidate Dossier & Email Audit Log
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

                            {/* Sent Emails & Letters Audit Trail */}
                            {selectedCandidate.emailLogs?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Sent Emails & Official Letters ({selectedCandidate.emailLogs.length})
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {selectedCandidate.emailLogs.slice().reverse().map((log, i) => (
                                            <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-xs text-gray-900">{log.subject}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] uppercase">{log.actionType}</Badge>
                                                        {log.previewUrl && (
                                                            <a
                                                                href={log.previewUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[11px] font-bold text-[#6A38C2] hover:underline flex items-center gap-1"
                                                            >
                                                                Live Email Preview <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">{log.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume Preview */}
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
                                        className="w-full h-72 rounded-xl border border-gray-200 bg-gray-50"
                                    />
                                ) : (
                                    <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                                        Candidate has not uploaded a PDF resume yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Enterprise AI Hiring Pipeline & Letter Dispatcher Modal */}
            <Dialog open={Boolean(studioCandidate)} onOpenChange={() => setStudioCandidate(null)}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2 text-lg font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-[#6A38C2]" />
                                <span>Enterprise Hiring Action & AI Letter Studio — {studioCandidate?.applicant?.fullname}</span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {studioCandidate && (
                        <form onSubmit={handleExecuteHiringAction} className="space-y-5 text-sm">
                            {/* Stage Action Switcher */}
                            <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {[
                                        { id: "shortlist", label: "1. Shortlist" },
                                        { id: "assignment", label: "2. Assignment" },
                                        { id: "interview", label: "3. Interview (.ics)" },
                                        { id: "interview_passed", label: "4. Pass Round" },
                                        { id: "offer_letter", label: "5. Offer Letter" },
                                        { id: "joining_letter", label: "6. Joining Letter" },
                                        { id: "rejection", label: "Reject" }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setActionType(tab.id);
                                                handleDraftWithAI(studioCandidate._id, tab.id);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                                actionType === tab.id
                                                    ? "bg-[#6A38C2] text-white shadow-xs"
                                                    : "bg-white text-gray-700 hover:bg-purple-100"
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={draftingAI}
                                    onClick={() => handleDraftWithAI(studioCandidate._id, actionType)}
                                    className="h-8 rounded-xl border-purple-200 text-[#6A38C2] bg-white text-xs font-semibold cursor-pointer"
                                >
                                    {draftingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                                    Redraft with Groq AI
                                </Button>
                            </div>

                            {/* Conditional Stage Form Fields */}
                            {actionType === "interview" && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs font-semibold">Interview Round Name</Label>
                                        <Input
                                            value={interviewForm.roundName}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, roundName: e.target.value })}
                                            placeholder="e.g. Round 1: Technical Coding Interview"
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Round Number</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={interviewForm.roundNumber}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, roundNumber: Number(e.target.value) })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Interview Date *</Label>
                                        <Input
                                            type="date"
                                            value={interviewForm.date}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Start Time *</Label>
                                        <Input
                                            type="time"
                                            value={interviewForm.time}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Duration (Mins)</Label>
                                        <Input
                                            type="number"
                                            value={interviewForm.duration}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, duration: Number(e.target.value) })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Platform / Mode</Label>
                                        <Input
                                            value={interviewForm.mode}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, mode: e.target.value })}
                                            placeholder="Google Meet / Zoom / Teams"
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs font-semibold">Meeting Join Link (Google Meet / Zoom)</Label>
                                        <Input
                                            value={interviewForm.meetingLink}
                                            onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                                            placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {actionType === "assignment" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                                    <div>
                                        <Label className="text-xs font-semibold">Assignment Title *</Label>
                                        <Input
                                            value={assignmentForm.title}
                                            onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Submission Deadline *</Label>
                                        <Input
                                            type="date"
                                            value={assignmentForm.deadline}
                                            onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs font-semibold">Reference / Brief Link (GitHub / Notion / Doc)</Label>
                                        <Input
                                            value={assignmentForm.referenceLink}
                                            onChange={(e) => setAssignmentForm({ ...assignmentForm, referenceLink: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs font-semibold">Key Instructions</Label>
                                        <Input
                                            value={assignmentForm.instructions}
                                            onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {actionType === "offer_letter" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                                    <div>
                                        <Label className="text-xs font-semibold">Offered Annual CTC *</Label>
                                        <Input
                                            value={offerForm.ctc}
                                            onChange={(e) => setOfferForm({ ...offerForm, ctc: e.target.value })}
                                            placeholder="e.g. 14.5 LPA"
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Proposed Joining Date *</Label>
                                        <Input
                                            type="date"
                                            value={offerForm.joiningDate}
                                            onChange={(e) => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Work Location</Label>
                                        <Input
                                            value={offerForm.location}
                                            onChange={(e) => setOfferForm({ ...offerForm, location: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Perks & Benefits</Label>
                                        <Input
                                            value={offerForm.benefits}
                                            onChange={(e) => setOfferForm({ ...offerForm, benefits: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {actionType === "joining_letter" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-green-50/60 border border-green-200">
                                    <div>
                                        <Label className="text-xs font-semibold">Official Joining Date *</Label>
                                        <Input
                                            type="date"
                                            value={joiningForm.joiningDate}
                                            onChange={(e) => setJoiningForm({ ...joiningForm, joiningDate: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Reporting Time</Label>
                                        <Input
                                            value={joiningForm.reportingTime}
                                            onChange={(e) => setJoiningForm({ ...joiningForm, reportingTime: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Reporting Manager</Label>
                                        <Input
                                            value={joiningForm.reportingManager}
                                            onChange={(e) => setJoiningForm({ ...joiningForm, reportingManager: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Work Mode</Label>
                                        <Input
                                            value={joiningForm.workMode}
                                            onChange={(e) => setJoiningForm({ ...joiningForm, workMode: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="text-xs font-semibold">Mandatory Onboarding Documents</Label>
                                        <Input
                                            value={joiningForm.documentsRequired}
                                            onChange={(e) => setJoiningForm({ ...joiningForm, documentsRequired: e.target.value })}
                                            className="h-9 text-xs bg-white mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email / Letter Subject & Body */}
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-700">Email / Letter Subject Line</Label>
                                    <Input
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="h-10 text-sm mt-1 rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-700">
                                        Personalized Message / Letter Body (Sent via HTML Email + In-App Notification)
                                    </Label>
                                    <textarea
                                        rows="7"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        className="w-full mt-1 rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#6A38C2]"
                                        required
                                    />
                                </div>
                            </div>

                            {/* AI Suggested Interview Questions for Recruiter */}
                            {actionType === "interview" && suggestedQuestions.length > 0 && (
                                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                                    <p className="text-[11px] font-bold text-[#6A38C2] uppercase">
                                        🧠 AI Suggested Interview Questions for {studioCandidate?.applicant?.fullname} (Recruiter Private Note)
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                                        {suggestedQuestions.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Live Ethereal Email Preview Banner */}
                            {lastPreviewUrl && (
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-emerald-900">
                                            ✅ Email & In-App Notification Dispatched Successfully!
                                        </p>
                                        <p className="text-[11px] text-emerald-700">
                                            Click to view the live branded HTML email & attached .ics / letter in the Ethereal Sandbox.
                                        </p>
                                    </div>
                                    <a
                                        href={lastPreviewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                                    >
                                        <span>View Live Sent Email</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            )}

                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={() => setStudioCandidate(null)} className="rounded-xl">
                                    Close
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={sendingAction || draftingAI}
                                    className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-semibold cursor-pointer"
                                >
                                    {sendingAction ? (
                                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Dispatching Email & Updating Stage...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-1.5" /> Confirm & Send to Candidate</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ApplicantsTable