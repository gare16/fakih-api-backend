import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "../router/Router.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));
app.use("/images", express.static("files"));
app.use(cors());
app.use(cookieParser());
app.use(router);

app.get("/", function (req, res) {
  res.status(200).json({
    message: "Hello...",
  });
});

app.listen(port, () => console.log(`Listen PORT : ${port}`));
