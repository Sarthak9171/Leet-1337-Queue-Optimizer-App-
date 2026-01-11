const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      index: true,
    },


    name: {
      type: String,
      required: true,
      trim: true,
    },

    currentServingToken: {
    type: Number,
    default: null,
    },


    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Queue", queueSchema);
