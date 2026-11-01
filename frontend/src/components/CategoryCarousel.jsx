import React, { useMemo } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setSearchedQuery, setJobFilters, resetJobFilters } from '@/redux/jobSlice';
import {
    Code2, Server, Layers, Database, Cpu, Smartphone,
    Cloud, Palette, ShieldCheck, Briefcase, Terminal, Bug
} from 'lucide-react';

const CATEGORY_ITEMS = [
    { label: "Frontend Developer", keyword: "Frontend", icon: Code2, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60" },
    { label: "Backend Developer", keyword: "Backend", icon: Server, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60" },
    { label: "Full Stack Developer", keyword: "Full Stack", icon: Layers, color: "text-[#6A38C2] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60" },
    { label: "Data & Analytics", keyword: "Data", icon: Database, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60" },
    { label: "AI / ML Engineer", keyword: "AI", icon: Cpu, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60" },
    { label: "DevOps & Cloud", keyword: "DevOps", icon: Cloud, color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60" },
    { label: "QA & Automation", keyword: "QA", icon: Bug, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60" },
    { label: "Mobile Developer", keyword: "Mobile", icon: Smartphone, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60" },
    { label: "UI/UX Designer", keyword: "Design", icon: Palette, color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60" },
    { label: "Cybersecurity", keyword: "Security", icon: ShieldCheck, color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60" },
    { label: "Software Intern", keyword: "Intern", icon: Terminal, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60" },
    { label: "Product Manager", keyword: "Product", icon: Briefcase, color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800" }
];

const CategoryCarousel = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { allJobs = [] } = useSelector(store => store.job);

    // Dynamically calculate how many active jobs match each category
    const categoriesWithCounts = useMemo(() => {
        return CATEGORY_ITEMS.map(cat => {
            const kw = cat.keyword.toLowerCase();
            const count = allJobs.filter(job => {
                const blob = `${job?.title || ""} ${job?.description || ""} ${job?.jobType || ""} ${(job?.requirements || []).join(" ")}`.toLowerCase();
                return blob.includes(kw);
            }).length;
            return { ...cat, count };
        });
    }, [allJobs]);

    const searchJobHandler = (keyword) => {
        dispatch(resetJobFilters());
        dispatch(setSearchedQuery(keyword));
        dispatch(setJobFilters({ keyword }));
        navigate("/jobs");
    };

    return (
        <section className='w-full py-12 bg-gray-50/70 dark:bg-slate-900/40 border-y border-gray-100 dark:border-slate-800/80 my-8 transition-colors'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3 text-center sm:text-left'>
                    <div>
                        <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white'>
                            Explore by <span className='text-[#6A38C2] dark:text-purple-400'>Career Track</span>
                        </h2>
                        <p className='text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1'>
                            Select a specialization to filter matching roles and tech stacks immediately.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            dispatch(resetJobFilters());
                            navigate("/jobs");
                        }}
                        className='text-xs font-bold text-[#6A38C2] dark:text-purple-400 hover:underline self-center sm:self-end cursor-pointer'
                    >
                        View All Categories →
                    </button>
                </div>

                <Carousel className="w-full max-w-6xl mx-auto px-8 sm:px-12">
                    <CarouselContent className="-ml-3">
                        {categoriesWithCounts.map((cat, index) => {
                            const Icon = cat.icon;
                            return (
                                <CarouselItem key={index} className="pl-3 basis-1/2 sm:basis-1/3 lg:basis-1/4">
                                    <div
                                        onClick={() => searchJobHandler(cat.keyword)}
                                        className="group bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex items-center gap-3.5"
                                    >
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${cat.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-[#6A38C2] dark:group-hover:text-purple-300 truncate transition-colors">
                                                {cat.label}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                                                {cat.count > 0 ? `${cat.count} Open ${cat.count === 1 ? 'Role' : 'Roles'}` : 'Explore Track →'}
                                            </p>
                                        </div>
                                    </div>
                                </CarouselItem>
                            );
                        })}
                    </CarouselContent>
                    <CarouselPrevious className="absolute -left-2 sm:-left-4 h-9 w-9 rounded-full border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 shadow-md hover:bg-gray-50 dark:hover:bg-slate-700" />
                    <CarouselNext className="absolute -right-2 sm:-right-4 h-9 w-9 rounded-full border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 shadow-md hover:bg-gray-50 dark:hover:bg-slate-700" />
                </Carousel>
            </div>
        </section>
    )
}

export default CategoryCarousel;