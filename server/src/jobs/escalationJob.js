import prisma from '../prisma.js';
import { sendEscalationEmail } from '../mail/smtp.js';

/**
 * Checks open nonconformances to see if their escalation date has passed.
 * If passed and not responded to, escalates the finding and sends an email.
 */
export async function runEscalationCheck() {
    console.log('[EscalationJob] Starting background check...');
    try {
        const openNcs = await prisma.nonconformance.findMany({
            where: {
                status: {
                    in: ['ASSIGNED', 'CHANGES_REQUESTED']
                }
            },
            include: {
                auditPlan: true,
                assignee: {
                    select: { firstName: true, lastName: true, email: true }
                }
            }
        });

        const now = new Date();
        let escalatedCount = 0;

        for (const nc of openNcs) {
            try {
                if (!nc.auditPlan || !nc.auditPlan.findingsData) continue;
                
                // Parse findingsData if it's a string, or use directly if it's an object
                const findingsData = typeof nc.auditPlan.findingsData === 'string' 
                    ? JSON.parse(nc.auditPlan.findingsData) 
                    : nc.auditPlan.findingsData;

                const finding = (findingsData.findings || []).find(f => f.id === nc.findingId);
                
                if (!finding || !finding.escalationDate || !finding.escalationTo) continue;

                const escDate = new Date(finding.escalationDate);
                
                // If escalationDate is valid and in the past
                if (!Number.isNaN(escDate.getTime()) && escDate < now) {
                    console.log(`[EscalationJob] Escalating NC ${nc.ncNumber} (Finding ID: ${nc.findingId})`);

                    // 1. Update status to ESCALATED
                    await prisma.nonconformance.update({
                        where: { id: nc.id },
                        data: { status: 'ESCALATED' }
                    });

                    // 2. Parse escalation email
                    // Escalation To might look like "Jane Doe (jane@iaudit.global)"
                    let escalationEmail = finding.escalationTo.trim();
                    const emailMatch = escalationEmail.match(/\(([^)]+@[^)]+)\)$/);
                    if (emailMatch) {
                        escalationEmail = emailMatch[1].trim();
                    }

                    // 3. Send email
                    const assigneeName = `${nc.assignee?.firstName || ''} ${nc.assignee?.lastName || ''}`.trim() || nc.assignee?.email || 'The assignee';
                    
                    await sendEscalationEmail({
                        escalationEmail,
                        ncNumber: nc.ncNumber,
                        findingTitle: finding.findingTitle || nc.findingTitle,
                        auditName: nc.auditPlan.auditName,
                        assigneeName,
                        nonconformanceId: nc.id
                    });

                    escalatedCount++;
                }
            } catch (err) {
                console.error(`[EscalationJob] Error processing NC ${nc.id}:`, err);
            }
        }

        console.log(`[EscalationJob] Finished check. Escalated ${escalatedCount} findings.`);
    } catch (error) {
        console.error('[EscalationJob] Critical error during execution:', error);
    }
}
