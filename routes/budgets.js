// /routes/budget.js
const express = require("express");
const mongoose = require("mongoose");
const Budget = require("../modals/Budget");
const Envelope = require("../modals/Envelope");
const Account = require("../modals/Account");
const Transaction = require("../modals/Transaction");
const { decodeToken } = require("../helpers/decodeToken");

const router = express.Router();

// ---- auth ----
function requireUser(req, res) {
  const raw = req.header("Authorization");
  if (!raw) { res.status(401).send("Unauthorized"); return null; }
  const token = raw.replace(/^Bearer\s+/i, "");
  try { return decodeToken(token); } catch { res.status(401).send("Invalid token"); return null; }
}

// ---- helpers ----
async function sumAllocations(budgetId, userId) {
  const rows = await Envelope.aggregate([
    { $match: { budgetId: new mongoose.Types.ObjectId(budgetId), createdBy: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: "$allocation" } } },
  ]);
  return rows[0]?.total || 0;
}

async function refreshBudgetTotals(budgetId, userId) {
  const b = await Budget.findOne({ _id: budgetId, createdBy: userId });
  if (!b) return null;
  const totalAllocated = await sumAllocations(budgetId, userId);
  const remainingBudget = (b.targetSavings || 0) - totalAllocated; // can be negative (overspend allowed)
  // persist convenience fields so UI can read fast
  b.totalAllocated = totalAllocated;
  b.remainingBudget = remainingBudget;
  await b.save();
  return { currency: b.currency, budgetAmount: b.targetSavings || 0, totalAllocated, remainingBudget };
}

// ---- GET /api/budget ----
router.get("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const items = await Budget.find({ createdBy: user._id }).sort({ periodStart: -1 }).lean();
  res.send({ success: true, data: items });
});

// ---- POST /api/budget ----
router.post("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const { name, currency, periodStart, periodEnd, targetSavings = 0, accountId } = req.body;
  if (!name || !currency || !periodStart || !periodEnd)
    return res.status(400).send("name, currency, periodStart, periodEnd are required");
  const doc = await Budget.create({
    name,
    currency,
    periodStart,
    periodEnd,
    targetSavings,
    accountId: accountId || undefined,
    createdBy: user._id,
    totalAllocated: 0,
    remainingBudget: targetSavings
  });
  res.status(201).send({ success: true, data: doc });
});

// ---- GET /api/budget/:id ----
router.get("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOne({ _id: req.params.id, createdBy: user._id }).lean();
  if (!b) return res.status(404).send("Not found");
  const envelopes = await Envelope.find({ budgetId: b._id, createdBy: user._id }).lean();
  const totalAllocated = await sumAllocations(b._id, user._id);
  const remainingBudget = (b.targetSavings || 0) - totalAllocated;
  res.send({
    success: true,
    data: { ...b, envelopes },
    totals: { currency: b.currency, budgetAmount: b.targetSavings || 0, totalAllocated, remainingBudget }
  });
});

// ---- PUT /api/budget/:id ----
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

  // recompute totals after any change
  const totals = await refreshBudgetTotals(b._id, user._id);
  res.send({ success: true, data: b, totals });
});

// ---- DELETE /api/budget/:id ----
router.delete("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOneAndDelete({ _id: req.params.id, createdBy: user._id });
  if (!b) return res.status(404).send("Not found");
  await Envelope.deleteMany({ budgetId: b._id, createdBy: user._id });
  res.send({ success: true, data: true });
});

// ---- POST /api/budget/:id/envelopes ----
// Allow over-allocation; return warning & updated totals; also persist remainingBudget on Budget.
router.post("/budget/:id/envelopes", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const budget = await Budget.findOne({ _id: req.params.id, createdBy: user._id });
  if (!budget) return res.status(404).send("Budget not found");

  const { name, allocation } = req.body;
  if (!name || typeof allocation !== "number" || allocation < 0)
    return res.status(400).send("name and numeric allocation are required");

  const env = await Envelope.create({
    name,
    allocation,
    currency: budget.currency,
    budgetId: budget._id,
    createdBy: user._id,
  });

  const totals = await refreshBudgetTotals(budget._id, user._id);
  const over = totals.remainingBudget < 0;

  res.status(201).send({
    success: true,
    data: env,
    totals,
    warning: over ? {
      code: "OVER_BUDGET",
      message: `You overspent beyond your budget by ${Math.abs(totals.remainingBudget)}`
    } : undefined
  });
});

// ---- PUT /api/envelopes/:envId ----
// Allow increasing allocation beyond budget; return warning & updated totals.
router.put("/envelopes/:envId", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const envOld = await Envelope.findOne({ _id: req.params.envId, createdBy: user._id });
  if (!envOld) return res.status(404).send("Envelope not found");

  const { name, allocation } = req.body;
  const update = {};
  if (typeof name === "string" && name.trim()) update.name = name.trim();
  if (typeof allocation === "number" && allocation >= 0) update.allocation = allocation;

  const env = await Envelope.findOneAndUpdate(
    { _id: envOld._id, createdBy: user._id },
    { $set: update },
    { new: true }
  );

  const totals = await refreshBudgetTotals(env.budgetId, user._id);
  const over = totals.remainingBudget < 0;

  res.send({
    success: true,
    data: env,
    totals,
    warning: over ? {
      code: "OVER_BUDGET",
      message: `You overspent beyond your budget by ${Math.abs(totals.remainingBudget)}`
    } : undefined
  });
});

// ---- POST /api/envelopes/:envId/transactions ----
// Allow spending beyond envelope allocation; return warning & updated envelope + budget totals.
router.post("/envelopes/:envId/transactions", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const env = await Envelope.findOne({ _id: req.params.envId, createdBy: user._id });
  if (!env) return res.status(404).send("Envelope not found");

  const { accountId, amount, note, at, kind = "expense" } = req.body;
  if (!accountId) return res.status(400).send("accountId required");
  if (!amount || amount <= 0) return res.status(400).send("amount required");

  const acc = await Account.findOne({ _id: accountId, createdBy: user._id });
  if (!acc) return res.status(404).send("Account not found");
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

  const delta = kind === "income" ? amount : -amount;
  await Account.updateOne({ _id: acc._id, createdBy: user._id }, { $inc: { balance: delta } });
  if (kind === "expense") {
    await Envelope.updateOne({ _id: env._id, createdBy: user._id }, { $inc: { spent: amount } });
  }

  // recompute envelope + budget totals
  const envAfter = await Envelope.findOne({ _id: env._id, createdBy: user._id }).lean();
  const totals = await refreshBudgetTotals(env.budgetId, user._id);

  const overEnvelope = kind === "expense" && (Number(envAfter.spent || 0) > Number(envAfter.allocation || 0));
  res.status(201).send({
    success: true,
    data: txn,
    envelope: {
      allocation: envAfter.allocation,
      spent: envAfter.spent,
      remaining: (envAfter.allocation || 0) - (envAfter.spent || 0),
      currency: envAfter.currency
    },
    totals,
    warning: (overEnvelope || totals.remainingBudget < 0) ? {
      code: overEnvelope ? "OVER_ENVELOPE" : "OVER_BUDGET",
      message: overEnvelope
        ? `You overspent this envelope by ${Math.abs((envAfter.allocation || 0) - (envAfter.spent || 0))}`
        : `You overspent beyond your budget by ${Math.abs(totals.remainingBudget)}`
    } : undefined
  });
});

// ---- GET /api/budget/:id/summary ----
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
    remaining: (e.allocation || 0) - (e.spent || 0),
    currency: e.currency,
    budgetName: budget.name,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
  }));

  const totalAllocated = data.reduce((s, x) => s + Number(x.allocation || 0), 0);
  const totalSpent = data.reduce((s, x) => s + Number(x.spent || 0), 0);
  const remainingBudget = (budget.targetSavings || 0) - totalAllocated; // can be negative

  res.send({
    success: true,
    data,
    totals: {
      currency: budget.currency,
      budgetAmount: budget.targetSavings || 0,
      totalAllocated,
      totalSpent,
      remainingBudget
    },
    warning: remainingBudget < 0 ? {
      code: "OVER_BUDGET",
      message: `You overspent beyond your budget by ${Math.abs(remainingBudget)}`
    } : undefined
  });
});

module.exports = router;
