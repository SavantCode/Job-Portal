import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../shared/Navbar'
import ApplicantsTable from './ApplicantsTable'
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAllApplicants } from '@/redux/applicationSlice';
import { Input } from '../ui/input';
import { Search, Users, CheckCircle2, ClipboardList, Calendar, Award, Building2, XCircle } from 'lucide-react';

/**
 * Visual Kanban Pipeline Stages Configuration
 */
const PIPELINE_STAGES = [
    { key: "all", label: "All Candidates", icon: Users, color: "border-gray-200 bg-white text-gray-800" },
    { key: "applied", label: "Applied", icon: Users, color: "border-gray-200 bg-gray-50 text-gray-700" },
    { key: "shortlisted", label: "Shortlisted", icon: CheckCircle2, color: "border-blue-200 bg-blue-50/70 text-blue-800" },
    { key: "assignment_sent", label: "Assignment", icon: ClipboardList, color: "border-indigo-200 bg-indigo-50/70 text-indigo-800" },
    { key: "interview_scheduled", label: "In Interview", icon: Calendar, color: "border-purple-200 bg-purple-50/70 text-[#6A38C2]" },
    { key: "offer_stage", label: "Offer Stage", icon: Award, color: "border-teal-200 bg-teal-50/70 text-teal-800" },
    { key: "hired", label: "Joined / Hired", icon: Building2, color: "border-green-200 bg-green-50/70 text-green-800" },
    { key: "rejected", label: "Rejected", icon: XCircle, color: "border-red-200 bg-red-50/70 text-red-700" }
];

const Applicants = () => {
    const params = useParams();
    const dispatch = useDispatch();
    const { applicants } = useSelector(store => store.application);

    const [skillQuery, setSkillQuery] = useState("");
    const [stageFilter, setStageFilter] = useState("all");

    useEffect(() => {
        const fetchAllApplicants = async () => {
            try {
                const res = await axios.get(`${APPLICATION_API_END_POINT}/${params.id}/applicants`, { withCredentials: true });
                dispatch(setAllApplicants(res.data.job));
            } catch (error) {
                console.log(error);
            }
        };
        fetchAllApplicants();
    }, [params.id, dispatch]);

    // Calculate candidate counts per pipeline stage for the Kanban Funnel Bar
    const stageCounts = useMemo(() => {
        const apps = applicants?.applications || [];
        const counts = {
            all: apps.length,
            applied: 0,
            shortlisted: 0,
            assignment_sent: 0,
            interview_scheduled: 0,
            offer_stage: 0,
            hired: 0,
            rejected: 0
        };

        apps.forEach(item => {
            const st = item?.hiringStage || (item?.status === 'accepted' ? 'shortlisted' : item?.status === 'rejected' ? 'rejected' : 'applied');
            if (st === "applied") counts.applied++;
            else if (st === "shortlisted") counts.shortlisted++;
            else if (st === "assignment_sent") counts.assignment_sent++;
            else if (st === "interview_scheduled" || st === "interview_passed") counts.interview_scheduled++;
            else if (st === "offer_sent" || st === "offer_accepted" || st === "offer_declined") counts.offer_stage++;
            else if (st === "hired") counts.hired++;
            else if (st === "rejected") counts.rejected++;
        });

        return counts;
    }, [applicants]);

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-7xl mx-auto px-4 sm:px-6 my-8 space-y-6'>

                {/* Visual Kanban / Pipeline Stage Funnel Bar */}
                <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3'>
                    {PIPELINE_STAGES.map((stage) => {
                        const Icon = stage.icon;
                        const active = stageFilter === stage.key;
                        return (
                            <button
                                key={stage.key}
                                type="button"
                                onClick={() => setStageFilter(stage.key)}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    active
                                        ? "ring-2 ring-[#6A38C2] bg-white shadow-sm border-[#6A38C2]"
                                        : `${stage.color} hover:shadow-xs`
                                }`}
                            >
                                <div className='flex items-center justify-between mb-1'>
                                    <Icon className='w-4 h-4 opacity-80' />
                                    <span className='text-lg font-extrabold'>{stageCounts[stage.key] ?? 0}</span>
                                </div>
                                <p className='text-[11px] font-bold truncate'>{stage.label}</p>
                            </button>
                        );
                    })}
                </div>

                <div className='bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6'>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                        <div>
                            <h1 className='font-bold text-xl text-gray-900'>
                                Hiring Pipeline for {applicants?.title || "Job"} ({applicants?.applications?.length || 0})
                            </h1>
                            <p className='text-xs text-muted-foreground'>
                                Click any stage card above to filter candidates, inspect resumes, or dispatch AI letters & calendar invites.
                            </p>
                        </div>

                        {/* Skill & Candidate Search */}
                        <div className='flex flex-wrap items-center gap-3'>
                            <div className='relative w-72'>
                                <Search className='w-4 h-4 text-gray-400 absolute left-3 top-3' />
                                <Input
                                    type="text"
                                    placeholder="Search by skill (e.g. React) or candidate..."
                                    value={skillQuery}
                                    onChange={(e) => setSkillQuery(e.target.value)}
                                    className="pl-9 h-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <ApplicantsTable skillQuery={skillQuery} statusFilter={stageFilter} />
                </div>
            </div>
        </div>
    )
}

export default Applicants