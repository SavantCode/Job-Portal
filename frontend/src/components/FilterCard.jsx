import React from 'react'
import { Label } from './ui/label'
import { useDispatch, useSelector } from 'react-redux'
import { resetJobFilters, setJobFilters } from '@/redux/jobSlice'
import { SlidersHorizontal, MapPin, Briefcase, IndianRupee, RotateCcw, Clock, Layers } from 'lucide-react'
import { Button } from './ui/button'

const filterSections = [
    {
        key: "location",
        label: "Location",
        icon: MapPin,
        options: ["Bengaluru", "Mumbai", "Hyderabad", "Pune", "Remote", "Delhi NCR"]
    },
    {
        key: "industry",
        label: "Role / Category",
        icon: Briefcase,
        options: ["Frontend", "Backend", "Full Stack", "Data", "DevOps", "QA"]
    },
    {
        key: "jobType",
        label: "Job Type",
        icon: Layers,
        options: ["Full-Time", "Internship", "Contract", "Freelance"]
    },
    {
        key: "experience",
        label: "Experience Level",
        icon: Clock,
        options: [
            { label: "Fresher (0 Yrs)", value: "0" },
            { label: "1 - 2 Years", value: "1-2" },
            { label: "3 - 4 Years", value: "3-4" },
            { label: "5+ Years", value: "5+" }
        ]
    },
    {
        key: "salary",
        label: "Salary Range (LPA)",
        icon: IndianRupee,
        options: ["3-6", "6-10", "10-15", "15-25", "25+"]
    }
];

const FilterCard = () => {
    const dispatch = useDispatch();
    const { jobFilters = {} } = useSelector(store => store.job);

    const hasActiveFilters = Object.values(jobFilters).some(Boolean);

    const toggleFilterValue = (key, value) => {
        const current = jobFilters[key] || "";
        dispatch(setJobFilters({ [key]: current === value ? "" : value }));
    };

    const clearAll = () => {
        dispatch(resetJobFilters());
    };

    return (
        <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-6'>
            {/* Header with Clear Option */}
            <div className='flex items-center justify-between pb-3.5 border-b border-gray-100'>
                <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#6A38C2]'>
                        <SlidersHorizontal className='w-4 h-4' />
                    </div>
                    <div>
                        <h1 className='font-bold text-base text-gray-900'>Multi-Filters</h1>
                        <p className='text-[11px] text-gray-400'>Combine multiple criteria</p>
                    </div>
                </div>
                {hasActiveFilters && (
                    <Button
                        onClick={clearAll}
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw className='w-3 h-3' />
                        <span>Reset</span>
                    </Button>
                )}
            </div>

            {/* Filter Sections */}
            <div className='space-y-5'>
                {filterSections.map((section) => {
                    const Icon = section.icon;
                    const activeValue = jobFilters[section.key] || "";

                    return (
                        <div key={section.key} className='space-y-2.5'>
                            <div className='flex items-center justify-between text-gray-900 font-semibold text-xs uppercase tracking-wider'>
                                <span className='flex items-center gap-1.5'>
                                    <Icon className='w-3.5 h-3.5 text-[#6A38C2]' />
                                    {section.label}
                                </span>
                                {activeValue && (
                                    <button
                                        type="button"
                                        onClick={() => toggleFilterValue(section.key, activeValue)}
                                        className="text-[10px] text-[#6A38C2] hover:underline font-medium"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className='flex flex-wrap gap-1.5'>
                                {section.options.map((opt) => {
                                    const val = typeof opt === 'object' ? opt.value : opt;
                                    const display = typeof opt === 'object'
                                        ? opt.label
                                        : section.key === 'salary'
                                        ? `${opt} LPA`
                                        : opt;
                                    const isSelected = activeValue === val;

                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => toggleFilterValue(section.key, val)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-[#6A38C2] text-white border-[#6A38C2] shadow-xs'
                                                    : 'bg-gray-50/80 text-gray-600 border-gray-200/80 hover:border-purple-200 hover:bg-purple-50/50'
                                            }`}
                                        >
                                            {display}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default FilterCard