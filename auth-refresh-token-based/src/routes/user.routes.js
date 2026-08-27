import { Router } from "express";
import * as auth from "../controllers/signIn.controller.js";
import { signInValidator } from "../middleware/signInValidator.js";

export const userRouter = Router();

userRouter.post("/signin", signInValidator, auth.signIn);