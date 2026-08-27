import app from "./src/app.js";
import { connectDb } from "./src/config/connectDb.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, async()=>{
    await connectDb();
    console.log(`Server is running at:http://localhost:${PORT}`);

})