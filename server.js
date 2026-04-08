// import dotenv from "dotenv";
import app from "./app.js";
import dotenv from 'dotenv'
dotenv.config();

const PORT = process.env.PORT || 5000;
// import cors from "cors";

// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "https://hrms-seven-dusky.vercel.app"
//   ],
//   credentials: true
// }));

const startServer = async () => {
   app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();