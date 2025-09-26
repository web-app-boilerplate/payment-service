import {
    createPaymentService
    , getAllPaymentsService
    , confirmPaymentService
    , failPaymentService
    , refundPaymentService
    , getPaymentByIdService
    , getPaymentByUserService
} from "../services/paymentService.js";
import { ApiError } from "../errors/ApiError.js";

const createPayment = async (req, res, next) => {
    try {
        const { amount, currency, provider } = req.body;
        const userId = req.user.id;

        const payment = await createPaymentService({
            userId,
            amount,
            currency,
            provider,
        });

        res.status(201).json(payment);
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

        const payment = await confirmPaymentService(id);

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
    , getAllPayments
    , confirmPayment
    , failPayment
    , refundPayment
    , getPaymentById
    , getPaymentByUser
};
