import mongoose from "mongoose";

export const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        console.log("🟢 DATABASE CONNECTED");
        
    } catch (error) {
        console.log("MONGO DB CONNECTION ERROR:", error);
    }
}