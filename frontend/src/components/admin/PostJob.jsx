import React, { useState, useEffect } from 'react'
import Navbar from '../shared/Navbar'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useSelector } from 'react-redux'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import axios from 'axios'
import { AI_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Loader2, Briefcase, MapPin, IndianRupee, Clock, Users, Building, FileText, CheckCircle2, Sparkles } from 'lucide-react'
import useGetAllCompanies from '@/hooks/useGetAllCompanies'

const LOCAL_STORAGE_KEY = "postJobFormState";

const DEFAULT_SALARIES = ["3-6", "6-10", "10-15", "15-25", "25+"];
const DEFAULT_LOCATIONS = ["Bengaluru", "Mumbai", "Hyderabad", "Pune", "Delhi NCR", "Chennai", "Noida", "Remote"];
const DEFAULT_EXPERIENCES = [
    { value: "0", label: "Fresher (0 Years)" },
    { value: "1", label: "1 Year" },
    { value: "2", label: "2 Years" },
    { value: "3", label: "3 Years" },
    { value: "4", label: "4 Years" },
    { value: "5", label: "5+ Years" }
];

/**
 * PostJob Component (Recruiter)
 * - Includes 1-click "✨ Auto-Write Job with AI" button that generates Description, Tech Stack Requirements, and suggested Salary/Experience from the Job Title
 * - Automatically persists draft state in localStorage
 */
const PostJob = () => {
    useGetAllCompanies();
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
    const [generatingAI, setGeneratingAI] = useState(false);
    const navigate = useNavigate();

    const { companies = [] } = useSelector(store => store.company);

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

    // AI Auto-Write Job Description & Tech Stack Handler
    const handleAutoGenerateJobWithAI = async () => {
        if (!input.title.trim()) {
            toast.error("Please enter a Job Title first (e.g. 'Senior Full Stack Engineer') so AI can write the posting.");
            return;
        }
        try {
            setGeneratingAI(true);
            const selectedCompany = companies.find(c => c._id === input.companyId);
            const res = await axios.post(
                `${AI_API_END_POINT}/generate-job-description`,
                {
                    title: input.title,
                    companyName: selectedCompany?.name || "our organization",
                    jobType: input.jobType || "Full-Time",
                    experience: input.experience || "1",
                    location: input.location || "Bengaluru"
                },
                { withCredentials: true }
            );

            if (res.data.success) {
                setInput(prev => ({
                    ...prev,
                    description: res.data.description || prev.description,
                    requirements: res.data.requirements || prev.requirements,
                    salary: prev.salary || String(res.data.suggestedSalary || "10-15"),
                    experience: prev.experience !== "" ? String(prev.experience) : String(res.data.suggestedExperience ?? "1"),
                    location: prev.location || "Bengaluru"
                }));
                toast.success("✨ Job Description & Tech Stack auto-generated with AI!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate job description with AI.");
        } finally {
            setGeneratingAI(false);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();

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
            toast.error("Please select or enter a Salary package.");
            return;
        }
        if (!input.location) {
            toast.error("Please select or enter a work Location.");
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
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                navigate("/admin/jobs");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const salaryOptions = input.salary && !DEFAULT_SALARIES.includes(String(input.salary))
        ? [...DEFAULT_SALARIES, String(input.salary)]
        : DEFAULT_SALARIES;

    const locationOptions = input.location && !DEFAULT_LOCATIONS.includes(String(input.location))
        ? [...DEFAULT_LOCATIONS, String(input.location)]
        : DEFAULT_LOCATIONS;

    const expOptions = input.experience !== "" && !DEFAULT_EXPERIENCES.some(e => e.value === String(input.experience))
        ? [...DEFAULT_EXPERIENCES, { value: String(input.experience), label: `${input.experience} Years` }]
        : DEFAULT_EXPERIENCES;

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />

            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-10'>
                <form onSubmit={submitHandler} className='bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm space-y-8'>

                    {/* Header Section with AI Auto-Write Button */}
                    <div className='border-b border-gray-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center shrink-0'>
                                <Briefcase className='w-6 h-6' />
                            </div>
                            <div>
                                <h1 className='text-2xl font-bold text-gray-900'>Post a New Job</h1>
                                <p className='text-xs text-muted-foreground mt-0.5'>Enter a job title and click "Auto-Write Job with AI" to generate description & skills instantly.</p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleAutoGenerateJobWithAI}
                            disabled={generatingAI}
                            className="rounded-xl bg-gradient-to-r from-[#6A38C2] to-indigo-600 hover:opacity-95 text-white text-xs font-semibold h-10 px-4 shadow-sm cursor-pointer shrink-0"
                        >
                            {generatingAI ? (
                                <><Loader2 className='w-4 h-4 mr-1.5 animate-spin' /> Writing Job with AI...</>
                            ) : (
                                <><Sparkles className='w-4 h-4 mr-1.5 text-amber-300' /> Auto-Write Job with AI</>
                            )}
                        </Button>
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
                                placeholder="e.g. Senior Full Stack Developer"
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
                            <div className='flex items-center justify-between'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <FileText className='w-4 h-4 text-[#6A38C2]' /> Job Description <span className='text-red-500'>*</span>
                                </Label>
                                <button
                                    type="button"
                                    onClick={handleAutoGenerateJobWithAI}
                                    disabled={generatingAI}
                                    className="text-xs font-semibold text-[#6A38C2] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {generatingAI ? "Generating..." : "Generate Description & Skills with AI"}
                                </button>
                            </div>
                            <textarea
                                name="description"
                                rows="6"
                                placeholder="Describe the role, responsibilities, and team culture (or click Auto-Write Job with AI)..."
                                value={input.description}
                                onChange={changeEventHandler}
                                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2] text-gray-800 resize-none shadow-xs"
                            />
                        </div>

                        {/* Requirements */}
                        <div className='col-span-1 md:col-span-2 space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <CheckCircle2 className='w-4 h-4 text-[#6A38C2]' /> Requirements & Tech Stack (comma-separated) <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                type="text"
                                name="requirements"
                                placeholder="e.g. React.js, Node.js, TypeScript, MongoDB, Docker, AWS"
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
                            <Select value={String(input.salary)} onValueChange={(value) => handleSelectChange('salary', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select salary range" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        {salaryOptions.map((sal) => (
                                            <SelectItem key={sal} value={sal}>{sal} LPA</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Location */}
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                <MapPin className='w-4 h-4 text-[#6A38C2]' /> Location <span className='text-red-500'>*</span>
                            </Label>
                            <Select value={String(input.location)} onValueChange={(value) => handleSelectChange('location', value)}>
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 w-full focus:ring-1 focus:ring-[#6A38C2]">
                                    <SelectValue placeholder="Select work location" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                    <SelectGroup>
                                        {locationOptions.map((loc) => (
                                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                        ))}
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
                                        {expOptions.map((exp) => (
                                            <SelectItem key={exp.value} value={exp.value}>{exp.label}</SelectItem>
                                        ))}
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
                            <Button type="submit" className="w-full h-12 rounded-xl bg-[#7209b7] hover:bg-[#5f32ad] text-white font-semibold shadow-md transition-all cursor-pointer">
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