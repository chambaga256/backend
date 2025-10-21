// /routes/budget.js
const express = require("express");
const mongoose = require("mongoose");
const Budget = require("../modals/Budget");
const Envelope = require("../modals/Envelope");
const Account = require("../modals/Account");
const Transaction = require("../modals/Transaction");
const { decodeToken } = require("../helpers/decodeToken");

const router = express.Router();

// ---------- auth helper ----------
function requireUser(req, res) {
  const raw = req.header("Authorization");
  if (!raw) { res.status(401).send("Unauthorized"); return null; }
  const token = raw.replace(/^Bearer\s+/i, "");
  try { return decodeToken(token); } catch { res.status(401).send("Invalid token"); return null; }
}

// ---------- helpers ----------
async function sumAllocations(budgetId, userId) {
  const rows = await Envelope.aggregate([
    { $match: { budgetId: new mongoose.Types.ObjectId(budgetId), createdBy: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: "$allocation" } } },
  ]);
  return rows[0]?.total || 0;
}

// ---------- GET /api/budget ----------
router.get("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const items = await Budget.find({ createdBy: user._id }).sort({ periodStart: -1 }).lean();
  res.send({ success: true, data: items });
});

// ---------- POST /api/budget ----------
router.post("/budget", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const { name, currency, periodStart, periodEnd, targetSavings = 0, accountId } = req.body;
  if (!name || !currency || !periodStart || !periodEnd)
    return res.status(400).send("name, currency, periodStart, periodEnd are required");
  const doc = await Budget.create({
    name, currency, periodStart, periodEnd, targetSavings,
    accountId: accountId || undefined, createdBy: user._id,
  });
  res.status(201).send({ success: true, data: doc });
});

// ---------- GET /api/budget/:id ----------
router.get("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOne({ _id: req.params.id, createdBy: user._id }).lean();
  if (!b) return res.status(404).send("Not found");
  const envelopes = await Envelope.find({ budgetId: b._id, createdBy: user._id }).lean();
  const totalAllocated = await sumAllocations(b._id, user._id);
  const remainingBudget = Math.max(0, (b.targetSavings || 0) - totalAllocated);
  res.send({ success: true, data: { ...b, envelopes, totals: { totalAllocated, remainingBudget } } });
});

// ---------- PUT /api/budget/:id ----------
router.put("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const patch = (({ name, currency, periodStart, periodEnd, targetSavings, accountId, closed }) =>
    ({ name, currency, periodStart, periodEnd, targetSavings, accountId, closed }))(req.body);

  // If targetSavings is being reduced, ensure it's not below already allocated
  if (typeof patch.targetSavings === "number") {
    const alreadyAllocated = await sumAllocations(req.params.id, user._id);
    if (patch.targetSavings < alreadyAllocated) {
      return res.status(400).json({
        success: false,
        code: "TARGET_BELOW_ALLOCATIONS",
        message: `Target (${patch.targetSavings}) is below current allocated total (${alreadyAllocated}).`,
      });
    }
  }

  const b = await Budget.findOneAndUpdate(
    { _id: req.params.id, createdBy: user._id },
    { $set: patch },
    { new: true }
  );
  if (!b) return res.status(404).send("Not found");
  res.send({ success: true, data: b });
});

// ---------- DELETE /api/budget/:id ----------
router.delete("/budget/:id", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const b = await Budget.findOneAndDelete({ _id: req.params.id, createdBy: user._id });
  if (!b) return res.status(404).send("Not found");
  await Envelope.deleteMany({ budgetId: b._id, createdBy: user._id });
  res.send({ success: true, data: true });
});

// ---------- POST /api/budget/:id/envelopes ----------
router.post("/budget/:id/envelopes", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const budget = await Budget.findOne({ _id: req.params.id, createdBy: user._id });
  if (!budget) return res.status(404).send("Budget not found");

  const { name, allocation } = req.body;
  if (!name || typeof allocation !== "number" || allocation < 0)
    return res.status(400).send("name and numeric allocation are required");

  const currentAllocated = await sumAllocations(budget._id, user._id);
  const newTotal = currentAllocated + allocation;

  if (newTotal > (budget.targetSavings || 0)) {
    const remaining = Math.max(0, (budget.targetSavings || 0) - currentAllocated);
    return res.status(400).json({
      success: false,
      code: "OVER_BUDGET",
      message: `Cannot allocate ${allocation}. Remaining budget is ${remaining}. You have spent beyond your budget.`,
      details: { remainingBudget: remaining, currentAllocated, budgetAmount: budget.targetSavings || 0 }
    });
  }

  const env = await Envelope.create({
    name,
    allocation,
    currency: budget.currency,
    budgetId: budget._id,
    createdBy: user._id,
  });

  // return totals for UI after creation
  const totalAllocated = newTotal;
  const remainingBudget = Math.max(0, (budget.targetSavings || 0) - totalAllocated);

  res.status(201).send({
    success: true,
    data: env,
    totals: { totalAllocated, remainingBudget }
  });
});

// ---------- PUT /api/envelopes/:envId ----------
router.put("/envelopes/:envId", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const { name, allocation } = req.body;

  const envOld = await Envelope.findOne({ _id: req.params.envId, createdBy: user._id });
  if (!envOld) return res.status(404).send("Envelope not found");

  // If allocation is changing, enforce budget cap
  if (typeof allocation === "number" && allocation >= 0) {
    const budget = await Budget.findOne({ _id: envOld.budgetId, createdBy: user._id });
    const currentAllocated = await sumAllocations(envOld.budgetId, user._id);
    const newTotal = currentAllocated - (envOld.allocation || 0) + allocation;

    if (newTotal > (budget.targetSavings || 0)) {
      const remaining = Math.max(0, (budget.targetSavings || 0) - (currentAllocated - (envOld.allocation || 0)));
      return res.status(400).json({
        success: false,
        code: "OVER_BUDGET",
        message: `Cannot set allocation to ${allocation}. Remaining budget is ${remaining}. You have spent beyond your budget.`,
        details: { remainingBudget: remaining, newTotal, budgetAmount: budget.targetSavings || 0 }
      });
    }
  }

  const env = await Envelope.findOneAndUpdate(
    { _id: req.params.envId, createdBy: user._id },
    { $set: { ...(name ? { name } : {}), ...(typeof allocation === "number" ? { allocation } : {}) } },
    { new: true }
  );

  res.send({ success: true, data: env });
});

// ---------- POST /api/envelopes/:envId/transactions ----------
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

  // Guard: prevent overspend on this envelope
  if (kind === "expense" && (Number(env.spent || 0) + Number(amount)) > Number(env.allocation || 0)) {
    const remaining = Math.max(0, Number(env.allocation || 0) - Number(env.spent || 0));
    return res.status(400).json({
      success: false,
      code: "OVER_ENVELOPE",
      message: `This spend exceeds the envelope allocation. Remaining: ${remaining}. You have spent beyond your budget.`,
      details: { remainingEnvelope: remaining }
    });
  }

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

// ---------- GET /api/budget/:id/summary ----------
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

  const totalAllocated = data.reduce((s, x) => s + Number(x.allocation || 0), 0);
  const totalSpent = data.reduce((s, x) => s + Number(x.spent || 0), 0);
  const remainingBudget = Math.max(0, (budget.targetSavings || 0) - totalAllocated);

  res.send({
    success: true,
    data,
    totals: {
      currency: budget.currency,
      budgetAmount: budget.targetSavings || 0,
      totalAllocated,
      totalSpent,
      remainingBudget,
    },
  });
});

module.exports = router;
