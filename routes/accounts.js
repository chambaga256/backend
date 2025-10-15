
// routes/accounts.js
const express = require("express");
const Account = require("../modals/Account");
const Transaction = require("../modals/Transaction");
const { authOptional, authRequired } = require("../helpers/auth");

const router = express.Router();

router.get("/", authOptional, async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const filter = { archived: false };
  if (req.user) filter.createdBy = req.user._id; // only own accounts if logged in
  if (q) filter.$text = { $search: q };
  const items = await Account.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

router.post("/", authRequired, async (req, res) => {
  const { name, institution, type, currency, balance = 0, color } = req.body;
  const acc = await Account.create({ name, institution, type, currency, balance, color, createdBy: req.user._id });
  res.status(201).json({ success: true, data: acc });
});

router.get("/:id", authRequired, async (req, res) => {
  const item = await Account.findOne({ _id: req.params.id, createdBy: req.user._id }).lean();
  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

router.put("/:id", authRequired, async (req, res) => {
  const item = await Account.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true }
  );
  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

router.patch("/:id/archive", authRequired, async (req, res) => {
  const item = await Account.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { archived: true },
    { new: true }
  );
  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

router.delete("/:id", authRequired, async (req, res) => {
  const txCount = await Transaction.countDocuments({ accountId: req.params.id, createdBy: req.user._id });
  if (txCount > 0) return res.status(400).json({ success: false, message: "Account has transactions. Archive instead." });
  await Account.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  res.json({ success: true });
});

router.get("/stats/summary", authRequired, async (req, res) => {
  const totals = await Account.aggregate([
    { $match: { archived: false, createdBy: req.user._id } },
    { $group: { _id: "$currency", total: { $sum: "$balance" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: totals });
});

module.exports = router;
