import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.json({
        message: "Hello from Node",
        server: process.env.SERVER_NAME
    });
});

app.listen(5000, () => {
    console.log("Server running on 5000");
});