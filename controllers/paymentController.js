import axios from 'axios';
import {
    createPaymentService
    , createCheckoutSessionService
    , getAllPaymentsService
    , confirmPaymentService
    , failPaymentService
    , refundPaymentService
    , getPaymentByIdService
    , getPaymentByUserService
} from "../services/paymentService.js";
import { ApiError } from "../errors/ApiError.js";

const createCheckoutSession = async (req, res, next) => {
    try {
        const { bundle } = req.body;
        const userId = req.user.id;

        if (!bundle) {
            throw new ApiError("Bundle is required", 400);
        }

        const sessionUrl = await createCheckoutSessionService({ userId, bundle });

        res.status(200).json({ url: sessionUrl });
    } catch (error) {
        next(error);
    }
};


const createPayment = async (req, res, next) => {
    try {
        const { amount, currency, provider } = req.body;
        const userId = req.user.id;

        const { payment, clientSecret } = await createPaymentService({ userId, amount: parseFloat(amount), currency, provider });

        // return DB payment and client_secret if stripe
        res.status(201).json({ payment, clientSecret });
    } catch (err) {
        next(err);
    }
};

const getAllPayments = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status = "ALL" } = req.query;

        const { payments, total } = await getAllPaymentsService({
            page: Number(page),
            limit: Number(limit),
            status: status.toUpperCase()
        });

        res.status(200).json({
            data: payments,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
                status
            }
        });
    } catch (err) {
        next(err);
    }
};

const confirmPayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Confirm the payment
        const payment = await confirmPaymentService(id);

        // 2. Call Credit service to add balance
        await axios.post(
            `${process.env.CREDIT_SERVICE_URL}/credit/user/${payment.userId}/add`,
            { amount: payment.amount },
            {
                headers: {
                    Authorization: req.headers.authorization, // forward JWT for auth
                },
            }
        );

        res.status(200).json({
            message: "Payment confirmed successfully",
            payment,
        });
    } catch (err) {
        next(err);
    }
};


const failPayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payment = await failPaymentService(id);

        res.status(200).json({
            message: "Payment marked as FAILED",
            payment,
        });
    } catch (err) {
        next(err);
    }
};

const refundPayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payment = await refundPaymentService(id);

        res.status(200).json({
            message: "Payment refunded successfully",
            payment,
        });
    } catch (err) {
        next(err);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;

        const payment = await getPaymentByIdService(id, requestingUser);

        res.status(200).json(payment);
    } catch (err) {
        next(err);
    }
};

const getPaymentByUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20, status = "ALL" } = req.query;

        const requestingUser = req.user;

        const result = await getPaymentByUserService({
            userId,
            requestingUser,
            status: status.toUpperCase(),
            page: Number(page) || 1,
            limit: Number(limit) || 10
        });

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export {
    createPayment
    , createCheckoutSession
    , getAllPayments
    , confirmPayment
    , failPayment
    , refundPayment
    , getPaymentById
    , getPaymentByUser
};
