import jwt from "jsonwebtoken";
import { sessionModel } from "../models/session.model.js";
import { User } from "../models/user.model.js";
import AppError from "../utils/globleError.js";

export const protectRoute = async (req, res, next) => {
    try {

        let token = req.cookies?.accessToken;

        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return AppError
                .unauthorized("Access token not found")
                .sendResponse(res);
        }

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return AppError
                    .unauthorized("Access token expired")
                    .sendResponse(res);
            }

            return AppError
                .unauthorized("Invalid access token")
                .sendResponse(res);
        }

        if (!decoded._id || !decoded.sessionId) {
            return AppError
                .unauthorized("Invalid token payload")
                .sendResponse(res);
        }

        const session = await sessionModel.findOne({
            _id: decoded.sessionId,
            user: decoded._id,
            revoke: false,
        });

        if (!session) {
            return AppError
                .unauthorized("Session expired or revoked")
                .sendResponse(res);
        }

        const user = await User.findById(decoded._id);

        if (!user) {
            return AppError
                .unauthorized("User not found")
                .sendResponse(res);
        }

        req.user = user;
        req.userId = decoded._id;
        req.session = session;
        req.sessionId = decoded.sessionId;


        next();

    } catch (error) {
        console.error("[PROTECT ROUTE ERROR]", error);

        return AppError
            .internalServerError()
            .sendResponse(res);
    }
};