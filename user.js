import express from "express";
import User from "../models/User.js";
const router = express.Router();

// Middleware to identify user (simple example, replace with Auth)
const getUser = async (req, res, next) => {
  const userId = req.body.userId; // replace with auth token in prod
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  req.user = user;
  next();
};

// GET user profile
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update wallet/xp/avatars/etc
router.post("/update", getUser, async (req, res) => {
  const updates = req.body.updates;
  Object.assign(req.user, updates); // simple merge
  await req.user.save();
  res.json({ message: "Profile updated", user: req.user });
});

export default router;
