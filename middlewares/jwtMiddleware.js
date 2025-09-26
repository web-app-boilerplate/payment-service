// middlewares/jwtMiddleware.js
import jwt from "jsonwebtoken";
import { ApiError } from "../errors/ApiError.js";
import logger from "../utils/logger.js";

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    logger.info(`authHeader : ${authHeader}`)
    logger.info(`token : ${token}`)
    if (!token) {
        return next(new ApiError("Token missing", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // attach user info to request
        next();
    } catch (err) {
        next(new ApiError("Invalid or expired token", 401));
    }
};

export default verifyToken;
