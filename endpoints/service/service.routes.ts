import { Router } from 'express';
import { createServiceListing, updateServiceListing, getServiceListing, uploadServiceImage } from './service.controller.js';
import { upload } from '../../utils/multer.js'; // Assuming multer utility exists, or define inline

const router = Router();

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
router.post('/create', createServiceListing);

// Update an existing listing
router.put('/update/:id', updateServiceListing);

// Get a listing by ID
router.get('/:id', getServiceListing);

// Upload an image
router.post('/upload', upload.single('image'), uploadServiceImage);

export default router;
