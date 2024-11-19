const express = require("express");

const mongoose = require("mongoose");
const certifcates = require("./routes/certificates");
const transactions = require("./routes/transaction");
const incomes = require("./routes/income");
const salaries = require("./routes/salary");
const gaols = require("./routes/setgoal");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const user = require("./routes/user");
const wants = require("./routes/wants");
const savings = require("./routes/savings");
const needs = require("./routes/needs");
const frequencies = require("./routes/frquenceEarnig");
const articles = require("./routes/articles");
const category = require("./routes/category");
 const budget = require("./routes/budget");
const app = express();

// Middleware to parse form data
app.use(cors());
app.use(express.json());

// Serve static files

// Connect to MongoDB Atlas

mongoose
  .connect(
   "mongodb+srv://chambagaabdulmurs:chambaga256@cluster0.xetqawq.mongodb.net/pledge",
    // "mongodb+srv://rsemakula201687:rsemakula201687@cluster0.y5xjvna.mongodb.net/uibfs",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err);
  });
app.get("/", (req, res) => {
  res.send("Hello, World! This is the home page.");
});


app.use("/api/certificates", certifcates);
app.use("/api/transactions", transactions);
app.use("/api/incomes", incomes);
app.use("/api/salaries", salaries);
app.use("/api/goal", gaols);
app.use("/api/auth", user);
app.use("/api/rules", wants);
app.use("/api/rules", savings);
app.use("/api/rules", needs);
app.use("/api/rules", frequencies);

app.use("/api/articles",articles);
app.use("/api/category", category)

app.use("/api",  budget)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
