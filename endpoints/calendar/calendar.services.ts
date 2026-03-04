import { PrismaClient } from "@prisma/client";
import { format, startOfDay } from "date-fns";

const prisma = new PrismaClient();

export class CalendarService {
    /**
     * Fetch all calendar configurations for a specific listing and listing type.
     */
    async getListingConfigs(listingType: string, listingId: string) {
        let whereClause: any = {};
        if (listingType === 'listing') {
            whereClause.listingId = listingId;
        } else if (listingType === 'service') {
            whereClause.serviceListingId = listingId;
        } else if (listingType === 'experience') {
            whereClause.experienceListingId = listingId;
        } else {
            throw new Error("Invalid listing type");
        }

        const configs = await prisma.listingDateConfig.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
        });

        return configs;
    }

    /**
     * Upsert a calendar configuration for a single date.
     */
    async upsertDateConfig(
        listingType: string,
        listingId: string,
        dateString: string,
        isAvailable: boolean,
        price: number | null,
        minNights: number | null
    ) {
        const date = startOfDay(new Date(dateString));

        let connectData: any = {};
        if (listingType === 'listing') {
            connectData.listing = { connect: { id: listingId } };
        } else if (listingType === 'service') {
            connectData.serviceListing = { connect: { id: listingId } };
        } else if (listingType === 'experience') {
            connectData.experienceListing = { connect: { id: listingId } };
        } else {
            throw new Error("Invalid listing type");
        }

        // Try to find the existing config
        let existingConfig;
        if (listingType === 'listing') {
            existingConfig = await prisma.listingDateConfig.findUnique({
                where: { listingId_date: { listingId, date } }
            });
        } else if (listingType === 'service') {
            existingConfig = await prisma.listingDateConfig.findUnique({
                where: { serviceListingId_date: { serviceListingId: listingId, date } }
            });
        } else if (listingType === 'experience') {
            existingConfig = await prisma.listingDateConfig.findUnique({
                where: { experienceListingId_date: { experienceListingId: listingId, date } }
            });
        }

        if (existingConfig) {
            // Update
            return await prisma.listingDateConfig.update({
                where: { id: existingConfig.id },
                data: {
                    isAvailable,
                    price,
                    minNights,
                }
            });
        } else {
            // Create
            return await prisma.listingDateConfig.create({
                data: {
                    ...connectData,
                    date,
                    isAvailable,
                    price,
                    minNights,
                }
            });
        }
    }
}

export default new CalendarService();
