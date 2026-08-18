import express from "express";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 5000;

app.post("/auth", async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and name"
            });
        }

        const fileData = fs.readFileSync("./user.json", "utf-8");
        const data = JSON.parse(fileData);

        console.log(data);
        
        const existingUser = data?.user?.find(
            user => user.email === email
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const newUser = {
            id: Date.now(),
            name,
            email
        };

        data.user.push(newUser);

        fs.writeFileSync(
            "./user.json",
            JSON.stringify(data, null, 2)
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser
        });

    } catch (error) {
        console.log("Auth Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});