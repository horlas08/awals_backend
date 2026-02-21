import { Router } from 'express';
import { createExperienceListing, updateExperienceListing, getExperienceListing, uploadExperienceImage } from './experience.controller.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../auth/auth.middleware.js';
import {
  createWishlistCategory,
  getExperienceListingDetails,
  getWishlist,
  getWishlistCategories,
  getWishlistCategoryListings,
  limitedAllCategory,
  listByCategory,
  listByCountry,
  toggleWishlist,
  toggleWishlistInCategory,
} from './experience.explore.controller.js';

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

// Create a new listing (draft)
router.post('/drafts', verifyToken, createExperienceListing);

// Update an existing listing
router.patch('/drafts/:id', verifyToken, updateExperienceListing);

// Get a listing by ID
router.get('/drafts/:id', verifyToken, getExperienceListing);

// Upload an image
router.post('/upload', verifyToken, upload.single('file'), uploadExperienceImage);

// Explore/Home endpoints
router.get('/limitedAllCategory', limitedAllCategory);
router.get('/category', listByCategory);
router.get('/country', listByCountry);

// Wishlist endpoints
router.get('/wishlist', verifyToken, getWishlist);
router.post('/:id/wishlist', verifyToken, toggleWishlist);

router.get('/wishlist/categories', verifyToken, getWishlistCategories);
router.post('/wishlist/categories', verifyToken, createWishlistCategory);
router.get('/wishlist/categories/:categoryId', verifyToken, getWishlistCategoryListings);
router.post('/:id/wishlist/:categoryId', verifyToken, toggleWishlistInCategory);

// Experience listing details (public)
router.get('/:id', getExperienceListingDetails);

export default router;
