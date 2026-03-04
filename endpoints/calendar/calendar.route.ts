import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { getConfigs, updateConfig } from "./calendar.controller.js";

const route = Router();

// Get calendar configs for a listing
route.get("/config/:listingType/:listingId", verifyToken, getConfigs);

// Upsert a calendar config for a date
route.post("/config/:listingType/:listingId", verifyToken, updateConfig);

export default route;
