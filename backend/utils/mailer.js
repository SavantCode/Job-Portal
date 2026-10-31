import nodemailer from "nodemailer";

let cachedEtherealAccount = null;

/**
 * Resolves a Nodemailer transporter:
 * 1. Uses configured SMTP_HOST / SMTP_USER / SMTP_PASS (Gmail App Password, Brevo, Resend, etc.)
 * 2. Automatically fails over to a real Ethereal test account so emails work out-of-the-box with a live preview URL.
 */
const getTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const port = Number(process.env.SMTP_PORT || 587);
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        return { transporter, mode: "smtp" };
    }

    if (!cachedEtherealAccount) {
        cachedEtherealAccount = await nodemailer.createTestAccount();
    }

    const transporter = nodemailer.createTransport({
        host: cachedEtherealAccount.smtp.host,
        port: cachedEtherealAccount.smtp.port,
        secure: cachedEtherealAccount.smtp.secure,
        auth: {
            user: cachedEtherealAccount.user,
            pass: cachedEtherealAccount.pass
        }
    });

    return { transporter, mode: "ethereal" };
};

/**
 * Generates an RFC-5545 compliant iCalendar (.ics) file string for interview invites
 */
export const generateICSInvite = ({
    summary,
    description,
    location,
    date,
    time,
    durationMinutes = 45,
    organizerName = "Hiring Team",
    organizerEmail = "noreply@jobportal.com",
    attendeeName = "Candidate",
    attendeeEmail = "candidate@example.com"
}) => {
    try {
        const startDateTime = date && time ? new Date(`${date}T${time}:00`) : new Date(Date.now() + 86400000);
        const validStart = isNaN(startDateTime.getTime()) ? new Date(Date.now() + 86400000) : startDateTime;
        const endDateTime = new Date(validStart.getTime() + Number(durationMinutes || 45) * 60000);

        const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const uid = `interview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@jobportal.ai`;

        const cleanDesc = (description || "").replace(/\r?\n/g, "\\n");

        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//JobPortal Enterprise ATS//Hiring Engine//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${formatICSDate(validStart)}`,
            `DTEND:${formatICSDate(endDateTime)}`,
            `SUMMARY:${summary || "Technical Interview"}`,
            `DESCRIPTION:${cleanDesc}`,
            `LOCATION:${location || "Online Video Meeting"}`,
            `ORGANIZER;CN="${organizerName}":mailto:${organizerEmail}`,
            `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${attendeeName}":mailto:${attendeeEmail}`,
            "STATUS:CONFIRMED",
            "SEQUENCE:0",
            "BEGIN:VALARM",
            "TRIGGER:-PT15M",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder: Upcoming Interview in 15 minutes",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");
    } catch (err) {
        console.error("ICS Generation error:", err);
        return null;
    }
};

/**
 * Builds a responsive Enterprise HTML Email Template for all hiring stages
 */
export const buildEnterpriseEmailHTML = ({
    companyName = "Enterprise Partner",
    companyLogo = "",
    badgeText = "APPLICATION UPDATE",
    badgeColor = "#6A38C2",
    subject = "",
    bodyText = "",
    actionType = "shortlist",
    interviewDetails = null,
    assignmentDetails = null,
    offerDetails = null,
    joiningDetails = null,
    recruiterName = "Talent Acquisition Team",
    recruiterEmail = ""
}) => {
    const formattedBody = (bodyText || "")
        .split("\n")
        .map(line => line.trim() ? `<p style="margin:0 0 12px 0;color:#334155;font-size:15px;line-height:1.65;">${line}</p>` : `<br/>`)
        .join("");

    let extraCardHTML = "";

    if (actionType === "interview" && interviewDetails?.date) {
        extraCardHTML = `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#F5F3FF;border:1px solid #DDD6FE;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6A38C2;letter-spacing:0.06em;margin-bottom:10px;">
                    📅 Scheduled Interview Details (${interviewDetails.roundName || `Round ${interviewDetails.roundNumber || 1}`})
                </div>
                <table style="width:100%;font-size:14px;color:#1E293B;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#64748B;width:130px;">Date & Time:</td><td style="padding:4px 0;font-weight:600;">${interviewDetails.date} at ${interviewDetails.time || "TBD"} (${interviewDetails.duration || 45} mins)</td></tr>
                    <tr><td style="padding:4px 0;color:#64748B;">Interview Mode:</td><td style="padding:4px 0;font-weight:600;">${interviewDetails.mode || "Video Call"}</td></tr>
                    ${interviewDetails.notes ? `<tr><td style="padding:4px 0;color:#64748B;">Prep Notes:</td><td style="padding:4px 0;">${interviewDetails.notes}</td></tr>` : ""}
                </table>
                ${interviewDetails.meetingLink ? `
                    <div style="margin-top:16px;">
                        <a href="${interviewDetails.meetingLink}" target="_blank" style="display:inline-block;padding:11px 22px;background:#6A38C2;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;">
                            Join Live Interview Meeting →
                        </a>
                    </div>
                ` : ""}
                <div style="margin-top:10px;font-size:12px;color:#64748B;">
                    * An iCalendar (invite.ics) file is attached to this email to add directly to Google/Outlook/Apple Calendar.
                </div>
            </div>
        `;
    } else if (actionType === "assignment" && assignmentDetails?.title) {
        extraCardHTML = `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#EFF6FF;border:1px solid #BFDBFE;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#1D4ED8;letter-spacing:0.06em;margin-bottom:10px;">
                    📝 Technical Assignment Brief
                </div>
                <div style="font-size:16px;font-weight:700;color:#1E293B;margin-bottom:6px;">${assignmentDetails.title}</div>
                <div style="font-size:14px;color:#334155;margin-bottom:10px;white-space:pre-line;">${assignmentDetails.instructions || ""}</div>
                <div style="font-size:13px;color:#475569;"><strong>Submission Deadline:</strong> ${assignmentDetails.deadline || "Within 48 hours"}</div>
                ${assignmentDetails.referenceLink ? `
                    <div style="margin-top:14px;">
                        <a href="${assignmentDetails.referenceLink}" target="_blank" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;border-radius:10px;">
                            Open Assignment Brief / Starter Repo →
                        </a>
                    </div>
                ` : ""}
            </div>
        `;
    } else if (actionType === "offer_letter" && offerDetails?.ctc) {
        extraCardHTML = `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#ECFDF5;border:1px solid #A7F3D0;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#047857;letter-spacing:0.06em;margin-bottom:10px;">
                    🎉 Official Offer Summary
                </div>
                <table style="width:100%;font-size:14px;color:#1E293B;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#065F46;width:150px;">Offered Compensation:</td><td style="padding:4px 0;font-weight:700;">${offerDetails.ctc}</td></tr>
                    <tr><td style="padding:4px 0;color:#065F46;">Proposed Joining Date:</td><td style="padding:4px 0;font-weight:600;">${offerDetails.joiningDate || "Immediate / Flexible"}</td></tr>
                    <tr><td style="padding:4px 0;color:#065F46;">Work Location:</td><td style="padding:4px 0;font-weight:600;">${offerDetails.location || "Company HQ"}</td></tr>
                    <tr><td style="padding:4px 0;color:#065F46;">Probation Period:</td><td style="padding:4px 0;">${offerDetails.probationMonths || 3} Months</td></tr>
                    ${offerDetails.benefits ? `<tr><td style="padding:4px 0;color:#065F46;">Perks & Benefits:</td><td style="padding:4px 0;">${offerDetails.benefits}</td></tr>` : ""}
                </table>
            </div>
        `;
    } else if (actionType === "joining_letter" && joiningDetails?.joiningDate) {
        extraCardHTML = `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#F0FDF4;border:1px solid #86EFAC;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#15803D;letter-spacing:0.06em;margin-bottom:10px;">
                    🏛️ Onboarding & Joining Instructions
                </div>
                <table style="width:100%;font-size:14px;color:#1E293B;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#166534;width:150px;">Official Joining Date:</td><td style="padding:4px 0;font-weight:700;">${joiningDetails.joiningDate}</td></tr>
                    <tr><td style="padding:4px 0;color:#166534;">Reporting Time:</td><td style="padding:4px 0;font-weight:600;">${joiningDetails.reportingTime || "10:00 AM"}</td></tr>
                    <tr><td style="padding:4px 0;color:#166534;">Reporting Manager:</td><td style="padding:4px 0;font-weight:600;">${joiningDetails.reportingManager || "HR & Engineering Lead"}</td></tr>
                    <tr><td style="padding:4px 0;color:#166534;">Work Mode:</td><td style="padding:4px 0;">${joiningDetails.workMode || "Hybrid"}</td></tr>
                    ${joiningDetails.documentsRequired ? `<tr><td style="padding:4px 0;color:#166534;">Documents to Bring:</td><td style="padding:4px 0;">${joiningDetails.documentsRequired}</td></tr>` : ""}
                </table>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin:0;padding:24px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 12px rgba(15,23,42,0.04);">
                <div style="background:linear-gradient(135deg,#6A38C2 0%,#4F46E5 100%);padding:24px 28px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">${companyName}</div>
                        <div style="font-size:12px;opacity:0.85;margin-top:2px;">Enterprise Talent Acquisition Portal</div>
                    </div>
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${badgeColor};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;">
                        ${badgeText}
                    </span>
                </div>

                <div style="padding:28px;">
                    <h2 style="margin:0 0 18px 0;font-size:18px;color:#0F172A;">${subject}</h2>
                    ${formattedBody}
                    ${extraCardHTML}
                </div>

                <div style="padding:18px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;">
                    <div>Sent by <strong>${recruiterName}</strong> via <strong>JobPortal Enterprise ATS</strong></div>
                    ${recruiterEmail ? `<div style="margin-top:4px;">Direct Reply-To: <a href="mailto:${recruiterEmail}" style="color:#6A38C2;">${recruiterEmail}</a></div>` : ""}
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Dispatches the email with optional .ics calendar attachment or HTML letter attachment
 */
export const sendEnterpriseEmail = async ({
    to,
    subject,
    text,
    html,
    replyTo,
    senderName = "JobPortal Talent Acquisition",
    icsContent = null,
    letterAttachmentHtml = null,
    letterAttachmentName = null
}) => {
    const { transporter, mode } = await getTransporter();

    const fromAddress = process.env.SMTP_USER || "talent-acquisition@jobportal-ats.io";
    const attachments = [];

    if (icsContent) {
        attachments.push({
            filename: "invite.ics",
            content: icsContent,
            contentType: "text/calendar; charset=utf-8; method=REQUEST"
        });
    }

    if (letterAttachmentHtml && letterAttachmentName) {
        attachments.push({
            filename: letterAttachmentName,
            content: letterAttachmentHtml,
            contentType: "text/html; charset=utf-8"
        });
    }

    const info = await transporter.sendMail({
        from: `"${senderName}" <${fromAddress}>`,
        to,
        replyTo: replyTo || fromAddress,
        subject,
        text,
        html,
        attachments,
        ...(icsContent ? {
            icalEvent: {
                filename: "invite.ics",
                method: "request",
                content: icsContent
            }
        } : {})
    });

    let previewUrl = "";
    if (mode === "ethereal") {
        previewUrl = nodemailer.getTestMessageUrl(info) || "";
    }

    return {
        messageId: info.messageId,
        deliveryMode: mode,
        previewUrl
    };
};