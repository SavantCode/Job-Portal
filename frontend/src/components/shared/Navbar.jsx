import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User2, ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

const Navbar = () => {
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

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
            toast.error(error.response.data.message);
        }
    }

    return (
        <header className='sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-xs'>
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
                <div className='flex items-center gap-8'>
                    <nav>
                        <ul className='flex font-medium items-center gap-6 text-gray-600'>
                            {
                                user && user.role === 'recruiter' ? (
                                    <>
                                        <li>
                                            <Link to="/admin/companies" className='transition-colors hover:text-[#F83002]'>Companies</Link>
                                        </li>
                                        <li>
                                            <Link to="/admin/jobs" className='transition-colors hover:text-[#F83002]'>Jobs</Link>
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
                                    </>
                                )
                            }
                        </ul>
                    </nav>

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
                                                    <Link 
                                                        to="/profile" 
                                                        className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-[#6A38C2]'
                                                    >
                                                        <User2 className='h-4 w-4 text-gray-500' />
                                                        <span>View Profile</span>
                                                    </Link>
                                                )
                                            }

                                            <button 
                                                onClick={logoutHandler} 
                                                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium text-red-600 text-left'
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