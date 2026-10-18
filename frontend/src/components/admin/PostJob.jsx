import React, { useState, useEffect } from 'react'
import Navbar from '../shared/Navbar'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useSelector } from 'react-redux'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import axios from 'axios'
import { JOB_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Loader2, Briefcase, MapPin, IndianRupee, Clock, Users, Building, FileText, CheckCircle2 } from 'lucide-react'

const LOCAL_STORAGE_KEY = "postJobFormState";

const PostJob = () => {
    // Initialize state from localStorage if available to persist data on refresh
    const [input, setInput] = useState(() => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (e) {
                console.error("Failed to parse saved form state", e);
            }
        }
        return {
            title: "",
            description: "",
            requirements: "",
            salary: "",
            location: "",
            jobType: "Full-Time",
            experience: "", 
            position: 1,
            companyId: ""
        };
    });

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { companies } = useSelector(store => store.company);

    // Save input changes to localStorage automatically so refresh won't wipe data
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(input));
    }, [input]);

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    };

    const selectCompanyHandler = (value) => {
        const selectedCompany = companies.find((company) => company.name.toLowerCase() === value);
        if (selectedCompany) {
            setInput({ ...input, companyId: selectedCompany._id });
        }
    };

    const handleSelectChange = (name, value) => {
        setInput({ ...input, [name]: value });
    };

    const submitHandler = async (e) => {
        e.preventDefault();

        // Validation checks
        if (!input.title.trim()) {
            toast.error("Please enter a Job Title.");
            return;
        }
        if (!input.companyId) {
            toast.error("Please select a Company.");
            return;
        }
        if (!input.description.trim()) {
            toast.error("Please provide a Job Description.");
            return;
        }
        if (!input.requirements.trim()) {
            toast.error("Please specify Requirements & Tech Stack.");
            return;
        }
        if (!input.salary) {
            toast.error("Please select a Salary package.");
            return;
        }
        if (!input.location) {
            toast.error("Please select a work Location.");
            return;
        }
        if (!input.jobType) {
            toast.error("Please select a Job Type.");
            return;
        }
        if (input.experience === "") {
            toast.error("Please select the Experience Level required.");
            return;
        }
        if (!input.position || input.position < 1) {
            toast.error("Please enter at least 1 open position.");
            return;
        }

        // Format data to match backend schema strictly (experience as Number, position as Number)
        const formattedData = {
            ...input,
            experience: Number(input.experience),
            position: Number(input.position)
        };

        try {
            setLoading(true);
            const res = await axios.post(`${JOB_API_END_POINT}/post`, formattedData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                toast.success(res.data.message);
                // Clear localStorage upon successful submission
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                navigate("/admin/jobs");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />

            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-10'>
                <form onSubmit={submitHandler} className='bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm space-y-8'>

                    {/* Header Section */}
                    <div className='border-b border-gray-100 pb-6 flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center'>
                                <Briefcase className='w-6 h-6' />
                            </div>
                            <div>
                                <h1 className='text-2xl font-bold text-gray-900'>Post a New Job</h1>
                                <p className='text-xs text-muted-foreground mt-0.5'>All fields are mandatory. Form data persists automatically if refreshed.</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Grid Section */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

                        {/* Job Title */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <Briefcase className='w-4 h-4 text-[#6A38C2]' /> Job Title <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                type="text"
                                name="title"
                                placeholder="e.g. Software QA Engineer"
                                value={input.title}
                                onChange={changeEventHandler}
                                className="h-11 rounded-xl border-gray-200 focus-visible:ring-1 focus-visible:ring-[#6A38C2]"
                            />
                        </div>

                        {/* Company Selection */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <Building className='w-4 h-4 text-[#6A38C2]' /> Select Company <span className='text-red-500'>*</span>
                            </Label>
                            {companies.length > 0 ? (
                                <Select onValueChange={selectCompanyHandler} value={companies.find(c => c._id === input.companyId)?.name?.toLowerCase() || ""}>
                                    <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                        <SelectValue placeholder="Select a company" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                        <SelectGroup>
                                            {companies.map((company) => (
                                                <SelectItem key={company._id} value={company?.name?.toLowerCase()} className="cursor-pointer">
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className='h-11 flex items-center px-3 rounded-xl border border-dashed border-red-200 bg-red-50/50 text-xs text-red-600 font-medium'>
                                    No companies found. Register one first!
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className='col-span-1 md:col-span-2 space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <FileText className='w-4 h-4 text-[#6A38C2]' /> Job Description <span className='text-red-500'>*</span>
                            </Label>
                            <textarea
                                name="description"
                                rows="4"
                                placeholder="Describe the role, responsibilities, and team culture..."
                                value={input.description}
                                onChange={changeEventHandler}
                                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2] text-gray-800 resize-none shadow-xs"
                            />
                        </div>

                        {/* Requirements */}
                        <div className='col-span-1 md:col-span-2 space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <CheckCircle2 className='w-4 h-4 text-[#6A38C2]' /> Requirements & Tech Stack <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                type="text"
                                name="requirements"
                                placeholder="e.g. Postman, Appium, Selenium, Bug Tracking"
                                value={input.requirements}
                                onChange={changeEventHandler}
                                className="h-11 rounded-xl border-gray-200 focus-visible:ring-1 focus-visible:ring-[#6A38C2]"
                            />
                        </div>

                        {/* Salary */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <IndianRupee className='w-4 h-4 text-[#6A38C2]' /> Salary Package (LPA) <span className='text-red-500'>*</span>
                            </Label>
                            <Select value={input.salary} onValueChange={(value) => handleSelectChange('salary', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select salary range" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        <SelectItem value="3-6">3 - 6 LPA</SelectItem>
                                        <SelectItem value="6-10">6 - 10 LPA</SelectItem>
                                        <SelectItem value="10-15">10 - 15 LPA</SelectItem>
                                        <SelectItem value="15-25">15 - 25 LPA</SelectItem>
                                        <SelectItem value="25+">25+ LPA</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Location */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <MapPin className='w-4 h-4 text-[#6A38C2]' /> Location <span className='text-red-500'>*</span>
                            </Label>
                            <Select value={input.location} onValueChange={(value) => handleSelectChange('location', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select work location" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                                        <SelectItem value="Mumbai">Mumbai</SelectItem>
                                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                                        <SelectItem value="Pune">Pune</SelectItem>
                                        <SelectItem value="Remote">Remote</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Job Type */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <Clock className='w-4 h-4 text-[#6A38C2]' /> Job Type <span className='text-red-500'>*</span>
                            </Label>
                            <Select value={input.jobType} onValueChange={(value) => handleSelectChange('jobType', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select job type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                        <SelectItem value="Freelance">Freelance</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Experience Level */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <Clock className='w-4 h-4 text-[#6A38C2]' /> Experience Level <span className='text-red-500'>*</span>
                            </Label>
                            <Select value={String(input.experience)} onValueChange={(value) => handleSelectChange('experience', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select experience required" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        <SelectItem value="0">Fresher (0 Years)</SelectItem>
                                        <SelectItem value="1">1 Year</SelectItem>
                                        <SelectItem value="2">2 Years</SelectItem>
                                        <SelectItem value="3">3 Years</SelectItem>
                                        <SelectItem value="5">5+ Years</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* No of Positions */}
                        <div className='space-y-2 col-span-1 md:col-span-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <Users className='w-4 h-4 text-[#6A38C2]' /> No. of Open Positions <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                type="number"
                                name="position"
                                min="1"
                                max="50"
                                placeholder="1"
                                value={input.position}
                                onChange={changeEventHandler}
                                className="h-11 rounded-xl border-gray-200 focus-visible:ring-1 focus-visible:ring-[#6A38C2]"
                            />
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className='pt-4'>
                        {loading ? (
                            <Button disabled className="w-full h-12 rounded-xl bg-[#6A38C2] text-white font-semibold">
                                <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Publishing Job...
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full h-12 rounded-xl bg-[#7209b7] hover:bg-[#5f32ad] text-white font-semibold shadow-md transition-all">
                                Post New Job
                            </Button>
                        )}

                        {companies.length === 0 && (
                            <p className='text-xs text-red-600 font-semibold text-center mt-3'>
                                *Please register a company first, before posting a job.
                            </p>
                        )}
                    </div>

                </form>
            </div>
        </div>
    )
}

export default PostJob