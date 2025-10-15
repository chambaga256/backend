const { User, validateUser } = require("../modals/user");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const express = require("express");
const router = express.Router();
const Joi = require("joi");

//getting some user information while excluding the password.
router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  res.send(user);
});

router.post("/register", async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ contact: req.body.contact });
  if (user) return res.status(400).send("This number is already registered in our system ..");

  user = new User(_.pick(req.body, ["name", "contact", "email", "password"]));

  // encrypt the password sent by the user.
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  //save user to the database
  await user.save();
  //get users token
  const token = user.generateAuthToken();
  console.log("user token is here", token);
  res.send(token);
  //Send back the response to the client..
  res.status(200).send("user Registered successfully");
});

router.post("/login", async (req, res) => {
  let user = await User.findOne({ contact: req.body.contact });
  if (!user) return res.status(400).send("Please Signup, Your Contact Was Found in Our System ");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("Invalid password provided..");

  //get the json web token generated.
  const token = user.generateAuthToken();
  console.log("Token generated", token);

  res.send(token);
});

// Reset Password Route
router.post("/resetpassword", async (req, res) => {
  const { error } = validateResetPassword(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("User not found");

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordCode = resetCode;

  try {
    await user.save();
    sendResetCodeByEmail(req.body.email, resetCode);
    res.status(200).send("Reset code sent to your email");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/setnewpassword", async (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  const user = await User.findOne({ email, resetPasswordCode: resetCode });
  if (!user) return res.status(400).send("Invalid reset code or email");

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordCode = undefined;
  await user.save();

  res.status(200).send("Password reset successfully");
});

// Helper function to send the reset code via email
function sendResetCodeByEmail(email, resetCode) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.COMPANY_PASSWORD,
    },
  });

  const mailOptions = {
    from: "chambagaabudlah@gmail.com",
    to: email,
    subject: "Password Reset Code",
    text: `Your password reset code is: ${resetCode}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Reset code sent: " + info.response);
    }
  });
}

function validateResetPassword(req) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  return schema.validate(req);
}

function validateUserUpdate(req) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    contact: Joi.string().min(10).max(14).optional(),
  });
  return schema.validate(req);
}

// Update user information route
router.put("/:id", async (req, res) => {
  const { error } = validateUserUpdate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    _.pick(req.body, ["name", "email", "contact"]),
    { new: true }
  );

  if (!user) return res.status(404).send("User not found");

  res.send(user);
});


// Delete user account route
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send("User not found");

    res.status(200).send("User account deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
