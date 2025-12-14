
import { Router } from "express";
import { UserController } from "./user.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

// router.post("/", UserController.createUser);
// router.get("/", UserController.getAllUsers);
router.get("/:id", UserController.getUserById);
// router.get("/email/:email", UserController.getUserByEmail);
router.patch("/me/update", verifyToken, UserController.updateUser);
router.delete("/me/delete", verifyToken, UserController.deleteUser);

export default router;
