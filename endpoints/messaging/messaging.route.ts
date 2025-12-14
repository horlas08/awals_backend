import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

router.post("/send", verifyToken, );

router.get("/:receipientId/messages", );


export default router;
