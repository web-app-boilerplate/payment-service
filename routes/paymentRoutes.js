import express from "express";
import {
    createPayment
    , getAllPayments
    , confirmPayment
    , failPayment
    , refundPayment
    , getPaymentById
    , getPaymentByUser
} from "../controllers/paymentController.js";
import verifyToken from "../middlewares/jwtMiddleware.js";
import authorizeRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Create a new payment intent        
router.route('/').post(verifyToken, authorizeRole(["admin", "user"]), createPayment);
// Get all payments (admin)           
router.route('/').get(verifyToken, authorizeRole(["admin"]), getAllPayments);

// Confirm a payment (set to SUCCESS) 
router.route('/:id/confirm').post(verifyToken, authorizeRole(["admin"]), confirmPayment);
// Mark as failed                     
router.route('/:id/fail').post(verifyToken, authorizeRole(["admin"]), failPayment);
// Refund payment                     
router.route('/:id/refund').post(verifyToken, authorizeRole(["admin"]), refundPayment);
// Get a specific payment             
router.route('/:id').get(verifyToken, authorizeRole(["admin", "user"]), getPaymentById);

// Get all payments for a given user  
router.route('/user/:userId').get(verifyToken, authorizeRole(["admin", "user"]), getPaymentByUser);


export default router;
