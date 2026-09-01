import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../models/user.model.js";
import { sessionModel } from "../models/session.model.js";
import AppError from "../utils/globleError.js";

const SALTROUND = 10;
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const ACCESS_TOKEN_EXPIRES_IN = "15m";

const createRefreshToken = (userId, sessionId) => {
    return jwt.sign(
        {
            _id: userId,
            sessionId,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
            algorithm: "HS256",
        }
    );
};

const createAccessToken = (userId, sessionId) => {
    return jwt.sign(
        {
            _id: userId,
            sessionId,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            algorithm: "HS256",
        }
    );
};


export const signUp = async (req, res) => {
    const mongoSession = await mongoose.startSession();

    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return AppError
                .badRequest(errors.array()[0].msg)
                .sendResponse(res);
        }

        const { name, email, password } = req.body;

        mongoSession.startTransaction();

        const existingUser = await User.findOne({ email }).session(
            mongoSession
        );

        if (existingUser) {
            await mongoSession.abortTransaction();

            return AppError
                .conflict("User already exists")
                .sendResponse(res);
        }

        const hashedPassword = await bcrypt.hash(
            password,
            SALTROUND
        );

        const [newUser] = await User.create(
            [
                {
                    name,
                    email,
                    password: hashedPassword,
                },
            ],
            {
                session: mongoSession,
            }
        );

        const [session] = await sessionModel.create(
            [
                {
                    user: newUser._id,
                    ip: req.ip || "unknown",
                    userAgent: req.headers["user-agent"] || "unknown",
                    revoke: false,
                },
            ],
            {
                session: mongoSession,
            }
        );

        const refreshToken = createRefreshToken(
            newUser._id,
            session._id
        );

        const refreshTokenHash = await bcrypt.hash(
            refreshToken,
            SALTROUND
        );

        session.refreshTokenHash = refreshTokenHash;

        await session.save({
            session: mongoSession,
        });

        await mongoSession.commitTransaction();

        const accessToken = createAccessToken(
            newUser._id,
            session._id
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                verified: newUser.verified,
            },
            token: accessToken,
        });

    } catch (error) {
        if (mongoSession.inTransaction()) {
            await mongoSession.abortTransaction();
        }

        console.error("Signup error:", error);

        if (error.code === 11000) {
            return AppError
                .conflict("Email already exists")
                .sendResponse(res);
        }

        return AppError
            .internalServerError()
            .sendResponse(res);

    } finally {
        await mongoSession.endSession();
    }
};

export const login = async (req, res) => {
    const mongoSession = await mongoose.startSession();

    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return AppError
                .badRequest(errors.array()[0].msg)
                .sendResponse(res);
        }

        const { email, password } = req.body;

        mongoSession.startTransaction();

        const user = await User.findOne({ email }).session(
            mongoSession
        );

        if (!user) {
            await mongoSession.abortTransaction();

            return AppError
                .unauthorized("Invalid email or password")
                .sendResponse(res);
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            await mongoSession.abortTransaction();

            return AppError
                .unauthorized("Invalid email or password")
                .sendResponse(res);
        }

        const [session] = await sessionModel.create(
            [
                {
                    user: user._id,
                    ip: req.ip || "unknown",
                    userAgent: req.headers["user-agent"] || "unknown",
                    revoke: false,
                },
            ],
            {
                session: mongoSession,
            }
        );

        const refreshToken = createRefreshToken(
            user._id,
            session._id
        );

        const refreshTokenHash = await bcrypt.hash(
            refreshToken,
            SALTROUND
        );

        session.refreshTokenHash = refreshTokenHash;

        await session.save({
            session: mongoSession,
        });

        user.lastLogin = new Date();

        await user.save({
            session: mongoSession,
        });

        await mongoSession.commitTransaction();

        const accessToken = createAccessToken(
            user._id,
            session._id
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                verified: user.verified,
                lastLogin: user.lastLogin,
            },
            token: accessToken,
        });

    } catch (error) {
        if (mongoSession.inTransaction()) {
            await mongoSession.abortTransaction();
        }

        console.error("Login error:", error);

        return AppError
            .internalServerError()
            .sendResponse(res);

    } finally {
        await mongoSession.endSession();
    }
};

export const refreshToken = async (req, res) => {
    const mongoSession = await mongoose.startSession();

    try {
        const oldRefreshToken = req.cookies?.refreshToken;

        if (!oldRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token not found",
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                oldRefreshToken,
                process.env.JWT_SECRET,
                {
                    algorithms: ["HS256"],
                }
            );
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }

        if (!decoded._id || !decoded.sessionId) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
        }

        mongoSession.startTransaction();

        const oldSession = await sessionModel.findOne({
            _id: decoded.sessionId,
            user: decoded._id,
            revoke: false,
        }).session(mongoSession);

        if (!oldSession) {
            await mongoSession.abortTransaction();

            return res.status(401).json({
                success: false,
                message: "Session invalid or revoked",
            });
        }

        const tokenHashMatches = await bcrypt.compare(
            oldRefreshToken,
            oldSession.refreshTokenHash
        );

        if (!tokenHashMatches) {
            await sessionModel.updateMany(
                {
                    user: decoded._id,
                    revoke: false,
                },
                {
                    $set: {
                        revoke: true,
                        revokedAt: new Date(),
                    },
                },
                {
                    session: mongoSession,
                }
            );

            await mongoSession.commitTransaction();

            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
            });

            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
        }

        oldSession.revoke = true;
        oldSession.revokedAt = new Date();

        await oldSession.save({
            session: mongoSession,
        });

        const [newSession] = await sessionModel.create(
            [
                {
                    user: decoded._id,
                    ip: req.ip || "unknown",
                    userAgent: req.headers["user-agent"] || "unknown",
                    revoke: false,
                },
            ],
            {
                session: mongoSession,
            }
        );

        const newRefreshToken = createRefreshToken(
            decoded._id,
            newSession._id
        );

        const newRefreshTokenHash = await bcrypt.hash(
            newRefreshToken,
            SALTROUND
        );

        newSession.refreshTokenHash = newRefreshTokenHash;

        await newSession.save({
            session: mongoSession,
        });

        await mongoSession.commitTransaction();

        const newAccessToken = createAccessToken(
            decoded._id,
            newSession._id
        );

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            token: newAccessToken,
        });

    } catch (error) {
        if (mongoSession.inTransaction()) {
            await mongoSession.abortTransaction();
        }

        console.error("[REFRESH TOKEN ERROR]", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });

    } finally {
        await mongoSession.endSession();
    }
};


export const me = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                verified: user.verified,
                lastLogin: user.lastLogin,
            },
        });

    } catch (error) {
        console.error("[ME ERROR]", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


export const logout = async (req, res) => {
    try {
        const sessionId = req.sessionId;

        if (!sessionId) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
            });

            return res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        }

        const session = await sessionModel.findOne({
            _id: sessionId,
            user: req.userId,
            revoke: false,
        });

        if (session) {
            session.revoke = true;
            session.revokedAt = new Date();

            await session.save();
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error) {
        console.error("[LOGOUT ERROR]", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const logoutAll = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        await sessionModel.updateMany(
            {
                user: req.userId,
                revoke: false,
            },
            {
                $set: {
                    revoke: true,
                    revokedAt: new Date(),
                },
            }
        );

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Logged out from all devices successfully",
        });

    } catch (error) {
        console.error("[LOGOUT ALL ERROR]", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};