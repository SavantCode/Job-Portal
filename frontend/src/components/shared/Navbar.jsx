import React, { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User2, ChevronDown, Bell, CheckCircle2, XCircle, Sparkles, Calendar, Award, ClipboardList, Sun, Moon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { APPLICATION_API_END_POINT, NOTIFICATION_API_END_POINT, USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { setAllAppliedJobs } from '@/redux/jobSlice'
import { setNotifications, markAllReadInStore } from '@/redux/notificationSlice'
import { toast } from 'sonner'

const Navbar = () => {
    const { user } = useSelector(store => store.auth);
    const { notifications = [] } = useSelector(store => store.notification);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Dark Mode State
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

    const toggleDarkMode = () => {
        setIsDark(prev => !prev);
    };

    // Fetch latest applied jobs & persistent notifications for student
    useEffect(() => {
        if (user && user.role === 'student') {
            axios.get(`${APPLICATION_API_END_POINT}/get`, { withCredentials: true })
                .then(res => {
                    if (res.data.success) {
                        dispatch(setAllAppliedJobs(res.data.application));
                    }
                })
                .catch(() => {});

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
                navigate("/");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    return (
        <header className='sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-xs transition-colors'>
            <div className='flex items-center justify-between mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8'>
                {/* Logo */}
                <div>
                    <Link to="/" className='flex items-center gap-1 focus:outline-hidden'>
                        <h1 className='text-2xl font-extrabold tracking-tight text-gray-900'>
                            Job<span className='text-[#F83002]'>Portal</span>
                        </h1>
                    </Link>
                </div>

                {/* Nav Links & Actions */}
                <div className='flex items-center gap-4 sm:gap-6'>
                    <nav>
                        <ul className='flex font-medium items-center gap-5 sm:gap-6 text-gray-600 text-sm sm:text-base'>
                            {
                                user && user.role === 'recruiter' ? (
                                    <>
                                        <li>
                                            <Link to="/admin/companies" className='transition-colors hover:text-[#F83002]'>Companies</Link>
                                        </li>
                                        <li>
                                            <Link to="/admin/jobs" className='transition-colors hover:text-[#F83002]'>Jobs & Analytics</Link>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li>
                                            <Link to="/" className='transition-colors hover:text-[#F83002]'>Home</Link>
                                        </li>
                                        <li>
                                            <Link to="/jobs" className='transition-colors hover:text-[#F83002]'>Jobs</Link>
                                        </li>
                                        <li>
                                            <Link to="/browse" className='transition-colors hover:text-[#F83002]'>Browse</Link>
                                        </li>
                                        <li>
                                            <Link to="/ai-cover-letter" className='transition-colors hover:text-[#F83002] flex items-center gap-1'>
                                                <Sparkles className='w-3.5 h-3.5 text-[#6A38C2]' />
                                                <span>AI Cover Letter</span>
                                            </Link>
                                        </li>
                                        {user && user.role === 'student' && (
                                            <li>
                                                <Link to="/notifications" className='transition-colors hover:text-[#F83002] flex items-center gap-1.5'>
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

                    {/* Dark Mode Toggle Button */}
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full border border-gray-200 hover:bg-purple-50 text-gray-600 hover:text-[#6A38C2] transition-all cursor-pointer"
                        aria-label="Toggle Dark Mode"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </button>

                    {/* Job Alerts Notification Bell for Students */}
                    {user && user.role === 'student' && (
                        <Popover onOpenChange={(open) => { if (open) handleMarkAlertsSeen(); }}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="relative p-2 rounded-full hover:bg-purple-50 text-gray-600 hover:text-[#6A38C2] transition-colors cursor-pointer"
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
                            <PopoverContent className="w-80 p-0 shadow-xl rounded-2xl border-gray-100 overflow-hidden" align="end">
                                <div className="px-4 py-3 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">Hiring & Letter Alerts</h4>
                                        <p className="text-[11px] text-gray-500">Interviews, assignments & official letters</p>
                                    </div>
                                    <Link to="/notifications" className="text-xs font-semibold text-[#6A38C2] hover:underline">
                                        Open Center
                                    </Link>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-gray-500">
                                            No notifications yet. Apply to jobs to receive live updates!
                                        </div>
                                    ) : (
                                        notifications.slice(0, 6).map((item) => (
                                            <div
                                                key={item._id}
                                                onClick={() => navigate("/notifications")}
                                                className="p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3"
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

                    {
                        !user ? (
                            <div className='flex items-center gap-3'>
                                <Link to="/login">
                                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50 font-medium">Login</Button>
                                </Link>
                                <Link to="/signup">
                                    <Button className="bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-medium shadow-xs transition-all">Signup</Button>
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
                                                    {user?.profile?.bio || "No bio added yet."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Menu Actions */}
                                        <div className='flex flex-col gap-1 text-gray-700'>
                                            {
                                                user && user.role === 'student' && (
                                                    <>
                                                        <Link
                                                            to="/profile"
                                                            className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-[#6A38C2]'
                                                        >
                                                            <User2 className='h-4 w-4 text-gray-500' />
                                                            <span>View Profile & Applied Jobs</span>
                                                        </Link>
                                                        <Link
                                                            to="/notifications"
                                                            className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-[#6A38C2]'
                                                        >
                                                            <Bell className='h-4 w-4 text-gray-500' />
                                                            <span>Notifications & Letters</span>
                                                        </Link>
                                                    </>
                                                )
                                            }

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