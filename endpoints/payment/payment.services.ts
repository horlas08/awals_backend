import prisma from "../../prisma/client.js";

export class PaymentService {
    static async getBalances(userId: string) {
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                pendingBalance: true,
                availableBalance: true,
                totalWithdrawn: true,
                royalPointsBalance: true,
            },
        });

        if (!user) throw new Error("User not found");

        const settings = await (prisma as any).appSettings.findFirst({});
        const minimumWithdrawal =
            typeof settings?.minimumWithdrawal === "number"
                ? settings.minimumWithdrawal
                : 0;

        const pointsPerDollar =
            typeof settings?.pointsPerDollar === "number" ? settings.pointsPerDollar : 0;

        // Total balance is sum of pending and available in our context
        const totalBalance = user.pendingBalance + user.availableBalance;
        // Total earned is total withdrawn + total balance (approx for mock-sync logic)
        const totalEarned = user.totalWithdrawn + totalBalance;

        return {
            pendingBalance: user.pendingBalance,
            availableBalance: user.availableBalance,
            totalBalance: totalBalance,
            totalWithdrawn: user.totalWithdrawn,
            totalEarned: totalEarned,
            royalPointsBalance: user.royalPointsBalance,
            minimumWithdrawal,
            pointsPerDollar,
        };
    }

    static async getMyTransactions(userId: string, opts?: { limit?: number; cursor?: string }) {
        const limit = Math.max(1, Math.min(Number(opts?.limit ?? 50), 200));

        const where: any = { userId };
        const orderBy: any = { createdAt: "desc" };

        const txs = await (prisma as any).transaction.findMany({
            where,
            orderBy,
            take: limit,
            ...(opts?.cursor
                ? {
                      cursor: { id: opts.cursor },
                      skip: 1,
                  }
                : {}),
        });

        const nextCursor = txs.length === limit ? txs[txs.length - 1]?.id : null;
        return { items: txs, nextCursor };
    }

    static async listMyWithdrawals(userId: string, opts?: { limit?: number; cursor?: string }) {
        const limit = Math.max(1, Math.min(Number(opts?.limit ?? 50), 200));

        const withdrawals = await (prisma as any).withdrawal.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            ...(opts?.cursor
                ? {
                      cursor: { id: opts.cursor },
                      skip: 1,
                  }
                : {}),
        });

        const nextCursor =
            withdrawals.length === limit ? withdrawals[withdrawals.length - 1]?.id : null;
        return { items: withdrawals, nextCursor };
    }

    static async requestWithdrawal(
        userId: string,
        data: { amount: number; method?: string; note?: string; currency?: string }
    ) {
        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("amount must be a positive number");
        }

        const settings = await (prisma as any).appSettings.findFirst({});
        const minimumWithdrawal =
            typeof settings?.minimumWithdrawal === "number"
                ? settings.minimumWithdrawal
                : 0;
        if (amount < minimumWithdrawal) {
            throw new Error(`Minimum withdrawal is ${minimumWithdrawal}`);
        }

        const currency = typeof data.currency === "string" && data.currency.trim() ? data.currency.trim() : "USD";

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { availableBalance: true },
            });
            if (!user) throw new Error("User not found");

            if (user.availableBalance < amount) {
                throw new Error("Insufficient available balance");
            }

            const withdrawal = await (tx as any).withdrawal.create({
                data: {
                    userId,
                    amount,
                    currency,
                    status: "pending",
                    method: data.method,
                    note: data.note,
                },
            });

            // Hold funds immediately to prevent double-spend.
            await tx.user.update({
                where: { id: userId },
                data: {
                    availableBalance: { decrement: amount },
                },
            });

            await (tx as any).transaction.create({
                data: {
                    userId,
                    bookingId: null,
                    type: "withdrawal_request",
                    amount: -Math.abs(amount),
                    currency,
                    points: 0,
                    counterpartyUserId: null,
                    note: "Withdrawal request",
                    meta: {
                        withdrawalId: withdrawal.id,
                        method: data.method,
                    },
                },
            });

            return withdrawal;
        });
    }

    static async getPayoutDetails(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                payoutPaypalEmail: true,
                payoutBankName: true,
                payoutAccountNumber: true,
                payoutAccountHolderName: true,
            },
        });

        if (!user) throw new Error("User not found");

        return {
            paypalEmail: user.payoutPaypalEmail || "",
            bankName: user.payoutBankName || "",
            accountNumber: user.payoutAccountNumber || "",
            accountHolderName: user.payoutAccountHolderName || "",
        };
    }

    static async updatePayoutDetails(userId: string, data: any) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                payoutPaypalEmail: data.paypalEmail,
                payoutBankName: data.bankName,
                payoutAccountNumber: data.accountNumber,
                payoutAccountHolderName: data.accountHolderName,
            },
        });
    }
}
