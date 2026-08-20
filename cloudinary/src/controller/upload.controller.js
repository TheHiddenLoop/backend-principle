import streamifier from "streamifier";
import { uploadCloud } from "../config/cloudinary.js";

function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = uploadCloud.uploader.upload_stream(
      {
        folder: "products",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

export const uploadTOCloud = async (req, res) => {
  try {
    const img = req.file;

    if (!img) {
      return res.status(400).json({
        success: false,
        message: "Image is not provided",
      });
    }

    const result = await uploadToCloudinary(img.buffer);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      image: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
};