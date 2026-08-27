import { validationResult } from "express-validator";
import { User } from "../models/user.model.js";
import AppError from "../utils/globleError.js"
import bcrypt from "bcrypt";

const SALTROUND = 10;

export const signIn = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return AppError.badRequest(errors.array()[0].msg).sendResponse(res);
        }
        
        const { name, email, password } = req.body;

        const user = await User.find({email});
        if(!user){
            return AppError.conflict("User already exists").sendResponse(res);
        }

        const hashedPasswored = await bcrypt.hash(password, SALTROUND);
        const newUser = await User.create({email, name, password: hashedPasswored});

        return res.status(200).json({success: true, message: "User created successfully", newUser});

    } catch (error) {
        console.log("Signin error:", error);
        if (error.code === 11000) {
            return AppError.conflict("Email already exists").sendResponse(res);
        }
        return AppError.internalServerError().sendResponse(res);
    }
}