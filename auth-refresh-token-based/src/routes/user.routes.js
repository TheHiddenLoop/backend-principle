import { Router } from "express";
import * as auth from "../controllers/signIn.controller.js";
import { signInValidator } from "../middleware/signInValidator.js";
import { protectRoute } from "../middleware/protectedRoutes.js";

export const userRouter = Router();

userRouter.post("/signin", signInValidator, auth.signUp);
userRouter.post("/refresh", signInValidator, auth.refreshToken);
userRouter.post("/login", signInValidator, auth.login);
userRouter.post("/logout", protectRoute, auth.logout);
userRouter.post("/logout-all", protectRoute, auth.logoutAll);
userRouter.get("/me", protectRoute, auth.me);