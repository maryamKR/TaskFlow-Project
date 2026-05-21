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



// DEFAULT COLUMNS CREATION
boardSchema.pre("save", async function (next) {
  if (this.isNew) {
    const Column = mongoose.model("Column");

    const defaultColumns = await Column.insertMany([
      { title: "To Do", board: this._id },
      { title: "In Progress", board: this._id },
      { title: "Done", board: this._id }
    ]);

    this.columns = defaultColumns.map(col => col._id);
  }

  next();
});

module.exports = mongoose.model("Board", boardSchema);