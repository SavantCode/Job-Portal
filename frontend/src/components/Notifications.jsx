import React, { useEffect, useMemo, useState } from 'react';
import Navbar from './shared/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { APPLICATION_API_END_POINT, NOTIFICATION_API_END_POINT } from '@/utils/constant';
import {
    setNotifications,
    markOneReadInStore,
    markAllReadInStore,
    removeNotificationFromStore,
    clearNotificationsInStore
} from '@/redux/notificationSlice';
import { setAllAppliedJobs } from '@/redux/jobSlice';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import {
    Bell, Trash2, CheckCheck, Calendar, Award, ClipboardList,
    Building2, ExternalLink, Video, Download, CheckCircle2, XCircle, Eye, Users, Printer, ShieldCheck, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { printA4Letterhead } from '@/utils/printDocument';

const TYPE_CONFIG = {
    new_application: { label: "New Applicant", icon: Users, badgeCls: "bg-purple-100 text-[#6A38C2]" },
    shortlisted: { label: "Shortlisted", icon: CheckCircle2, badgeCls: "bg-blue-100 text-blue-800" },
    assignment: { label: "Assignment", icon: ClipboardList, badgeCls: "bg-indigo-100 text-indigo-800" },
    assignment_submitted: { label: "Assignment Submitted", icon: ClipboardList, badgeCls: "bg-blue-100 text-blue-800" },
    interview: { label: "Interview Invite", icon: Calendar, badgeCls: "bg-purple-100 text-[#6A38C2]" },
    interview_passed: { label: "Round Cleared", icon: CheckCircle2, badgeCls: "bg-emerald-100 text-emerald-800" },
    offer_letter: { label: "Offer Letter", icon: Award, badgeCls: "bg-teal-100 text-teal-900" },
    offer_accepted: { label: "Offer Accepted ✍️", icon: CheckCircle2, badgeCls: "bg-emerald-100 text-emerald-900" },
    offer_declined: { label: "Offer Declined", icon: XCircle, badgeCls: "bg-amber-100 text-amber-900" },
    joining_letter: { label: "Joining Letter", icon: Building2, badgeCls: "bg-green-100 text-green-900" },
    rejected: { label: "Status Update", icon: XCircle, badgeCls: "bg-red-100 text-red-700" },
    status_update: { label: "Application", icon: Bell, badgeCls: "bg-gray-100 text-gray-700" }
};

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications = [] } = useSelector(store => store.notification);
    const { allAppliedJobs = [] } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);
    const isRecruiter = user?.role === 'recruiter';

    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [printNotifLetter, setPrintNotifLetter] = useState(null);

    // Direct Offer Accept / Decline & Assignment Submit inside Notification Modal
    const [signature, setSignature] = useState("");
    const [respondingOffer, setRespondingOffer] = useState(false);
    const [submissionLink, setSubmissionLink] = useState("");
    const [submittingAssignment, setSubmittingAssignment] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${NOTIFICATION_API_END_POINT}/get`, { withCredentials: true });
            if (res.data.success) {
                dispatch(setNotifications(res.data.notifications));
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getApplicationIdFromNotif = (notif) => {
        if (!notif) return null;
        if (typeof notif.application === "object" && notif.application?._id) return notif.application._id;
        if (typeof notif.application === "string") return notif.application;
        if (notif.metadata?.applicationId) return notif.metadata.applicationId;
        const jobId = notif.job?._id || notif.job || notif.metadata?.jobId;
        if (jobId) {
            const matchedApp = allAppliedJobs.find(a => (a.job?._id || a.job) === jobId);
            if (matchedApp) return matchedApp._id;
        }
        return null;
    };

    const getApplicationObjectForNotif = (notif) => {
        if (!notif) return null;
        const appId = getApplicationIdFromNotif(notif);
        const fromStore = allAppliedJobs.find(a => a._id === appId);
        if (fromStore) return fromStore;
        if (typeof notif.application === "object" && notif.application) return notif.application;
        return null;
    };

    const openInspectModal = (notif) => {
        setSelectedNotif(notif);
        const appObj = getApplicationObjectForNotif(notif);
        setSignature(appObj?.offerDetails?.candidateSignature || user?.fullname || "");
        setSubmissionLink(appObj?.assignmentDetails?.submissionLink || "");
        if (!notif.isRead) handleMarkRead(notif._id);
    };

    const handleDirectOfferResponse = async (decision) => {
        const appId = getApplicationIdFromNotif(selectedNotif);
        if (!appId) {
            toast.error("Could not locate the linked application. Please respond from Applied Jobs in your Profile.");
            return;
        }
        const finalSignature = (signature || user?.fullname || "Candidate").trim();
        if (decision === "accepted" && !finalSignature) {
            toast.error("Please enter your full name as your digital signature to accept the offer.");
            return;
        }
        try {
            setRespondingOffer(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/${appId}/respond-offer`,
                { decision, signature: finalSignature },
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                const updatedApp = res.data.application;
                const updatedJobs = allAppliedJobs.map(item =>
                    item._id === appId
                        ? {
                            ...item,
                            status: updatedApp.status || item.status,
                            hiringStage: updatedApp.hiringStage,
                            offerDetails: updatedApp.offerDetails
                        }
                        : item
                );
                dispatch(setAllAppliedJobs(updatedJobs));
                // Also update selectedNotif.application in local state
                setSelectedNotif(prev => prev ? {
                    ...prev,
                    application: updatedApp
                } : null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit offer response.");
        } finally {
            setRespondingOffer(false);
        }
    };

    const handleDirectAssignmentSubmit = async (e) => {
        e.preventDefault();
        const appId = getApplicationIdFromNotif(selectedNotif);
        if (!appId) {
            toast.error("Could not locate the linked application.");
            return;
        }
        try {
            setSubmittingAssignment(true);
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/${appId}/submit-assignment`,
                { submissionLink },
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                const updatedApp = res.data.application;
                const updatedJobs = allAppliedJobs.map(item =>
                    item._id === appId ? { ...item, assignmentDetails: updatedApp.assignmentDetails } : item
                );
                dispatch(setAllAppliedJobs(updatedJobs));
                setSelectedNotif(prev => prev ? {
                    ...prev,
                    application: updatedApp
                } : null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit assignment.");
        } finally {
            setSubmittingAssignment(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await axios.put(`${NOTIFICATION_API_END_POINT}/${id}/read`, {}, { withCredentials: true });
            dispatch(markOneReadInStore(id));
        } catch (error) {
            console.log(error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await axios.put(`${NOTIFICATION_API_END_POINT}/read-all`, {}, { withCredentials: true });
            if (res.data.success) {
                dispatch(markAllReadInStore());
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error("Failed to mark all as read.");
        }
    };

    const handleDeleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await axios.delete(`${NOTIFICATION_API_END_POINT}/${id}`, { withCredentials: true });
            if (res.data.success) {
                dispatch(removeNotificationFromStore(id));
                toast.success("Notification deleted.");
                if (selectedNotif?._id === id) setSelectedNotif(null);
            }
        } catch (error) {
            toast.error("Failed to delete notification.");
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to delete all notifications?")) return;
        try {
            const res = await axios.delete(`${NOTIFICATION_API_END_POINT}/clear/all`, { withCredentials: true });
            if (res.data.success) {
                dispatch(clearNotificationsInStore());
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error("Failed to clear notifications.");
        }
    };

    const downloadICSFile = (icsContent, title = "interview-invite") => {
        if (!icsContent) return;
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Calendar invite (.ics) downloaded!");
    };

    const filteredList = useMemo(() => {
        return notifications.filter(n => {
            if (filter === "unread") return !n.isRead;
            if (filter === "interviews") return n.type === "interview" || n.type === "interview_passed";
            if (filter === "assignments") return n.type === "assignment" || n.type === "assignment_submitted";
            if (filter === "letters") return ["offer_letter", "offer_accepted", "offer_declined", "joining_letter"].includes(n.type);
            return true;
        });
    }, [notifications, filter]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const linkedApplication = getApplicationObjectForNotif(selectedNotif);
    const offerResponseStatus = linkedApplication?.offerDetails?.responseStatus || (
        linkedApplication?.hiringStage === "offer_accepted" ? "accepted" :
        linkedApplication?.hiringStage === "offer_declined" ? "declined" : "pending"
    );

    return (
        <div className="min-h-screen bg-gray-50/40 pb-20">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
                {/* Header Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center shrink-0">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {isRecruiter ? "Recruiter Activity & Alerts Center" : "Notifications & Letters Center"}
                                    </h1>
                                    {unreadCount > 0 && (
                                        <Badge className="bg-[#F83002] text-white border-none text-xs">
                                            {unreadCount} Unread
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {isRecruiter
                                        ? "Track new job applicants, submitted technical assignments, and signed offer acceptances."
                                        : "View all interview invitations, calendar links, assignments, and accept or decline offer letters."}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllRead}
                                    className="rounded-xl text-xs h-9 border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                >
                                    <CheckCheck className="w-4 h-4 mr-1.5" /> Mark All Read
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="rounded-xl text-xs h-9 border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: "all", label: `All (${notifications.length})` },
                            { id: "unread", label: `Unread (${unreadCount})` },
                            { id: "interviews", label: "Interviews" },
                            { id: "assignments", label: "Assignments" },
                            { id: "letters", label: "Offers & Letters" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFilter(tab.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    filter === tab.id
                                        ? "bg-[#6A38C2] text-white shadow-xs"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Notification List */}
                    {loading ? (
                        <div className="py-12 text-center text-sm text-gray-500">Loading your notifications...</div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-16 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 space-y-2">
                            <Bell className="w-10 h-10 text-gray-300 mx-auto" />
                            <p className="text-sm font-semibold text-gray-700">No notifications in this view</p>
                            <p className="text-xs text-gray-500">
                                {isRecruiter
                                    ? "When candidates apply, submit assignments, or accept offers, alerts will appear here."
                                    : "When recruiters shortlist you, schedule interviews, or send offer letters, they will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredList.map((notif) => {
                                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.status_update;
                                const Icon = cfg.icon;
                                const meta = notif.metadata || {};

                                return (
                                    <div
                                        key={notif._id}
                                        onClick={() => openInspectModal(notif)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                            notif.isRead
                                                ? "bg-white border-gray-100 hover:border-gray-200"
                                                : "bg-purple-50/40 border-purple-200 shadow-2xs"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-[#6A38C2] flex items-center justify-center shrink-0 mt-0.5">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge className={`${cfg.badgeCls} border-none text-[10px] font-bold`}>
                                                        {cfg.label}
                                                    </Badge>
                                                    <h3 className="font-bold text-sm text-gray-900">{notif.title}</h3>
                                                    {!notif.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-[#F83002]" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-400">
                                                    <span>{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}</span>
                                                    {meta.interviewDetails?.date && (
                                                        <span className="text-[#6A38C2] font-semibold">
                                                            📅 Interview: {meta.interviewDetails.date} at {meta.interviewDetails.time}
                                                        </span>
                                                    )}
                                                    {meta.offerDetails?.ctc && (
                                                        <span className="text-emerald-700 font-semibold">
                                                            💰 Offered CTC: {meta.offerDetails.ctc}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openInspectModal(notif);
                                                }}
                                                className="h-8 text-xs rounded-xl border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                {notif.type === "offer_letter" && !isRecruiter ? "Review & Respond" : "Inspect Details"}
                                            </Button>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => handleDeleteNotification(notif._id, e)}
                                                className="h-8 w-8 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                title="Delete Notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Full Notification & Letter Inspector Modal */}
            <Dialog open={Boolean(selectedNotif)} onOpenChange={() => setSelectedNotif(null)}>
                <DialogContent className="sm:max-w-[660px] max-h-[88vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            {selectedNotif?.emailSubject || selectedNotif?.title}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedNotif && (
                        <div className="space-y-4 text-sm">
                            {selectedNotif.metadata?.submissionLink && (
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-900">
                                        📝 Candidate Assignment Submission Link
                                    </span>
                                    <a
                                        href={selectedNotif.metadata.submissionLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                                    >
                                        Open Submitted Work <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            )}

                            {/* Direct Candidate Assignment Submission inside Notification Modal */}
                            {!isRecruiter && selectedNotif.type === "assignment" && getApplicationIdFromNotif(selectedNotif) && (
                                <form onSubmit={handleDirectAssignmentSubmit} className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2.5">
                                    <p className="text-xs font-bold text-blue-900 uppercase">
                                        📝 Submit Your Technical Assignment Directly
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={submissionLink}
                                            onChange={(e) => setSubmissionLink(e.target.value)}
                                            placeholder="Paste your GitHub repository or live deployment URL..."
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

                            {/* Interview Details Box */}
                            {selectedNotif.metadata?.interviewDetails?.date && (
                                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase text-[#6A38C2]">
                                            📅 {selectedNotif.metadata.interviewDetails.roundName || "Scheduled Interview"}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-700">
                                            {selectedNotif.metadata.interviewDetails.date} at {selectedNotif.metadata.interviewDetails.time} ({selectedNotif.metadata.interviewDetails.duration} mins)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {selectedNotif.metadata.interviewDetails.meetingLink && (
                                            <a
                                                href={selectedNotif.metadata.interviewDetails.meetingLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6A38C2] text-white text-xs font-semibold hover:bg-[#5b30a6]"
                                            >
                                                <Video className="w-3.5 h-3.5" /> Join Video Interview
                                            </a>
                                        )}
                                        {selectedNotif.metadata.icsContent && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => downloadICSFile(selectedNotif.metadata.icsContent, selectedNotif.title)}
                                                className="h-8 text-xs rounded-xl border-purple-300 text-[#6A38C2] cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" /> Download Calendar Invite (.ics)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Offer Summary Box + Direct Accept / Decline Offer Controls for Candidate */}
                            {(selectedNotif.type === "offer_letter" || selectedNotif.metadata?.offerDetails?.ctc) && (
                                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-teal-900 uppercase">🎉 Official Offer Package Summary</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPrintNotifLetter({ notif: selectedNotif, type: "offer" })}
                                            className="h-7 text-xs rounded-xl bg-white border-teal-300 text-teal-900 cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5 mr-1" /> Open A4 Letterhead / PDF
                                        </Button>
                                    </div>
                                    {selectedNotif.metadata?.offerDetails && (
                                        <div className="space-y-1">
                                            <p><strong>Compensation (CTC):</strong> {selectedNotif.metadata.offerDetails.ctc}</p>
                                            <p><strong>Joining Date:</strong> {selectedNotif.metadata.offerDetails.joiningDate}</p>
                                            <p><strong>Location:</strong> {selectedNotif.metadata.offerDetails.location}</p>
                                            <p><strong>Benefits:</strong> {selectedNotif.metadata.offerDetails.benefits}</p>
                                        </div>
                                    )}

                                    {/* Direct Candidate Offer Accept / Decline Action Bar */}
                                    {!isRecruiter && getApplicationIdFromNotif(selectedNotif) && (
                                        <div className="pt-2 border-t border-teal-200/80">
                                            {offerResponseStatus === "accepted" ? (
                                                <div className="p-3 rounded-xl bg-emerald-100/90 border border-emerald-300 flex items-center justify-between text-emerald-950 font-semibold">
                                                    <span className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                                        Offer Accepted & Digitally Signed ({linkedApplication?.offerDetails?.candidateSignature || user?.fullname})
                                                    </span>
                                                    <span>Recruiter Notified ✓</span>
                                                </div>
                                            ) : offerResponseStatus === "declined" ? (
                                                <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 flex items-center justify-between text-amber-950 font-semibold">
                                                    <span className="flex items-center gap-1.5">
                                                        <XCircle className="w-4 h-4 text-amber-700" />
                                                        You declined this offer letter.
                                                    </span>
                                                    <span>Recruiter Notified ✓</span>
                                                </div>
                                            ) : (
                                                <div className="p-3.5 rounded-xl bg-white border border-teal-200 space-y-2.5">
                                                    <p className="font-bold text-gray-900">
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
                                                                onClick={() => handleDirectOfferResponse("accepted")}
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
                                                                onClick={() => handleDirectOfferResponse("declined")}
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
                                </div>
                            )}

                            {/* Joining Letter Box */}
                            {selectedNotif.metadata?.joiningDetails?.joiningDate && (
                                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-green-900 uppercase">🏛️ Official Joining Instructions</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPrintNotifLetter({ notif: selectedNotif, type: "joining" })}
                                            className="h-7 text-xs rounded-xl bg-white border-green-300 text-green-900 cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5 mr-1" /> Open A4 Letterhead / PDF
                                        </Button>
                                    </div>
                                    <p><strong>Official Joining Date:</strong> {selectedNotif.metadata.joiningDetails.joiningDate} at {selectedNotif.metadata.joiningDetails.reportingTime}</p>
                                    <p><strong>Reporting Manager:</strong> {selectedNotif.metadata.joiningDetails.reportingManager}</p>
                                    <p><strong>Work Mode:</strong> {selectedNotif.metadata.joiningDetails.workMode}</p>
                                    <p><strong>Documents to Carry:</strong> {selectedNotif.metadata.joiningDetails.documentsRequired}</p>
                                </div>
                            )}

                            {/* Full Letter / Email Body */}
                            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                                {selectedNotif.emailBody || selectedNotif.message}
                            </div>

                            {/* Live Email Preview Link */}
                            {selectedNotif.previewUrl && (
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <span className="text-xs font-medium text-emerald-900">
                                        Want to view the exact HTML email & attachments sent to your inbox?
                                    </span>
                                    <a
                                        href={selectedNotif.previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                                    >
                                        Open Live Email Preview <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={(e) => handleDeleteNotification(selectedNotif?._id, e)}
                            className="text-red-600 hover:bg-red-50 rounded-xl text-xs cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete Notification
                        </Button>
                        <div className="flex items-center gap-2">
                            {isRecruiter && (selectedNotif?.job || selectedNotif?.metadata?.jobId) ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const jId = selectedNotif?.job?._id || selectedNotif?.job || selectedNotif?.metadata?.jobId;
                                        setSelectedNotif(null);
                                        navigate(`/admin/jobs/${jId}/applicants`);
                                    }}
                                    className="rounded-xl text-xs border-purple-200 text-[#6A38C2]"
                                >
                                    Open Candidate Pipeline →
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedNotif(null);
                                        navigate("/profile");
                                    }}
                                    className="rounded-xl text-xs"
                                >
                                    Go to Applied Jobs
                                </Button>
                            )}
                            <Button type="button" onClick={() => setSelectedNotif(null)} className="rounded-xl bg-[#6A38C2] text-white text-xs">
                                Done
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Branded A4 Letterhead Print Modal inside Notifications */}
            <Dialog open={Boolean(printNotifLetter)} onOpenChange={() => setPrintNotifLetter(null)}>
                <DialogContent className="sm:max-w-[780px] max-h-[92vh] overflow-y-auto rounded-3xl p-0">
                    {printNotifLetter && (
                        <div className="p-8 sm:p-10 bg-white space-y-6">
                            <div className="flex items-start justify-between border-b-2 border-[#6A38C2] pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden">
                                        {printNotifLetter.notif.metadata?.companyLogo ? (
                                            <img src={printNotifLetter.notif.metadata.companyLogo} alt="logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-7 h-7 text-[#6A38C2]" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                            {printNotifLetter.notif.metadata?.companyName || "Enterprise Corporation"}
                                        </h2>
                                        <p className="text-xs text-gray-500">Official HR Executive Document</p>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-500 space-y-1">
                                    <div className="inline-block px-3 py-1 rounded-full bg-purple-100 text-[#6A38C2] font-bold uppercase tracking-wider text-[10px]">
                                        {printNotifLetter.type === "joining" ? "Official Appointment & Joining Letter" : "Official Employment Offer Letter"}
                                    </div>
                                    <p>Ref ID: JP-{printNotifLetter.notif._id?.slice(-6).toUpperCase()}</p>
                                    <p>Date: {new Date(printNotifLetter.notif.createdAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="text-xs text-gray-700 space-y-0.5">
                                <p className="font-bold text-gray-900 text-sm">To: {user?.fullname || "Candidate"}</p>
                                <p>Email: {user?.email}</p>
                                <p>Position: <strong>{printNotifLetter.notif.metadata?.jobTitle || "Software Engineer"}</strong></p>
                            </div>

                            <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed py-2">
                                {printNotifLetter.notif.emailBody || printNotifLetter.notif.message}
                            </div>

                            <div className="pt-8 border-t border-gray-200 flex items-end justify-between text-xs">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-[#6A38C2] font-bold">
                                        <ShieldCheck className="w-4 h-4" /> Digitally Verified by {printNotifLetter.notif.metadata?.companyName || "Company"} HR
                                    </div>
                                    <p className="text-gray-500">Authorized Signatory • Talent Acquisition</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="font-serif italic text-base text-gray-900">{user?.fullname}</p>
                                    <p className="text-gray-500 border-t border-gray-300 pt-1">Candidate Digital Signature</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setPrintNotifLetter(null)} className="rounded-xl text-xs">
                                    Close Preview
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() =>
                                        printA4Letterhead({
                                            type: printNotifLetter.type,
                                            appId: printNotifLetter.notif._id,
                                            candidateName: user?.fullname || "Candidate",
                                            candidateEmail: user?.email || "",
                                            candidatePhone: user?.phoneNumber || "",
                                            candidateSignature: user?.fullname || "",
                                            jobTitle: printNotifLetter.notif.metadata?.jobTitle || "Software Engineer",
                                            companyName: printNotifLetter.notif.metadata?.companyName || "Enterprise Corporation",
                                            companyLogo: printNotifLetter.notif.metadata?.companyLogo || "",
                                            companyLocation: "Corporate Headquarters",
                                            letterBody: printNotifLetter.notif.emailBody || printNotifLetter.notif.message,
                                            offerDetails: printNotifLetter.notif.metadata?.offerDetails || {},
                                            joiningDetails: printNotifLetter.notif.metadata?.joiningDetails || {}
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
    );
};

export default Notifications;