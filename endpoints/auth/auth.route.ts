import { Router } from "express";
import { AuthController } from "./auth.controller.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/login", AuthController.login);
router.post("/email-exists", AuthController.emailExists);
router.post("/send-email-otp", AuthController.sendEmailOtp);
router.post("/login-phone", AuthController.loginWithPhone);
router.post("/login-idtoken", AuthController.loginWithIdToken);
// router.post("/refresh", AuthController.refresh);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

export default router;
