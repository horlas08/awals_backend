import { Router } from 'express';
import {
    getDashboardStats, getUsers, getListings, getBookings, getTransactions,
    getServiceListings, getExperienceListings, updateListingStatus, deleteListing,
    getWithdrawals, getSupportTickets, getReviews, getAppSettings, updateAppSettings,
    deleteUser, replyTicket, closeTicket, blockUser, updateUser,
    getListingDetail, getServiceDetail, getExperienceDetail, getUserDetail
} from './admin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all admin routes
// Uncomment when frontend sends auth token:
// router.use(authMiddleware);

// Dashboard Stats
router.get('/stats', getDashboardStats);

// Entities (list)
router.get('/users', getUsers);
router.get('/listings', getListings);
router.get('/services', getServiceListings);
router.get('/experiences', getExperienceListings);
router.get('/bookings', getBookings);
router.get('/transactions', getTransactions);
router.get('/withdrawals', getWithdrawals);
router.get('/tickets', getSupportTickets);
router.get('/reviews', getReviews);
router.get('/settings', getAppSettings);

// Entities (detail)
router.get('/listings/:id/detail', getListingDetail);
router.get('/services/:id/detail', getServiceDetail);
router.get('/experiences/:id/detail', getExperienceDetail);
router.get('/users/:id/detail', getUserDetail);

// Actions — Settings
router.patch('/settings', updateAppSettings);

// Actions — Users
router.delete('/users/:id', deleteUser);
router.patch('/users/:id', updateUser);
router.post('/users/:id/block', blockUser);

// Actions — Support Tickets
router.post('/tickets/:id/reply', replyTicket);
router.post('/tickets/:id/close', closeTicket);

// Actions — Listings / Services / Experiences
router.patch('/listings/:id/status', updateListingStatus);
router.delete('/listings/:id', deleteListing);

export default router;
