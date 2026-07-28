import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import userRoutes from "./route.js";
import cors from "cors";
import passport from "./oauth.js";

dotenv.config();

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Mongo Db Connected");
  } catch (error) {
    console.log("MongoDB connection failed, retrying in 5s...", error);
    setTimeout(connectDb, 5000);
  }
};

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1", userRoutes);

app.get("/", (_req, res) => {
  res.send("Server is working");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDb();
});
