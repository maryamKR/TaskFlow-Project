const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');
const asyncHandler = require('express-async-handler');

const createTask = asyncHandler(async (req, res) => {
  const { title, columnId, description, priority, dueDate } = req.body;

  // 1. Ensure the column exists
  const column = await Column.findById(columnId);
  if (!column) {
    res.status(404);
    throw new Error("Column not found");
  }

  // 2. Create the Task
  const board = await Board.findById(column.board);
  if (!board) {
    res.status(404);
    throw new Error("Associated board not found");
  }
const isOwner = board.user.toString() === req.user._id.toString();
const isCoworker = board.coworkers.some(id => id.toString() === req.user._id.toString());

if (!isOwner && !isCoworker) {
    res.status(403);
    throw new Error("You do not have permission to add tasks to this board");
}
  const task = await Task.create({
    title,
    description,
    priority,
    dueDate,
    column: columnId
  });

  // 3. Link task to column
  column.tasks.push(task._id);
  await column.save();

  res.status(201).json({ success: true, data: task });
});

const getTask = asyncHandler(async (req,res) => {
  const task = await Task.findById(req.params.id);
  if(!task){
    res.status(404);
    throw new Error("Task not found");
  }
  res.status(200).json({success: true, data:task})
});

const updateTask = asyncHandler(async(req,res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

    task.title = req.body.title || task.title;
    task.description = req.body.description;
    task.priority = req.body.priority;
    task.dueDate = req.body.dueDate;

    await task.save();
    res.status(200).json({ success:true, data:task})
  
});

const deleteTask = asyncHandler(async (req,res) => {
  const task = await Task.findById(req.params.id);

  if(!task){
    res.status(400);
    throw new Error("Task not found");
  }

  const column = await Column.findById(task.column);
  if(column){
    column.tasks.pull(task._id);
    await column.save();
  }

  await task.deleteOne();
  res.status(200).json({success : true, message: "Task deleted successfully" });
})

module.exports = { createTask, getTask, updateTask, deleteTask };