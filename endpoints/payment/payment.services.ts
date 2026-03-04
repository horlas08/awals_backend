import prisma from "../../prisma/client.js";

export class PaymentService {
    static async getBalances(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                pendingBalance: true,
                availableBalance: true,
                totalWithdrawn: true,
            },
        });

        if (!user) throw new Error("User not found");

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
        };
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
