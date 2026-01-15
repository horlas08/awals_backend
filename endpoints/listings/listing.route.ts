import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { attachImagePath, createDraft, finalizeDraft, getDraft, updateDraft } from './listing.controller.js';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer to save locally
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/drafts', createDraft);
router.get('/drafts', (_req, res) => {
  // import inside to avoid circular
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ctrl = require('./listing.controller.js');
  return ctrl.listDrafts(_req, res);
});
router.get('/drafts/:id', getDraft);
router.patch('/drafts/:id', updateDraft);
router.post('/drafts/:id/images', upload.single('file'), attachImagePath);
router.post('/drafts/:id/finalize', finalizeDraft);

export default router;
