import prisma from './prisma.js';

/**
 * Removes a user and rows that block FK deletion.
 * Company ownership is nulled (account kept). Invitees are re-parented to the org root
 * (or unlinked) so creatorId does not block the delete.
 */
export async function deleteUserCompletely(userId) {
    const targetId = Number.parseInt(String(userId), 10);
    if (!Number.isInteger(targetId) || targetId < 1) {
        const err = new Error('Invalid user id');
        err.code = 'INVALID_ID';
        throw err;
    }

    const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, email: true, role: true, creatorId: true },
    });
    if (!user) {
        const err = new Error('User not found');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    // Prefer re-parenting invitees under the deleted user's creator (or leave null).
    const reparentCreatorId =
        user.creatorId != null && Number.isInteger(Number(user.creatorId))
            ? Number(user.creatorId)
            : null;

    await prisma.$transaction(
        async (tx) => {
            // Independent cleanups in parallel — cuts wall time vs sequential awaits.
            await Promise.all([
                tx.payment.deleteMany({ where: { userId: targetId } }),
                tx.subscription.deleteMany({ where: { userId: targetId } }),
                tx.session.deleteMany({ where: { userId: targetId } }),
                tx.notification.deleteMany({ where: { recipientUserId: targetId } }),
                tx.site.updateMany({ where: { userId: targetId }, data: { userId: null } }),
                tx.company.updateMany({ where: { userId: targetId }, data: { userId: null } }),
                tx.auditPlan.updateMany({
                    where: { leadAuditorId: targetId },
                    data: { leadAuditorId: null },
                }),
                tx.auditProgram.updateMany({
                    where: { leadAuditorId: targetId },
                    data: { leadAuditorId: null },
                }),
                tx.auditPlan.updateMany({
                    where: { userId: targetId },
                    data: { userId: null },
                }),
                tx.auditProgram.updateMany({
                    where: { userId: targetId },
                    data: { userId: null },
                }),
                tx.user.updateMany({
                    where: { creatorId: targetId },
                    data: { creatorId: reparentCreatorId },
                }),
            ]);

            const email = user.email?.toLowerCase().trim();
            if (email) {
                await tx.otp.delete({ where: { email } }).catch(() => {});
            }

            // Disconnect M2M auditor memberships (implicit join tables).
            await tx.user.update({
                where: { id: targetId },
                data: {
                    auditPrograms: { set: [] },
                    auditPlans: { set: [] },
                },
            });

            // NC rows reference users with RESTRICT FKs — delete dependents then NCs.
            await Promise.all([
                tx.nonconformanceReview.deleteMany({ where: { reviewedById: targetId } }),
                tx.nonconformanceActivity.deleteMany({ where: { actorId: targetId } }),
                tx.nonconformanceResponse.deleteMany({ where: { submittedById: targetId } }),
            ]);

            await tx.nonconformance.deleteMany({
                where: {
                    OR: [
                        { assigneeId: targetId },
                        { reviewerId: targetId },
                        { createdById: targetId },
                    ],
                },
            });

            await tx.user.delete({ where: { id: targetId } });
        },
        {
            // Large orgs can exceed the default interactive transaction window.
            maxWait: 10_000,
            timeout: 30_000,
        },
    );

    return user;
}
