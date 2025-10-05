// backend/routes/rewards.js
import express from "express";
import Wallet from "../models/Wallet.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// --- Auth middleware ---
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Rewards auth error:", err?.message);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// --- GET user rewards (example) ---
router.get("/", authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    res.json({
      inx: wallet.inx,
      xp: wallet.xp,
      level: wallet.level,
      recentRewards: wallet.recentRewards || [],
    });
  } catch (err) {
    console.error("GET rewards error:", err);
    res.status(500).json({ error: "Server error fetching rewards" });
  }
});

// --- POST add reward to wallet ---
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    if (!type || !amount) return res.status(400).json({ error: "Type and amount required" });

    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    // Update wallet
    if (type === "inx") wallet.inx += amount;
    else if (type === "xp") wallet.xp += amount;

    // Keep a record of recent rewards
    wallet.recentRewards = wallet.recentRewards || [];
    wallet.recentRewards.push({ type, amount, description, date: new Date() });
    if (wallet.recentRewards.length > 10) wallet.recentRewards.shift(); // max 10 items

    await wallet.save();
    res.json({ message: "Reward added successfully", wallet });
  } catch (err) {
    console.error("POST rewards error:", err);
    res.status(500).json({ error: "Server error adding reward" });
  }
});

export default router;
