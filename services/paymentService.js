import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";
import { ApiError } from "../errors/ApiError.js";
import Stripe from "stripe";
import axios from "axios";
import { generateServiceToken } from "../middlewares/jwtMiddleware.js";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Map bundles to Stripe Price IDs
const BUNDLE_PRICE_MAP = {
    "5_credits": process.env.STRIPE_PRICE_5_CREDITS,
    "20_credits": process.env.STRIPE_PRICE_20_CREDITS,
    "50_credits": process.env.STRIPE_PRICE_50_CREDITS,
};


const createCheckoutSessionService = async ({ userId, bundle }) => {
    const priceId = BUNDLE_PRICE_MAP[bundle];
    if (!priceId) {
        throw new ApiError("Invalid bundle selected", 400);
    }

    // Create pending payment record
    const payment = await prisma.payment.create({
        data: {
            userId,
            amount: bundle === "5_credits" ? 15 : bundle === "20_credits" ? 50 : 100,
            currency: "usd",
            status: "PENDING",
            provider: "STRIPE",
        },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        metadata: {
            userId: String(userId),
            bundle,
            paymentId: String(payment.id),
        },
        success_url: `${process.env.FRONTEND_URL}/wallet`,
        cancel_url: `${process.env.FRONTEND_URL}/wallet`,
    });

    logger.info(`Stripe session created for user ${userId}, payment ${payment.id}`);
    return session.url;
};

const createPaymentService = async ({ userId, amount, currency, provider, metadata = {} }) => {
    if (!amount || !currency || !provider) {
        throw new ApiError("Missing required fields", 400);
    }

    // Default DB create for our payments table
    // If stripe, create PaymentIntent first; else create record and return.
    if (provider === "stripe") {
        // create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects cents
            currency: currency.toLowerCase(),
            metadata: { userId: String(userId), ...metadata },
        });

        // create DB record
        const payment = await prisma.payment.create({
            data: {
                userId,
                amount,
                currency,
                provider: "stripe",
                status: "PENDING",
                transactionId: paymentIntent.id, // store the intent id
            },
        });

        return {
            payment,
            clientSecret: paymentIntent.client_secret,
        };
    } else {
        // fallback for manual/mock providers
        const payment = await prisma.payment.create({
            data: { userId, amount, currency, provider, status: "PENDING" },
        });
        return { payment };
    }
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

    if (payment.status === "SUCCESS") {
        logger.info(`Payment ${paymentId} already confirmed`);
        return payment;
    }

    if (payment.status !== "PENDING") {
        throw new ApiError(`Cannot confirm a payment with status ${payment.status}`, 400);
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: Number(paymentId) },
        data: { status: "SUCCESS" },
    });

    logger.info(`Payment ${paymentId} confirmed. Crediting user ${payment.userId}`);

    try {
        // 2. Call Credit Service to add credit
        const token = generateServiceToken();
        await axios.post(
            `${process.env.CREDIT_SERVICE_URL}/credit/user/${payment.userId}/add`,
            { amount: payment.amount },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
            }
        );
    } catch (err) {
        logger.error(`Failed to credit user ${payment.userId} for payment ${paymentId}:`, err.message);
        // optional: rollback? For now, log error
    }


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
    , createCheckoutSessionService
    , getAllPaymentsService
    , confirmPaymentService
    , failPaymentService
    , refundPaymentService
    , getPaymentByIdService
    , getPaymentByUserService
}