import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { Loader2, Upload, User, Mail, Phone, FileText, Sparkles } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { setUser } from '@/redux/authSlice'
import { toast } from 'sonner'

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
    };

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        setInput({ ...input, file });
    };

    const parsedSkills = input.skills
        ? input.skills.split(",").map(s => s.trim()).filter(Boolean)
        : [];

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
    };

    const avatarPreview = input.profilePhotoUrl || user?.profile?.profilePhoto || "https://i.pinimg.com/736x/4c/5e/ee/4c5eee639a8f80b409bae963c1c64db9.jpg";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7" onInteractOutside={() => setOpen(false)}>
                <DialogHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                    <DialogTitle className="text-xl font-extrabold text-gray-900 dark:text-white">
                        Edit {isRecruiter ? "Recruiter" : "Candidate"} Profile
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Keep your contact details, skills, and resume updated for accurate AI matching.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submitHandler} className="space-y-5 pt-2">
                    {/* Live Avatar Preview + URL */}
                    <div className='flex items-center gap-4 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700'>
                        <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-slate-800 shadow-md shrink-0 bg-white">
                            <AvatarImage src={avatarPreview} alt="Avatar preview" className="object-cover" />
                            <AvatarFallback className="bg-purple-100 text-[#6A38C2] font-bold">
                                {input.fullname?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 space-y-1'>
                            <Label htmlFor="profilePhotoUrl" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                                Profile Photo Image URL
                            </Label>
                            <Input
                                id="profilePhotoUrl"
                                name="profilePhotoUrl"
                                type="text"
                                placeholder="https://example.com/your-photo.jpg"
                                value={input.profilePhotoUrl}
                                onChange={changeEventHandler}
                                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>

                    {/* Name & Phone */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div className='space-y-1.5'>
                            <Label htmlFor="fullname" className="text-xs font-semibold flex items-center gap-1.5">
                                <User className='w-3.5 h-3.5 text-[#6A38C2]' /> Full Name
                            </Label>
                            <Input
                                id="fullname"
                                name="fullname"
                                type="text"
                                value={input.fullname}
                                onChange={changeEventHandler}
                                className="h-10 rounded-xl text-sm"
                                required
                            />
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor="phoneNumber" className="text-xs font-semibold flex items-center gap-1.5">
                                <Phone className='w-3.5 h-3.5 text-[#6A38C2]' /> Phone Number
                            </Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="text"
                                value={input.phoneNumber}
                                onChange={changeEventHandler}
                                className="h-10 rounded-xl text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className='space-y-1.5'>
                        <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                            <Mail className='w-3.5 h-3.5 text-[#6A38C2]' /> Email Address
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={input.email}
                            onChange={changeEventHandler}
                            className="h-10 rounded-xl text-sm"
                            required
                        />
                    </div>

                    {/* Bio / Headline */}
                    <div className='space-y-1.5'>
                        <Label htmlFor="bio" className="text-xs font-semibold flex items-center gap-1.5">
                            <FileText className='w-3.5 h-3.5 text-[#6A38C2]' /> {isRecruiter ? "Recruiter Headline & Bio" : "Professional Summary / Bio"}
                        </Label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows="3"
                            placeholder={isRecruiter ? "e.g. Lead Technical Recruiter hiring across Full-Stack, Cloud & AI teams." : "Summarize your experience, key achievements, and career goals..."}
                            value={input.bio}
                            onChange={changeEventHandler}
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2] resize-none"
                        />
                    </div>

                    {/* Skills with Live Chip Preview */}
                    <div className='space-y-2'>
                        <Label htmlFor="skills" className="text-xs font-semibold flex items-center gap-1.5">
                            <Sparkles className='w-3.5 h-3.5 text-[#6A38C2]' /> {isRecruiter ? "Hiring Focus Areas (comma separated)" : "Technical Skills (comma separated)"}
                        </Label>
                        <Input
                            id="skills"
                            name="skills"
                            type="text"
                            placeholder={isRecruiter ? "Engineering, AI/ML, Product, Cloud" : "React.js, Node.js, TypeScript, MongoDB, AWS"}
                            value={input.skills}
                            onChange={changeEventHandler}
                            className="h-10 rounded-xl text-sm"
                        />
                        {parsedSkills.length > 0 && (
                            <div className='flex flex-wrap gap-1.5 pt-1'>
                                {parsedSkills.slice(0, 10).map((s, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[11px] bg-purple-50 text-[#6A38C2] border border-purple-200/60">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File Upload Dropzone */}
                    <div className='space-y-1.5'>
                        <Label htmlFor="file" className="text-xs font-semibold flex items-center gap-1.5">
                            <Upload className='w-3.5 h-3.5 text-[#6A38C2]' /> {isRecruiter ? "Upload Profile Photo" : "Upload Resume (PDF) or Photo"}
                        </Label>
                        <Input
                            id="file"
                            name="file"
                            type="file"
                            accept={isRecruiter ? "image/*" : "application/pdf,image/*"}
                            onChange={fileChangeHandler}
                            className="cursor-pointer text-xs rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-[#6A38C2]"
                        />
                    </div>

                    <DialogFooter className="pt-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="rounded-xl text-xs h-10 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        {loading ? (
                            <Button disabled className="rounded-xl h-10 bg-[#6A38C2] text-white text-xs">
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Saving Changes...
                            </Button>
                        ) : (
                            <Button type="submit" className="rounded-xl h-10 bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer px-6">
                                Save Profile Changes
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default UpdateProfileDialog