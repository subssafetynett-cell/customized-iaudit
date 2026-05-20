import prisma from './prisma.js';

/**
 * Removes a user and rows that block FK deletion (payments, subscriptions, sessions, OTP).
 * Company/site rows owned by the user are kept; their userId is nulled by the DB (ON DELETE SET NULL).
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
        select: { id: true, email: true, role: true }
    });
    if (!user) {
        const err = new Error('User not found');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { userId: targetId } });
        await tx.subscription.deleteMany({ where: { userId: targetId } });
        await tx.session.deleteMany({ where: { userId: targetId } });

        const email = user.email?.toLowerCase().trim();
        if (email) {
            await tx.otp.delete({ where: { email } }).catch(() => {});
        }

        await tx.user.update({
            where: { id: targetId },
            data: {
                auditPrograms: { set: [] },
                auditPlans: { set: [] }
            }
        });

        await tx.user.delete({ where: { id: targetId } });
    });

    return user;
}
