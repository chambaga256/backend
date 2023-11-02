const { User, validateUser } = require("../modal/user");
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

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registered ..");

  user = new User(_.pick(req.body, ["contact", "email", "password"]));

  // encrypt the password sent by the user.
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  //save user to the database
  await user.save();
  //get users token
  const token = user.generateAuthToken();
  console.log("user  token  is here", token);
  res.send(token);
  //Send back the response to the client..
  res.status(200).send("user Registered successfully");
});
// function validate(req) {
//   const schema = {
//     contact: Joi.string().min(10).max(14).contact.required(),
//     password: Joi.string().min(5).max(255).required(),
//   };

//   return (result = Joi.validate(req, schema));
//}
router.post("/login", async (req, res) => {
  //   const { error } = validate(req.body);
  //   if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ contact: req.body.contact });
  if (!user) return res.status(400).send("User Not Registered...");

  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword)
    return res.status(400).send("Invalid password provided..");

  //get  the json web token generated.
  const token = user.generateAuthToken();
  console.log("Token generated", token);

  res.send(token);
});

// Reset Password Route
// Route for generating and sending a reset code to the user's email
router.post("/resetpassword", async (req, res) => {
  // Validate the request data
  const { error } = validateResetPassword(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check if the user exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("User not found");

  // Generate a random 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store the reset code in the user's document in the database
  user.resetPasswordCode = resetCode;

  try {
    // Save the user document with the reset code
    await user.save();

    // Send the reset code to the user's email
    sendResetCodeByEmail(req.body.email, resetCode);

    res.status(200).send("Reset code sent to your email");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Helper function to send the reset code via email
function sendResetCodeByEmail(email, resetCode) {
  // Replace this with your email sending logic using Nodemailer
  // Create a nodemailer transporter and send the reset code
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Replace with your email service
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.COMPANY_PASSWORD,
    },
  });

  const mailOptions = {
    from: "chambagaabudlah@gmail.com", // Replace with your sender email
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

// Route for setting a new password with the reset code
router.post("/setnewpassword", async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  const user = await User.findOne({ email, resetPasswordCode: resetCode });

  if (!user) return res.status(400).send("Invalid reset code or email");

  // Encrypt the new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  // Clear the reset code
  user.resetPasswordCode = undefined;
  await user.save();

  res.status(200).send("Password reset successfully");
});

// Helper function to send the reset code via email
function sendResetCodeByEmail(email, resetCode) {
  // Replace this with your email sending logic using Nodemailer
  // Create a nodemailer transporter and send the reset code
  const transporter = nodemailer.createTransport({
    service: "Gmail", // e.g., Gmail
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
  const schema = {
    email: Joi.string().email().required(),
  };
  return Joi.validate(req, schema);
}
module.exports = router;
