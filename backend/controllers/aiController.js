const asyncHandler = require("express-async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// @desc     Suggest priority for a task
// @route    POST /api/ai/suggest-priority
// @access   Private
const suggestPriority = asyncHandler(async (req, res) => {
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
});

module.exports = { suggestPriority };