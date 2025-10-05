// backend/routes/paymentRoutes.js
import express from "express";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const router = express.Router();

const WP_QR = process.env.WORDPRESS_QR_URL || "https://your-wordpress-site.com/wp-content/uploads/upi-qr.png";
const AUTO_CREDIT = process.env.AUTO_CREDIT === "true";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret123";

// Show payment page
router.get("/pay", async (req, res) => {
  const { userId, amount, returnUrl } = req.query;
  if (!userId || !amount) return res.status(400).send("Missing userId/amount");

  const payment = await Payment.create({
    userId,
    amount,
    status: AUTO_CREDIT ? "auto" : "pending",
  });

  res.send(`
    <html>
      <body style="font-family:sans-serif;padding:20px;">
        <h2>Pay ₹${amount} using UPI</h2>
        <img src="${WP_QR}" alt="UPI QR" style="width:250px;height:250px;" />
        <form action="/api/payments/confirm" method="POST">
          <input type="hidden" name="paymentId" value="${payment._id}" />
          <input type="hidden" name="userId" value="${userId}" />
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="returnUrl" value="${returnUrl || ""}" />
          <button type="submit">I Have Paid</button>
        </form>
      </body>
    </html>
  `);
});

// Confirm payment
router.post("/confirm", async (req, res) => {
  const { paymentId, userId, amount, returnUrl } = req.body || req.query;
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).send("Payment not found");

  if (AUTO_CREDIT) {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    user.inx += Number(amount);
    await user.save();

    payment.status = "confirmed";
    payment.confirmedAt = new Date();
    await payment.save();

    if (returnUrl) {
      return res.redirect(`${returnUrl}?payment=success`);
    }

    return res.send("Payment confirmed and INX credited!");
  } else {
    payment.status = "pending";
    await payment.save();
    return res.send("Payment pending admin verification.");
  }
});

// Get balance (frontend sync)
router.get("/balance/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ balance: 0 });
  res.json({ balance: user.inx });
});

// Admin endpoints
router.get("/admin/payments", async (req, res) => {
  if (req.headers["x-admin-token"] !== ADMIN_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });

  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
});

router.post("/admin/confirm", async (req, res) => {
  if (req.headers["x-admin-token"] !== ADMIN_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });

  const { paymentId } = req.body;
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  const user = await User.findById(payment.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.inx += payment.amount;
  await user.save();

  payment.status = "confirmed";
  payment.confirmedAt = new Date();
  await payment.save();

  res.json({ message: "Payment confirmed", balance: user.inx });
});

export default router;
