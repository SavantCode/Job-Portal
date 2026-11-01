import React, { useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
    LogOut, User2, ChevronDown, Bell, CheckCircle2, XCircle,
    Sparkles, Calendar, Award, ClipboardList, Users, Menu, Briefcase, Home, Compass
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { APPLICATION_API_END_POINT, NOTIFICATION_API_END_POINT, USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { setAllAppliedJobs, setAllAdminJobs, resetJobFilters } from '@/redux/jobSlice'
import { setCompanies, setSingleCompany } from '@/redux/companySlice'
import { setAllApplicants } from '@/redux/applicationSlice'
import { setNotifications, markAllReadInStore, clearNotificationsInStore } from '@/redux/notificationSlice'
import { toast } from 'sonner'

/**
 * Shared Top Navigation Bar
 * - Supports both Student and Recruiter navigation links
 * - Fetches live notifications for both Students and Recruiters
 * - Clears all user-specific Redux slices on Logout to prevent redux-persist state leakage
 * - Includes responsive mobile navigation popover
 */
const Navbar = () => {
    const { user } = useSelector(store => store.auth);
    const { notifications = [] } = useSelector(store => store.notification);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch latest applied jobs (for students) & persistent notifications (for both students & recruiters)
    useEffect(() => {
        if (!user) return;

        if (user.role === 'student') {
            axios.get(`${APPLICATION_API_END_POINT}/get`, { withCredentials: true })
                .then(res => {
                    if (res.data.success) {
                        dispatch(setAllAppliedJobs(res.data.application));
                    }
                })
                .catch(() => {});
        }

        // Both students and recruiters receive real-time in-app notifications
        axios.get(`${NOTIFICATION_API_END_POINT}/get`, { withCredentials: true })
            .then(res => {
                if (res.data.success) {
                    dispatch(setNotifications(res.data.notifications));
                }
            })
            .catch(() => {});
    }, [user?._id, user?.role, dispatch]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAlertsSeen = async () => {
        if (unreadCount > 0) {
            try {
                await axios.put(`${NOTIFICATION_API_END_POINT}/read-all`, {}, { withCredentials: true });
                dispatch(markAllReadInStore());
            } catch {
                // ignore
            }
        }
    };

    /**
     * Logout Handler
     * Resets all user-specific Redux store slices so redux-persist never leaks
     * previous user's notifications, applied jobs, or admin companies to the next user.
     */
    const logoutHandler = async () => {
        try {
            const res = await axios.get(`${USER_API_END_POINT}/logout`, { withCredentials: true });
            if (res.data.success) {
                dispatch(setUser(null));
                dispatch(clearNotificationsInStore());
                dispatch(setAllAppliedJobs([]));
                dispatch(setAllAdminJobs([]));
                dispatch(setCompanies([]));
                dispatch(setSingleCompany(null));
                dispatch(setAllApplicants(null));
                dispatch(resetJobFilters());
                navigate("/");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    const isActivePath = (path) => location.pathname === path;

    return (
        <header className='sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-xs'>
            <div className='flex items-center justify-between mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8'>
                {/* Brand Logo */}
                <div className='flex items-center gap-3'>
                    <Link to="/" className='flex items-center gap-1 focus:outline-hidden'>
                        <h1 className='text-2xl font-extrabold tracking-tight text-gray-900'>
                            Job<span className='text-[#F83002]'>Portal</span>
                        </h1>
                    </Link>
                </div>

                {/* Navigation Links & Actions */}
                <div className='flex items-center gap-4 sm:gap-6'>
                    {/* Desktop Navigation */}
                    <nav className='hidden md:block'>
                        <ul className='flex font-medium items-center gap-6 text-gray-600 text-sm sm:text-base'>
                            {
                                user && user.role === 'recruiter' ? (
                                    <>
                                        <li>
                                            <Link
                                                to="/admin/companies"
                                                className={`transition-colors hover:text-[#F83002] ${isActivePath('/admin/companies') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                Companies
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/admin/jobs"
                                                className={`transition-colors hover:text-[#F83002] ${isActivePath('/admin/jobs') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                Jobs & Analytics
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/notifications"
                                                className={`transition-colors hover:text-[#F83002] flex items-center gap-1.5 ${isActivePath('/notifications') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                <span>Alerts</span>
                                                {unreadCount > 0 && (
                                                    <span className='px-1.5 py-0.2 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li>
                                            <Link
                                                to="/"
                                                className={`transition-colors hover:text-[#F83002] ${isActivePath('/') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                Home
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/jobs"
                                                className={`transition-colors hover:text-[#F83002] ${isActivePath('/jobs') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                Jobs
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/browse"
                                                className={`transition-colors hover:text-[#F83002] ${isActivePath('/browse') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                Browse
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/ai-cover-letter"
                                                className={`transition-colors hover:text-[#F83002] flex items-center gap-1 ${isActivePath('/ai-cover-letter') ? 'text-[#6A38C2] font-bold' : ''}`}
                                            >
                                                <Sparkles className='w-3.5 h-3.5 text-[#6A38C2]' />
                                                <span>AI Cover Letter</span>
                                            </Link>
                                        </li>
                                        {user && (
                                            <li>
                                                <Link
                                                    to="/notifications"
                                                    className={`transition-colors hover:text-[#F83002] flex items-center gap-1.5 ${isActivePath('/notifications') ? 'text-[#6A38C2] font-bold' : ''}`}
                                                >
                                                    <span>Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <span className='px-1.5 py-0.2 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        )}
                                    </>
                                )
                            }
                        </ul>
                    </nav>

                    {/* Live Notification Bell for Logged-In Users (Both Students & Recruiters) */}
                    {user && (
                        <Popover onOpenChange={(open) => { if (open) handleMarkAlertsSeen(); }}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="relative p-2 rounded-full hover:bg-purple-50 text-gray-600 hover:text-[#6A38C2] transition-colors cursor-pointer"
                                    aria-label="Notifications"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F83002] text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 shadow-xl rounded-2xl border-gray-100 overflow-hidden" align="end">
                                <div className="px-4 py-3 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">
                                            {user.role === 'recruiter' ? 'Recruiter Pipeline Alerts' : 'Hiring & Letter Alerts'}
                                        </h4>
                                        <p className="text-[11px] text-gray-500">
                                            {user.role === 'recruiter'
                                                ? 'New applicants, assignments & offer responses'
                                                : 'Interviews, assignments & official letters'}
                                        </p>
                                    </div>
                                    <Link to="/notifications" className="text-xs font-semibold text-[#6A38C2] hover:underline">
                                        Open Center
                                    </Link>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-gray-500">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.slice(0, 6).map((item) => (
                                            <div
                                                key={item._id}
                                                onClick={() => navigate("/notifications")}
                                                className="p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3"
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    {item.type === 'offer_letter' || item.type === 'joining_letter' || item.type === 'offer_accepted' ? (
                                                        <Award className="w-4 h-4 text-emerald-600" />
                                                    ) : item.type === 'interview' ? (
                                                        <Calendar className="w-4 h-4 text-[#6A38C2]" />
                                                    ) : item.type === 'assignment' || item.type === 'assignment_submitted' ? (
                                                        <ClipboardList className="w-4 h-4 text-blue-600" />
                                                    ) : item.type === 'new_application' ? (
                                                        <Users className="w-4 h-4 text-[#6A38C2]" />
                                                    ) : item.type === 'rejected' || item.type === 'offer_declined' ? (
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                                                        {item.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Mobile Navigation Menu Popover */}
                    <div className="md:hidden">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-700">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2 rounded-2xl shadow-xl border-gray-100" align="end">
                                <div className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                                    {user && user.role === 'recruiter' ? (
                                        <>
                                            <Link to="/admin/companies" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Briefcase className="w-4 h-4" /> Companies
                                            </Link>
                                            <Link to="/admin/jobs" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Users className="w-4 h-4" /> Jobs & Analytics
                                            </Link>
                                            <Link to="/notifications" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Bell className="w-4 h-4" /> Alerts {unreadCount > 0 && `(${unreadCount})`}
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Home className="w-4 h-4" /> Home
                                            </Link>
                                            <Link to="/jobs" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Briefcase className="w-4 h-4" /> Jobs
                                            </Link>
                                            <Link to="/browse" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Compass className="w-4 h-4" /> Browse
                                            </Link>
                                            <Link to="/ai-cover-letter" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                <Sparkles className="w-4 h-4 text-[#6A38C2]" /> AI Cover Letter
                                            </Link>
                                            {user && (
                                                <Link to="/notifications" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-[#6A38C2]">
                                                    <Bell className="w-4 h-4" /> Notifications {unreadCount > 0 && `(${unreadCount})`}
                                                </Link>
                                            )}
                                        </>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {
                        !user ? (
                            <div className='flex items-center gap-2 sm:gap-3'>
                                <Link to="/login">
                                    <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50 font-medium h-9 px-3 sm:px-4">Login</Button>
                                </Link>
                                <Link to="/signup">
                                    <Button size="sm" className="bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-medium shadow-xs transition-all h-9 px-3 sm:px-4">Signup</Button>
                                </Link>
                            </div>
                        ) : (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className='flex items-center gap-2 cursor-pointer group p-1 rounded-full hover:bg-gray-100 transition-colors'>
                                        <Avatar className="h-9 w-9 ring-2 ring-gray-100 group-hover:ring-[#6A38C2]/40 transition-all">
                                            <AvatarImage
                                                src={user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg"}
                                                alt="profile photo"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-purple-100 text-[#6A38C2] font-bold">
                                                {user?.fullname?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <ChevronDown className='h-4 w-4 text-gray-500 group-hover:text-gray-800 transition-transform' />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 shadow-xl rounded-xl border-gray-100">
                                    <div className='space-y-4'>
                                        {/* User Info Header */}
                                        <div className='flex items-start gap-3.5 pb-3 border-b border-gray-100'>
                                            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-purple-100">
                                                <AvatarImage
                                                    src={user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg"}
                                                    alt="profile photo"
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-purple-100 text-[#6A38C2] font-bold">
                                                    {user?.fullname?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className='space-y-1 overflow-hidden'>
                                                <h4 className='font-semibold text-gray-900 leading-tight truncate'>{user?.fullname}</h4>
                                                <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                                                    {user?.profile?.bio || (user?.role === 'recruiter' ? "Enterprise Recruiter" : "No bio added yet.")}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Menu Actions (Available for both Students & Recruiters) */}
                                        <div className='flex flex-col gap-1 text-gray-700'>
                                            <Link
                                                to="/profile"
                                                className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-[#6A38C2]'
                                            >
                                                <User2 className='h-4 w-4 text-gray-500' />
                                                <span>
                                                    {user.role === 'recruiter' ? 'Recruiter Profile & Settings' : 'View Profile & Applied Jobs'}
                                                </span>
                                            </Link>
                                            <Link
                                                to="/notifications"
                                                className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-[#6A38C2]'
                                            >
                                                <Bell className='h-4 w-4 text-gray-500' />
                                                <span>
                                                    {user.role === 'recruiter' ? 'Candidate Activity Alerts' : 'Notifications & Letters'}
                                                </span>
                                            </Link>

                                            <button
                                                onClick={logoutHandler}
                                                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium text-red-600 text-left cursor-pointer'
                                            >
                                                <LogOut className='h-4 w-4 text-red-500' />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )
                    }
                </div>
            </div>
        </header>
    )
}

export default Navbar