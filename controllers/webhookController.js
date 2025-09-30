import Stripe from "stripe";
import { confirmPaymentService, failPaymentService, refundPaymentService } from "../services/paymentService.js";
import logger from "../utils/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookHandler = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    logger.info(`sig : ${sig}`)
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const paymentId = session.metadata.paymentId; // we stored this when creating session
                logger.info(`Payment succeeded for paymentId=${paymentId}`);
                await confirmPaymentService(paymentId);
                break;
            }

            case "checkout.session.expired":
            case "checkout.session.async_payment_failed": {
                const session = event.data.object;
                const paymentId = session.metadata.paymentId;
                logger.warn(`Payment failed for paymentId=${paymentId}`);
                await failPaymentService(paymentId);
                break;
            }

            case "charge.refunded": {
                const charge = event.data.object;
                const paymentId = charge.metadata.paymentId;
                logger.info(`Payment refunded for paymentId=${paymentId}`);
                await refundPaymentService(paymentId);
                break;
            }

            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        logger.error("Error processing webhook:", err.message);
        res.status(500).send("Webhook handler failed");
    }
};

export { webhookHandler };
