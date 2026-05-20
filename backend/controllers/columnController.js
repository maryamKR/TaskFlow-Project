const Column = require('../models/Column');
const Board = require('../models/Board');
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

module.exports = {createColumn} ;

