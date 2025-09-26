import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";
import { ApiError } from "../errors/ApiError.js";

const prisma = new PrismaClient();

const createPaymentService = async ({ userId, amount, currency, provider }) => {
    if (!amount || !currency || !provider) {
        throw new ApiError("Missing required fields", 400);
    }

    // Create initial payment record with status PENDING
    const payment = await prisma.payment.create({
        data: {
            userId,
            amount,
            currency,
            provider,
        },
    });

    return payment;
};

const getAllPaymentsService = async ({ page = 1, limit = 20, status = "ALL" }) => {
    const skip = (page - 1) * limit;

    const whereClause =
        status === "ALL" ? {} : { status };

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" }
        }),
        prisma.payment.count({ where: whereClause })
    ]);

    return { payments, total };
};

const confirmPaymentService = async (paymentId) => {
    const payment = await prisma.payment.findUnique({
        where: { id: Number(paymentId) },
    });

    if (!payment) {
        throw new ApiError("Payment not found", 404);
    }

    if (payment.status !== "PENDING") {
        throw new ApiError(`Cannot confirm a payment with status ${payment.status}`, 400);
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: Number(paymentId) },
        data: { status: "SUCCESS" },
    });

    return updatedPayment;
};

const failPaymentService = async (paymentId) => {
    const payment = await prisma.payment.findUnique({
        where: { id: Number(paymentId) },
    });

    if (!payment) {
        throw new ApiError("Payment not found", 404);
    }

    if (payment.status !== "PENDING") {
        throw new ApiError(`Cannot fail a payment with status ${payment.status}`, 400);
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: Number(paymentId) },
        data: { status: "FAILED" },
    });

    return updatedPayment;
};

const refundPaymentService = async (paymentId) => {
    const payment = await prisma.payment.findUnique({
        where: { id: Number(paymentId) },
    });

    if (!payment) {
        throw new ApiError("Payment not found", 404);
    }

    if (payment.status !== "SUCCESS") {
        throw new ApiError(`Only payments with status SUCCESS can be refunded. Current status: ${payment.status}`, 400);
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: Number(paymentId) },
        data: { status: "REFUNDED" },
    });

    return updatedPayment;
};

const getPaymentByIdService = async (paymentId, requestingUser) => {
    const payment = await prisma.payment.findUnique({
        where: { id: Number(paymentId) },
    });

    if (!payment) {
        throw new ApiError("Payment not found", 404);
    }

    // Restrict access if user is not admin
    if (requestingUser.role !== "admin" && payment.userId !== requestingUser.id) {
        throw new ApiError("Forbidden: you can only view your own payments", 403);
    }

    return payment;
};
const getPaymentByUserService = async ({ userId, requestingUser, status = "ALL", page = 1, limit = 20 }) => {
    // Regular users can only access their own payments
    if (requestingUser.role !== "admin" && Number(userId) !== requestingUser.id) {
        throw new ApiError("Forbidden: you can only view your own payments", 403);
    }

    const whereClause = status === "ALL" ?
        {
            userId: Number(userId)
        }
        : {
            userId: Number(userId),
            status
        }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.payment.count({ where: whereClause })
    ]);

    return {
        payments,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
        }
    };
};

export {
    createPaymentService
    , getAllPaymentsService
    , confirmPaymentService
    , failPaymentService
    , refundPaymentService
    , getPaymentByIdService
    , getPaymentByUserService
}