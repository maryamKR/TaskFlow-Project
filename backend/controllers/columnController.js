const Column = require('../models/Column');
const Board = require('../models/Board');
const Task = require('../models/Task');
const asyncHandler = require('express-async-handler');

const createColumn = asyncHandler(async(req,res) => {
    const {title, boardId} = req.body;

    const board = await Board.findById(boardId);
    if(!board){
        res.status(404);
        throw new Error("Board not found");
    }
    const column = await Column.create({
    title,
    board: boardId,
    position: board.columns.length // Simple auto-position
  });

  //Add column reference to the Board
  board.columns.push(column._id);
  await board.save();

  res.status(201).json({ success: true, data: column });
});

const getColumnsByBoard = asyncHandler(async (req, res) => {
    const columns = await Column.find({board: req.params.boardId }).sort({ position: 1 });
    res.status(200).json({ success: true, data: columns });
});

const updateColumn = asyncHandler(async (req, res) => {
    // console.log("DEBUG: req.params is:", req.params);
  
    const column = await Column.findByIdAndUpdate(
        req.params.id,
         req.body,
        { returnDocument: 'after' });

    if (!column) {
        res.status(404);
        throw new Error("Column not found");
    }
    res.status(200).json({ success: true, data: column });
})

const deleteColumn = asyncHandler(async (req, res) => {
    const column = await Column.findByIdAndDelete(req.params.id);
    if (!column) {
        res.status(404);
        throw new Error("Column not found");
    }
    // Cleanup: Remove reference from board and delete all tasks inside
    await Board.findByIdAndUpdate(column.board, { $pull: { columns: column._id } });
    await Task.deleteMany({ column: column._id });
    
    res.status(200).json({ success: true, message: "Column and associated tasks removed" });
});

module.exports = {createColumn, getColumnsByBoard, updateColumn, deleteColumn} ;

