import nodemailer from 'nodemailer';
import { escapeHtml } from '../textSanitize.js';

const transporterConfig = process.env.SMTP_HOST
    ? {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
          },
      }
    : {
          service: process.env.SMTP_SERVICE || 'gmail',
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
          },
      };

export const transporter = nodemailer.createTransport({
    ...transporterConfig,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    // Abort hung SMTP transfers before Coolify/proxy gateway timeouts.
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '10000', 10) || 10000,
});

export function isSmtpConfigured() {
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    return Boolean(user && pass);
}

const SMTP_FROM_DEFAULT = 'noreply@iaudit.global';

export function getSmtpFromAddress() {
    const explicit = String(process.env.SMTP_FROM_ADDRESS || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(explicit)) return explicit;
    const authUser = String(process.env.SMTP_USER || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authUser)) return authUser;
    return SMTP_FROM_DEFAULT;
}

export function getAppLoginUrl() {
    return String(process.env.FRONTEND_URL || 'http://localhost:8080')
        .trim()
        .replace(/\/$/, '');
}

export function getFrontendBaseUrl() {
    return getAppLoginUrl();
}

/**
 * Email when a nonconformance / exception finding is assigned.
 */
export async function sendNcAssignmentEmail({
    assignToEmail,
    assignToName,
    raisedByName,
    auditName,
    findingRef,
    ncNumber,
    auditPlanId,
    nonconformanceId,
    findingId,
}) {
    if (!isSmtpConfigured()) {
        console.warn('[NC-ASSIGN] SMTP not configured; skipping assignment email.');
        return { sent: false, skipped: true };
    }

    const safeAssignee = escapeHtml(assignToName || assignToEmail);
    const safeRaisedBy = escapeHtml(raisedByName || 'A team member');
    const safeAudit = escapeHtml(auditName || 'an audit');
    const safeRef = escapeHtml(findingRef || ncNumber || 'Nonconformance');
    const safeNc = escapeHtml(ncNumber || '');
    const base = getFrontendBaseUrl();
    const loginUrl = `${base}/login`;
    const ctaUrl =
        auditPlanId && findingId
            ? `${base}/audit-findings/${Number(auditPlanId)}/${encodeURIComponent(String(findingId))}?respond=1`
            : nonconformanceId
              ? `${base}/nonconformances/${Number(nonconformanceId)}`
              : `${base}/audit-findings`;
    const ctaLabel =
        auditPlanId && findingId
            ? "Respond to finding"
            : nonconformanceId
              ? "View nonconformance"
              : "View my findings";

    const subject = safeNc
        ? `${safeRaisedBy} raised nonconformance ${safeNc}`
        : `${safeRaisedBy} raised a nonconformance assigned to you`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #213847; margin-bottom: 8px;">Nonconformance assigned to you</h2>
            <p style="font-size: 15px; line-height: 1.6;">
                <strong>${safeRaisedBy}</strong> raised a nonconformance on <strong>${safeAudit}</strong>
                and assigned it to <strong>${safeAssignee}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                ${safeNc ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">NC number</p>
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: bold;">${safeNc}</p>` : ''}
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Finding</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold;">${safeRef}</p>
            </div>
            <p style="margin: 24px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: #1e855e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                    ${ctaLabel}
                </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">
                Or sign in at <a href="${loginUrl}" style="color: #1e855e;">${loginUrl}</a>
            </p>
            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Audit plan #${Number(auditPlanId) || ''} · This is an automated message.</p>
        </div>
    `;

    await transporter.sendMail({
        from: getSmtpFromAddress(),
        to: assignToEmail,
        subject,
        html,
        text: `${raisedByName || 'A team member'} raised a nonconformance (${findingRef || ncNumber || 'Finding'}) on ${auditName || 'an audit'} and assigned it to you. Please log in: ${ctaUrl}`,
    });

    return { sent: true };
}

/**
 * Email the reporter when an assignee submits a finding / NC response.
 */
export async function sendFindingResponseEmail({
    reporterEmail,
    reporterName,
    responderName,
    auditName,
    findingRef,
    ncNumber,
    auditPlanId,
    findingId,
    nonconformanceId,
    isUpdate = false,
}) {
    if (!isSmtpConfigured()) {
        console.warn('[FINDING-RESPONSE] SMTP not configured; skipping response email.');
        return { sent: false, skipped: true };
    }

    const safeReporter = escapeHtml(reporterName || reporterEmail);
    const safeResponder = escapeHtml(responderName || 'The assignee');
    const safeAudit = escapeHtml(auditName || 'an audit');
    const safeRef = escapeHtml(findingRef || ncNumber || 'Finding');
    const safeNc = escapeHtml(ncNumber || '');
    const base = getFrontendBaseUrl();
    const loginUrl = `${base}/login`;
    let ctaUrl = `${base}/audit-findings?tab=raised`;
    if (nonconformanceId) {
        ctaUrl = `${base}/nonconformances/${Number(nonconformanceId)}`;
    } else if (auditPlanId && findingId) {
        ctaUrl = `${base}/audit-findings/${Number(auditPlanId)}/${encodeURIComponent(String(findingId))}`;
    }
    const ctaLabel = nonconformanceId ? 'Review response' : 'View finding response';

    const subject = safeNc
        ? isUpdate
            ? `Updated response for ${safeNc}`
            : `Response submitted for ${safeNc}`
        : isUpdate
          ? `Updated response for ${safeRef}`
          : `Response submitted for ${safeRef}`;

    const headline = isUpdate ? 'Finding response updated' : 'Finding response received';
    const actionVerb = isUpdate ? 'updated their response' : 'submitted a response';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #213847; margin-bottom: 8px;">${headline}</h2>
            <p style="font-size: 15px; line-height: 1.6;">
                Hi <strong>${safeReporter}</strong>,
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
                <strong>${safeResponder}</strong> ${actionVerb} for a finding on
                <strong>${safeAudit}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                ${safeNc ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">NC number</p>
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: bold;">${safeNc}</p>` : ''}
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Finding</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold;">${safeRef}</p>
            </div>
            <p style="margin: 24px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: #1e855e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                    ${ctaLabel}
                </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">
                Or sign in at <a href="${loginUrl}" style="color: #1e855e;">${loginUrl}</a>
            </p>
            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Audit plan #${Number(auditPlanId) || ''} · This is an automated message.</p>
        </div>
    `;

    await transporter.sendMail({
        from: getSmtpFromAddress(),
        to: reporterEmail,
        subject,
        html,
        text: `${responderName || 'The assignee'} ${isUpdate ? 'updated their response' : 'submitted a response'} for ${findingRef || ncNumber || 'a finding'} on ${auditName || 'an audit'}. Review it here: ${ctaUrl}`,
    });

    return { sent: true };
}
