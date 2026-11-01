/**
 * Enterprise A4 Document Print & PDF Generator
 * Opens a dedicated, isolated A4 document window (with @page { size: A4 })
 * so Chrome's "Save as PDF" produces a real, vector, multi-page A4 PDF
 * without any modal scrollbars, clipped headers, or UI overlays.
 */

const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

export const printA4Letterhead = ({
    type = "offer", // "offer" | "joining"
    appId = "DRAFT",
    dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    candidateName = "Candidate",
    candidateEmail = "",
    candidatePhone = "",
    candidateSignature = "",
    jobTitle = "Software Engineer",
    companyName = "Enterprise Corporation",
    companyLogo = "",
    companyLocation = "India",
    letterBody = "",
    offerDetails = {},
    joiningDetails = {}
}) => {
    const isJoining = type === "joining";
    const docBadge = isJoining
        ? "OFFICIAL APPOINTMENT & JOINING LETTER"
        : "OFFICIAL EMPLOYMENT OFFER LETTER";
    const refCode = escapeHtml(`JP-${String(appId).slice(-6).toUpperCase()}`);
    const safeTitle = escapeHtml(`${companyName.replace(/\s+/g, "_")}_${isJoining ? "Joining_Letter" : "Offer_Letter"}_${candidateName.replace(/\s+/g, "_")}`);

    const safeCompanyName = escapeHtml(companyName);
    const safeCompanyLocation = escapeHtml(companyLocation);
    const safeCandidateName = escapeHtml(candidateName);
    const safeCandidateEmail = escapeHtml(candidateEmail);
    const safeCandidatePhone = escapeHtml(candidatePhone);
    const safeCandidateSig = escapeHtml(candidateSignature || candidateName);
    const safeJobTitle = escapeHtml(jobTitle);
    const safeDateStr = escapeHtml(dateStr);

    const logoHtml = companyLogo
        ? `<img src="${escapeHtml(companyLogo)}" alt="${safeCompanyName}" style="width:56px;height:56px;object-fit:contain;border-radius:12px;border:1px solid #e9d5ff;background:#faf5ff;padding:4px;" />`
        : `<div style="width:56px;height:56px;border-radius:12px;background:#f3e8ff;color:#6A38C2;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;border:1px solid #d8b4fe;">${escapeHtml((companyName || "C").charAt(0).toUpperCase())}</div>`;

    const termsTableHtml = isJoining
        ? `
        <div class="terms-box">
            <div class="terms-header">ONBOARDING & JOINING SCHEDULE</div>
            <table class="terms-table">
                <tr>
                    <td><span class="label">Official Joining Date:</span> <strong>${escapeHtml(joiningDetails?.joiningDate || "TBD")}</strong></td>
                    <td><span class="label">Reporting Time:</span> <strong>${escapeHtml(joiningDetails?.reportingTime || "10:00 AM")}</strong></td>
                </tr>
                <tr>
                    <td><span class="label">Reporting Manager:</span> <strong>${escapeHtml(joiningDetails?.reportingManager || "Engineering Manager")}</strong></td>
                    <td><span class="label">Work Mode:</span> <strong>${escapeHtml(joiningDetails?.workMode || "Hybrid")}</strong></td>
                </tr>
                <tr>
                    <td colspan="2"><span class="label">Mandatory Documents:</span> <strong>${escapeHtml(joiningDetails?.documentsRequired || "Government ID, PAN, Educational & Experience Certificates")}</strong></td>
                </tr>
            </table>
        </div>`
        : `
        <div class="terms-box">
            <div class="terms-header">COMPENSATION & EMPLOYMENT TERMS</div>
            <table class="terms-table">
                <tr>
                    <td><span class="label">Annual Compensation (CTC):</span> <strong>${escapeHtml(offerDetails?.ctc || "As per discussion")}</strong></td>
                    <td><span class="label">Proposed Start Date:</span> <strong>${escapeHtml(offerDetails?.joiningDate || "TBD")}</strong></td>
                </tr>
                <tr>
                    <td><span class="label">Work Location:</span> <strong>${escapeHtml(offerDetails?.location || companyLocation)}</strong></td>
                    <td><span class="label">Probation Period:</span> <strong>${escapeHtml(offerDetails?.probationMonths || 3)} Months</strong></td>
                </tr>
                <tr>
                    <td colspan="2"><span class="label">Benefits & Perks:</span> <strong>${escapeHtml(offerDetails?.benefits || "Comprehensive Health Insurance, Standard Corporate Benefits")}</strong></td>
                </tr>
            </table>
        </div>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 14mm 16mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.65;
        }
        .page-container {
            width: 100%;
            max-width: 180mm;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2.5px solid #6A38C2;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .company-name {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin: 0;
            letter-spacing: -0.3px;
        }
        .company-sub {
            font-size: 11px;
            color: #6b7280;
            margin: 3px 0 0 0;
        }
        .doc-meta {
            text-align: right;
            font-size: 11px;
            color: #6b7280;
        }
        .doc-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            background: #f3e8ff;
            color: #6A38C2;
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .recipient-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12.5px;
        }
        .recipient-box p {
            margin: 2px 0;
        }
        .letter-body {
            white-space: pre-line;
            font-size: 13px;
            color: #1f2937;
            line-height: 1.7;
            margin-bottom: 22px;
        }
        .terms-box {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 26px;
            page-break-inside: avoid;
        }
        .terms-header {
            background: #f3f4f6;
            padding: 8px 14px;
            font-size: 11px;
            font-weight: 800;
            color: #111827;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #d1d5db;
        }
        .terms-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .terms-table td {
            padding: 9px 14px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #e5e7eb;
            vertical-align: top;
        }
        .terms-table tr:last-child td {
            border-bottom: none;
        }
        .terms-table td:last-child {
            border-right: none;
        }
        .label {
            color: #6b7280;
            margin-right: 4px;
        }
        .signatures {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 22px;
            border-top: 1px solid #e5e7eb;
            page-break-inside: avoid;
            margin-top: 24px;
        }
        .verified-stamp {
            color: #6A38C2;
            font-weight: 700;
            font-size: 12px;
            margin-bottom: 4px;
        }
        .sig-script {
            font-family: Georgia, 'Times New Roman', serif;
            font-style: italic;
            font-size: 18px;
            color: #111827;
            margin-bottom: 4px;
        }
        .sig-line {
            border-top: 1px solid #9ca3af;
            padding-top: 4px;
            font-size: 11px;
            color: #6b7280;
            min-width: 180px;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="header">
            <div class="brand">
                ${logoHtml}
                <div>
                    <h1 class="company-name">${safeCompanyName}</h1>
                    <p class="company-sub">${safeCompanyLocation} • Official HR Executive Document</p>
                </div>
            </div>
            <div class="doc-meta">
                <div class="doc-badge">${docBadge}</div>
                <div><strong>Ref ID:</strong> ${refCode}</div>
                <div><strong>Date:</strong> ${safeDateStr}</div>
            </div>
        </div>

        <div class="recipient-box">
            <p style="font-size:14px;font-weight:700;color:#111827;">To: ${safeCandidateName}</p>
            ${safeCandidateEmail ? `<p><strong>Email:</strong> ${safeCandidateEmail}</p>` : ""}
            ${safeCandidatePhone ? `<p><strong>Phone:</strong> ${safeCandidatePhone}</p>` : ""}
            <p><strong>Position:</strong> ${safeJobTitle}</p>
        </div>

        <div class="letter-body">${escapeHtml(letterBody || "")}</div>

        ${termsTableHtml}

        <div class="signatures">
            <div>
                <div class="verified-stamp">✓ Digitally Verified by ${safeCompanyName} HR</div>
                <div style="font-size:11px;color:#6b7280;">Authorized Signatory • Talent Acquisition</div>
            </div>
            <div style="text-align:right;">
                <div class="sig-script">${safeCandidateSig}</div>
                <div class="sig-line">Candidate Digital Signature</div>
            </div>
        </div>
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 250);
        };
    </script>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=900,height=1000");
    if (!printWin) {
        alert("Please allow pop-ups in your browser to generate the A4 PDF.");
        return;
    }
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
};

export const printCandidateCV = ({
    fullname = "Candidate",
    email = "",
    phoneNumber = "",
    bio = "",
    skills = []
}) => {
    const safeTitle = escapeHtml(`${fullname.replace(/\s+/g, "_")}_Curriculum_Vitae`);
    const skillsBadges = (skills.length > 0 ? skills : ["Full Stack Development", "Problem Solving", "Agile Delivery"])
        .map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`)
        .join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 16mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.6;
        }
        .cv-header {
            border-bottom: 2.5px solid #6A38C2;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .name {
            font-size: 26px;
            font-weight: 800;
            margin: 0;
            color: #111827;
        }
        .subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #6A38C2;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 4px;
        }
        .section {
            margin-bottom: 22px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #6b7280;
            margin-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
        }
        .skill-pill {
            display: inline-block;
            background: #f3e8ff;
            color: #6A38C2;
            border: 1px solid #d8b4fe;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            margin: 0 6px 6px 0;
        }
    </style>
</head>
<body>
    <div class="cv-header">
        <div>
            <h1 class="name">${escapeHtml(fullname)}</h1>
            <div class="subtitle">Verified Candidate Profile & Curriculum Vitae</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#4b5563;">
            <div><strong>Email:</strong> ${escapeHtml(email)}</div>
            <div><strong>Phone:</strong> ${escapeHtml(phoneNumber)}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Professional Summary</div>
        <p style="margin:0;color:#1f2937;">
            ${escapeHtml(bio || "Results-driven software professional experienced in building modern, scalable web applications and collaborating across agile engineering teams.")}
        </p>
    </div>

    <div class="section">
        <div class="section-title">Core Technical Competencies</div>
        <div>${skillsBadges}</div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 250);
        };
    </script>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=850,height=950");
    if (!printWin) {
        alert("Please allow pop-ups in your browser to save the CV as PDF.");
        return;
    }
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
};

/**
 * Print / Save A4 AI Mock Interview Scorecard & Readiness Report
 */
export const printMockInterviewReport = ({
    candidateName = "Candidate",
    jobTitle = "Software Engineer",
    companyName = "Enterprise Corp",
    averageScore = 0,
    readinessVerdict = "Ready for Technical Round",
    questions = [],
    evaluations = {},
    userAnswers = {}
}) => {
    const safeTitle = escapeHtml(`${candidateName.replace(/\s+/g, "_")}_Mock_Interview_Report_${jobTitle.replace(/\s+/g, "_")}`);
    const dateStr = escapeHtml(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }));

    const qaRowsHtml = questions
        .map((q, idx) => {
            const ev = evaluations[idx];
            const ans = userAnswers[idx] || "Not answered";
            const scoreStr = ev ? `${escapeHtml(ev.overallScore)} / 10 (${escapeHtml(ev.verdictBadge)})` : "Not Graded";
            const strengthsHtml = ev?.strengths?.length
                ? `<p style="margin:4px 0;color:#065f46;font-size:11.5px;"><strong>✓ Strengths:</strong> ${ev.strengths.map(escapeHtml).join(" • ")}</p>`
                : "";
            const improvementsHtml = ev?.improvements?.length
                ? `<p style="margin:4px 0;color:#92400e;font-size:11.5px;"><strong>⚠ Improvements:</strong> ${ev.improvements.map(escapeHtml).join(" • ")}</p>`
                : "";

            return `
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:14px;page-break-inside:avoid;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-weight:800;font-size:12px;color:#6A38C2;text-transform:uppercase;">Q${idx + 1} • ${escapeHtml(q.type || "Technical")}</span>
                    <span style="font-weight:700;font-size:12px;color:#111827;background:#f3e8ff;padding:2px 8px;border-radius:6px;">${scoreStr}</span>
                </div>
                <p style="margin:0 0 8px 0;font-weight:700;color:#111827;font-size:13px;">${escapeHtml(q.question)}</p>
                <p style="margin:0 0 8px 0;color:#374151;font-size:12px;background:#f9fafb;padding:8px 10px;border-radius:6px;border:1px solid #f3f4f6;">
                    <strong>Your Answer:</strong> ${escapeHtml(ans)}
                </p>
                ${strengthsHtml}
                ${improvementsHtml}
                <p style="margin:6px 0 0 0;color:#1e3a8a;font-size:11.5px;">
                    <strong>💡 Ideal Reference Answer:</strong> ${escapeHtml(ev?.idealAnswer || q.answer)}
                </p>
            </div>`;
        })
        .join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
        @page { size: A4 portrait; margin: 14mm 16mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, sans-serif; color: #111827; font-size: 13px; line-height: 1.55; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #6A38C2; padding-bottom: 14px; margin-bottom: 18px; }
        .summary-banner { display: flex; justify-content: space-between; align-items: center; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#111827;">AI Mock Interview Readiness Report</h1>
            <p style="margin:3px 0 0 0;font-size:12px;color:#6b7280;">Candidate: <strong>${escapeHtml(candidateName)}</strong> • Target Role: <strong>${escapeHtml(jobTitle)} (${escapeHtml(companyName)})</strong></p>
        </div>
        <div style="text-align:right;font-size:11px;color:#6b7280;">
            <div><strong>Date:</strong> ${dateStr}</div>
            <div><strong>Assessment Engine:</strong> JobPortal AI Bar-Raiser</div>
        </div>
    </div>

    <div class="summary-banner">
        <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6A38C2;">Overall Hiring Readiness Verdict</div>
            <div style="font-size:16px;font-weight:800;color:#111827;margin-top:2px;">${escapeHtml(readinessVerdict)}</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:11px;color:#6b7280;">Average Rubric Score</div>
            <div style="font-size:22px;font-weight:800;color:#6A38C2;">${escapeHtml(averageScore)} / 10</div>
        </div>
    </div>

    ${qaRowsHtml}

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 250);
        };
    </script>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=900,height=1000");
    if (!printWin) {
        alert("Please allow pop-ups in your browser to save the Interview Report as PDF.");
        return;
    }
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
};