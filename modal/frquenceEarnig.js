const mongoose = require("mongoose");
const Joi = require("joi");

const frequencySchema = new mongoose.Schema(
  {
    createdBy: {
      type: String,
    },
    frequencies: [
      {
        value: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Frequency = mongoose.model("Frequency", frequencySchema);

function validateFrequencyArray(frequencies) {
  const schema = Joi.array()
    .items(
      Joi.object({
        value: Joi.string().required(),
      })
    )
    .required();

  return (result = Joi.validate(frequencies, schema));
}

module.exports.Frequency = Frequency;
module.exports.validateFrequencyArray = validateFrequencyArray;
