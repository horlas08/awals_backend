import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { verifyToken } from '../auth/auth.middleware.js';

const router = Router();

router.get('/balances', verifyToken, PaymentController.getBalances);
router.get('/transactions', verifyToken, PaymentController.getMyTransactions);
router.get('/payout-details', verifyToken, PaymentController.getPayoutDetails);
router.post('/payout-details', verifyToken, PaymentController.updatePayoutDetails);
router.get('/withdrawals', verifyToken, PaymentController.listMyWithdrawals);
router.post('/withdrawals', verifyToken, PaymentController.requestWithdrawal);

export default router;
