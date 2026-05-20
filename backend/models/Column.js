const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    tasks:[
      {
      type: mongoose.Schema.Types.ObjectId,
      ref : "Task"
    }
  ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Column", columnSchema);