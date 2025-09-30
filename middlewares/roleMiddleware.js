import { ApiError } from "../errors/ApiError.js";

const authorizeRole = (roles) => {
    return (req, res, next) => {
        const role = req.user?.role || req.auth?.role;
        if (!role || !roles.includes(role)) {
            return next(new ApiError("Forbidden: insufficient rights", 403));
        }
        next();
    };
};

export default authorizeRole;
