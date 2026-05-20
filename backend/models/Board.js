const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coworkers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    columns:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Column"
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);