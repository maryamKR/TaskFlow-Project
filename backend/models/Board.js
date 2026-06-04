const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Board title cannot exceed 100 characters"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    ],
    pendingInvites: [
      {
        type: String,
        trim: true,
        lowercase: true,
      }
    ]
  },
  { timestamps: true }
);

boardSchema.index({ coworkers: 1 });

module.exports = mongoose.model("Board", boardSchema);