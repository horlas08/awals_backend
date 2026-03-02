import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { SupportController } from "./support.controller.js";

const router = Router();

router.post("/create", verifyToken, SupportController.createSupportTicket);

export default router;
