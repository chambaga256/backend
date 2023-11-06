const express = require("express");

const mongoose = require("mongoose");
const certifcates = require("./routes/certificates");
const cors = require("cors");
const port = 7001;
const user = require("./routes/user");

const app = express();

// Middleware to parse form data
app.use(cors());
app.use(express.json());

// Serve static files

// Connect to MongoDB Atlas

mongoose
  .connect(
    process.env.MONGODB_,
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
app.use("/api/auth", user);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
