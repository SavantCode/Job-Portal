import React, { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User2, ChevronDown, Bell, CheckCircle2, XCircle, Sparkles, Calendar, Award, ClipboardList, Sun, Moon, Menu, X } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { APPLICATION_API_END_POINT, NOTIFICATION_API_END_POINT, USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { setAllAppliedJobs, setAllAdminJobs, setSingleJob, resetJobFilters } from '@/redux/jobSlice'
import { setCompanies, setSingleCompany, setSearchCompanyByText } from '@/redux/companySlice'
import { setAllApplicants } from '@/redux/applicationSlice'
import { setNotifications, markAllReadInStore, clearNotificationsInStore } from '@/redux/notificationSlice'
import { toast } from 'sonner'

const Navbar = () => {
    const { user } = useSelector(store => store.auth);
    const { notifications = [] } = useSelector(store => store.notification);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Persistent Dark Mode State
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            return (
                document.documentElement.classList.contains("dark") ||
                localStorage.getItem("theme") === "dark"
            );
        }
        return false;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDark]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const toggleDarkMode = () => {
        setIsDark(prev => !prev);
    };

    // Fetch latest applied jobs & persistent notifications for logged-in user
    useEffect(() => {
        if (user) {
            if (user.role === 'student') {
                axios.get(`${APPLICATION_API_END_POINT}/get`, { withCredentials: true })
                    .then(res => {
                        if (res.data.success) {
                            dispatch(setAllAppliedJobs(res.data.application));
                        }
                    })
                    .catch(() => {});
            }

            axios.get(`${NOTIFICATION_API_END_POINT}/get`, { withCredentials: true })
                .then(res => {
                    if (res.data.success) {
                        dispatch(setNotifications(res.data.notifications));
                    }
                })
                .catch(() => {});
        }
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

    const logoutHandler = async () => {
        try {
            const res = await axios.get(`${USER_API_END_POINT}/logout`, { withCredentials: true });
            if (res.data.success) {
                dispatch(setUser(null));
                dispatch(setAllAppliedJobs([]));
                dispatch(setAllAdminJobs([]));
                dispatch(setSingleJob(null));
                dispatch(resetJobFilters());
                dispatch(setCompanies([]));
                dispatch(setSingleCompany(null));
                dispatch(setSearchCompanyByText(""));
                dispatch(setAllApplicants(null));
                dispatch(clearNotificationsInStore());
                navigate("/");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    const isActiveLink = (path) => location.pathname === path;

    return (
        <header className='sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 shadow-sm transition-colors'>
            <div className='flex items-center justify-between mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8'>
                {/* Logo & Mobile Menu Button */}
                <div className='flex items-center gap-2.5'>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        className='md:hidden p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer'
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
                    </button>
                    <Link to="/" className='flex items-center gap-1.5 focus:outline-none'>
                        <h1 className='text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white'>
                            Job<span className='text-[#F83002]'>Portal</span>
                        </h1>
                    </Link>
                </div>

                {/* Nav Links & Actions */}
                <div className='flex items-center gap-3 sm:gap-5'>
                    <nav className='hidden md:block'>
                        <ul className='flex font-medium items-center gap-1 text-gray-600 dark:text-slate-300 text-sm'>
                            {
                                user && user.role === 'recruiter' ? (
                                    <>
                                        <li>
                                            <Link
                                                to="/admin/companies"
                                                className={`px-3.5 py-2 rounded-xl transition-colors ${
                                                    isActiveLink('/admin/companies')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                Companies
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/admin/jobs"
                                                className={`px-3.5 py-2 rounded-xl transition-colors ${
                                                    isActiveLink('/admin/jobs')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                Jobs & Analytics
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/notifications"
                                                className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                                                    isActiveLink('/notifications')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                <span>Notifications</span>
                                                {unreadCount > 0 && (
                                                    <span className='px-1.5 py-0.5 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
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
                                                className={`px-3.5 py-2 rounded-xl transition-colors ${
                                                    isActiveLink('/')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                Home
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/jobs"
                                                className={`px-3.5 py-2 rounded-xl transition-colors ${
                                                    isActiveLink('/jobs')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                Jobs
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/browse"
                                                className={`px-3.5 py-2 rounded-xl transition-colors ${
                                                    isActiveLink('/browse')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                Browse
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="/ai-cover-letter"
                                                className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                                                    isActiveLink('/ai-cover-letter')
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                <Sparkles className='w-3.5 h-3.5 text-[#6A38C2] dark:text-purple-400' />
                                                <span>AI Cover Letter</span>
                                            </Link>
                                        </li>
                                        {user && user.role === 'student' && (
                                            <li>
                                                <Link
                                                    to="/notifications"
                                                    className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                                                        isActiveLink('/notifications')
                                                            ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                                            : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <span>Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <span className='px-1.5 py-0.5 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
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

                    {/* Modern Theme Switcher Pill */}
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="h-9 px-3 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/90 hover:bg-gray-100 dark:hover:bg-slate-700/80 text-gray-700 dark:text-slate-200 flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shadow-sm"
                        aria-label="Toggle color theme"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <>
                                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                                <span className="hidden sm:inline">Light</span>
                            </>
                        ) : (
                            <>
                                <Moon className="w-3.5 h-3.5 text-slate-600" />
                                <span className="hidden sm:inline">Dark</span>
                            </>
                        )}
                    </button>

                    {/* Job Alerts Notification Bell */}
                    {user && (
                        <Popover onOpenChange={(open) => { if (open) handleMarkAlertsSeen(); }}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-[#6A38C2] transition-colors cursor-pointer"
                                    aria-label="Job Alerts"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F83002] text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 shadow-xl rounded-2xl border-gray-100 dark:border-slate-800 overflow-hidden" align="end">
                                <div className="px-4 py-3 bg-purple-50/70 dark:bg-slate-800/80 border-b border-purple-100 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Hiring & Letter Alerts</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400">Real-time pipeline & letter updates</p>
                                    </div>
                                    <Link to="/notifications" className="text-xs font-semibold text-[#6A38C2] dark:text-purple-400 hover:underline">
                                        Open Center
                                    </Link>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-gray-500 dark:text-slate-400">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.slice(0, 6).map((item) => (
                                            <div
                                                key={item._id}
                                                onClick={() => navigate("/notifications")}
                                                className="p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3"
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    {item.type === 'offer_letter' || item.type === 'joining_letter' ? (
                                                        <Award className="w-4 h-4 text-emerald-600" />
                                                    ) : item.type === 'interview' ? (
                                                        <Calendar className="w-4 h-4 text-[#6A38C2]" />
                                                    ) : item.type === 'assignment' ? (
                                                        <ClipboardList className="w-4 h-4 text-blue-600" />
                                                    ) : item.type === 'rejected' ? (
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 line-clamp-2">
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

                    {
                        !user ? (
                            <div className='flex items-center gap-2.5'>
                                <Link to="/login">
                                    <Button variant="outline" className="rounded-xl border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium h-9 px-4">
                                        Login
                                    </Button>
                                </Link>
                                <Link to="/signup">
                                    <Button className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-medium shadow-sm transition-all h-9 px-4">
                                        Signup
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className='flex items-center gap-2 cursor-pointer group p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors'>
                                        <Avatar className="h-9 w-9 ring-2 ring-gray-100 dark:ring-slate-700 group-hover:ring-[#6A38C2]/40 transition-all">
                                            <AvatarImage
                                                src={user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg"}
                                                alt="profile photo"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-purple-100 text-[#6A38C2] font-bold">
                                                {user?.fullname?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <ChevronDown className='h-4 w-4 text-gray-500 dark:text-slate-400 group-hover:text-gray-800 dark:group-hover:text-white transition-transform' />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 shadow-xl rounded-2xl border-gray-100 dark:border-slate-800" align="end">
                                    <div className='space-y-4'>
                                        {/* User Info Header */}
                                        <div className='flex items-start gap-3.5 pb-3 border-b border-gray-100 dark:border-slate-800'>
                                            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-purple-100 dark:ring-purple-900">
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
                                                <h4 className='font-semibold text-gray-900 dark:text-white leading-tight truncate'>{user?.fullname}</h4>
                                                <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                                                    {user?.profile?.bio || (user?.role === 'recruiter' ? "Enterprise Recruiter" : "No bio added yet.")}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Menu Actions */}
                                        <div className='flex flex-col gap-1 text-gray-700 dark:text-slate-200'>
                                            <Link
                                                to="/profile"
                                                className='flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-[#6A38C2]'
                                            >
                                                <User2 className='h-4 w-4 text-gray-500 dark:text-slate-400' />
                                                <span>{user?.role === 'recruiter' ? 'Recruiter Profile' : 'View Profile & Applied Jobs'}</span>
                                            </Link>
                                            <Link
                                                to="/notifications"
                                                className='flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-[#6A38C2]'
                                            >
                                                <Bell className='h-4 w-4 text-gray-500 dark:text-slate-400' />
                                                <span>Notifications & Letters</span>
                                            </Link>

                                            <button
                                                onClick={logoutHandler}
                                                className='w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-sm font-medium text-red-600 text-left cursor-pointer'
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

            {/* Responsive Mobile Navigation Drawer */}
            {mobileMenuOpen && (
                <div className='md:hidden bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 pt-2 pb-4 space-y-1'>
                    {user && user.role === 'recruiter' ? (
                        <>
                            <Link
                                to="/admin/companies"
                                className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/admin/companies')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Companies
                            </Link>
                            <Link
                                to="/admin/jobs"
                                className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/admin/jobs')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Jobs & Analytics
                            </Link>
                            <Link
                                to="/notifications"
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/notifications')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>Notifications</span>
                                {unreadCount > 0 && (
                                    <span className='px-2 py-0.5 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/"
                                className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Home
                            </Link>
                            <Link
                                to="/jobs"
                                className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/jobs')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Jobs
                            </Link>
                            <Link
                                to="/browse"
                                className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/browse')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                Browse
                            </Link>
                            <Link
                                to="/ai-cover-letter"
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                    isActiveLink('/ai-cover-letter')
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Sparkles className='w-4 h-4 text-[#6A38C2] dark:text-purple-400' />
                                <span>AI Cover Letter</span>
                            </Link>
                            {user && user.role === 'student' && (
                                <Link
                                    to="/notifications"
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                                        isActiveLink('/notifications')
                                            ? 'bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 font-semibold'
                                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className='px-2 py-0.5 rounded-full bg-[#F83002] text-white text-[10px] font-bold'>
                                            {unreadCount}
                                        </span>
                                    )}
                                </Link>
                            )}
                        </>
                    )}
                </div>
            )}
        </header>
    )
}

export default Navbar