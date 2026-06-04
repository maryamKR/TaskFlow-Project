const { GoogleGenerativeAI } = require("@google/generative-ai");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const { hasBoardAccess } = require("../utils/boardAuth");

// @desc     Suggest priority for a task
// @route    POST /api/ai/suggest-priority
// @access   Private
const suggestPriority = async (req, res) => {
  const { title, description } = req.body;

  // 1. Validation
  if (!title) {
    res.status(400);
    throw new Error("Task title is required");
  }

  // 2. Verify API Key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500);
    throw new Error("Backend Error: GEMINI_API_KEY is not defined in .env file");
  }

  try {
    // 3. Initialize Gemini using the ultra-fast gemini-2.5-flash model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a project management assistant. Analyze the following task and determine its priority level.
    
    Task title: "${title}"
    Task description: "${description || 'No description provided'}"
    
    Reply with ONLY one of these exact lowercase words: "high", "medium", or "low". Do not include punctuation, markdown, or extra explanation text.
    - high: urgent, critical, blocking, bugs, crashes, security issues
    - medium: important but not urgent, improvements, standard features
    - low: nice to have, minor changes, cosmetic tweaks, documentation`;

    // 4. Send request to Google
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // 5. Sanitize and match the format expected by your application
    const priority = responseText.trim().toLowerCase().replace(/[^a-z]/g, "");
    
    // 6. Final fallback match
    const validPriorities = ["high", "medium", "low"];
    const finalPriority = validPriorities.includes(priority) ? priority : "medium";

    res.status(200).json({ 
      success: true, 
      priority: finalPriority 
    });

  } catch (geminiError) {
    console.error('Gemini API Error:', geminiError.message);
    res.status(500).json({ 
      success: false, 
      error: `Gemini AI Error: ${geminiError.message}` 
    });
  }
};


const autoLabel = async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    res.status(400);
    throw new Error("Task title is required");
  }

  const text = `${title} ${description || ''}`.toLowerCase();

  const labels = [
    { label: 'Bug', keywords: ['bug', 'fix', 'crash', 'error', 'broken', 'issue', 'problem', 'fail'] },
    { label: 'Frontend', keywords: ['ui', 'ux', 'design', 'page', 'component', 'style', 'css', 'layout', 'button', 'modal', 'dashboard'] },
    { label: 'Backend', keywords: ['api', 'endpoint', 'server', 'database', 'db', 'route', 'controller', 'model', 'query'] },
    { label: 'Documentation', keywords: ['docs', 'documentation', 'readme', 'guide', 'wiki', 'comment', 'write'] },
    { label: 'DevOps', keywords: ['deploy', 'deployment', 'ci', 'cd', 'docker', 'production', 'server', 'hosting', 'vercel', 'railway'] },
    { label: 'Testing', keywords: ['test', 'testing', 'unit', 'e2e', 'jest', 'spec', 'qa'] },
    { label: 'Feature', keywords: ['add', 'create', 'build', 'implement', 'feature', 'new', 'develop'] },
    { label: 'Design', keywords: ['figma', 'mockup', 'wireframe', 'prototype', 'graphic', 'logo'] },
  ];

  let detectedLabel = 'Other';
  for (const { label, keywords } of labels) {
    if (keywords.some(k => text.includes(k))) {
      detectedLabel = label;
      break;
    }
  }

  res.status(200).json({ success: true, label: detectedLabel });
};

// @desc     Get AI board insights for the banner
// @route    POST /api/ai/board-insight
const getBoardInsight = async (req, res) => {
  const { boardId } = req.body;

  if (!boardId) {
    return res.status(400).json({ error: "boardId is required" });
  }

  try {
    const board = await Board.findById(boardId).populate({
      path: 'columns',
      populate: { path: 'tasks' }
    });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    if (!hasBoardAccess(board, req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allTasks = board.columns.flatMap(col => 
      col.tasks.map(t => ({
        title: t.title,
        priority: t.priority,
        status: col.title,
        dueDate: t.dueDate,
        createdAt: t.createdAt
      }))
    );

    if (allTasks.length === 0) {
      return res.status(200).json({ insight: "Add some tasks to see AI insights!" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a project management AI assistant. Analyze these tasks and return ONE short summary insight layout (max 15 words).
    
    Tasks data: ${JSON.stringify(allTasks)}`;

    const result = await model.generateContent(prompt);
    res.status(200).json({ insight: result.response.text().trim() });
  } catch (err) {
    console.error("Insight engine server error:", err.message);

    if (err.message.includes("429") || err.message.includes("quota")) {
      return res.status(200).json({ 
        insight: "✨ (Demo Mode) 3 urgent bugs remain unassigned in your backlog column." 
      });
    }

    res.status(500).json({ error: err.message });
  }
};

// @desc     Bulk task priority re-calculation array
// @route    POST /api/ai/auto-prioritize
const autoPrioritize = async (req, res) => {
  const { boardId } = req.body;

  if (!boardId) {
    return res.status(400).json({ error: "boardId is required" });
  }

  try {
    const board = await Board.findById(boardId).populate({
      path: 'columns',
      populate: { path: 'tasks' }
    });

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    if (!hasBoardAccess(board, req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allTasks = board.columns.flatMap(col => 
      col.tasks.map(t => ({
        id: t._id,
        title: t.title,
        description: t.description || '',
        status: col.title,
        dueDate: t.dueDate,
        currentPriority: t.priority
      }))
    );

    if (allTasks.length === 0) {
      return res.status(200).json({ priorities: [] });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a project management AI assistant.
    Analyze these tasks and assign priority (low, medium, high) to each one based on dates and descriptions.
    Return ONLY a valid JSON array matching this exact schema layout, nothing else:
    [{"id": "task_id_here", "priority": "high"}]

    Tasks data: ${JSON.stringify(allTasks)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();

    res.status(200).json({ priorities: JSON.parse(clean) });
  } catch (err) {
    console.error("Auto-prioritize server error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { suggestPriority, autoLabel, getBoardInsight, autoPrioritize };