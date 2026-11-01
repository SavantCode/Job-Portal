import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { AI_API_END_POINT } from '@/utils/constant';
import { printMockInterviewReport } from '@/utils/printDocument';
import {
    Mic, MicOff, Volume2, VolumeX, Sparkles, Loader2, CheckCircle2,
    AlertTriangle, Award, Play, Square, RotateCcw, Printer,
    MessageSquare, ChevronRight, ChevronLeft, HelpCircle, Check
} from 'lucide-react';

/**
 * ============================================================================
 * Enterprise Interactive AI Mock Interview Simulator (Voice + Text Q&A)
 * ============================================================================
 * Features:
 * 1. Dual Interview Modes:
 *    - 🎙️ Live Voice Interview Mode (Browser Native SpeechRecognition + SpeechSynthesis)
 *    - ⌨️ Structured Text Q&A Mode (Rich text response editor with live word count)
 * 2. 100% Free Browser-Native Audio Stack:
 *    - Text-to-Speech (TTS): AI Interviewer speaks the question aloud & can read the Ideal Answer.
 *    - Speech-to-Text (STT): Real-time continuous voice transcription with live timer & waveform.
 * 3. Instant Multi-Metric AI Grading Rubric (0 - 10 Scale):
 *    - Overall Score + Hiring Signal Badge
 *    - 3 Sub-Scores: Technical Accuracy, Clarity & Structure, STAR / Practical Depth
 *    - Actionable Strengths, Missing Concepts, and a 10/10 Reference Answer
 * 4. Executive Interview Readiness Summary & A4 PDF Export
 */
const MockInterviewSimulator = ({
    jobId,
    jobTitle = "Software Engineer",
    companyName = "Enterprise Corp",
    candidateName = "Candidate",
    questions = [],
    loadingQuestions = false,
    onGenerateQuestions,
    requireAuth
}) => {
    // Interview Mode: "voice" | "text"
    const [interviewMode, setInterviewMode] = useState("voice");
    // Current active question index (0 to questions.length - 1)
    const [activeIdx, setActiveIdx] = useState(0);
    // Toggle between active Q&A workspace and Final Readiness Summary Report
    const [showSummaryReport, setShowSummaryReport] = useState(false);

    // Per-question candidate answers: { [idx]: "candidate response text" }
    const [userAnswers, setUserAnswers] = useState({});
    // Per-question AI evaluations: { [idx]: { overallScore, technicalAccuracy, clarityAndStructure, starAndDepth, ... } }
    const [evaluations, setEvaluations] = useState({});
    const [evaluating, setEvaluating] = useState(false);

    // ========================================================================
    // Browser Native Text-to-Speech (TTS) State — AI Interviewer Voice
    // ========================================================================
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

    // ========================================================================
    // Browser Native Speech-to-Text (STT) State — Candidate Microphone Input
    // ========================================================================
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    // Check if the user's browser supports Web Speech API
    const isSpeechRecognitionSupported = useMemo(() => {
        if (typeof window === "undefined") return false;
        return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    }, []);

    const currentQuestion = questions[activeIdx] || null;
    const currentAnswer = userAnswers[activeIdx] || "";
    const currentEvaluation = evaluations[activeIdx] || null;

    // Stop any active TTS or STT when unmounting
    useEffect(() => {
        return () => {
            stopAiSpeaking();
            stopMicrophoneListening();
        };
    }, []);

    // When switching questions in Voice Mode, stop old audio and optionally read the new question aloud
    useEffect(() => {
        stopMicrophoneListening();
        if (currentQuestion && interviewMode === "voice" && !voiceMuted && !showSummaryReport) {
            speakTextAloud(currentQuestion.question);
        } else {
            stopAiSpeaking();
        }
    }, [activeIdx, currentQuestion?.question, interviewMode, showSummaryReport]);

    /**
     * Speak any text aloud using window.speechSynthesis (100% Free Browser TTS)
     */
    const speakTextAloud = (textToSpeak) => {
        if (!synthRef.current || !textToSpeak) return;
        try {
            synthRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Prefer a natural English voice if available on the OS/Browser
            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(
                v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Microsoft"))
            ) || voices.find(v => v.lang.startsWith("en"));

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onstart = () => setIsAiSpeaking(true);
            utterance.onend = () => setIsAiSpeaking(false);
            utterance.onerror = () => setIsAiSpeaking(false);

            synthRef.current.speak(utterance);
        } catch (err) {
            console.warn("TTS playback error:", err);
            setIsAiSpeaking(false);
        }
    };

    const stopAiSpeaking = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        setIsAiSpeaking(false);
    };

    /**
     * Start continuous microphone Speech-to-Text recording
     */
    const startMicrophoneListening = () => {
        if (!isSpeechRecognitionSupported) {
            toast.error("Voice recognition is not supported in this browser. Please use Chrome/Edge or switch to Text Mode.");
            setInterviewMode("text");
            return;
        }

        // Stop AI voice before candidate starts speaking so mic doesn't pick up speaker output
        stopAiSpeaking();

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onstart = () => {
                setIsListening(true);
                setInterimTranscript("");
                setRecordingSeconds(0);
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                    setRecordingSeconds(prev => prev + 1);
                }, 1000);
            };

            recognition.onresult = (event) => {
                let finalChunk = "";
                let interimChunk = "";

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalChunk += transcriptPiece + " ";
                    } else {
                        interimChunk += transcriptPiece;
                    }
                }

                if (finalChunk) {
                    setUserAnswers(prev => {
                        const existing = prev[activeIdx] ? prev[activeIdx].trim() + " " : "";
                        return {
                            ...prev,
                            [activeIdx]: (existing + finalChunk).trim()
                        };
                    });
                }
                setInterimTranscript(interimChunk);
            };

            recognition.onerror = (event) => {
                console.warn("SpeechRecognition error:", event.error);
                if (event.error === "not-allowed") {
                    toast.error("Microphone permission was denied. Please allow microphone access or type your answer.");
                }
                stopMicrophoneListening();
            };

            recognition.onend = () => {
                setIsListening(false);
                setInterimTranscript("");
                if (timerRef.current) clearInterval(timerRef.current);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error) {
            console.error("Failed to start SpeechRecognition:", error);
            toast.error("Could not start microphone recording.");
        }
    };

    /**
     * Stop microphone recording and flush any remaining interim transcript
     */
    const stopMicrophoneListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
            recognitionRef.current = null;
        }
        if (interimTranscript.trim()) {
            setUserAnswers(prev => {
                const existing = prev[activeIdx] ? prev[activeIdx].trim() + " " : "";
                return {
                    ...prev,
                    [activeIdx]: (existing + interimTranscript).trim()
                };
            });
            setInterimTranscript("");
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsListening(false);
    };

    /**
     * Submit the candidate's current answer (spoken or typed) to the AI Grading Engine
     */
    const handleEvaluateCurrentAnswer = async () => {
        if (requireAuth && !requireAuth()) return;
        stopMicrophoneListening();
        stopAiSpeaking();

        const combinedAnswer = `${currentAnswer} ${interimTranscript}`.trim();
        if (!combinedAnswer) {
            toast.error(interviewMode === "voice"
                ? "Please record your voice answer (or type in the transcript box) before submitting."
                : "Please type your answer before submitting for AI grading.");
            return;
        }

        try {
            setEvaluating(true);
            const res = await axios.post(
                `${AI_API_END_POINT}/evaluate-interview-answer`,
                {
                    jobId,
                    question: currentQuestion?.question,
                    questionType: currentQuestion?.type,
                    expectedAnswer: currentQuestion?.answer,
                    keyConcepts: currentQuestion?.keyConcepts || [],
                    userAnswer: combinedAnswer,
                    answerMode: interviewMode
                },
                { withCredentials: true }
            );

            if (res.data.success && res.data.evaluation) {
                setEvaluations(prev => ({
                    ...prev,
                    [activeIdx]: res.data.evaluation
                }));
                toast.success(`Graded: ${res.data.evaluation.overallScore} / 10 (${res.data.evaluation.verdictBadge})`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to evaluate answer.");
        } finally {
            setEvaluating(false);
        }
    };

    /**
     * Calculate aggregate readiness metrics across all graded questions
     */
    const summaryMetrics = useMemo(() => {
        const gradedEntries = Object.values(evaluations);
        if (gradedEntries.length === 0) {
            return {
                answeredCount: 0,
                averageScore: 0,
                readinessPercent: 0,
                verdict: "Complete at least 1 question to view readiness"
            };
        }
        const sum = gradedEntries.reduce((acc, ev) => acc + Number(ev.overallScore || 0), 0);
        const avg = Number((sum / gradedEntries.length).toFixed(1));
        const percent = Math.round(avg * 10);

        let verdict = "Needs More Practice";
        if (avg >= 8.0) verdict = "Strong Hire — Ready for Final Round";
        else if (avg >= 6.5) verdict = "Hire — Ready for Technical Round";
        else if (avg >= 5.0) verdict = "Borderline — Review Missing Concepts";

        return {
            answeredCount: gradedEntries.length,
            averageScore: avg,
            readinessPercent: percent,
            verdict
        };
    }, [evaluations]);

    const formatTimer = (secs) => {
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        return `${m}:${s}`;
    };

    const wordCount = `${currentAnswer} ${interimTranscript}`.trim()
        ? `${currentAnswer} ${interimTranscript}`.trim().split(/\s+/).length
        : 0;

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Top Header: Title, Mode Switcher, and Generate/Reset Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6A38C2] to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Mic className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                                Interactive AI Mock Interview Simulator
                            </h2>
                            <Badge className="bg-purple-100 text-[#6A38C2] border-none text-[10px] font-bold">
                                VOICE + TEXT • INSTANT AI GRADING
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Practice role-specific questions for <strong className="text-gray-700">{jobTitle}</strong> at <strong className="text-gray-700">{companyName}</strong> with real-time speech transcription and a 10-point AI hiring rubric.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Voice vs Text Mode Switcher */}
                    {questions.length > 0 && (
                        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setInterviewMode("voice");
                                    setShowSummaryReport(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    interviewMode === "voice" && !showSummaryReport
                                        ? "bg-[#6A38C2] text-white shadow-2xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <Mic className="w-3.5 h-3.5" /> Voice Interview
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    stopMicrophoneListening();
                                    stopAiSpeaking();
                                    setInterviewMode("text");
                                    setShowSummaryReport(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    interviewMode === "text" && !showSummaryReport
                                        ? "bg-[#6A38C2] text-white shadow-2xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <MessageSquare className="w-3.5 h-3.5" /> Text Q&A
                            </button>
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={() => {
                            stopMicrophoneListening();
                            stopAiSpeaking();
                            setShowSummaryReport(false);
                            setActiveIdx(0);
                            onGenerateQuestions();
                        }}
                        disabled={loadingQuestions}
                        className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold h-9 px-4 cursor-pointer"
                    >
                        {loadingQuestions ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading Simulator...</>
                        ) : (
                            <><Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" /> {questions.length > 0 ? "New Question Set" : "Start AI Mock Interview"}</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Empty State before starting interview */}
            {questions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 border border-dashed border-purple-200 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#6A38C2] flex items-center justify-center mx-auto">
                        <HelpCircle className="w-7 h-7" />
                    </div>
                    <div className="max-w-lg mx-auto space-y-1.5">
                        <h3 className="font-bold text-gray-900 text-base">
                            Ready to test your interview readiness for {jobTitle}?
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Click <strong>"Start AI Mock Interview"</strong> above to launch a 5-round technical & behavioral session. Choose between <strong>Live Voice Mode</strong> (AI speaks questions aloud & transcribes your spoken answer) or <strong>Text Q&A Mode</strong>.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-gray-600">
                        <span className="px-3 py-1 rounded-full bg-white border border-gray-200 font-medium">🎙️ Real-Time Voice-to-Text</span>
                        <span className="px-3 py-1 rounded-full bg-white border border-gray-200 font-medium">🔊 AI Voice Interviewer</span>
                        <span className="px-3 py-1 rounded-full bg-white border border-gray-200 font-medium">📊 10-Point Instant Rubric</span>
                        <span className="px-3 py-1 rounded-full bg-white border border-gray-200 font-medium">📄 A4 PDF Scorecard</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* 5-Round Question Progress Bar & Summary Report Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                            {questions.map((q, idx) => {
                                const ev = evaluations[idx];
                                const isCurrent = activeIdx === idx && !showSummaryReport;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setShowSummaryReport(false);
                                            setActiveIdx(idx);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                            isCurrent
                                                ? "bg-[#6A38C2] text-white border-[#6A38C2] shadow-xs"
                                                : ev
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-purple-200"
                                        }`}
                                    >
                                        <span>Q{idx + 1}</span>
                                        {ev && (
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${isCurrent ? "bg-white/20 text-white" : "bg-emerald-200/70 text-emerald-900"}`}>
                                                {ev.overallScore}/10
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            {summaryMetrics.answeredCount > 0 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={showSummaryReport ? "default" : "outline"}
                                    onClick={() => {
                                        stopMicrophoneListening();
                                        stopAiSpeaking();
                                        setShowSummaryReport(!showSummaryReport);
                                    }}
                                    className={`h-8 text-xs rounded-xl cursor-pointer ${
                                        showSummaryReport
                                            ? "bg-[#6A38C2] text-white"
                                            : "border-purple-200 text-[#6A38C2] hover:bg-purple-50"
                                    }`}
                                >
                                    <Award className="w-3.5 h-3.5 mr-1" />
                                    Readiness Report ({summaryMetrics.averageScore}/10)
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* VIEW A: Final Executive Readiness Report */}
                    {showSummaryReport ? (
                        <div className="space-y-6 p-6 rounded-2xl bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/40 border border-purple-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-purple-100">
                                <div>
                                    <Badge className="bg-purple-100 text-[#6A38C2] border-none text-[10px] font-bold mb-1.5">
                                        EXECUTIVE INTERVIEW SCORECARD
                                    </Badge>
                                    <h3 className="text-xl font-extrabold text-gray-900">{summaryMetrics.verdict}</h3>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        You have completed {summaryMetrics.answeredCount} of {questions.length} interview rounds for {jobTitle}.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-white px-4 py-3 rounded-2xl border border-purple-200 text-center shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Overall Score</span>
                                        <span className="text-2xl font-extrabold text-[#6A38C2]">
                                            {summaryMetrics.averageScore} / 10
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            printMockInterviewReport({
                                                candidateName,
                                                jobTitle,
                                                companyName,
                                                averageScore: summaryMetrics.averageScore,
                                                readinessVerdict: summaryMetrics.verdict,
                                                questions,
                                                evaluations,
                                                userAnswers
                                            })
                                        }
                                        className="rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold h-10 px-4 cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4 mr-1.5" /> Export A4 Report PDF
                                    </Button>
                                </div>
                            </div>

                            {/* Question-by-question summary cards */}
                            <div className="space-y-3">
                                {questions.map((q, idx) => {
                                    const ev = evaluations[idx];
                                    return (
                                        <div key={idx} className="p-4 rounded-2xl bg-white border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[10px]">Q{idx + 1} • {q.type}</Badge>
                                                    {ev ? (
                                                        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">
                                                            {ev.overallScore}/10 — {ev.verdictBadge}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-gray-400">Not Answered Yet</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-gray-900">{q.question}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowSummaryReport(false);
                                                    setActiveIdx(idx);
                                                }}
                                                className="h-8 text-xs rounded-xl shrink-0 cursor-pointer"
                                            >
                                                {ev ? "Review / Retry" : "Answer Now"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* VIEW B: Active Question & Voice/Text Simulator Workspace */
                        currentQuestion && (
                            <div className="space-y-5">
                                {/* Question Prompt Card with AI Voice Controls */}
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-purple-50/60 border border-purple-200/80 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-[#6A38C2] text-white border-none text-[10px] font-bold">
                                                ROUND {activeIdx + 1} OF {questions.length}
                                            </Badge>
                                            <Badge className="bg-white text-[#6A38C2] border border-purple-200 text-[10px] font-semibold">
                                                {currentQuestion.type || "Technical Question"}
                                            </Badge>
                                            {isAiSpeaking && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6A38C2] animate-pulse">
                                                    🔊 AI Interviewer Speaking...
                                                </span>
                                            )}
                                        </div>

                                        {/* AI Voice TTS Controls */}
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (isAiSpeaking) {
                                                        stopAiSpeaking();
                                                    } else {
                                                        speakTextAloud(currentQuestion.question);
                                                    }
                                                }}
                                                className="h-7 text-[11px] rounded-lg bg-white border-purple-200 text-[#6A38C2] hover:bg-purple-50 cursor-pointer"
                                            >
                                                {isAiSpeaking ? (
                                                    <><Square className="w-3 h-3 mr-1 fill-current" /> Stop AI Voice</>
                                                ) : (
                                                    <><Volume2 className="w-3.5 h-3.5 mr-1" /> Speak Question</>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    const nextMute = !voiceMuted;
                                                    setVoiceMuted(nextMute);
                                                    if (nextMute) stopAiSpeaking();
                                                }}
                                                className="h-7 w-7 rounded-lg text-gray-500 hover:text-[#6A38C2] cursor-pointer"
                                                title={voiceMuted ? "Unmute Auto-Voice" : "Mute Auto-Voice"}
                                            >
                                                {voiceMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                                        "{currentQuestion.question}"
                                    </h3>

                                    {currentQuestion.tip && (
                                        <p className="text-xs text-[#6A38C2] bg-white/80 px-3 py-2 rounded-xl border border-purple-100 font-medium">
                                            💡 <strong>Interviewer Hint:</strong> {currentQuestion.tip}
                                        </p>
                                    )}
                                </div>

                                {/* Voice Mode Microphone Control Bar */}
                                {interviewMode === "voice" && (
                                    <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                        isListening
                                            ? "bg-red-50/70 border-red-300 shadow-xs"
                                            : "bg-gray-50/90 border-gray-200"
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                                isListening ? "bg-red-600 text-white animate-pulse" : "bg-purple-100 text-[#6A38C2]"
                                            }`}>
                                                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-900">
                                                        {isListening ? "Listening & Transcribing Live..." : "Voice Answer Recorder (Web Speech API)"}
                                                    </span>
                                                    {isListening && (
                                                        <Badge className="bg-red-600 text-white border-none text-[10px]">
                                                            ● REC {formatTimer(recordingSeconds)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {isListening
                                                        ? "Speak clearly into your microphone. Your words appear live in the transcript box below."
                                                        : "Click 'Start Speaking' to answer via microphone, or edit the transcript directly below."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {!isListening ? (
                                                <Button
                                                    type="button"
                                                    onClick={startMicrophoneListening}
                                                    className="h-9 px-4 rounded-xl bg-[#6A38C2] hover:bg-[#5b30a6] text-white text-xs font-semibold cursor-pointer"
                                                >
                                                    <Mic className="w-3.5 h-3.5 mr-1.5" /> Start Speaking
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    onClick={stopMicrophoneListening}
                                                    className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                                                >
                                                    <Square className="w-3.5 h-3.5 mr-1.5 fill-current" /> Stop Recording
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Answer Transcript / Text Editor Box */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-700">
                                            {interviewMode === "voice" ? "🎙️ Live Voice Transcript (Editable before submitting)" : "⌨️ Your Structured Interview Answer"}
                                        </span>
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <span>{wordCount} words</span>
                                            {currentAnswer && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserAnswers(prev => ({ ...prev, [activeIdx]: "" }));
                                                        setInterimTranscript("");
                                                    }}
                                                    className="text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3 h-3" /> Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <textarea
                                        rows="5"
                                        value={interimTranscript ? `${currentAnswer} ${interimTranscript}`.trim() : currentAnswer}
                                        onChange={(e) => {
                                            setInterimTranscript("");
                                            setUserAnswers(prev => ({ ...prev, [activeIdx]: e.target.value }));
                                        }}
                                        placeholder={
                                            interviewMode === "voice"
                                                ? "Click 'Start Speaking' above and speak your answer, or type/edit your response here..."
                                                : "Write your response using the STAR method (Situation, Task, Action, Result) and cite concrete technical examples..."
                                        }
                                        className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A38C2]/30 focus:border-[#6A38C2] text-gray-800 resize-none bg-white shadow-2xs"
                                    />
                                </div>

                                {/* Action Row: Previous / Next Question & Submit Answer for AI Grading */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={activeIdx === 0}
                                            onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                                            className="h-9 rounded-xl text-xs cursor-pointer"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={activeIdx >= questions.length - 1}
                                            onClick={() => setActiveIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                            className="h-9 rounded-xl text-xs cursor-pointer"
                                        >
                                            Next Question <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>

                                    <Button
                                        type="button"
                                        disabled={evaluating}
                                        onClick={handleEvaluateCurrentAnswer}
                                        className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#6A38C2] to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-sm cursor-pointer"
                                    >
                                        {evaluating ? (
                                            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Evaluating Answer with AI Rubric...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4 mr-1.5 text-amber-300" /> {currentEvaluation ? "Re-Evaluate Answer" : "Submit Answer for Instant AI Grading"}</>
                                        )}
                                    </Button>
                                </div>

                                {/* Instant AI Evaluation Scorecard (Renders immediately after grading) */}
                                {currentEvaluation && (
                                    <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-purple-50/70 via-white to-emerald-50/40 border border-purple-200 space-y-5 shadow-xs">
                                        {/* Top Score & Verdict Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`border-none text-xs font-bold px-3 py-0.5 ${
                                                        currentEvaluation.overallScore >= 8
                                                            ? "bg-emerald-600 text-white"
                                                            : currentEvaluation.overallScore >= 6.5
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-amber-600 text-white"
                                                    }`}>
                                                        {currentEvaluation.verdictBadge}
                                                    </Badge>
                                                    <span className="text-[11px] text-gray-500 uppercase font-semibold">
                                                        Evaluated via {currentEvaluation.answerMode || interviewMode} mode
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-700 font-medium pt-1">
                                                    {currentEvaluation.feedbackSummary}
                                                </p>
                                            </div>

                                            <div className="bg-white px-5 py-3 rounded-2xl border border-purple-200 text-center shrink-0 shadow-2xs">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                                                    AI Score
                                                </span>
                                                <span className="text-2xl font-extrabold text-[#6A38C2]">
                                                    {currentEvaluation.overallScore} <span className="text-sm text-gray-400">/ 10</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* 3 Sub-Scores Progress Bars */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { label: "Technical Accuracy", score: currentEvaluation.technicalAccuracy },
                                                { label: "Clarity & Structure", score: currentEvaluation.clarityAndStructure },
                                                { label: "STAR / Practical Depth", score: currentEvaluation.starAndDepth }
                                            ].map((metric, i) => (
                                                <div key={i} className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold text-gray-600">{metric.label}</span>
                                                        <span className="font-extrabold text-gray-900">{metric.score} / 10</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#6A38C2] rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (metric.score || 0) * 10)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Strengths vs Improvements Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What You Did Well
                                                </p>
                                                <ul className="space-y-1.5 text-xs text-emerald-950">
                                                    {(currentEvaluation.strengths || []).map((st, i) => (
                                                        <li key={i} className="flex items-start gap-1.5">
                                                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                            <span>{st}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" /> How to Reach a 10/10
                                                </p>
                                                <ul className="space-y-1.5 text-xs text-amber-950">
                                                    {(currentEvaluation.improvements || []).map((imp, i) => (
                                                        <li key={i} className="flex items-start gap-1.5">
                                                            <span className="font-bold text-amber-700">•</span>
                                                            <span>{imp}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Ideal 10/10 Reference Answer with Audio Playback */}
                                        <div className="p-4 rounded-2xl bg-white border border-purple-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6A38C2]">
                                                    💡 Ideal 10/10 Senior-Level Sample Answer
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => speakTextAloud(currentEvaluation.idealAnswer)}
                                                    className="h-7 text-xs text-[#6A38C2] hover:bg-purple-50 rounded-lg cursor-pointer"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5 mr-1" /> Listen to Ideal Answer
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-700 leading-relaxed">
                                                {currentEvaluation.idealAnswer}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default MockInterviewSimulator;