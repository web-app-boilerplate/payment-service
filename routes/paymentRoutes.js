import express from "express";
import {
    createPayment
    , createCheckoutSession
    , getAllPayments
    , confirmPayment
    , failPayment
    , refundPayment
    , getPaymentById
    , getPaymentByUser
} from "../controllers/paymentController.js";
import { verifyToken } from "../middlewares/jwtMiddleware.js";
import authorizeRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Start a checkou session 
router.route('/checkout').post(verifyToken, authorizeRole(["admin", "user"]), createCheckoutSession);

// Create a new payment intent        
router.route('/').post(verifyToken, authorizeRole(["admin", "user"]), createPayment);
// Get all payments (admin)           
router.route('/').get(verifyToken, authorizeRole(["admin"]), getAllPayments);

// Confirm a payment (set to SUCCESS) 
//TODO REMOVE USER ROLE ONCE STRIPE ADDED
router.route('/:id/confirm').post(verifyToken, authorizeRole(["admin", "user"]), confirmPayment);
// Mark as failed                     
//TODO REMOVE USER ROLE ONCE STRIPE ADDED
router.route('/:id/fail').post(verifyToken, authorizeRole(["admin", "user"]), failPayment);
// Refund payment                     
//TODO REMOVE USER ROLE ONCE STRIPE ADDED
router.route('/:id/refund').post(verifyToken, authorizeRole(["admin", "user"]), refundPayment);
// Get a specific payment             
router.route('/:id').get(verifyToken, authorizeRole(["admin", "user"]), getPaymentById);

// Get all payments for a given user  
router.route('/user/:userId').get(verifyToken, authorizeRole(["admin", "user"]), getPaymentByUser);


export default router;
