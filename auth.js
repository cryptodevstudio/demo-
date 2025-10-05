// backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// --- UPDATE USERNAME ---
router.post("/update-username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.username = username;
    await user.save();

    res.json({ message: "Username updated successfully", username: user.username });
  } catch (err) {
    console.error("Update username error:", err.message);
    res.status(500).json({ error: "Failed to update username" });
  }
});

// --- UPDATE EMAIL ---
router.post("/update-email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const exists = await User.findOne({ email });
    if (exists && exists._id.toString() !== req.user.id)
      return res.status(400).json({ error: "Email already in use" });

    const user = await User.findById(req.user.id);
    user.email = email;
    await user.save();

    res.json({ message: "Email updated successfully", email: user.email });
  } catch (err) {
    console.error("Update email error:", err.message);
    res.status(500).json({ error: "Failed to update email" });
  }
});

// --- UPDATE PASSWORD ---
router.post("/update-password", authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: "Both old and new passwords required" });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Update password error:", err.message);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    // Create default wallet
    const wallet = new Wallet({ user: newUser._id });
    await wallet.save();

    res.status(201).json({
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email },
      wallet: { inx: wallet.inx, xp: wallet.xp, level: wallet.level },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1h" }
    );

    const walletDoc = await Wallet.findOne({ user: user._id });
    const wallet = walletDoc || { inx: 0, xp: 0, level: 1, lastCheckIn: null };

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
      wallet: { inx: wallet.inx, xp: wallet.xp, level: wallet.level, lastCheckIn: wallet.lastCheckIn ?? null },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const wallet = await Wallet.findOne({ user: user._id }) || { inx: 0, xp: 0, level: 1, lastCheckIn: null };

    res.json({
      user: { id: user._id, username: user.username, email: user.email },
      wallet,
    });
  } catch (err) {
    console.error("❌ Profile error:", err.message);
    res.status(500).json({ error: "Server error while fetching profile" });
  }
});

export default router;
