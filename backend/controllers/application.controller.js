import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import {
    generateICSInvite,
    buildEnterpriseEmailHTML,
    sendEnterpriseEmail
} from "../utils/mailer.js";

export const applyJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;
        const coverNote = req.body?.coverNote || "";

        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            });
        }

        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });
        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this job",
                success: false
            });
        }

        const job = await Job.findById(jobId).populate("company");
        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,
            status: "pending",
            hiringStage: "applied",
            coverNote: coverNote.trim()
        });

        job.applications.push(newApplication._id);
        await job.save();

        // Create initial confirmation notification for the candidate
        await Notification.create({
            recipient: userId,
            application: newApplication._id,
            job: job._id,
            type: "status_update",
            title: `Application Submitted: ${job.title}`,
            message: `Your application for ${job.title} at ${job.company?.name || "the company"} has been received and is pending review.`
        });

        return res.status(201).json({
            message: "Job applied successfully.",
            application: newApplication,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while applying for job.",
            success: false
        });
    }
};

export const withdrawApplication = async (req, res) => {
    try {
        const userId = req.id;
        const idParam = req.params.id;

        let application = await Application.findOne({ _id: idParam, applicant: userId });
        if (!application) {
            application = await Application.findOne({ job: idParam, applicant: userId });
        }

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            });
        }

        if (application.status !== "pending") {
            return res.status(400).json({
                message: `Cannot withdraw an application that has already been ${application.status}.`,
                success: false
            });
        }

        await Job.findByIdAndUpdate(application.job, {
            $pull: { applications: application._id }
        });

        await Application.findByIdAndDelete(application._id);

        return res.status(200).json({
            message: "Application withdrawn successfully.",
            applicationId: application._id,
            jobId: application.job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while withdrawing application.",
            success: false
        });
    }
};

export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const application = await Application.find({ applicant: userId }).sort({ createdAt: -1 }).populate({
            path: 'job',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'company',
                options: { sort: { createdAt: -1 } },
            }
        });
        if (!application) {
            return res.status(404).json({
                message: "No Applications",
                success: false
            });
        }
        return res.status(200).json({
            application,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while fetching applied jobs.",
            success: false
        });
    }
};

export const getApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId)
            .populate("company")
            .populate({
                path: 'applications',
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: 'applicant'
                }
            });
        if (!job) {
            return res.status(404).json({
                message: 'Job not found.',
                success: false
            });
        }
        return res.status(200).json({
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while fetching applicants.",
            success: false
        });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;
        if (!status) {
            return res.status(400).json({
                message: 'Status is required',
                success: false
            });
        }

        const application = await Application.findById(applicationId)
            .populate("applicant")
            .populate({ path: "job", populate: { path: "company" } });

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            });
        }

        const normalized = status.toLowerCase();
        application.status = normalized;
        if (normalized === "accepted" && application.hiringStage === "applied") {
            application.hiringStage = "shortlisted";
        } else if (normalized === "rejected") {
            application.hiringStage = "rejected";
        }

        await application.save();

        await Notification.create({
            recipient: application.applicant?._id,
            sender: req.id,
            application: application._id,
            job: application.job?._id,
            type: normalized === "accepted" ? "shortlisted" : "rejected",
            title: normalized === "accepted"
                ? `Application Accepted: ${application.job?.title}`
                : `Application Update: ${application.job?.title}`,
            message: normalized === "accepted"
                ? `Good news! ${application.job?.company?.name || "The recruiter"} has accepted and shortlisted your application for ${application.job?.title}.`
                : `Thank you for your interest in ${application.job?.title} at ${application.job?.company?.name || "the company"}. The hiring team has updated your status.`
        });

        return res.status(200).json({
            message: "Status updated successfully.",
            application,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while updating status.",
            success: false
        });
    }
};

/**
 * Full Enterprise Hiring Workflow Action Endpoint
 * Handles sequential stages:
 * 1. shortlist (Accept Application)
 * 2. assignment (Send Technical Assignment)
 * 3. interview (Schedule Round 1, Round 2, HR Round with .ics calendar attachment)
 * 4. interview_passed (Mark Interview Cleared)
 * 5. offer_letter (Send Official Offer Letter)
 * 6. joining_letter (Send Official Joining / Appointment Letter)
 * 7. rejection (Constructive Rejection)
 */
export const executeHiringStageAction = async (req, res) => {
    try {
        const applicationId = req.params.id;
        const {
            actionType,
            subject,
            body,
            sendEmail = true,
            interviewDetails,
            assignmentDetails,
            offerDetails,
            joiningDetails
        } = req.body;

        const application = await Application.findById(applicationId)
            .populate("applicant")
            .populate({
                path: "job",
                populate: { path: "company" }
            });

        if (!application) {
            return res.status(404).json({ message: "Application not found.", success: false });
        }

        const recruiter = await User.findById(req.id);
        const candidate = application.applicant;
        const job = application.job;
        const companyName = job?.company?.name || "Enterprise Hiring Partner";

        // Enforce logical progression rules
        if (
            ["assignment", "interview", "interview_passed", "offer_letter", "joining_letter"].includes(actionType) &&
            application.status === "rejected"
        ) {
            return res.status(400).json({
                message: "Please shortlist/accept the application before sending interview or offer communications.",
                success: false
            });
        }

        let badgeText = "APPLICATION UPDATE";
        let badgeColor = "#6A38C2";
        let notifType = "status_update";
        let notifTitle = subject || `Hiring Update: ${job?.title}`;

        if (actionType === "shortlist") {
            application.status = "accepted";
            application.hiringStage = "shortlisted";
            badgeText = "SHORTLISTED";
            badgeColor = "#2563EB";
            notifType = "shortlisted";
            notifTitle = `Application Shortlisted: ${job?.title} at ${companyName}`;
        } else if (actionType === "assignment") {
            application.status = "accepted";
            application.hiringStage = "assignment_sent";
            application.assignmentDetails = {
                ...application.assignmentDetails,
                ...assignmentDetails
            };
            badgeText = "TECHNICAL ASSIGNMENT";
            badgeColor = "#2563EB";
            notifType = "assignment";
            notifTitle = `Technical Assignment Received: ${job?.title} at ${companyName}`;
        } else if (actionType === "interview") {
            application.status = "accepted";
            application.hiringStage = "interview_scheduled";
            const nextRound = Number(interviewDetails?.roundNumber || (application.currentRound + 1) || 1);
            application.currentRound = nextRound;
            application.interviewDetails = {
                roundName: interviewDetails?.roundName || `Round ${nextRound} Interview`,
                roundNumber: nextRound,
                date: interviewDetails?.date || "",
                time: interviewDetails?.time || "",
                duration: Number(interviewDetails?.duration || 45),
                mode: interviewDetails?.mode || "Google Meet",
                meetingLink: interviewDetails?.meetingLink || "",
                notes: interviewDetails?.notes || ""
            };
            badgeText = `INTERVIEW INVITATION (ROUND ${nextRound})`;
            badgeColor = "#059669";
            notifType = "interview";
            notifTitle = `Interview Scheduled (${application.interviewDetails.roundName}): ${job?.title}`;
        } else if (actionType === "interview_passed") {
            application.status = "accepted";
            application.hiringStage = "interview_passed";
            badgeText = "INTERVIEW CLEARED";
            badgeColor = "#059669";
            notifType = "interview_passed";
            notifTitle = `Interview Round Cleared: ${job?.title} at ${companyName}`;
        } else if (actionType === "offer_letter") {
            application.status = "accepted";
            application.hiringStage = "offer_sent";
            application.offerDetails = {
                ctc: offerDetails?.ctc || `${job?.salary || "Competitive"} LPA`,
                joiningDate: offerDetails?.joiningDate || "",
                location: offerDetails?.location || job?.location || "",
                probationMonths: Number(offerDetails?.probationMonths || 3),
                benefits: offerDetails?.benefits || "Health Insurance, Flexible Work, Learning Stipend",
                letterContent: body,
                issuedAt: new Date()
            };
            badgeText = "OFFICIAL OFFER LETTER";
            badgeColor = "#047857";
            notifType = "offer_letter";
            notifTitle = `🎉 Official Offer Letter Issued: ${job?.title} at ${companyName}`;
        } else if (actionType === "joining_letter") {
            application.status = "accepted";
            application.hiringStage = "hired";
            application.joiningDetails = {
                joiningDate: joiningDetails?.joiningDate || application.offerDetails?.joiningDate || "",
                reportingTime: joiningDetails?.reportingTime || "10:00 AM",
                reportingManager: joiningDetails?.reportingManager || recruiter?.fullname || "Engineering Manager",
                workMode: joiningDetails?.workMode || "Hybrid",
                documentsRequired: joiningDetails?.documentsRequired || "Gov ID, PAN, Degree Certificates, Bank Details",
                letterContent: body,
                issuedAt: new Date()
            };
            badgeText = "JOINING & APPOINTMENT LETTER";
            badgeColor = "#15803D";
            notifType = "joining_letter";
            notifTitle = `🏛️ Official Joining Letter: Welcome to ${companyName}!`;
        } else if (actionType === "rejection") {
            application.status = "rejected";
            application.hiringStage = "rejected";
            badgeText = "APPLICATION STATUS UPDATE";
            badgeColor = "#64748B";
            notifType = "rejected";
            notifTitle = `Application Update for ${job?.title} at ${companyName}`;
        }

        let emailResult = { deliveryMode: "in-app", previewUrl: "" };
        let icsContent = null;

        if (actionType === "interview" && application.interviewDetails?.date) {
            icsContent = generateICSInvite({
                summary: `${application.interviewDetails.roundName}: ${job?.title} at ${companyName}`,
                description: `${body}\n\nMeeting Link: ${application.interviewDetails.meetingLink || "See email details"}`,
                location: application.interviewDetails.meetingLink || application.interviewDetails.mode,
                date: application.interviewDetails.date,
                time: application.interviewDetails.time || "11:00",
                durationMinutes: application.interviewDetails.duration || 45,
                organizerName: recruiter?.fullname || companyName,
                organizerEmail: recruiter?.email || "hr@jobportal.com",
                attendeeName: candidate?.fullname || "Candidate",
                attendeeEmail: candidate?.email || "candidate@example.com"
            });
        }

        const htmlContent = buildEnterpriseEmailHTML({
            companyName,
            companyLogo: job?.company?.logo || "",
            badgeText,
            badgeColor,
            subject,
            bodyText: body,
            actionType,
            interviewDetails: application.interviewDetails,
            assignmentDetails: application.assignmentDetails,
            offerDetails: application.offerDetails,
            joiningDetails: application.joiningDetails,
            recruiterName: recruiter?.fullname || `${companyName} Talent Team`,
            recruiterEmail: recruiter?.email || ""
        });

        if (sendEmail && candidate?.email) {
            try {
                const letterAttachmentName =
                    actionType === "offer_letter"
                        ? `Offer_Letter_${candidate.fullname?.replace(/\s+/g, "_")}.html`
                        : actionType === "joining_letter"
                        ? `Joining_Letter_${candidate.fullname?.replace(/\s+/g, "_")}.html`
                        : null;

                emailResult = await sendEnterpriseEmail({
                    to: candidate.email,
                    subject,
                    text: body,
                    html: htmlContent,
                    replyTo: recruiter?.email,
                    senderName: `${companyName} Hiring Team`,
                    icsContent,
                    letterAttachmentHtml: letterAttachmentName ? htmlContent : null,
                    letterAttachmentName
                });
            } catch (mailErr) {
                console.error("[Mailer Error]:", mailErr);
            }
        }

        const metadataSnapshot = {
            hiringStage: application.hiringStage,
            interviewDetails: actionType === "interview" ? application.interviewDetails : undefined,
            assignmentDetails: actionType === "assignment" ? application.assignmentDetails : undefined,
            offerDetails: actionType === "offer_letter" ? application.offerDetails : undefined,
            joiningDetails: actionType === "joining_letter" ? application.joiningDetails : undefined,
            icsContent: icsContent || undefined
        };

        application.emailLogs.push({
            actionType,
            subject,
            body,
            sentAt: new Date(),
            deliveryMode: emailResult.deliveryMode,
            previewUrl: emailResult.previewUrl || "",
            metadata: metadataSnapshot
        });

        await application.save();

        // Create real-time candidate notification
        const notification = await Notification.create({
            recipient: candidate?._id,
            sender: req.id,
            application: application._id,
            job: job?._id,
            type: notifType,
            title: notifTitle,
            message: body ? body.slice(0, 260) + (body.length > 260 ? "..." : "") : notifTitle,
            emailSubject: subject,
            emailBody: body,
            previewUrl: emailResult.previewUrl || "",
            metadata: {
                companyName,
                companyLogo: job?.company?.logo || "",
                jobTitle: job?.title || "",
                actionType,
                ...metadataSnapshot
            }
        });

        return res.status(200).json({
            success: true,
            message: `${badgeText} sent to ${candidate?.fullname} (${emailResult.deliveryMode.toUpperCase()})`,
            application,
            notification,
            previewUrl: emailResult.previewUrl || "",
            deliveryMode: emailResult.deliveryMode
        });
    } catch (error) {
        console.error("[Execute Hiring Stage Error]:", error);
        return res.status(500).json({
            message: "Server error while executing hiring stage action.",
            success: false
        });
    }
};

/**
 * Candidate submits assignment link
 */
export const submitCandidateAssignment = async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { submissionLink } = req.body;

        if (!submissionLink || !submissionLink.trim()) {
            return res.status(400).json({ message: "Assignment submission link is required.", success: false });
        }

        const application = await Application.findOne({ _id: applicationId, applicant: req.id });
        if (!application) {
            return res.status(404).json({ message: "Application not found.", success: false });
        }

        application.assignmentDetails = {
            ...(application.assignmentDetails || {}),
            submissionLink: submissionLink.trim(),
            submittedAt: new Date()
        };

        await application.save();

        return res.status(200).json({
            success: true,
            message: "Assignment submitted successfully! The recruiter can now review it.",
            application
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to submit assignment.", success: false });
    }
};