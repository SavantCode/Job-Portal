import React, { useState, useEffect } from 'react';
import Navbar from './shared/Navbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { AI_API_END_POINT } from '@/utils/constant';
import { Sparkles, Loader2, Copy, Check, FileText, Briefcase, Building, RotateCcw } from 'lucide-react';

const AICoverLetterGenerator = () => {
    const [formData, setFormData] = useState({
        externalTitle: '',
        externalCompany: '',
        externalJobDescription: ''
    });

    const [coverLetter, setCoverLetter] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!formData.externalJobDescription.trim()) {
            toast.error("Please paste the job description.");
            return;
        }

        try {
            setLoading(true);
            setCoverLetter(''); // Reset old output while loading

            const res = await axios.post(`${AI_API_END_POINT}/generate-cover-letter/`, formData, {
                withCredentials: true
            });

            console.log("API Response:", res.data); // Debug check

            // Handle possible response key variations (res.data.coverLetter or res.data.message/data)
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
                                <h1 className='text-xl font-bold text-gray-900'>AI Quick Pitch</h1>
                                <p className='text-xs text-gray-500'>Generate a sharp, 100-word outreach note instantly.</p>
                            </div>
                        </div>
                        {(coverLetter || formData.externalJobDescription) && (
                            <Button type="button" variant="ghost" onClick={handleClear} className="text-gray-400 hover:text-red-600 text-xs rounded-xl h-9 px-3 cursor-pointer">
                                <RotateCcw className='w-3.5 h-3.5 mr-1.5' /> Reset
                            </Button>
                        )}
                    </div>

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
                                placeholder="Paste job description here..."
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
                            {loading ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Crafting pitch with Groq...</> : <><Sparkles className='mr-2 h-4 w-4 text-amber-300' /> Generate Quick Note</>}
                        </Button>
                    </form>

                    {/* Output Preview Section - Rendered directly inside the card flow */}
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