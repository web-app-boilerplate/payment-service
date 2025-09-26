// middlewares/errorHandler.js
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error
    logger.error(`${req.method} ${req.originalUrl} -> ${message}`);

    res.status(status).json({
        error: { message: err.message },
    });
};

export default errorHandler;
