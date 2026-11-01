import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../shared/Navbar'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import AdminJobsTable from './AdminJobsTable'
import useGetAllAdminJobs from '@/hooks/useGetAllAdminJobs'
import { setSearchJobByText } from '@/redux/jobSlice'
import { Briefcase, Users, CheckCircle2, Clock, Plus } from 'lucide-react'

const AdminJobs = () => {
    useGetAllAdminJobs();
    const [input, setInput] = useState("");
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { allAdminJobs = [] } = useSelector(store => store.job);

    useEffect(() => {
        dispatch(setSearchJobByText(input));
    }, [input, dispatch]);

    // Compute Recruiter Analytics Summary using multi-stage hiringStage + status
    const stats = useMemo(() => {
        let totalApplicants = 0;
        let accepted = 0;
        let rejected = 0;
        let pending = 0;

        allAdminJobs.forEach(job => {
            const apps = job?.applications || [];
            totalApplicants += apps.length;
            apps.forEach(app => {
                if (typeof app === 'object') {
                    const stage = app.hiringStage || "";
                    if (
                        stage === 'rejected' ||
                        stage === 'offer_declined' ||
                        app.status === 'rejected'
                    ) {
                        rejected++;
                    } else if (
                        ['shortlisted', 'assignment_sent', 'interview_scheduled', 'interview_passed', 'offer_sent', 'offer_accepted', 'hired'].includes(stage) ||
                        app.status === 'accepted'
                    ) {
                        accepted++;
                    } else {
                        pending++;
                    }
                } else {
                    pending++;
                }
            });
        });

        const conversionRate = totalApplicants > 0 ? Math.round((accepted / totalApplicants) * 100) : 0;
        return {
            totalJobs: allAdminJobs.length,
            totalApplicants,
            accepted,
            rejected,
            pending,
            conversionRate
        };
    }, [allAdminJobs]);

    return (
        <div className='min-h-screen bg-gray-50/40 pb-20'>
            <Navbar />
            <div className='max-w-6xl mx-auto px-4 sm:px-6 my-10 space-y-8'>

                {/* Recruiter Analytics Dashboard */}
                <div className='space-y-4'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-900'>Recruiter Analytics & Job Postings</h1>
                        <p className='text-xs text-muted-foreground'>Monitor active listings, applicant volume, and hiring conversion rates.</p>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                        <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-purple-50 text-[#6A38C2] flex items-center justify-center shrink-0'>
                                <Briefcase className='w-6 h-6' />
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-medium'>Active Job Listings</p>
                                <h3 className='text-2xl font-extrabold text-gray-900'>{stats.totalJobs}</h3>
                            </div>
                        </div>

                        <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0'>
                                <Users className='w-6 h-6' />
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-medium'>Total Applications</p>
                                <h3 className='text-2xl font-extrabold text-gray-900'>{stats.totalApplicants}</h3>
                            </div>
                        </div>

                        <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0'>
                                <CheckCircle2 className='w-6 h-6' />
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-medium'>Shortlisted / In Pipeline</p>
                                <h3 className='text-2xl font-extrabold text-gray-900'>
                                    {stats.accepted} <span className='text-xs font-semibold text-emerald-600'>({stats.conversionRate}%)</span>
                                </h3>
                            </div>
                        </div>

                        <div className='bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0'>
                                <Clock className='w-6 h-6' />
                            </div>
                            <div>
                                <p className='text-xs text-gray-500 font-medium'>Pending Review</p>
                                <h3 className='text-2xl font-extrabold text-gray-900'>{stats.pending}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter & Post New Job Bar */}
                <div className='bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6'>
                    <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                        <Input
                            className="w-full sm:w-80 rounded-xl"
                            placeholder="Filter by company name or role..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <Button
                            onClick={() => navigate("/admin/jobs/create")}
                            className="w-full sm:w-auto rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white cursor-pointer"
                        >
                            <Plus className='w-4 h-4 mr-1.5' /> Post New Job
                        </Button>
                    </div>
                    <AdminJobsTable />
                </div>
            </div>
        </div>
    )
}

export default AdminJobs