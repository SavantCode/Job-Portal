import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar'
import ApplicantsTable from './ApplicantsTable'
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAllApplicants } from '@/redux/applicationSlice';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

const Applicants = () => {
    const params = useParams();
    const dispatch = useDispatch();
    const { applicants } = useSelector(store => store.application);

    const [skillQuery, setSkillQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-7xl mx-auto px-4 sm:px-6 my-8 space-y-6'>
                <div className='bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6'>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                        <div>
                            <h1 className='font-bold text-xl text-gray-900'>
                                Applicants for {applicants?.title || "Job"} ({applicants?.applications?.length || 0})
                            </h1>
                            <p className='text-xs text-muted-foreground'>Filter candidates by skills, name, or application status and preview resumes.</p>
                        </div>

                        {/* Skill Search & Status Filter */}
                        <div className='flex flex-wrap items-center gap-3'>
                            <div className='relative w-64'>
                                <Search className='w-4 h-4 text-gray-400 absolute left-3 top-3' />
                                <Input
                                    type="text"
                                    placeholder="Filter by skill (e.g. React) or name..."
                                    value={skillQuery}
                                    onChange={(e) => setSkillQuery(e.target.value)}
                                    className="pl-9 h-9 rounded-xl text-xs"
                                />
                            </div>

                            <div className='flex items-center gap-1 bg-gray-100 p-1 rounded-xl'>
                                {["all", "pending", "accepted", "rejected"].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                                            statusFilter === st ? 'bg-white text-[#6A38C2] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <ApplicantsTable skillQuery={skillQuery} statusFilter={statusFilter} />
                </div>
            </div>
        </div>
    )
}

export default Applicants