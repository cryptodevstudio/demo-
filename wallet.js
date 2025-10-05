// backend/routes/wallet.js
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
    console.error("wallet auth error:", err && err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// --- GET wallet ---
router.get("/", authMiddleware, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ user: req.user.id });
      await wallet.save();
    }

    res.json(wallet);
  } catch (err) {
    console.error("GET wallet error:", err);
    res.status(500).json({ error: "Server error fetching wallet" });
  }
});

// --- POST wallet (upsert/update) ---
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { inx, xp, level, lastCheckIn, gamesPlayed, recentRewards } = req.body;

    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = new Wallet({
        user: req.user.id,
        inx: inx ?? 0,
        xp: xp ?? 0,
        level: level ?? 1,
        lastCheckIn: lastCheckIn ?? null,
        gamesPlayed: gamesPlayed ?? 0,
        recentRewards: recentRewards ?? [],
      });
    } else {
      // Update only provided fields
      if (typeof inx === "number") wallet.inx = inx;
      if (typeof xp === "number") wallet.xp = xp;
      if (typeof level === "number") wallet.level = level;
      if (lastCheckIn !== undefined) wallet.lastCheckIn = lastCheckIn ?? wallet.lastCheckIn;
      if (typeof gamesPlayed === "number") wallet.gamesPlayed = gamesPlayed;
      if (Array.isArray(recentRewards)) wallet.recentRewards = recentRewards;
    }

    await wallet.save();
    res.json(wallet);
  } catch (err) {
    console.error("POST wallet error:", err);
    res.status(500).json({ error: "Server error updating wallet" });
  }
});

export default router;
