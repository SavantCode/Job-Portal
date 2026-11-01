import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

/**
 * UpdateProfileDialog Component
 * Supports both Candidate and Recruiter profile updates:
 * - Full Name, Email, Phone Number
 * - Bio / Recruiter Headline
 * - Skills / Hiring Focus Areas
 * - Direct Avatar Image URL or File Upload (Photo for Recruiter, Resume PDF / Photo for Student)
 */
const UpdateProfileDialog = ({ open, setOpen }) => {
    const [loading, setLoading] = useState(false);
    const { user } = useSelector(store => store.auth);
    const isRecruiter = user?.role === 'recruiter';

    const [input, setInput] = useState({
        fullname: user?.fullname || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        bio: user?.profile?.bio || "",
        skills: user?.profile?.skills?.join(", ") || "",
        profilePhotoUrl: user?.profile?.profilePhoto || "",
        file: null
    });

    useEffect(() => {
        if (user) {
            setInput({
                fullname: user.fullname || "",
                email: user.email || "",
                phoneNumber: user.phoneNumber || "",
                bio: user?.profile?.bio || "",
                skills: user?.profile?.skills?.join(", ") || "",
                profilePhotoUrl: user?.profile?.profilePhoto || "",
                file: null
            });
        }
    }, [user, open]);

    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        setInput({ ...input, file });
    }

    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("fullname", input.fullname);
        formData.append("email", input.email);
        formData.append("phoneNumber", input.phoneNumber);
        formData.append("bio", input.bio);
        formData.append("skills", input.skills);
        if (input.profilePhotoUrl) {
            formData.append("profilePhotoUrl", input.profilePhotoUrl);
        }

        if (input.file) {
            formData.append("file", input.file);
        }

        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/profile/update`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                toast.success(res.data.message);
                setOpen(false);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[460px] rounded-2xl" onInteractOutside={() => setOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>Update {isRecruiter ? "Recruiter" : "Candidate"} Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitHandler}>
                        <div className='grid gap-4 py-4'>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="fullname" className="text-right text-xs font-semibold">Full Name</Label>
                                <Input
                                    id="fullname"
                                    name="fullname"
                                    type="text"
                                    value={input.fullname}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="email" className="text-right text-xs font-semibold">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={input.email}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="phoneNumber" className="text-right text-xs font-semibold">Phone</Label>
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    type="text"
                                    value={input.phoneNumber}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="bio" className="text-right text-xs font-semibold">
                                    {isRecruiter ? "Headline / Bio" : "Bio"}
                                </Label>
                                <Input
                                    id="bio"
                                    name="bio"
                                    type="text"
                                    placeholder={isRecruiter ? "e.g. Lead Technical Recruiter at TechFlow" : "Brief summary about yourself"}
                                    value={input.bio}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="skills" className="text-right text-xs font-semibold">
                                    {isRecruiter ? "Hiring Focus" : "Skills"}
                                </Label>
                                <Input
                                    id="skills"
                                    name="skills"
                                    type="text"
                                    placeholder={isRecruiter ? "e.g. Engineering, AI/ML, Product, Cloud" : "e.g. React, Node.js, MongoDB"}
                                    value={input.skills}
                                    onChange={changeEventHandler}
                                    className="col-span-3"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="profilePhotoUrl" className="text-right text-xs font-semibold">Avatar URL</Label>
                                <Input
                                    id="profilePhotoUrl"
                                    name="profilePhotoUrl"
                                    type="text"
                                    placeholder="Paste image URL or upload file below"
                                    value={input.profilePhotoUrl}
                                    onChange={changeEventHandler}
                                    className="col-span-3 text-xs"
                                />
                            </div>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor="file" className="text-right text-xs font-semibold">
                                    {isRecruiter ? "Upload Photo" : "Resume / Photo"}
                                </Label>
                                <Input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept={isRecruiter ? "image/*" : "application/pdf,image/*"}
                                    onChange={fileChangeHandler}
                                    className="col-span-3 cursor-pointer text-xs"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            {
                                loading ? (
                                    <Button disabled className="w-full my-2">
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Saving Changes...
                                    </Button>
                                ) : (
                                    <Button type="submit" className="w-full my-2 bg-[#6A38C2] hover:bg-[#5b30a6] cursor-pointer">
                                        Save Profile Changes
                                    </Button>
                                )
                            }
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default UpdateProfileDialog