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
import {
  deleteBill,
  getBills,
  getInvoice,
  getMonthlyUsageSummary,
  getTotalWeb,
  updateStatus,
} from "../controllers/BillController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();
const app = express();
app.use(cookieParser());

// Bill Router
router.get("/bills", verifyAuth, getBills);
router.get("/bills/:id", getInvoice);
router.get("/bills/total/web", verifyAuth, getTotalWeb);
router.get("/bills/total/mobile", verifyAuth, getMonthlyUsageSummary);
router.post(
  "/bills",
  verifyAuth,
  upload.single("file_foto"),
  createBillHandler
);
router.patch("/bills/:id", updateStatus);
router.delete("/bills/:id", deleteBill);

// User Router
router.post("/auth/register", createUser);
router.post("/auth/login", login);
router.patch("/auth/change-password", verifyAuth, changePassword);
router.patch("/users/:id", verifyAuth, updateUser);
router.get("/users", verifyAuth, getUsers);
router.get("/users/:nama", verifyAuth, getUsersByName);

// File Router
router.get("/view/image/:id", imageViewer);

export default router;
