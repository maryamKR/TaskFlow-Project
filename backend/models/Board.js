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



// Easy to add/remove/rename default columns here
const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];

boardSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const Column = mongoose.model("Column");

      const defaultColumns = await Column.insertMany(
        DEFAULT_COLUMNS.map((title, index) => ({
          title,
          board: this._id,
          position: index,
        }))
      );

      this.columns = defaultColumns.map(col => col._id);
      next();
    } catch (error) {
      next(error); // passes error to global errorHandler
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Board", boardSchema);