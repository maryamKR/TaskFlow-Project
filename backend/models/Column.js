const mongoose = require("mongoose");
 
const columnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Column title cannot exceed 50 characters"],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    tasks:[
      {
      type: mongoose.Schema.Types.ObjectId,
      ref : "Task"
    }
  ],
  type: {
  type: String,
  enum: ['todo', 'in-progress', 'review', 'done'],
  default: 'todo'
}
  },
  { timestamps: true }
);

columnSchema.pre('save', function() {
  const titleLower = this.title.toLowerCase();
  
  const typeMap = {
    'done': 'done',
    'review': 'review',
    'in progress': 'in-progress',
    'to do': 'todo'
  };

  if (typeMap[titleLower]) {
    this.type = typeMap[titleLower];
  }
});

module.exports = mongoose.model("Column", columnSchema);