import express from "express";
import dotenv from "dotenv";
import paymentRoute from "./routes/paymentRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "./swagger-output.json" assert { type: "json" };
import { webhookHandler } from "./controllers/webhookController.js";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5002;

app.post("/payments/webhook/stripe", express.raw({ type: "application/json" }), webhookHandler);

app.use(express.json());

// Test route
app.get("/health", (req, res) => {
    res.json({ service: "payment-service", status: "ok" });
});

// Users route
app.use("/payments", paymentRoute)


app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.get("/swagger.json", (req, res) => res.json(swaggerFile));

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Payment Service running on port ${PORT}`);
});
