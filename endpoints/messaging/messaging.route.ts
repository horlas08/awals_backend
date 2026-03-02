import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import MessagingController from "./messaging.controller.js";

const router = Router();

router.post("/send", verifyToken, MessagingController.sendMessage);

router.get("/:recipientId/messages", verifyToken, MessagingController.getMessages);

router.get("/inbox", verifyToken, MessagingController.getInbox);

export default router;
