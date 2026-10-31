import React, { useEffect, useMemo, useState } from 'react';
import Navbar from './shared/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { NOTIFICATION_API_END_POINT } from '@/utils/constant';
import {
    setNotifications,
    markOneReadInStore,
    markAllReadInStore,
    removeNotificationFromStore,
    clearNotificationsInStore
} from '@/redux/notificationSlice';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import {
    Bell, Trash2, CheckCheck, Calendar, Award, ClipboardList,
    Building2, ExternalLink, Video, Download, CheckCircle2, XCircle, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    shortlisted: { label: "Shortlisted", icon: CheckCircle2, badgeCls: "bg-blue-100 text-blue-800" },
    assignment: { label: "Assignment", icon: ClipboardList, badgeCls: "bg-indigo-100 text-indigo-800" },
    interview: { label: "Interview Invite", icon: Calendar, badgeCls: "bg-purple-100 text-[#6A38C2]" },
    interview_passed: { label: "Round Cleared", icon: CheckCircle2, badgeCls: "bg-emerald-100 text-emerald-800" },
    offer_letter: { label: "Offer Letter", icon: Award, badgeCls: "bg-teal-100 text-teal-900" },
    joining_letter: { label: "Joining Letter", icon: Building2, badgeCls: "bg-green-100 text-green-900" },
    rejected: { label: "Status Update", icon: XCircle, badgeCls: "bg-red-100 text-red-700" },
    status_update: { label: "Application", icon: Bell, badgeCls: "bg-gray-100 text-gray-700" }
};

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications = [] } = useSelector(store => store.notification);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const [selectedNotif, setSelectedNotif] = useState(null);

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
            if (filter === "assignments") return n.type === "assignment";
            if (filter === "letters") return n.type === "offer_letter" || n.type === "joining_letter";
            return true;
        });
    }, [notifications, filter]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

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
                                    <h1 className="text-2xl font-bold text-gray-900">Notifications & Letters Center</h1>
                                    {unreadCount > 0 && (
                                        <Badge className="bg-[#F83002] text-white border-none text-xs">
                                            {unreadCount} Unread
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    View all interview invitations, calendar links, assignments, offer letters, and joining letters.
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
                            { id: "interviews", label: "Interviews & Calendar" },
                            { id: "assignments", label: "Assignments" },
                            { id: "letters", label: "Offer & Joining Letters" }
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
                            <p className="text-xs text-gray-500">When recruiters shortlist you, schedule interviews, or send offer letters, they will appear here.</p>
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
                                        onClick={() => {
                                            setSelectedNotif(notif);
                                            if (!notif.isRead) handleMarkRead(notif._id);
                                        }}
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
                                                    setSelectedNotif(notif);
                                                    if (!notif.isRead) handleMarkRead(notif._id);
                                                }}
                                                className="h-8 text-xs rounded-xl border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" /> Open Letter / Details
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

                            {/* Offer Summary Box */}
                            {selectedNotif.metadata?.offerDetails?.ctc && (
                                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5 text-xs">
                                    <p className="font-bold text-teal-900 uppercase">🎉 Official Offer Package Summary</p>
                                    <p><strong>Compensation (CTC):</strong> {selectedNotif.metadata.offerDetails.ctc}</p>
                                    <p><strong>Joining Date:</strong> {selectedNotif.metadata.offerDetails.joiningDate}</p>
                                    <p><strong>Location:</strong> {selectedNotif.metadata.offerDetails.location}</p>
                                    <p><strong>Benefits:</strong> {selectedNotif.metadata.offerDetails.benefits}</p>
                                </div>
                            )}

                            {/* Joining Letter Box */}
                            {selectedNotif.metadata?.joiningDetails?.joiningDate && (
                                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 space-y-1.5 text-xs">
                                    <p className="font-bold text-green-900 uppercase">🏛️ Official Joining Instructions</p>
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
                            <Button type="button" onClick={() => setSelectedNotif(null)} className="rounded-xl bg-[#6A38C2] text-white text-xs">
                                Done
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Notifications;