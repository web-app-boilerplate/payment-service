import { ApiError } from "../errors/ApiError.js";

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ApiError("Forbidden: insufficient rights", 403));
        }
        next();
    };
};

export default authorizeRole;
