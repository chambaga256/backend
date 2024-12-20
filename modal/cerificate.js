const mongoose = require("mongoose");
const Joi = require("joi");

const certificateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50,
  },
  // pladge: {

  // type: String,
  // required: true,
  // maxlength: 50,
  // },

  link: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  institutionEmail: {
    type: String,
    required: true,
  },

  // amount: {
  //   type: Number,
  //   required: true,
  // },
  phoneNumber: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    true: true,
  },
  insuranceCompany: {
    type: String,
    true: true,
  },

  dateOfCompletion: {
    type: Date,
    default: Date.now(),
  },

  createdBy: {
    type: String,
  },
},

{ timestamps: true });

const Certificate = mongoose.model("Certificate", certificateSchema);

function validateCertifacte(certificate) {
  const schema = {
    name: Joi.string().max(50).required(),

    email: Joi.string().max(50).required(),
    institutionEmail: Joi.string().max(50).required(),
    // amount: Joi.number().required(),
    phoneNumber: Joi.string().max(50).required(),
    frequency: Joi.string().max(50).required(),
    institution: Joi.string().max(200),
    insuranceCompany: Joi.string().max(200),
  };

  return (result = Joi.validate(certificate, schema));
}

module.exports.Certificate = Certificate;
module.exports.validateCertifacte = validateCertifacte;
