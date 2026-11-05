import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../shared/Navbar";
import Footer from "../shared/Footer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import axios from "axios";
import { SYSTEM_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    ShieldAlert,
    Users,
    Building2,
    Briefcase,
    FileText,
    Database,
    Cpu,
    RefreshCw,
    Search,
    Download,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Radio,
    Layers,
    Award,
    TrendingUp,
    Play,
    ExternalLink,
    PlusCircle,
    BarChart3,
    Clock
} from "lucide-react";

const STAGE_LABELS = {
    applied: "1. Applied",
    shortlisted: "2. Shortlisted",
    assignment_sent: "3. Assignment Sent",
    interview_scheduled: "4. Interview Scheduled",
    interview_passed: "5. Interview Passed",
    offer_sent: "6. Offer Sent",
    offer_accepted: "7. Offer Accepted",
    hired: "8. Joined / Hired",
    rejected: "Rejected / Archived"
};

/**
 * PlatformHeadquarters Component (/admin/hq)
 * Complete Admin & Maintainer Command Center connecting Job Seekers & Recruiters:
 * - Tab 1: Executive Overview, 8-Stage Conversion Funnel, Skill Supply vs. Demand Graphs & Market Analytics
 * - Tab 2: Job Seekers Directory (ATS Scores, Skills, Parsed Resumes, Application Stage)
 * - Tab 3: Recruiters, Companies & All Platform Jobs Moderation
 * - Tab 4: System Design, DB Indexes, LRU Cache, SSE Broker & Per-Route P95 Latency Telemetry
 * - Tab 5: Immutable Security Audit Logs & Background Dead-Letter Queue (DLQ)
 */
const PlatformHeadquarters = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview"); // "overview" | "seekers" | "recruiters" | "system" | "audit"
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [healthData, setHealthData] = useState(null);
    const [hqData, setHqData] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [dlqData, setDlqData] = useState({ stats: {}, deadLetterItems: [] });

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [auditStatusFilter, setAuditStatusFilter] = useState("ALL");
    const [auditScope, setAuditScope] = useState("platform");
    const [auditSearch, setAuditSearch] = useState("");

    const fetchAllHqTelemetry = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);
            else setLoading(true);

            const [healthRes, hqRes, auditRes, dlqRes] = await Promise.all([
                axios.get(`${SYSTEM_API_END_POINT}/health`, { withCredentials: true }),
                axios.get(`${SYSTEM_API_END_POINT}/hq-overview`, { withCredentials: true }),
                axios.get(
                    `${SYSTEM_API_END_POINT}/audit-logs?status=${auditStatusFilter}&scope=${auditScope}&limit=120`,
                    { withCredentials: true }
                ),
                axios.get(`${SYSTEM_API_END_POINT}/dlq`, { withCredentials: true })
            ]);

            if (healthRes.data?.success) setHealthData(healthRes.data);
            if (hqRes.data?.success) setHqData(hqRes.data);
            if (auditRes.data?.success) setAuditLogs(auditRes.data.logs || []);
            if (dlqRes.data?.success) setDlqData(dlqRes.data);

            if (showToast) toast.success("Platform Headquarters telemetry synchronized!");
        } catch (error) {
            console.error("HQ Fetch Error:", error);
            if (showToast) toast.error("Failed to refresh some HQ metrics.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllHqTelemetry(false);
    }, [auditStatusFilter, auditScope]);

    const handleFlushCache = async () => {
        try {
            const res = await axios.post(`${SYSTEM_API_END_POINT}/cache/flush`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchAllHqTelemetry(true);
            }
        } catch {
            toast.error("Failed to flush LRU cache.");
        }
    };

    const handleTriggerTestAudit = async () => {
        try {
            const res = await axios.post(
                `${SYSTEM_API_END_POINT}/audit-logs/test`,
                { actorName: "Platform Maintainer (HQ)" },
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                fetchAllHqTelemetry(false);
            }
        } catch {
            toast.error("Failed to record test audit event.");
        }
    };

    const handleDeleteJobFromHq = async (jobId, jobTitle) => {
        if (!window.confirm(`Delete job "${jobTitle}" and all its applications atomically?`)) return;
        try {
            const res = await axios.delete(`${SYSTEM_API_END_POINT}/hq/job/${jobId}`, {
                withCredentials: true
            });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchAllHqTelemetry(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete job.");
        }
    };

    const handleReplayDlq = async (taskId) => {
        try {
            const res = await axios.post(
                `${SYSTEM_API_END_POINT}/dlq/${taskId}/replay`,
                {},
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                fetchAllHqTelemetry(true);
            }
        } catch {
            toast.error("Failed to replay DLQ task.");
        }
    };

    const exportAuditLogsJson = () => {
        const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jobportal_audit_report_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported Security Audit Report as JSON!");
    };

    const filteredSeekers = useMemo(() => {
        const list = hqData?.jobSeekersDirectory || [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (s) =>
                s.fullname?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.location?.toLowerCase().includes(q) ||
                (s.skills || []).some((sk) => String(sk).toLowerCase().includes(q))
        );
    }, [hqData, searchQuery]);

    const filteredRecruiters = useMemo(() => {
        const list = hqData?.recruitersDirectory || [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (r) =>
                r.fullname?.toLowerCase().includes(q) ||
                r.email?.toLowerCase().includes(q) ||
                (r.companies || []).some((c) => String(c).toLowerCase().includes(q))
        );
    }, [hqData, searchQuery]);

    const filteredJobsInventory = useMemo(() => {
        const list = hqData?.jobsInventory || [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (j) =>
                j.title?.toLowerCase().includes(q) ||
                j.companyName?.toLowerCase().includes(q) ||
                j.location?.toLowerCase().includes(q) ||
                j.recruiterName?.toLowerCase().includes(q)
        );
    }, [hqData, searchQuery]);

    const filteredAuditLogs = useMemo(() => {
        const q = auditSearch.trim().toLowerCase();
        if (!q) return auditLogs;
        return auditLogs.filter(
            (log) =>
                log.action?.toLowerCase().includes(q) ||
                log.actorName?.toLowerCase().includes(q) ||
                log.entityType?.toLowerCase().includes(q) ||
                log.ipAddress?.toLowerCase().includes(q)
        );
    }, [auditLogs, auditSearch]);

    const kpis = hqData?.kpis || {};
    const funnel = hqData?.funnelBreakdown || [];
    const skillsChart = hqData?.topSkillsComparison || [];
    const jobsByLocation = hqData?.jobsByLocation || [];
    const jobsByType = hqData?.jobsByType || [];
    const secCounters = healthData?.securityCounters || healthData?.security || {};

    return (
        <div className="min-h-screen bg-gray-50/60 dark:bg-[#0b1120] flex flex-col justify-between transition-colors">
            <div>
                <Navbar />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8 space-y-6">
                    {/* Top Executive Command Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-[#2e1065] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-purple-500/20">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wider text-purple-200">
                                    <ShieldAlert className="w-3.5 h-3.5 text-[#F83002]" />
                                    <span>Platform Maintainer & System Design Headquarters</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    JobPortal Global Operations & Intelligence HQ
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                                    Unified observability across all Job Seekers, Recruiters, 8-Stage Hiring Funnels, Skill Supply vs. Demand Gaps, MongoDB Indexes, LRU Cache, Real-Time SSE Streams, and Immutable Security Audit Logs.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <Button
                                    type="button"
                                    onClick={handleFlushCache}
                                    variant="outline"
                                    className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 cursor-pointer"
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                                    Flush LRU Cache
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => fetchAllHqTelemetry(true)}
                                    disabled={refreshing}
                                    className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold h-10 px-4 cursor-pointer shadow-md"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                                    {refreshing ? "Syncing HQ..." : "Refresh Live Telemetry"}
                                </Button>
                            </div>
                        </div>

                        {/* Live System Health Strip inside Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">MongoDB Status & Ping</span>
                                <span className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5 mt-0.5">
                                    <Database className="w-3.5 h-3.5" />
                                    {healthData?.database?.state === "connected" ? "ONLINE" : "SYNCING"} ({healthData?.database?.pingLatencyMs ?? 1.2} ms)
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">API Latency (Avg / P95)</span>
                                <span className="font-extrabold text-sm text-white flex items-center gap-1.5 mt-0.5">
                                    <Clock className="w-3.5 h-3.5 text-purple-300" />
                                    {healthData?.latency?.avgMs ?? 0}ms / {healthData?.latency?.p95Ms ?? 0}ms
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">LRU Cache Hit Ratio</span>
                                <span className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5 mt-0.5">
                                    <Zap className="w-3.5 h-3.5" />
                                    {healthData?.cache?.hitRatePercent ?? 0}% ({healthData?.cache?.hits ?? 0}H / {healthData?.cache?.misses ?? 0}M)
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">Live SSE Push Streams</span>
                                <span className="font-extrabold text-sm text-cyan-300 flex items-center gap-1.5 mt-0.5">
                                    <Radio className="w-3.5 h-3.5" />
                                    {healthData?.sseBroker?.activeConnections ?? 0} Sockets ({healthData?.sseBroker?.totalPublishedEvents ?? 0} Pushed)
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">Rate-Limiter & Sanitizer</span>
                                <span className="font-extrabold text-sm text-rose-300 flex items-center gap-1.5 mt-0.5">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    {secCounters.totalRateLimitedRequests ?? 0} Blocked • {secCounters.totalSanitizedPayloads ?? 0} Cleaned
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-slate-400 block text-[11px]">Node Memory (Heap / RSS)</span>
                                <span className="font-extrabold text-sm text-indigo-200 flex items-center gap-1.5 mt-0.5">
                                    <Cpu className="w-3.5 h-3.5" />
                                    {healthData?.memoryMB?.heapUsed ?? 0} MB / {healthData?.memoryMB?.rss ?? 0} MB
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* HQ Navigation Tabs */}
                    <div className="flex items-center flex-wrap gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
                        {[
                            { id: "overview", label: "1. Executive Graphs & Funnel", icon: BarChart3 },
                            { id: "seekers", label: `2. Job Seekers (${kpis.totalStudents || 0})`, icon: Users },
                            { id: "recruiters", label: `3. Recruiters & Jobs (${kpis.totalRecruiters || 0})`, icon: Building2 },
                            { id: "system", label: "4. System Design & Latency", icon: Cpu },
                            { id: "audit", label: `5. Security Audit & DLQ (${auditLogs.length})`, icon: ShieldAlert }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                        active
                                            ? "bg-[#6A38C2] text-white shadow-sm"
                                            : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {loading ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-slate-800">
                            <RefreshCw className="w-8 h-8 text-[#6A38C2] animate-spin mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                                Aggregating Platform-Wide Telemetry & MongoDB Facets...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* =====================================================================
                                TAB 1: EXECUTIVE OVERVIEW, FUNNEL & SKILL SUPPLY VS DEMAND GRAPHS
                               ===================================================================== */}
                            {activeTab === "overview" && (
                                <div className="space-y-6">
                                    {/* 6 Global KPI Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-[#6A38C2] mb-1">
                                                <Users className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Job Seekers</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.totalStudents || 0}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {kpis.resumesUploadedCount || 0} Parsed Resumes ({kpis.resumeUploadRate || 0}%)
                                            </p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-blue-600 mb-1">
                                                <Building2 className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Recruiters</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.totalRecruiters || 0}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {kpis.totalCompanies || 0} Verified Companies
                                            </p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-indigo-600 mb-1">
                                                <Briefcase className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Active Jobs</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.totalJobs || 0}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Indexed in LRU Cache</p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-emerald-600 mb-1">
                                                <FileText className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Applications</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.totalApplications || 0}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {kpis.shortlistedOrBeyondCount || 0} Shortlisted ({kpis.overallConversionRate || 0}%)
                                            </p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-amber-600 mb-1">
                                                <Award className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Avg ATS Score</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.avgCandidateAtsScore || 75}%
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Candidate Match Readiness</p>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                                            <div className="flex items-center justify-between text-rose-600 mb-1">
                                                <ShieldAlert className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase">Audit Events</span>
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {kpis.totalAuditEvents || auditLogs.length}
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Append-Only Compliance</p>
                                        </div>
                                    </div>

                                    {/* Visual Graph Row 1: 8-Stage Hiring Funnel + Skill Demand vs Candidate Supply */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Graph 1: 8-Stage Hiring Pipeline Conversion Funnel */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h2 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-[#6A38C2]" />
                                                        8-Stage Platform Hiring Conversion Funnel
                                                    </h2>
                                                    <p className="text-xs text-gray-500">
                                                        Real-time candidate progression across all recruiter pipelines
                                                    </p>
                                                </div>
                                                <Badge className="bg-purple-50 text-[#6A38C2] border-purple-200 text-xs">
                                                    {kpis.totalApplications || 0} Total Apps
                                                </Badge>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                {funnel.map((item) => (
                                                    <div key={item.stage} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-bold text-gray-700 dark:text-slate-200">
                                                                {STAGE_LABELS[item.stage] || item.stage}
                                                            </span>
                                                            <span className="font-extrabold text-gray-900 dark:text-white">
                                                                {item.count} ({item.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    item.stage === "rejected"
                                                                        ? "bg-rose-500"
                                                                        : item.stage === "hired" || item.stage === "offer_accepted"
                                                                        ? "bg-emerald-500"
                                                                        : "bg-gradient-to-r from-[#6A38C2] to-indigo-500"
                                                                }`}
                                                                style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.percentage)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Graph 2: Top In-Demand Job Skills vs. Candidate Skill Supply */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h2 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Layers className="w-4 h-4 text-[#6A38C2]" />
                                                        Recruiter Skill Demand vs. Candidate Supply Gap
                                                    </h2>
                                                    <p className="text-xs text-gray-500">
                                                        Compares required skills in job postings against parsed student resumes
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] font-bold">
                                                    <span className="flex items-center gap-1 text-[#6A38C2]">
                                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#6A38C2]" /> Demand
                                                    </span>
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Supply
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                {skillsChart.length === 0 ? (
                                                    <p className="text-xs text-gray-400 py-8 text-center">
                                                        No skill telemetry available yet.
                                                    </p>
                                                ) : (
                                                    skillsChart.map((sk) => {
                                                        const maxVal = Math.max(
                                                            sk.jobDemandCount,
                                                            sk.candidateSupplyCount,
                                                            1
                                                        );
                                                        const demandPct = Math.round((sk.jobDemandCount / maxVal) * 100);
                                                        const supplyPct = Math.round(
                                                            (sk.candidateSupplyCount / maxVal) * 100
                                                        );
                                                        return (
                                                            <div key={sk.skill} className="space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-gray-800 dark:text-slate-200">
                                                                        {sk.skill}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        <strong className="text-[#6A38C2]">
                                                                            {sk.jobDemandCount} Jobs
                                                                        </strong>{" "}
                                                                        •{" "}
                                                                        <strong className="text-emerald-600">
                                                                            {sk.candidateSupplyCount} Candidates
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                    <div className="w-full h-2 bg-purple-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-[#6A38C2] rounded-full"
                                                                            style={{ width: `${Math.max(8, demandPct)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="w-full h-2 bg-emerald-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-emerald-500 rounded-full"
                                                                            style={{ width: `${Math.max(8, supplyPct)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Graph Row 2: Geographic Distribution + Work Type Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                                Job Openings by City / Hub
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {jobsByLocation.map((loc) => (
                                                    <div
                                                        key={loc.location}
                                                        className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700"
                                                    >
                                                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                                                            {loc.location}
                                                        </p>
                                                        <p className="text-xl font-extrabold text-[#6A38C2] dark:text-purple-400 mt-1">
                                                            {loc.count}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">Active Roles</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                                Employment Type Distribution & Marketplace Balance
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {jobsByType.map((jt) => (
                                                    <div
                                                        key={jt.jobType}
                                                        className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-slate-800/70 border border-purple-100 dark:border-slate-700"
                                                    >
                                                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                                                            {jt.jobType}
                                                        </p>
                                                        <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                                                            {jt.count}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">Postings</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* =====================================================================
                                TAB 2: JOB SEEKERS DIRECTORY & TALENT ANALYTICS
                               ===================================================================== */}
                            {activeTab === "seekers" && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                                                Registered Job Seekers & Resume Intelligence ({filteredSeekers.length})
                                            </h2>
                                            <p className="text-xs text-gray-500">
                                                Inspect candidate skills, ATS readiness scores, parsed resume status, and hiring pipeline progress.
                                            </p>
                                        </div>
                                        <div className="relative w-full sm:w-80">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                            <Input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search candidate name, email, skill..."
                                                className="pl-9 h-10 rounded-xl text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-500 uppercase text-[11px]">
                                                    <th className="py-3 px-3">Candidate</th>
                                                    <th className="py-3 px-3">Location & Status</th>
                                                    <th className="py-3 px-3">Parsed Skills</th>
                                                    <th className="py-3 px-3">ATS Readiness</th>
                                                    <th className="py-3 px-3">Resume</th>
                                                    <th className="py-3 px-3">Applications & Stage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {filteredSeekers.map((stu) => (
                                                    <tr key={stu._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50">
                                                        <td className="py-3.5 px-3">
                                                            <p className="font-bold text-gray-900 dark:text-white">{stu.fullname}</p>
                                                            <p className="text-[11px] text-gray-500">{stu.email}</p>
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className="font-medium text-gray-700 dark:text-slate-300 block">
                                                                {stu.location}
                                                            </span>
                                                            <Badge
                                                                className={`mt-1 text-[10px] ${
                                                                    stu.openToWork
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        : "bg-gray-100 text-gray-600"
                                                                }`}
                                                            >
                                                                {stu.openToWork ? "Open to Work" : "Passive"}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3.5 px-3 max-w-xs">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(stu.skills || []).slice(0, 5).map((sk, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-[#6A38C2] dark:text-purple-300 text-[10px] font-semibold"
                                                                    >
                                                                        {sk}
                                                                    </span>
                                                                ))}
                                                                {(stu.skills || []).length === 0 && (
                                                                    <span className="text-gray-400 italic">No skills listed</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span
                                                                className={`font-extrabold text-xs px-2.5 py-1 rounded-lg ${
                                                                    stu.resumeAtsScore >= 75
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : "bg-amber-50 text-amber-700"
                                                                }`}
                                                            >
                                                                {stu.resumeAtsScore}% ATS
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            {stu.resumeUrl ? (
                                                                <a
                                                                    href={stu.resumeUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[#6A38C2] font-bold hover:underline"
                                                                >
                                                                    <span>View CV</span>
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400">Not Uploaded</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                {stu.applicationsCount} Applied
                                                            </span>
                                                            <span className="block text-[10px] text-gray-500 capitalize">
                                                                Latest: {String(stu.latestStage).replace(/_/g, " ")}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* =====================================================================
                                TAB 3: RECRUITERS DIRECTORY & ALL PLATFORM JOBS INVENTORY
                               ===================================================================== */}
                            {activeTab === "recruiters" && (
                                <div className="space-y-6">
                                    {/* Recruiters Table */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                                                    Recruiters & Enterprise Organizations ({filteredRecruiters.length})
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    Multi-tenant overview of all recruiter accounts, registered companies, and hiring conversion rates.
                                                </p>
                                            </div>
                                            <div className="relative w-full sm:w-80">
                                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                                <Input
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Filter recruiters, companies, or jobs..."
                                                    className="pl-9 h-10 rounded-xl text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-500 uppercase text-[11px]">
                                                        <th className="py-3 px-3">Recruiter</th>
                                                        <th className="py-3 px-3">Registered Companies</th>
                                                        <th className="py-3 px-3">Jobs Posted</th>
                                                        <th className="py-3 px-3">Applications Received</th>
                                                        <th className="py-3 px-3">Shortlist Conversion</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {filteredRecruiters.map((rec) => (
                                                        <tr key={rec._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50">
                                                            <td className="py-3.5 px-3">
                                                                <p className="font-bold text-gray-900 dark:text-white">{rec.fullname}</p>
                                                                <p className="text-[11px] text-gray-500">{rec.email}</p>
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {(rec.companies || []).map((c, idx) => (
                                                                        <Badge
                                                                            key={idx}
                                                                            variant="secondary"
                                                                            className="text-[11px] font-semibold"
                                                                        >
                                                                            {c}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-3 font-extrabold text-gray-900 dark:text-white">
                                                                {rec.jobsPostedCount} Jobs
                                                            </td>
                                                            <td className="py-3.5 px-3 font-bold text-blue-600">
                                                                {rec.totalApplicationsReceived} Applicants
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                                                                    {rec.shortlistedCount} Shortlisted ({rec.conversionRate}%)
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Complete Platform Jobs Inventory & Moderation */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                        <div>
                                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                                All Platform Job Listings & Moderation ({filteredJobsInventory.length})
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Inspect any job across the platform or atomically purge spam/expired listings (ACID transaction).
                                            </p>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-500 uppercase text-[11px]">
                                                        <th className="py-3 px-3">Role Title</th>
                                                        <th className="py-3 px-3">Company & Recruiter</th>
                                                        <th className="py-3 px-3">Location & Package</th>
                                                        <th className="py-3 px-3">Applicants</th>
                                                        <th className="py-3 px-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {filteredJobsInventory.map((job) => (
                                                        <tr key={job._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50">
                                                            <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white">
                                                                {job.title}
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                <span className="font-semibold text-[#6A38C2] block">
                                                                    {job.companyName}
                                                                </span>
                                                                <span className="text-[11px] text-gray-500">
                                                                    by {job.recruiterName}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-3 text-gray-600 dark:text-slate-300">
                                                                {job.location} • {job.salary} LPA
                                                            </td>
                                                            <td className="py-3.5 px-3">
                                                                <Badge variant="secondary" className="text-[11px]">
                                                                    {job.applicationsCount} Applicants
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3.5 px-3 text-right space-x-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => navigate(`/description/${job._id}`)}
                                                                    className="h-8 text-xs rounded-xl cursor-pointer"
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDeleteJobFromHq(job._id, job.title)}
                                                                    className="h-8 text-xs rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* =====================================================================
                                TAB 4: SYSTEM DESIGN, MONGODB INDEXES & PER-ROUTE P95 LATENCY
                               ===================================================================== */}
                            {activeTab === "system" && (
                                <div className="space-y-6">
                                    {/* Per-Route Latency Table */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-[#6A38C2]" />
                                                    Live HTTP Endpoint Latency Leaderboard (P50: {healthData?.latency?.p50Ms ?? 0}ms • P95: {healthData?.latency?.p95Ms ?? 0}ms • P99: {healthData?.latency?.p99Ms ?? 0}ms)
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    High-resolution `process.hrtime.bigint()` telemetry per API route
                                                </p>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-500 uppercase text-[11px]">
                                                        <th className="py-2.5 px-3">Normalized Route</th>
                                                        <th className="py-2.5 px-3">Requests</th>
                                                        <th className="py-2.5 px-3">Average Latency</th>
                                                        <th className="py-2.5 px-3">Peak (Max) Latency</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {(healthData?.latency?.topEndpoints || []).map((ep) => (
                                                        <tr key={ep.route}>
                                                            <td className="py-2.5 px-3 font-mono font-semibold text-gray-900 dark:text-white">
                                                                {ep.route}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-bold text-[#6A38C2]">
                                                                {ep.requests} reqs
                                                            </td>
                                                            <td className="py-2.5 px-3 text-emerald-600 font-bold">
                                                                {ep.avgMs} ms
                                                            </td>
                                                            <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400">
                                                                {ep.maxMs} ms
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Active MongoDB B-Tree, Full-Text & TTL Indexes */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Database className="w-4 h-4 text-[#6A38C2]" />
                                            MongoDB B-Tree, ESR Compound, Weighted Full-Text & TTL Indexes
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(hqData?.dbIndexes || {}).map(([collection, idxList]) => (
                                                <div
                                                    key={collection}
                                                    className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200/70 dark:border-slate-700 space-y-2"
                                                >
                                                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#6A38C2] dark:text-purple-400">
                                                        {collection} Collection
                                                    </h3>
                                                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300 font-mono">
                                                        {idxList.map((idxName) => (
                                                            <li key={idxName} className="flex items-start gap-1.5">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                                <span>{idxName}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* =====================================================================
                                TAB 5: IMMUTABLE SECURITY AUDIT LOGS & DEAD-LETTER QUEUE (DLQ)
                               ===================================================================== */}
                            {activeTab === "audit" && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <ShieldAlert className="w-5 h-5 text-[#6A38C2]" />
                                                    Immutable Security & Hiring Audit Trail ({filteredAuditLogs.length})
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    Append-only log of logins, job creations, ACID deletions, stage transitions, rate-limit blocks, and NoSQL sanitization events.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleTriggerTestAudit}
                                                    className="rounded-xl text-xs h-9 border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                                >
                                                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                                                    Record Test Audit Event
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={exportAuditLogsJson}
                                                    className="rounded-xl text-xs h-9 cursor-pointer"
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                                    Export JSON
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Filter Controls */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {["ALL", "SUCCESS", "BLOCKED", "FAILURE"].map((st) => (
                                                    <button
                                                        key={st}
                                                        type="button"
                                                        onClick={() => setAuditStatusFilter(st)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                                            auditStatusFilter === st
                                                                ? "bg-[#6A38C2] text-white"
                                                                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                                                        }`}
                                                    >
                                                        {st}
                                                    </button>
                                                ))}

                                                <select
                                                    value={auditScope}
                                                    onChange={(e) => setAuditScope(e.target.value)}
                                                    className="ml-2 h-8 px-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800"
                                                >
                                                    <option value="platform">Scope: Platform-Wide (Maintainer)</option>
                                                    <option value="tenant">Scope: My Account Only</option>
                                                </select>
                                            </div>

                                            <div className="relative w-full sm:w-72">
                                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                                                <Input
                                                    value={auditSearch}
                                                    onChange={(e) => setAuditSearch(e.target.value)}
                                                    placeholder="Search action, actor, or IP..."
                                                    className="pl-8 h-8 rounded-xl text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Audit Logs Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-500 uppercase text-[11px]">
                                                        <th className="py-3 px-3">Timestamp</th>
                                                        <th className="py-3 px-3">Action</th>
                                                        <th className="py-3 px-3">Actor & Role</th>
                                                        <th className="py-3 px-3">Entity</th>
                                                        <th className="py-3 px-3">Status</th>
                                                        <th className="py-3 px-3">IP Address</th>
                                                        <th className="py-3 px-3">Metadata</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {filteredAuditLogs.map((log) => (
                                                        <tr key={log._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50">
                                                            <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                                                                {log.createdAt
                                                                    ? new Date(log.createdAt).toLocaleString()
                                                                    : "Just now"}
                                                            </td>
                                                            <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-white">
                                                                {log.action}
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                                                                    {log.actorName}
                                                                </span>
                                                                <span className="text-[10px] uppercase text-[#6A38C2] font-bold">
                                                                    {log.actorRole}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-gray-600 dark:text-slate-300">
                                                                {log.entityType}
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <Badge
                                                                    className={`text-[10px] font-bold ${
                                                                        log.status === "BLOCKED" || log.status === "FAILURE"
                                                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    }`}
                                                                >
                                                                    {log.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-3 font-mono text-gray-500">
                                                                {log.ipAddress}
                                                            </td>
                                                            <td className="py-3 px-3 max-w-xs truncate font-mono text-[11px] text-gray-500">
                                                                {JSON.stringify(log.metadata || {})}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Background Worker Queue & Dead-Letter Queue (DLQ) Panel */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                                    Asynchronous Background Queue & Dead-Letter Queue (DLQ)
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    Enqueued: {dlqData?.stats?.totalEnqueued ?? 0} • Processed: {dlqData?.stats?.totalProcessed ?? 0} • Retried: {dlqData?.stats?.totalRetried ?? 0} • Dead-Lettered: {dlqData?.deadLetterItems?.length ?? 0}
                                                </p>
                                            </div>
                                        </div>

                                        {(dlqData?.deadLetterItems || []).length === 0 ? (
                                            <div className="p-8 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 text-center space-y-1">
                                                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                                    Zero Dead-Letter Queue Failures — All Async Tasks Healthy
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    Any task that fails 3 exponential-backoff attempts will appear here for 1-click replay.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {dlqData.deadLetterItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                    >
                                                        <div className="space-y-1 text-xs">
                                                            <div className="font-bold text-gray-900">
                                                                {item.type} ({item.id})
                                                            </div>
                                                            <div className="text-rose-600 font-medium">
                                                                Error after {item.attempts} attempts: {item.lastError}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => handleReplayDlq(item.id)}
                                                            className="rounded-xl bg-[#6A38C2] text-white text-xs cursor-pointer shrink-0"
                                                        >
                                                            <Play className="w-3.5 h-3.5 mr-1" /> Replay Task
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PlatformHeadquarters;