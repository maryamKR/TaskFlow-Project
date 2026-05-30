const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    label: {
      type: String,
      enum: ["Bug", "Frontend", "Backend", "Documentation", "DevOps", "Design", "Testing", "Feature", "Other"],
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
      index: true,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text' });
module.exports = mongoose.model("Task", taskSchema);