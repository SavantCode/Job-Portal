import React from 'react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Briefcase, Users, TrendingUp, CheckCircle2 } from 'lucide-react'

const HeroSection = () => {
    const navigate = useNavigate();

    return (
        <div className='relative overflow-hidden bg-gradient-to-b from-purple-50/50 via-white to-white py-20 lg:py-20'>
            {/* Background Decorative Glow Orbs */}
            <div className='absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl pointer-events-none' />
            <div className='absolute top-10 right-10 w-72 h-72 bg-pink-100/40 rounded-full blur-2xl pointer-events-none' />

            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
                <div className='flex flex-col items-center text-center space-y-8'>
                    
                    {/* Floating Top Badge */}
                    <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-[#6A38C2] text-xs font-semibold uppercase tracking-wider shadow-xs animate-bounce'>
                        <Sparkles className='w-4 h-4' />
                        <span>The Ultimate Career Ecosystem</span>
                    </div>

                    {/* Main Headline */}
                    <div className='max-w-4xl space-y-4'>
                        <h1 className='text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.15]'>
                            Discover, Apply & Secure Your <br />
                            <span className='bg-gradient-to-r from-[#6A38C2] to-[#F83002] bg-clip-text text-transparent'>
                                Dream Career Today
                            </span>
                        </h1>
                        <p className='text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed'>
                            Connect with thousands of top-tier global enterprises, startups, and tech innovators looking for elite talent like you.
                        </p>
                    </div>

                    {/* CTA Action Buttons */}
                    <div className='flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-2'>
                        <Button 
                            onClick={() => navigate("/jobs")} 
                            className='w-full sm:w-auto h-12 px-8 rounded-full bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 flex items-center justify-center gap-2 text-base group'
                        >
                            <span>Explore Openings</span>
                            <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                        </Button>
                        <Button 
                            onClick={() => navigate("/browse")} 
                            variant="outline" 
                            className='w-full sm:w-auto h-12 px-8 rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold transition-all text-base'
                        >
                            Browse Categories
                        </Button>
                    </div>

                    {/* Trust Indicators / Floating Stats Bar */}
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-6 pt-12 border-t border-gray-100 w-full max-w-3xl mt-8'>
                        <div className='flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#6A38C2] shrink-0'>
                                <Briefcase className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 text-base'>10,000+</h4>
                                <p className='text-xs text-muted-foreground'>Active Jobs</p>
                            </div>
                        </div>

                        <div className='flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0'>
                                <Users className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 text-base'>5,000+</h4>
                                <p className='text-xs text-muted-foreground'>Top Companies</p>
                            </div>
                        </div>

                        <div className='col-span-2 md:col-span-1 flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0'>
                                <TrendingUp className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 text-base'>98%</h4>
                                <p className='text-xs text-muted-foreground'>Success Rate</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default HeroSection