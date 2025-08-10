import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";
import cookieParser from "cookie-parser";

const app = express();
app.use(cookieParser());

const prisma = new PrismaClient();

export const createUser = async (req, res) => {
  const { nik, nama, email, password, alamat, role } = req.body.data;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.users.create({
      data: {
        nik,
        nama,
        email,
        password: passwordHash,
        alamat,
        role,
      },
    });
    res.status(201).json({
      msg: "User Created!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body.data;
  try {
    const user = await prisma.users.findUniqueOrThrow({
      where: {
        email: email,
      },
    });
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({
        message: "email or Password is Wrong!",
      });
    } else {
      const expiresIn = 60 * 60 * 8;
      const secret = process.env.JWT_SECRET;
      const payload = {
        role: user.role,
        email: user.email,
      };
      const token = jwt.sign(payload, secret, { expiresIn: expiresIn });
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: expiresIn,
      });

      res.status(200).json({
        message: "Login",
        name: user.nama,
        role: user.role,
        token,
      });
    }
  } catch (error) {
    res.status(401).json({ message: "Email or Password is Wrong!" });
  }
};

export async function getUsers(req, res) {
  const { role } = req.query;

  try {
    const users = await prisma.users.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        alamat: true,
        role: true,
      },
    });

    res.status(200).json({ result: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: "Failed to fetch users" });
  }
}

export async function getUsersByName(req, res) {
  const { nama } = req.params;

  try {
    const users = await prisma.users.findFirstOrThrow({
      where: nama ? { nama } : undefined,
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        alamat: true,
        role: true,
      },
    });

    res.status(200).json({ result: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: "Failed to fetch users" });
  }
}

export const changePassword = async (req, res) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { password, new_password } = req.body.data;
    if (!password || !new_password) {
      return res.status(400).json({ message: "Password fields required" });
    }

    const user = await prisma.users.findUnique({
      where: { email: email },
      select: { password: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Current password incorrect" });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await prisma.users.update({
      where: { email: email },
      data: { password: hashed },
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  const id = req.params.id;
  const data = req.body.data;
  try {
    await prisma.users.update({
      where: {
        id: parseInt(id),
      },
      data,
    });
    res.status(201).json({
      message: "updated!",
    });
  } catch (error) {
    console.log(error);
    res.send("err");
  }
};
