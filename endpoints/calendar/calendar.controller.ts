import type { Request, Response } from "express";
import calendarService from "./calendar.services.js";

export const getConfigs = async (req: Request, res: Response) => {
    try {
        const { listingType, listingId } = req.params;

        // basic validation
        if (!['listing', 'service', 'experience'].includes(listingType as string)) {
            res.status(400).json({ error: "Invalid listing type. Must be 'listing', 'service', or 'experience'." });
            return;
        }

        const configs = await calendarService.getListingConfigs(listingType as string, listingId as string);
        res.json(configs);
    } catch (error: any) {
        console.error("Error fetching calendar configs:", error);
        res.status(500).json({ error: error.message || "Failed to fetch calendar configurations" });
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { listingType, listingId } = req.params;
        const { date, isAvailable, price, minNights } = req.body;

        if (!['listing', 'service', 'experience'].includes(listingType as string)) {
            res.status(400).json({ error: "Invalid listing type." });
            return;
        }

        if (!date) {
            res.status(400).json({ error: "Date is required." });
            return;
        }

        const config = await calendarService.upsertDateConfig(
            listingType as string,
            listingId as string,
            date,
            isAvailable,
            price,
            minNights
        );
        res.json(config);
    } catch (error: any) {
        console.error("Error updating calendar config:", error);
        res.status(500).json({ error: error.message || "Failed to update calendar configuration" });
    }
};
