import { Router } from "express";
import { upload } from "../middleware/multer.js";
import { uploadTOCloud } from "../controller/upload.controller.js";

export const router = Router();

router.post("/upload", upload.single("image"), uploadTOCloud)