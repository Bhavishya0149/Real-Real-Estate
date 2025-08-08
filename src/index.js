import dotenv from "dotenv";
dotenv.config({path: './.env'});
import connectDB from "./db/DBconnection.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({origin: process.env.CORS_ORIGIN,credentials: true}));

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️  Server is listening at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
});

import routes from "./routes/index.js";
app.use("/api/v1", routes);