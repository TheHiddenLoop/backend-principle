import express from "express";
import dotenv from "dotenv";
import { router } from "./routes/routes.js";

dotenv.config();

export const app = express();

app.use(express.json());
router.use("/api", router);