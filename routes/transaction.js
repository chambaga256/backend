

// routes/transactions.js
const express = require("express");
const Transaction = require("../modals/Transaction");
const Account = require("../modals/Account");
const { authRequired } = require("../helpers/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const { accountId, kind, from, to, q } = req.query;
  const filter = { createdBy: req.user._id };
  if (accountId) filter.accountId = accountId;
  if (kind) filter.kind = kind;
  if (from || to) {
    filter.at = {};
    if (from) filter.at.$gte = new Date(from);
    if (to) filter.at.$lte = new Date(to);
  }
  if (q) filter.note = new RegExp(q, "i");
  const items = await Transaction.find(filter).sort({ at: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

router.post("/", authRequired, async (req, res) => {
  const { kind, accountId, amount, note, at } = req.body;
  if (!["expense","income"].includes(kind)) return res.status(400).json({ success: false, message: "Invalid kind" });

  const acc = await Account.findOne({ _id: accountId, createdBy: req.user._id });
  if (!acc) return res.status(404).json({ success: false, message: "Account not found" });

  const txn = await Transaction.create({
    kind,
    accountId,
    amount,
    currency: acc.currency,
    note,
    at: at ? new Date(at) : undefined,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: txn });
});

router.delete("/:id", authRequired, async (req, res) => {
  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true });
});

router.get("/reports/by-kind", authRequired, async (req, res) => {
  const data = await Transaction.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: "$kind", total: { $sum: "$amount" } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data });
});

module.exports = router;
