const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
require("dotenv").config();

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 13,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },

  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  resetPasswordCode: {
    type: String, // Ensure that you have this field in your schema
  },
});

// Setting userData in the sent token........
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      contact: this.contact,
      email: this.email,
    },
    process.env.PRIVATEKEY
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(4).max(200),
    contact: Joi.string().min(10).max(13),
    email: Joi.string().min(5).max(255).email().required(),
    password: Joi.string().min(5).max(255).required(),
  };

  return (result = Joi.validate(user, schema));
}

function validateUserUpdate(req) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    contact: Joi.string().min(10).max(14).optional(),
  });
  return schema.validate(req);
}

module.exports.User = User;
module.exports.validateUser = validateUser;

module.exports.validateUserUpdate = validateUserUpdate;
