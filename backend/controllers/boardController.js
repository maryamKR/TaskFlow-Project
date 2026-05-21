const Board = require("../models/Board");
const asyncHandler = require("express-async-handler");

const { hasBoardAccess } = require('../utils/boardAuth');

const Column = require("../models/Column");
const Task = require("../models/Task");

// @desc    Create a new project board
// @route   POST /api/boards
// @access  Private
const createBoard = asyncHandler(async (req, res, next) => {
  const { title, coworkers } = req.body;

  // 1. Create the new board document, setting the logged-in user as the creator
  const newBoard = await Board.create({
    title,
    user: req.user._id, // Coming directly from  protect middleware!
    coworkers: coworkers || [], // Defaults to an empty list if none provided yet
    columns: [] // Fresh board starts with no columns
  });

  // 2. Return the populated or clean board object back to the client
  res.status(201).json({
    success: true,
    data: newBoard
  });
});


// @desc    Get all boards for user (owned or shared)
// @route   GET /api/boards
// @access  Private
const getBoards = asyncHandler(async(req,res) =>{
    const boards = await Board.find({
        $or: [
            {user: req.user._id},
            {coworkers: req.user._id}
        ]
    }).sort({createdAt: -1});

    res.status(200).json({
        success : true,
        count : boards.length,
        data: boards
    })
})

const getBoardById = asyncHandler(async (req, res)=>{
    const board = await Board.findById(req.params.id).populate({
        path: 'columns',
        populate: {path: "tasks"} //Get task inside the columns
    }).populate({
        path: 'user',
        select: '-password'
});

    if(!board){
        res.status(404);
        throw new Error("Board not found")
    }

    if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have permission to view this board");
    }

    res.status(200).json({success: true, data: board})
});


const deleteBoard = asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);

    if(!board){
        res.status(404);
        throw new Error("Board not found");
    }

    if(board.user.toString() !== req.user._id.toString()){
        res.status(403);
        throw new Error("Only the owner can delete this board");
    }

   
    //Cascade delete 
    await Task.deleteMany({column:{ $in: board.columns}});
    await Column.deleteMany({board: board._id});
    await board.deleteOne();

    res.status(200).json({ success: true, message: "Board and all associated data removed" });
})

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  deleteBoard
};