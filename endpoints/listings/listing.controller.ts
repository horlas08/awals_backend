import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

// In-memory store for drafts for now. Replace with DB (Prisma) later.
const drafts = new Map<string, any>();

type Draft = {
  id: string;
  status: 'PENDING' | 'UNVERIFY' | 'ACTIVE';
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>;
};

export const createDraft = (req: Request, res: Response) => {
  const id = randomUUID();
  const now = new Date().toISOString();
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const draft: Draft = {
    id,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    data: { ...payload, status: 'PENDING' },
  };
  drafts.set(id, draft);
  return res.status(201).json({ id, status: draft.status });
};

export const listDrafts = (_req: Request, res: Response) => {
  const all = Array.from(drafts.values());
  return res.json(all);
};

export const updateDraft = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'id required' });
  const existing = drafts.get(id);
  if (!existing) return res.status(404).json({ message: 'Draft not found' });
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  existing.data = { ...existing.data, ...payload };
  existing.updatedAt = new Date().toISOString();
  drafts.set(id, existing);
  return res.json({ ok: true });
};

export const getDraft = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'id required' });
  const existing = drafts.get(id);
  if (!existing) return res.status(404).json({ message: 'Draft not found' });
  return res.json(existing);
};

export const finalizeDraft = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'id required' });
  const existing = drafts.get(id);
  if (!existing) return res.status(404).json({ message: 'Draft not found' });
  existing.status = 'UNVERIFY';
  existing.data.status = 'UNVERIFY';
  existing.updatedAt = new Date().toISOString();
  drafts.set(id, existing);
  return res.json({ status: existing.status });
};

export const attachImagePath = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'id required' });
  const existing = drafts.get(id);
  if (!existing) return res.status(404).json({ message: 'Draft not found' });
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  const publicPath = `/uploads/${file.filename}`;
  const images: string[] = Array.isArray(existing.data.images) ? existing.data.images : [];
  images.push(publicPath);
  existing.data.images = images;
  existing.updatedAt = new Date().toISOString();
  drafts.set(id, existing);
  return res.status(201).json({ path: publicPath });
};
