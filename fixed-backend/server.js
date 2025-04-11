import express from "express";
import cors from 'cors';
import 'dotenv/config';
import cookieParser from "cookie-parser";
import connectDB from "./config/mongodb.js";
import authRouter from './routes/authRoutes.js';
import userRouter from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 4000

connectDB();
//connect the frontend
app.use(cors({
    origin: 'http://localhost:5173', // exact frontend address
    credentials: true                // required to support cookies
}));

app.use(express.json());
app.use(cookieParser());
//app.use(cors({ credentials: true })); //send the cookies in the response from express app

//API Endpoints
app.get('/', (req, res) => res.send("API Working"));
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter);


app.listen(port, () => console.log(`Server started on PORT: ${port}`));

