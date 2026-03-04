
import { Router } from "express";
import { UserController } from "./user.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// router.post("/", UserController.createUser);
// router.get("/", UserController.getAllUsers);
router.get("/:id", UserController.getUserById);
// router.get("/email/:email", UserController.getUserByEmail);
router.patch("/me/update", verifyToken, UserController.updateUser);
router.post("/me/upload", verifyToken, upload.single('file'), UserController.uploadProfilePicture);
router.delete("/me/delete", verifyToken, UserController.deleteUser);

export default router;
