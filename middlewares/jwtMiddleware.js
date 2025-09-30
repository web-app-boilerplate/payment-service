import jwt from "jsonwebtoken";
import { ApiError } from "../errors/ApiError.js";
import logger from "../utils/logger.js";

const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return next(new ApiError("Access denied. No token provided.", 401));
    let decoded = null;
    // Try service token first
    try {
        decoded = jwt.verify(token, process.env.SERVICE_JWT_SECRET);
        if (decoded && decoded.role && decoded.role === "service") {
            req.auth = decoded; // normalized
            return next();
        }
    } catch (_) {
        // ignore, fall back to user secret
    }

    // Try user token
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // normalized
        return next();
    } catch (err) {
        return next(new ApiError("Invalid or expired token", 403));
    }
};

const generateServiceToken = () => {
    return jwt.sign(
        { role: "service", service: "payment-service" }, // you can add service name
        process.env.SERVICE_JWT_SECRET,
        { expiresIn: "5m" }
    );
};

export { verifyToken, generateServiceToken };
