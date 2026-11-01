import React, { useState } from 'react';
import Navbar from './shared/Navbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { AI_API_END_POINT } from '@/utils/constant';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import useGetAllJobs from '@/hooks/useGetAllJobs';
import { Sparkles, Loader2, Copy, Check, RotateCcw, Briefcase } from 'lucide-react';

/**
 * AICoverLetterGenerator Component
 * - Allows candidates to auto-fill Job Title, Company & Description from any active portal job in 1 click
 * - Or paste an external job description manually
 * - Generates a tailored 100-word outreach pitch / cover letter
 */
const AICoverLetterGenerator = () => {
    useGetAllJobs();
    const { allJobs = [] } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        externalTitle: '',
        externalCompany: '',
        externalJobDescription: ''
    });

    const [selectedJobId, setSelectedJobId] = useState("");
    const [coverLetter, setCoverLetter] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Quick-fill from any live job in the portal
    const handleSelectPortalJob = (jobId) => {
        setSelectedJobId(jobId);
        const found = allJobs.find(j => j._id === jobId);
        if (found) {
            const reqStr = Array.isArray(found.requirements) ? `\nKey Skills: ${found.requirements.join(", ")}` : "";
            setFormData({
                externalTitle: found.title || "",
                externalCompany: found.company?.name || "",
                externalJobDescription: `${found.description || ""}${reqStr}`.trim()
            });
            toast.success(`Auto-filled details for ${found.title} at ${found.company?.name || "Company"}!`);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error("Please login first to generate a personalized AI cover letter.");
            navigate("/login");
            return;
        }
        if (!formData.externalJobDescription.trim()) {
            toast.error("Please select a job or paste the job description.");
            return;
        }

        try {
            setLoading(true);
            setCoverLetter('');

            const endpoint = selectedJobId
                ? `${AI_API_END_POINT}/generate-cover-letter/${selectedJobId}`
                : `${AI_API_END_POINT}/generate-cover-letter/`;

            const res = await axios.post(endpoint, formData, {
                withCredentials: true
            });

            const resultText = res.data?.coverLetter || res.data?.data || res.data?.note;

            if (res.data && (res.data.success !== false) && resultText) {
                setCoverLetter(resultText);
                toast.success("Quick pitch generated successfully!");
            } else {
                toast.error("Received empty response from server.");
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
            toast.error(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSelectedJobId("");
        setFormData({ externalTitle: '', externalCompany: '', externalJobDescription: '' });
        setCoverLetter('');
        toast.success("Cleared!");
    };

    const copyToClipboard = () => {
        if (!coverLetter) return;
        navigator.clipboard.writeText(coverLetter);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const wordCount = coverLetter.trim() ? coverLetter.trim().split(/\s+/).length : 0;

    return (
        <div className='min-h-screen bg-gray-50/50 pb-24'>
            <Navbar />

            <div className='max-w-3xl mx-auto px-4 sm:px-6 mt-10'>
                <div className='bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6'>

                    {/* Header */}
                    <div className='flex items-center justify-between border-b border-gray-100 pb-5'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 rounded-2xl bg-purple-100 text-[#7209b7] flex items-center justify-center shrink-0'>
                                <Sparkles className='w-6 h-6' />
                            </div>
                            <div>
                                <h1 className='text-xl font-bold text-gray-900'>AI Cover Letter & Quick Pitch Studio</h1>
                                <p className='text-xs text-gray-500'>Pick an active portal job or paste any external JD to craft a tailored 100-word pitch.</p>
                            </div>
                        </div>
                        {(coverLetter || formData.externalJobDescription) && (
                            <Button type="button" variant="ghost" onClick={handleClear} className="text-gray-400 hover:text-red-600 text-xs rounded-xl h-9 px-3 cursor-pointer">
                                <RotateCcw className='w-3.5 h-3.5 mr-1.5' /> Reset
                            </Button>
                        )}
                    </div>

                    {/* 1-Click Auto-Fill from Portal Jobs */}
                    {allJobs.length > 0 && (
                        <div className='p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2'>
                            <Label className='text-xs font-bold text-[#6A38C2] flex items-center gap-1.5'>
                                <Briefcase className='w-3.5 h-3.5' /> Quick-Fill from Active Portal Jobs (Optional)
                            </Label>
                            <Select value={selectedJobId} onValueChange={handleSelectPortalJob}>
                                <SelectTrigger className="h-10 rounded-xl bg-white border-purple-200 text-xs">
                                    <SelectValue placeholder="Choose a live job opening to auto-fill title, company & description..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-64">
                                    <SelectGroup>
                                        {allJobs.map((job) => (
                                            <SelectItem key={job._id} value={job._id} className="text-xs cursor-pointer">
                                                {job.title} — {job.company?.name || "Company"} ({job.location})
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleGenerate} className='space-y-4'>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div>
                                <Label className='text-xs font-semibold text-gray-700 mb-1 block'>Job Title</Label>
                                <Input
                                    type="text"
                                    name="externalTitle"
                                    placeholder="e.g. Full Stack Developer"
                                    value={formData.externalTitle}
                                    onChange={handleChange}
                                    className="h-10 rounded-xl text-sm border-gray-200"
                                />
                            </div>
                            <div>
                                <Label className='text-xs font-semibold text-gray-700 mb-1 block'>Company Name</Label>
                                <Input
                                    type="text"
                                    name="externalCompany"
                                    placeholder="e.g. Microsoft"
                                    value={formData.externalCompany}
                                    onChange={handleChange}
                                    className="h-10 rounded-xl text-sm border-gray-200"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className='text-xs font-semibold text-gray-700 mb-1 block'>Job Description *</Label>
                            <textarea
                                name="externalJobDescription"
                                rows="4"
                                placeholder="Paste job description here (or select a job above)..."
                                value={formData.externalJobDescription}
                                onChange={handleChange}
                                required
                                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#7209b7] text-gray-800 resize-none bg-white"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-xl bg-[#7209b7] hover:bg-[#5f32ad] text-white font-medium text-sm shadow-sm cursor-pointer transition-all"
                        >
                            {loading ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Crafting pitch with AI...</> : <><Sparkles className='mr-2 h-4 w-4 text-amber-300' /> Generate Quick Note</>}
                        </Button>
                    </form>

                    {/* Output Preview Section */}
                    {coverLetter ? (
                        <div className='mt-8 pt-6 border-t-2 border-purple-100 space-y-3 bg-purple-50/40 p-5 rounded-2xl border border-purple-200/60'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-xs font-bold text-gray-900 flex items-center gap-1.5'>
                                        <Sparkles className='w-3.5 h-3.5 text-[#7209b7]' /> Generated Pitch Result
                                    </span>
                                    <span className='text-[10px] bg-purple-200/70 text-[#7209b7] px-2 py-0.5 rounded-full font-bold'>{wordCount} words</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={copyToClipboard}
                                    className="rounded-xl h-8 text-xs px-3 border-purple-200 bg-white hover:bg-purple-100 text-[#7209b7] cursor-pointer"
                                >
                                    {copied ? <Check className='w-3.5 h-3.5 text-emerald-600 mr-1' /> : <Copy className='w-3.5 h-3.5 mr-1' />}
                                    {copied ? "Copied!" : "Copy Text"}
                                </Button>
                            </div>

                            <div className='w-full p-4 bg-white rounded-xl border border-purple-100 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-sans shadow-xs'>
                                {coverLetter}
                            </div>
                        </div>
                    ) : null}

                </div>
            </div>
        </div>
    );
};

export default AICoverLetterGenerator;