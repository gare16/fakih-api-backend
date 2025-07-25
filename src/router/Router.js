import express from "express";
import {
  changePassword,
  createUser,
  getUsers,
  login,
  updateUser,
} from "../controllers/UserController.js";
import {
  createBillHandler,
  imageViewer,
} from "../controllers/UploadController.js";
import { verifyAuth } from "../middleware/verifyToken.js";
import cookieParser from "cookie-parser";
import { getBills, getTotals } from "../controllers/BillController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();
const app = express();
app.use(cookieParser());

// Bill Router
router.get("/bills", verifyAuth, getBills);
router.get("/bills/total", verifyAuth, getTotals);
router.post(
  "/bills",
  verifyAuth,
  upload.single("file_foto"),
  createBillHandler
);

// User Router
router.post("/auth/register", createUser);
router.post("/auth/login", login);
router.patch("/auth/change-password", verifyAuth, changePassword);
router.patch("/users/:id", verifyAuth, updateUser);
router.get("/users", verifyAuth, getUsers);

// File Router
router.get("/view/image/:id", verifyAuth, imageViewer);

export default router;
