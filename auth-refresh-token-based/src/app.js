import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import { userRouter } from "./routes/user.routes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res)=>{
    res.status(200).json({success: true, message: "Server is running.."})
});

app.use("/api/auth", userRouter);

export default app;