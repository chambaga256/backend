// /routes/budget.js
const express = require("express");
const mongoose = require("mongoose");
const Budget = require("../modals/Budget");
const Envelope = require("../modals/Envelope");
const Account = require("../modals/Account");          // adjust if your path differs
const Transaction = require("../modals/Transaction");  // adjust if your path differs
const { decodeToken } = require("../helpers/decodeToken");

const router = express.Router();

// auth helper
function requireUser(req, res) {
  const raw = req.header("Authorization");
  if (!raw) { res.status(401).send("Unauthorized"); return null; }
  const token = raw.replace(/^Bearer\s+/i, "");
  try { return decodeToken(token); } catch { res.status(401).send("Invalid token"); return null; }
}

// GET /api/budget
router.get("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const items = await Budget.find({ createdBy: user._id }).sort({ periodStart: -1 }).lean();
  res.send({ success: true, data: items });
});

// POST /api/budget
router.post("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const { name, currency, periodStart, periodEnd, targetSavings = 0, accountId } = req.body;
  const doc = await Budget.create({
    name, currency, periodStart, periodEnd, targetSavings, accountId: accountId || undefined, createdBy: user._id,
  });
  res.status(201).send({ success: true, data: doc });
});

// GET /api/budget/:id
router.get("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOne({ _id: req.params.id, createdBy: user._id }).lean();
  if (!b) return res.status(404).send("Not found");
  const envelopes = await Envelope.find({ budgetId: b._id, createdBy: user._id }).lean();
  res.send({ success: true, data: { ...b, envelopes } });
});

// PUT /api/budget/:id
router.put("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const patch = (({ name, currency, periodStart, periodEnd, targetSavings, accountId, closed }) =>
    ({ name, currency, periodStart, periodEnd, targetSavings, accountId, closed }))(req.body);
  const b = await Budget.findOneAndUpdate(
    { _id: req.params.id, createdBy: user._id },
    { $set: patch },
    { new: true }
  );
  if (!b) return res.status(404).send("Not found");
  res.send({ success: true, data: b });
});

// DELETE /api/budget/:id
router.delete("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOneAndDelete({ _id: req.params.id, createdBy: user._id });
  if (!b) return res.status(404).send("Not found");
  // delete envelopes for this budget
  await Envelope.deleteMany({ budgetId: b._id, createdBy: user._id });
  res.send({ success: true, data: true });
});

// POST /api/budget/:id/envelopes
router.post("/budget/:id/envelopes", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const budget = await Budget.findOne({ _id: req.params.id, createdBy: user._id });
  if (!budget) return res.status(404).send("Budget not found");
  const { name, allocation } = req.body;
  const env = await Envelope.create({
    name,
    allocation,
    currency: budget.currency,
    budgetId: budget._id,
    createdBy: user._id,
  });
  res.status(201).send({ success: true, data: env });
});

// PUT /api/envelopes/:envId
router.put("/envelopes/:envId", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const patch = (({ name, allocation }) => ({ name, allocation }))(req.body);
  const env = await Envelope.findOneAndUpdate(
    { _id: req.params.envId, createdBy: user._id },
    { $set: patch },
    { new: true }
  );
  if (!env) return res.status(404).send("Envelope not found");
  res.send({ success: true, data: env });
});

// POST /api/envelopes/:envId/transactions
// Creates an expense tied to account + budget/envelope, updates account balance and envelope.spent
router.post("/envelopes/:envId/transactions", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const env = await Envelope.findOne({ _id: req.params.envId, createdBy: user._id });
  if (!env) return res.status(404).send("Envelope not found");

  const { accountId, amount, note, at, kind = "expense" } = req.body;
  if (!accountId) return res.status(400).send("accountId required");
  if (!amount || amount <= 0) return res.status(400).send("amount required");

  const acc = await Account.findOne({ _id: accountId, createdBy: user._id });
  if (!acc) return res.status(404).send("Account not found");

  // Optional currency guard
  if (acc.currency !== env.currency) return res.status(400).send("Currency mismatch");

  const txn = await Transaction.create({
    kind,
    accountId: acc._id,
    amount,
    currency: acc.currency,
    note,
    at: at ? new Date(at) : new Date(),
    budgetId: env.budgetId,
    envelopeId: env._id,
    createdBy: user._id,
  });

  // Apply effects
  const delta = kind === "income" ? amount : -amount;
  await Account.updateOne({ _id: acc._id, createdBy: user._id }, { $inc: { balance: delta } });
  if (kind === "expense") {
    await Envelope.updateOne({ _id: env._id, createdBy: user._id }, { $inc: { spent: amount } });
  }

  res.status(201).send({ success: true, data: txn });
});

// GET /api/budget/:id/summary
// Returns [{ envelopeId, budgetId, name, allocation, spent, remaining, currency, budgetName, periodStart, periodEnd }]
router.get("/budget/:id/summary", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const budget = await Budget.findOne({ _id: req.params.id, createdBy: user._id }).lean();
  if (!budget) return res.status(404).send("Budget not found");

  const envs = await Envelope.find({ budgetId: budget._id, createdBy: user._id }).lean();
  const data = envs.map((e) => ({
    envelopeId: e._id,
    budgetId: e.budgetId,
    name: e.name,
    allocation: e.allocation,
    spent: e.spent,
    remaining: Math.max(0, (e.allocation || 0) - (e.spent || 0)),
    currency: e.currency,
    budgetName: budget.name,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
  }));
  res.send({ success: true, data });
});

module.exports = router;
