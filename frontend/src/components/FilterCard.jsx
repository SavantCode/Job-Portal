import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { resetJobFilters, setJobFilters } from '@/redux/jobSlice'
import {
    SlidersHorizontal, MapPin, Briefcase, IndianRupee,
    RotateCcw, Clock, Layers, Check, Search, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from './ui/button'

/**
 * Normalizes a salary string/number from a Job document into a comparable LPA number or range
 */
export const getJobSalaryLPA = (salaryRaw) => {
    if (salaryRaw === undefined || salaryRaw === null) return { min: 0, max: 0, label: "" };
    const str = String(salaryRaw).trim();
    const nums = str.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (nums.length === 0) return { min: 0, max: 0, label: str };

    // Handle raw annual numbers like 120000 -> convert or treat as LPA if <= 150
    let min = nums[0];
    let max = nums.length > 1 ? nums[1] : nums[0];
    if (min > 1000) {
        min = Math.round(min / 10000);
        max = Math.round(max / 10000);
    }
    return { min, max, raw: str };
};

export const matchesSalaryFilter = (jobSalaryRaw, filterValue) => {
    if (!filterValue) return true;
    const rawStr = String(jobSalaryRaw || "").trim();
    if (rawStr.toLowerCase() === filterValue.toLowerCase()) return true;

    const { min, max } = getJobSalaryLPA(jobSalaryRaw);
    if (filterValue === "0-6" || filterValue === "3-6") return min <= 6;
    if (filterValue === "6-10") return max >= 6 && min <= 10;
    if (filterValue === "10-15") return max >= 10 && min <= 15;
    if (filterValue === "15-25") return max >= 15 && min <= 25;
    if (filterValue === "25+") return max >= 25;

    return rawStr.toLowerCase().includes(filterValue.toLowerCase());
};

export const matchesExperienceFilter = (jobExpRaw, filterValue) => {
    if (!filterValue) return true;
    const exp = Number(jobExpRaw ?? 0);
    if (filterValue === "0") return exp === 0;
    if (filterValue === "1-2") return exp >= 1 && exp <= 2;
    if (filterValue === "3-4") return exp >= 3 && exp <= 4;
    if (filterValue === "5+") return exp >= 5;
    return String(exp) === String(filterValue);
};

const FilterCard = () => {
    const dispatch = useDispatch();
    const { allJobs = [], jobFilters = {} } = useSelector(store => store.job);

    // Search inside filter options (for large dynamic lists of cities/skills)
    const [optionSearch, setOptionSearch] = useState("");
    const [expandedSections, setExpandedSections] = useState({
        location: false,
        industry: false
    });

    // Dynamically build filter sections from live `allJobs` data + sensible defaults
    const dynamicSections = useMemo(() => {
        const locationCounts = new Map();
        const roleSkillCounts = new Map();
        const jobTypeCounts = new Map();

        // Seed core categories so the filter bar never looks empty even with few jobs
        ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Remote"].forEach(loc => locationCounts.set(loc, 0));
        ["Frontend", "Backend", "Full Stack", "Data", "DevOps", "QA", "AI / ML", "Mobile"].forEach(role => roleSkillCounts.set(role, 0));
        ["Full-Time", "Internship", "Contract", "Freelance"].forEach(jt => jobTypeCounts.set(jt, 0));

        const expCounts = { "0": 0, "1-2": 0, "3-4": 0, "5+": 0 };
        const salaryCounts = { "3-6": 0, "6-10": 0, "10-15": 0, "15-25": 0, "25+": 0 };
        const customSalaryMap = new Map();

        allJobs.forEach((job) => {
            // 1. Dynamic Locations (extract city/location directly from every job)
            const rawLoc = (job?.location || "").trim();
            if (rawLoc) {
                // Split e.g. "San Francisco, CA" or "Bangalore, India" into primary city name
                const primaryCity = rawLoc.split(",")[0].trim();
                const normalizedCity =
                    primaryCity.toLowerCase() === "bangalore" ? "Bengaluru" : primaryCity;

                locationCounts.set(normalizedCity, (locationCounts.get(normalizedCity) || 0) + 1);
            }

            // 2. Dynamic Roles & Top Skills (from job title + job.requirements)
            const textBlob = `${job?.title || ""} ${job?.description || ""} ${(job?.requirements || []).join(" ")}`.toLowerCase();
            for (const [roleKey] of roleSkillCounts.entries()) {
                const searchToken = roleKey.toLowerCase().replace(/\s*\/\s*/, "|");
                const regex = new RegExp(searchToken, "i");
                if (regex.test(textBlob)) {
                    roleSkillCounts.set(roleKey, (roleSkillCounts.get(roleKey) || 0) + 1);
                }
            }

            // Also dynamically add top requirements/skills from jobs
            const reqs = Array.isArray(job?.requirements)
                ? job.requirements.flatMap(r => String(r).split(",")).map(s => s.trim()).filter(Boolean)
                : [];
            reqs.forEach(skill => {
                if (skill.length >= 2 && skill.length <= 18) {
                    // Check case-insensitively if already tracked
                    const existingKey = Array.from(roleSkillCounts.keys()).find(
                        k => k.toLowerCase() === skill.toLowerCase()
                    );
                    const keyToUse = existingKey || skill;
                    roleSkillCounts.set(keyToUse, (roleSkillCounts.get(keyToUse) || 0) + 1);
                }
            });

            // 3. Dynamic Job Types
            const rawType = (job?.jobType || "").trim();
            if (rawType) {
                const matchedKey = Array.from(jobTypeCounts.keys()).find(
                    k => k.toLowerCase() === rawType.toLowerCase()
                ) || rawType;
                jobTypeCounts.set(matchedKey, (jobTypeCounts.get(matchedKey) || 0) + 1);
            }

            // 4. Experience Level Counts
            const exp = Number(job?.experienceLevel ?? 0);
            if (exp === 0) expCounts["0"]++;
            else if (exp >= 1 && exp <= 2) expCounts["1-2"]++;
            else if (exp >= 3 && exp <= 4) expCounts["3-4"]++;
            else if (exp >= 5) expCounts["5+"]++;

            // 5. Salary Brackets + any custom salary strings
            let matchedStandardBracket = false;
            ["3-6", "6-10", "10-15", "15-25", "25+"].forEach(bracket => {
                if (matchesSalaryFilter(job?.salary, bracket)) {
                    salaryCounts[bracket]++;
                    matchedStandardBracket = true;
                }
            });
            if (!matchedStandardBracket && job?.salary) {
                const salKey = String(job.salary).trim();
                customSalaryMap.set(salKey, (customSalaryMap.get(salKey) || 0) + 1);
            }
        });

        // Sort dynamic options so options with active jobs appear first
        const sortedLocations = Array.from(locationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, value: label, count }));

        const sortedRolesAndSkills = Array.from(roleSkillCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, value: label, count }));

        const sortedJobTypes = Array.from(jobTypeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, value: label, count }));

        const salaryOptions = [
            { label: "3 - 6 LPA", value: "3-6", count: salaryCounts["3-6"] },
            { label: "6 - 10 LPA", value: "6-10", count: salaryCounts["6-10"] },
            { label: "10 - 15 LPA", value: "10-15", count: salaryCounts["10-15"] },
            { label: "15 - 25 LPA", value: "15-25", count: salaryCounts["15-25"] },
            { label: "25+ LPA", value: "25+", count: salaryCounts["25+"] },
            ...Array.from(customSalaryMap.entries()).map(([val, count]) => ({
                label: `${val} LPA`,
                value: val,
                count
            }))
        ];

        return [
            {
                key: "location",
                label: "City / Location",
                icon: MapPin,
                collapsible: true,
                limit: 6,
                options: sortedLocations
            },
            {
                key: "industry",
                label: "Role & Tech Stack",
                icon: Briefcase,
                collapsible: true,
                limit: 8,
                options: sortedRolesAndSkills
            },
            {
                key: "jobType",
                label: "Work Type",
                icon: Layers,
                options: sortedJobTypes
            },
            {
                key: "experience",
                label: "Experience Level",
                icon: Clock,
                options: [
                    { label: "Fresher (0 Yrs)", value: "0", count: expCounts["0"] },
                    { label: "1 - 2 Years", value: "1-2", count: expCounts["1-2"] },
                    { label: "3 - 4 Years", value: "3-4", count: expCounts["3-4"] },
                    { label: "5+ Years", value: "5+", count: expCounts["5+"] }
                ]
            },
            {
                key: "salary",
                label: "Salary Package (LPA)",
                icon: IndianRupee,
                options: salaryOptions
            }
        ];
    }, [allJobs]);

    const activeCount = Object.entries(jobFilters).filter(([k, v]) => k !== "keyword" && Boolean(v)).length;

    const toggleFilterValue = (key, value) => {
        const current = jobFilters[key] || "";
        dispatch(setJobFilters({ [key]: current === value ? "" : value }));
    };

    const clearAll = () => {
        dispatch(resetJobFilters());
        setOptionSearch("");
    };

    const toggleExpandSection = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <aside className='bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-4'>
            {/* Header with Active Counter & Reset */}
            <div className='flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800'>
                <div className='flex items-center gap-2.5'>
                    <div className='w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-[#6A38C2] dark:text-purple-400'>
                        <SlidersHorizontal className='w-4 h-4' />
                    </div>
                    <div>
                        <div className='flex items-center gap-2'>
                            <h2 className='font-bold text-sm text-gray-900 dark:text-white'>Dynamic Filters</h2>
                            {activeCount > 0 && (
                                <span className='px-1.5 py-0.5 rounded-md bg-[#6A38C2] text-white text-[10px] font-bold leading-none'>
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        <p className='text-[11px] text-gray-500 dark:text-slate-400'>Synced with live openings</p>
                    </div>
                </div>
                {activeCount > 0 && (
                    <Button
                        onClick={clearAll}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw className='w-3 h-3' />
                        <span>Reset</span>
                    </Button>
                )}
            </div>

            {/* Quick Filter Option Search (Find any city, skill, or package) */}
            <div className='relative'>
                <Search className='w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5' />
                <input
                    type="text"
                    value={optionSearch}
                    onChange={(e) => setOptionSearch(e.target.value)}
                    placeholder="Filter cities, skills, packages..."
                    className='w-full h-8 pl-8 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/80 text-xs text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#6A38C2]'
                />
            </div>

            {/* Dynamic Filter Sections */}
            <div className='space-y-4 divide-y divide-gray-100 dark:divide-slate-800/80'>
                {dynamicSections.map((section, idx) => {
                    const Icon = section.icon;
                    const activeValue = jobFilters[section.key] || "";
                    const isExpanded = Boolean(expandedSections[section.key]);

                    // Filter options if user typed inside the sidebar quick-search
                    const matchingOptions = section.options.filter(opt =>
                        !optionSearch.trim() ||
                        opt.label.toLowerCase().includes(optionSearch.trim().toLowerCase())
                    );

                    const visibleOptions =
                        section.collapsible && !isExpanded && !optionSearch.trim()
                            ? matchingOptions.slice(0, section.limit)
                            : matchingOptions;

                    const hiddenCount = matchingOptions.length - visibleOptions.length;

                    return (
                        <div key={section.key} className={idx > 0 ? 'pt-4 space-y-2.5' : 'space-y-2.5'}>
                            <div className='flex items-center justify-between'>
                                <span className='flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider'>
                                    <Icon className='w-3.5 h-3.5 text-[#6A38C2] dark:text-purple-400' />
                                    {section.label}
                                </span>
                                {activeValue && (
                                    <button
                                        type="button"
                                        onClick={() => toggleFilterValue(section.key, activeValue)}
                                        className="text-[11px] text-[#6A38C2] dark:text-purple-400 hover:underline font-medium cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {visibleOptions.length === 0 ? (
                                <p className='text-[11px] text-gray-400 italic'>No matching {section.label.toLowerCase()} options</p>
                            ) : (
                                <div className='flex flex-wrap gap-1.5'>
                                    {visibleOptions.map((opt) => {
                                        const isSelected = activeValue.toLowerCase() === String(opt.value).toLowerCase();

                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => toggleFilterValue(section.key, opt.value)}
                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-[#6A38C2] text-white border-[#6A38C2] shadow-xs'
                                                        : 'bg-gray-50/90 dark:bg-slate-800/70 text-gray-700 dark:text-slate-300 border-gray-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/30'
                                                }`}
                                            >
                                                {isSelected && <Check className='w-3 h-3 stroke-[2.5] shrink-0' />}
                                                <span>{opt.label}</span>
                                                {opt.count > 0 && (
                                                    <span
                                                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-gray-200/70 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        {opt.count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Show More / Show Less Toggle for Dynamic Lists */}
                            {section.collapsible && !optionSearch.trim() && matchingOptions.length > section.limit && (
                                <button
                                    type="button"
                                    onClick={() => toggleExpandSection(section.key)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6A38C2] dark:text-purple-400 hover:underline pt-0.5 cursor-pointer"
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp className="w-3 h-3" /> Show fewer
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3 h-3" /> + {hiddenCount} more
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    )
}

export default FilterCard