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
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Briefcase, MapPin, IndianRupee, Clock, Users, Building, FileText, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react'
import useGetAllCompanies from '@/hooks/useGetAllCompanies'

/**
 * EditJob Component (Recruiter)
 * Allows editing existing job details or auto-rewriting Description & Requirements with AI
 */
const EditJob = () => {
    useGetAllCompanies();
    const { id } = useParams();
    const navigate = useNavigate();
    const { companies = [] } = useSelector(store => store.company);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [input, setInput] = useState({
        title: "",
        description: "",
        requirements: "",
        salary: "",
        location: "",
        jobType: "Full-Time",
        experience: "0",
        position: 1,
        companyId: ""
    });

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                setFetching(true);
                const res = await axios.get(`${JOB_API_END_POINT}/get/${id}`, { withCredentials: true });
                if (res.data.success && res.data.job) {
                    const job = res.data.job;
                    setInput({
                        title: job.title || "",
                        description: job.description || "",
                        requirements: Array.isArray(job.requirements) ? job.requirements.join(", ") : (job.requirements || ""),
                        salary: String(job.salary || ""),
                        location: job.location || "",
                        jobType: job.jobType || "Full-Time",
                        experience: String(job.experienceLevel ?? 0),
                        position: job.position || 1,
                        companyId: job.company?._id || job.company || ""
                    });
                }
            } catch (error) {
                toast.error("Failed to load job details.");
            } finally {
                setFetching(false);
            }
        };
        fetchJobDetails();
    }, [id]);

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, value) => {
        setInput({ ...input, [name]: value });
    };

    const handleAutoGenerateJobWithAI = async () => {
        if (!input.title.trim()) {
            toast.error("Please enter a Job Title first.");
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
                    jobType: input.jobType,
                    experience: input.experience,
                    location: input.location
                },
                { withCredentials: true }
            );
            if (res.data.success) {
                setInput(prev => ({
                    ...prev,
                    description: res.data.description || prev.description,
                    requirements: res.data.requirements || prev.requirements
                }));
                toast.success("✨ Job Description & Requirements enhanced with AI!");
            }
        } catch (error) {
            toast.error("Failed to generate with AI.");
        } finally {
            setGeneratingAI(false);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.put(`${JOB_API_END_POINT}/update/${id}`, {
                ...input,
                experience: Number(input.experience),
                position: Number(input.position)
            }, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });

            if (res.data.success) {
                toast.success(res.data.message);
                navigate("/admin/jobs");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update job.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-4xl mx-auto px-4 sm:px-6 mt-10'>
                <form onSubmit={submitHandler} className='bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm space-y-8'>
                    <div className='border-b border-gray-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => navigate("/admin/jobs")}
                                className="rounded-xl"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h1 className='text-2xl font-bold text-gray-900'>Edit Job Listing</h1>
                                <p className='text-xs text-muted-foreground mt-0.5'>Update role details, requirements, or auto-enhance with AI.</p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleAutoGenerateJobWithAI}
                            disabled={generatingAI || fetching}
                            className="rounded-xl bg-gradient-to-r from-[#6A38C2] to-indigo-600 text-white text-xs font-semibold h-10 px-4 cursor-pointer"
                        >
                            {generatingAI ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enhancing...</> : <><Sparkles className="w-4 h-4 mr-1.5 text-amber-300" /> Auto-Rewrite with AI</>}
                        </Button>
                    </div>

                    {fetching ? (
                        <div className="py-12 text-center text-sm text-gray-500">Loading job details...</div>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <Briefcase className='w-4 h-4 text-[#6A38C2]' /> Job Title
                                </Label>
                                <Input
                                    type="text"
                                    name="title"
                                    value={input.title}
                                    onChange={changeEventHandler}
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <Building className='w-4 h-4 text-[#6A38C2]' /> Company
                                </Label>
                                <Select
                                    value={input.companyId}
                                    onValueChange={(val) => handleSelectChange('companyId', val)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Select a company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {companies.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='col-span-1 md:col-span-2 space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <FileText className='w-4 h-4 text-[#6A38C2]' /> Job Description
                                </Label>
                                <textarea
                                    name="description"
                                    rows="5"
                                    value={input.description}
                                    onChange={changeEventHandler}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#6A38C2]"
                                />
                            </div>

                            <div className='col-span-1 md:col-span-2 space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-[#6A38C2]' /> Requirements (comma separated)
                                </Label>
                                <Input
                                    type="text"
                                    name="requirements"
                                    value={input.requirements}
                                    onChange={changeEventHandler}
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <IndianRupee className='w-4 h-4 text-[#6A38C2]' /> Salary Package (LPA)
                                </Label>
                                <Input
                                    type="text"
                                    name="salary"
                                    value={input.salary}
                                    onChange={changeEventHandler}
                                    placeholder="e.g. 10-15"
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <MapPin className='w-4 h-4 text-[#6A38C2]' /> Location
                                </Label>
                                <Input
                                    type="text"
                                    name="location"
                                    value={input.location}
                                    onChange={changeEventHandler}
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <Clock className='w-4 h-4 text-[#6A38C2]' /> Job Type
                                </Label>
                                <Select value={input.jobType} onValueChange={(v) => handleSelectChange('jobType', v)}>
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Select job type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="Full-Time">Full-Time</SelectItem>
                                            <SelectItem value="Internship">Internship</SelectItem>
                                            <SelectItem value="Contract">Contract</SelectItem>
                                            <SelectItem value="Freelance">Freelance</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <Clock className='w-4 h-4 text-[#6A38C2]' /> Experience (Years)
                                </Label>
                                <Input
                                    type="number"
                                    name="experience"
                                    min="0"
                                    value={input.experience}
                                    onChange={changeEventHandler}
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            <div className='space-y-2 col-span-1 md:col-span-2'>
                                <Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                                    <Users className='w-4 h-4 text-[#6A38C2]' /> Open Positions
                                </Label>
                                <Input
                                    type="number"
                                    name="position"
                                    min="1"
                                    value={input.position}
                                    onChange={changeEventHandler}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    <div className='pt-4'>
                        <Button
                            type="submit"
                            disabled={loading || fetching}
                            className="w-full h-12 rounded-xl bg-[#7209b7] hover:bg-[#5f32ad] text-white font-semibold cursor-pointer"
                        >
                            {loading ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' /> Saving Changes...</> : "Save Job Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EditJob