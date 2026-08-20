import { app } from "./src/index.js";

const PORT = process.env.PORT;

app.listen(PORT, ()=>{
    console.log(`Server is running at: http://localhost:${PORT}`);
})
