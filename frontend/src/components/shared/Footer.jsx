import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ShieldCheck, Mail, ArrowRight, Github, Twitter, Linkedin, Facebook } from 'lucide-react';
import { toast } from 'sonner';

const Footer = () => {
    const [newsletterEmail, setNewsletterEmail] = useState("");

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
            toast.error("Please enter a valid email address.");
            return;
        }
        toast.success(`Subscribed ${newsletterEmail.trim()} to weekly job alerts!`);
        setNewsletterEmail("");
    };

    return (
        <footer className='bg-gray-900 text-gray-300 border-t border-gray-800 pt-16 pb-12'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>

                {/* Top Section: Brand & Newsletter Row */}
                <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-gray-800'>

                    {/* Brand Info */}
                    <div className='lg:col-span-4 space-y-4'>
                        <div className='flex items-center gap-2'>
                            <div className='w-10 h-10 rounded-xl bg-[#6A38C2] flex items-center justify-center text-white font-bold shadow-md'>
                                <Briefcase className='w-5 h-5' />
                            </div>
                            <h2 className='text-2xl font-extrabold tracking-tight text-white'>
                                Job<span className='text-[#F83002]'>Portal</span>
                            </h2>
                        </div>
                        <p className='text-sm text-gray-400 leading-relaxed pr-4'>
                            Empowering global careers and connecting world-class enterprises with elite talent through AI-driven assessments, voice mock interviews, and seamless hiring pipelines.
                        </p>
                        <div className='flex items-center gap-3 pt-2 text-xs text-emerald-400 font-medium'>
                            <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
                            <span>All Enterprise Systems Operational</span>
                        </div>
                    </div>

                    {/* Navigation Links Columns */}
                    <div className='lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-8'>
                        <div>
                            <h3 className='text-white font-semibold text-sm uppercase tracking-wider mb-4'>Platform</h3>
                            <ul className='space-y-2.5 text-sm'>
                                <li><Link to="/jobs" className='hover:text-white transition-colors'>Browse Jobs</Link></li>
                                <li><Link to="/browse" className='hover:text-white transition-colors'>Categories</Link></li>
                                <li><Link to="/ai-cover-letter" className='hover:text-white transition-colors'>AI Cover Letter</Link></li>
                                <li><Link to="/profile" className='hover:text-white transition-colors'>Candidate Portal</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className='text-white font-semibold text-sm uppercase tracking-wider mb-4'>Recruiters</h3>
                            <ul className='space-y-2.5 text-sm'>
                                <li><Link to="/admin/jobs/create" className='hover:text-white transition-colors'>Post a Job</Link></li>
                                <li><Link to="/admin/companies" className='hover:text-white transition-colors'>Manage Companies</Link></li>
                                <li><Link to="/admin/jobs" className='hover:text-white transition-colors'>Hiring Analytics</Link></li>
                                <li><Link to="/notifications" className='hover:text-white transition-colors'>Pipeline Alerts</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className='text-white font-semibold text-sm uppercase tracking-wider mb-4'>AI Suite</h3>
                            <ul className='space-y-2.5 text-sm'>
                                <li><Link to="/jobs" className='hover:text-white transition-colors'>Voice Mock Interview</Link></li>
                                <li><Link to="/jobs" className='hover:text-white transition-colors'>ATS Skill Matcher</Link></li>
                                <li><Link to="/ai-cover-letter" className='hover:text-white transition-colors'>Quick Pitch Studio</Link></li>
                                <li><Link to="/profile" className='hover:text-white transition-colors'>A4 CV Generator</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Newsletter Box */}
                    <div className='lg:col-span-3 space-y-4'>
                        <h3 className='text-white font-semibold text-sm uppercase tracking-wider'>Stay Ahead</h3>
                        <p className='text-xs text-gray-400 leading-relaxed'>
                            Subscribe to our executive newsletter for weekly industry insights and top-tier job openings.
                        </p>
                        <form onSubmit={handleNewsletterSubmit} className='flex items-center gap-2'>
                            <div className='relative w-full'>
                                <Mail className='absolute left-3 top-2.5 w-4 h-4 text-gray-500' />
                                <input
                                    type='email'
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                    placeholder='Enter your email'
                                    className='w-full bg-gray-800 text-sm rounded-lg pl-9 pr-3 py-2 text-white border border-gray-700 focus:outline-hidden focus:border-[#6A38C2] transition-colors'
                                />
                            </div>
                            <button type='submit' className='bg-[#6A38C2] hover:bg-[#5b30a6] text-white p-2 rounded-lg transition-colors shrink-0 cursor-pointer'>
                                <ArrowRight className='w-4 h-4' />
                            </button>
                        </form>
                    </div>

                </div>

                {/* Bottom Section: Copyright, Socials, and Security */}
                <div className='flex flex-col md:flex-row items-center justify-between pt-8 gap-4 text-xs text-gray-500'>

                    <div className='flex items-center gap-6'>
                        <p>© {new Date().getFullYear()} JobPortal Inc. All rights reserved.</p>
                        <div className='hidden sm:flex items-center gap-4'>
                            <Link to="/jobs" className='hover:text-gray-300 transition-colors'>Privacy Policy</Link>
                            <Link to="/jobs" className='hover:text-gray-300 transition-colors'>Terms of Service</Link>
                            <Link to="/jobs" className='hover:text-gray-300 transition-colors'>Cookie Settings</Link>
                        </div>
                    </div>

                    {/* Social Icons & Security Badge */}
                    <div className='flex items-center gap-6'>
                        <div className='flex items-center gap-1 text-gray-400'>
                            <ShieldCheck className='w-4 h-4 text-[#6A38C2]' />
                            <span>SOC-2 Certified & 256-Bit SSL</span>
                        </div>

                        <div className='flex items-center space-x-3'>
                            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className='w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#6A38C2] hover:text-white transition-colors' aria-label="LinkedIn">
                                <Linkedin className='w-4 h-4' />
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noreferrer" className='w-4 h-4' aria-label="Twitter">
                                <Twitter className='w-4 h-4' />
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noreferrer" className='w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#6A38C2] hover:text-white transition-colors' aria-label="Facebook">
                                <Facebook className='w-4 h-4' />
                            </a>
                            <a href="https://github.com" target="_blank" rel="noreferrer" className='w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#6A38C2] hover:text-white transition-colors' aria-label="Github">
                                <Github className='w-4 h-4' />
                            </a>
                        </div>
                    </div>

                </div>

            </div>
        </footer>
    );
}

export default Footer;