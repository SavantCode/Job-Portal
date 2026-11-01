import React, { useMemo, useState } from 'react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setJobFilters, setSearchedQuery, resetJobFilters } from '@/redux/jobSlice';
import {
    Sparkles, ArrowRight, Briefcase, Users, TrendingUp,
    Search, MapPin, Building2, Flame
} from 'lucide-react'

const TRENDING_TAGS = [
    { label: "Full Stack", type: "keyword", value: "Full Stack" },
    { label: "React.js", type: "keyword", value: "React" },
    { label: "Remote", type: "location", value: "Remote" },
    { label: "Backend", type: "keyword", value: "Backend" },
    { label: "Bengaluru", type: "location", value: "Bengaluru" },
    { label: "15-25 LPA", type: "salary", value: "15-25" }
];

const HeroSection = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { allJobs = [] } = useSelector(store => store.job);

    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");

    // Dynamically extract unique locations and top hiring companies from live jobs
    const { cityOptions, topCompanies } = useMemo(() => {
        const cities = new Set(["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Remote", "Delhi NCR"]);
        const companyMap = new Map();

        allJobs.forEach(job => {
            if (job?.location) {
                const primary = job.location.split(",")[0].trim();
                cities.add(primary.toLowerCase() === "bangalore" ? "Bengaluru" : primary);
            }
            if (job?.company?.name) {
                const name = job.company.name;
                const existing = companyMap.get(name) || {
                    name,
                    logo: job.company.logo || "",
                    count: 0
                };
                existing.count += 1;
                if (!existing.logo && job.company.logo) existing.logo = job.company.logo;
                companyMap.set(name, existing);
            }
        });

        return {
            cityOptions: Array.from(cities),
            topCompanies: Array.from(companyMap.values()).sort((a, b) => b.count - a.count).slice(0, 6)
        };
    }, [allJobs]);

    const handleHeroSearch = (e) => {
        if (e) e.preventDefault();
        dispatch(resetJobFilters());
        dispatch(setSearchedQuery(keyword.trim()));
        dispatch(setJobFilters({
            keyword: keyword.trim(),
            location: location === "all" ? "" : location.trim()
        }));
        navigate("/jobs");
    };

    const handleQuickTag = (tag) => {
        dispatch(resetJobFilters());
        if (tag.type === "location") {
            dispatch(setJobFilters({ location: tag.value }));
        } else if (tag.type === "salary") {
            dispatch(setJobFilters({ salary: tag.value }));
        } else {
            dispatch(setSearchedQuery(tag.value));
            dispatch(setJobFilters({ keyword: tag.value }));
        }
        navigate("/jobs");
    };

    const handleCompanyClick = (companyName) => {
        dispatch(resetJobFilters());
        dispatch(setJobFilters({ keyword: companyName }));
        navigate("/jobs");
    };

    return (
        <section className='relative overflow-hidden bg-gradient-to-b from-purple-50/70 via-white to-white dark:from-slate-900 dark:via-[#0b1120] dark:to-[#0b1120] pt-14 pb-16 lg:pt-20 lg:pb-20 transition-colors'>
            {/* Background Decorative Glow Orbs */}
            <div className='absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-purple-200/40 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none' />
            <div className='absolute top-10 right-10 w-72 h-72 bg-pink-100/40 dark:bg-indigo-600/10 rounded-full blur-2xl pointer-events-none' />

            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
                <div className='flex flex-col items-center text-center space-y-7'>

                    {/* Floating Top Badge */}
                    <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/80 text-[#6A38C2] dark:text-purple-300 text-xs font-semibold uppercase tracking-wider shadow-2xs'>
                        <Sparkles className='w-3.5 h-3.5' />
                        <span>AI-Powered Career & Hiring Ecosystem</span>
                    </div>

                    {/* Main Headline */}
                    <div className='max-w-4xl space-y-4'>
                        <h1 className='text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.12]'>
                            Discover, Apply & Secure Your <br />
                            <span className='bg-gradient-to-r from-[#6A38C2] via-purple-500 to-[#F83002] bg-clip-text text-transparent'>
                                Dream Career Today
                            </span>
                        </h1>
                        <p className='text-base sm:text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed'>
                            Search verified openings, check your instant AI resume match score, practice live voice mock interviews, and track offers in one place.
                        </p>
                    </div>

                    {/* Unified Command Search Bar */}
                    <form
                        onSubmit={handleHeroSearch}
                        className='w-full max-w-3xl bg-white dark:bg-slate-900/95 p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-gray-200/90 dark:border-slate-700/90 shadow-xl shadow-purple-500/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2'
                    >
                        {/* Keyword Input */}
                        <div className='flex items-center gap-2.5 flex-1 px-3.5 py-2 sm:py-1'>
                            <Search className='w-4 h-4 text-[#6A38C2] dark:text-purple-400 shrink-0' />
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Job title, tech skill (e.g. React, Node), or company..."
                                className='w-full bg-transparent! border-none! text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:outline-none'
                            />
                        </div>

                        <div className='hidden sm:block w-px h-7 bg-gray-200 dark:bg-slate-700' />

                        {/* City / Location Selector */}
                        <div className='flex items-center gap-2 px-3.5 py-2 sm:py-1 sm:w-52 border-t sm:border-t-0 border-gray-100 dark:border-slate-800'>
                            <MapPin className='w-4 h-4 text-gray-400 shrink-0' />
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                aria-label="Select city or location"
                                className='w-full bg-transparent! border-none! text-sm font-medium text-gray-700 dark:text-slate-200 focus:outline-none cursor-pointer'
                            >
                                <option value="">All Locations</option>
                                {cityOptions.map((city) => (
                                    <option key={city} value={city} className='bg-white dark:bg-slate-900 text-gray-900 dark:text-white'>
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search Submit Button */}
                        <Button
                            type="submit"
                            className='h-11 px-7 rounded-xl sm:rounded-full bg-[#6A38C2] hover:bg-[#5b30a6] text-white font-semibold text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0'
                        >
                            <span>Search Jobs</span>
                            <ArrowRight className='w-4 h-4' />
                        </Button>
                    </form>

                    {/* Trending Quick Filter Pills */}
                    <div className='flex items-center justify-center flex-wrap gap-2 text-xs'>
                        <span className='inline-flex items-center gap-1 text-gray-500 dark:text-slate-400 font-medium mr-1'>
                            <Flame className='w-3.5 h-3.5 text-[#F83002]' />
                            Trending:
                        </span>
                        {TRENDING_TAGS.map((tag) => (
                            <button
                                key={tag.label}
                                type="button"
                                onClick={() => handleQuickTag(tag)}
                                className='px-3 py-1 rounded-full bg-white dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#6A38C2] dark:hover:border-purple-500 hover:text-[#6A38C2] dark:hover:text-purple-300 font-medium transition-all cursor-pointer shadow-2xs'
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>

                    {/* Top Hiring Companies Showcase Strip (Dynamic from DB) */}
                    {topCompanies.length > 0 && (
                        <div className='w-full max-w-4xl pt-6'>
                            <p className='text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3'>
                                Top Companies Hiring Right Now — Click to Filter
                            </p>
                            <div className='flex items-center justify-center flex-wrap gap-2.5'>
                                {topCompanies.map((comp) => (
                                    <button
                                        key={comp.name}
                                        type="button"
                                        onClick={() => handleCompanyClick(comp.name)}
                                        className='group flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-2xs hover:shadow-md transition-all cursor-pointer'
                                    >
                                        <div className='w-7 h-7 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-1 flex items-center justify-center shrink-0'>
                                            {comp.logo ? (
                                                <img src={comp.logo} alt={comp.name} className='w-full h-full object-contain rounded' />
                                            ) : (
                                                <Building2 className='w-3.5 h-3.5 text-[#6A38C2] dark:text-purple-400' />
                                            )}
                                        </div>
                                        <span className='text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-[#6A38C2] dark:group-hover:text-purple-300'>
                                            {comp.name}
                                        </span>
                                        <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-[#6A38C2] dark:text-purple-300'>
                                            {comp.count} {comp.count === 1 ? 'role' : 'roles'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trust Indicators / Floating Stats Bar */}
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-slate-800/80 w-full max-w-3xl mt-4'>
                        <div className='flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-[#6A38C2] dark:text-purple-400 shrink-0'>
                                <Briefcase className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 dark:text-white text-base'>
                                    {allJobs.length > 0 ? `${allJobs.length} Live • 10k+` : "10,000+"}
                                </h4>
                                <p className='text-xs text-muted-foreground'>Verified Openings</p>
                            </div>
                        </div>

                        <div className='flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0'>
                                <Users className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 dark:text-white text-base'>5,000+</h4>
                                <p className='text-xs text-muted-foreground'>Enterprise Partners</p>
                            </div>
                        </div>

                        <div className='col-span-2 md:col-span-1 flex items-center justify-center gap-3 text-left'>
                            <div className='w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0'>
                                <TrendingUp className='w-5 h-5' />
                            </div>
                            <div>
                                <h4 className='font-bold text-gray-900 dark:text-white text-base'>AI-Graded</h4>
                                <p className='text-xs text-muted-foreground'>ATS & Mock Interviews</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default HeroSection