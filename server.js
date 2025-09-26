import express from "express";
import dotenv from "dotenv";
import paymentRoute from "./routes/paymentRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Test route
app.get("/health", (req, res) => {
    res.json({ service: "payment-service", status: "ok" });
});

// Users route
app.use("/payments", paymentRoute)

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Payment Service running on port ${PORT}`);
});
