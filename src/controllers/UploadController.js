import { PrismaClient } from "@prisma/client";
import path from "path";

const __dirname = path.resolve();
const prisma = new PrismaClient();

export const createBillHandler = async (req, res) => {
  try {
    const { id_user, catatan_awal, catatan_akhir, pemakaian, status } =
      req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!id_user || !catatan_awal || !catatan_akhir || !pemakaian || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const existingBill = await prisma.bills.findFirst({
      where: {
        id_user: parseInt(id_user),
        created_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (existingBill) {
      return res.status(400).json({ message: "Tagihan bulan ini sudah ada" });
    }

    await prisma.bills.create({
      data: {
        id_user: parseInt(id_user),
        catatan_awal: parseFloat(catatan_awal),
        catatan_akhir: parseFloat(catatan_akhir),
        pemakaian: parseFloat(pemakaian),
        file_foto: req.file.filename,
        status,
      },
    });

    res.status(201).json({ message: "Data berhasil dibuat" });
  } catch (err) {
    console.error("Create Bill Error:", err);
    res.status(500).json({ message: "Gagal tambah tagihan" });
  }
};

export const imageViewer = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await prisma.bills.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!result || !result.file_foto) {
      return res.status(404).send("Image not found");
    }

    const fileName = result.file_foto;
    const filePath = path.join(__dirname, ".", "uploads", fileName);

    // Set Content-Type otomatis berdasarkan ekstensi file (bisa .jpg, .png, etc.)
    const fileExt = path.extname(fileName).toLowerCase();
    let contentType = "image/jpeg"; // default

    if (fileExt === ".png") contentType = "image/png";
    if (fileExt === ".webp") contentType = "image/webp";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error("Image viewer error:", error);
    res.status(500).send("Gagal menampilkan gambar");
  }
};
