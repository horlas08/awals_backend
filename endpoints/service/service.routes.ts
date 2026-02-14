import { Router } from 'express';
import { createServiceListing, updateServiceListing, getServiceListing, uploadServiceImage } from './service.controller.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../auth/auth.middleware.js';
import {
  createWishlistCategory,
  getServiceListingDetails,
  getWishlist,
  getWishlistCategories,
  getWishlistCategoryListings,
  limitedAllCategory,
  listByCategory,
  listByCountry,
  toggleWishlist,
  toggleWishlistInCategory,
} from './service.explore.controller.js';

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

// Configure multer storage (if not using shared utility)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname)
//   }
// })
// const upload = multer({ storage: storage })


// Create a new listing (draft)
router.post('/drafts', verifyToken, createServiceListing);

// Update an existing listing
router.patch('/drafts/:id', verifyToken, updateServiceListing);

// Get a listing by ID
router.get('/drafts/:id', verifyToken, getServiceListing);

// Upload an image
router.post('/upload', verifyToken, upload.single('file'), uploadServiceImage);

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

// Service listing details (public)
router.get('/:id', getServiceListingDetails);

export default router;
