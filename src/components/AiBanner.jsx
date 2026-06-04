import { useState, useEffect, useRef } from 'react';
import { getAiInsight, autoPrioritizeTasks } from '../services/ai';

function AiBanner({ boardId, columns, onPrioritiesUpdated }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Track the last known task state to avoid duplicate API spam
  const lastTaskSignature = useRef('');
  // Track when the last hard AI API request was made (in milliseconds)
  const lastForcedFetchTime = useRef(0);

  // Core intervals configuration
  const FORCE_RE_EVALUATE_INTERVAL = 15 * 60 * 1000; // 15 minutes
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const handleFetchInsight = async (forceRequest = false) => {
    if (!boardId) return;

    // Create a text snapshot of current task layout counts
    const currentSignature = (columns || []).map(c => `${c.title}-${(c.tasks || []).length}`).join('|');
    const now = Date.now();
    const timeSinceLastForce = now - lastForcedFetchTime.current;

    // Skip the network request if data hasn't changed AND we haven't hit our 15-minute time limit
    if (!forceRequest && currentSignature === lastTaskSignature.current && timeSinceLastForce < FORCE_RE_EVALUATE_INTERVAL) {
      console.log("AI Banner: Data hasn't changed and 15-minute interval hasn't expired. Skipping fetch.");
      return;
    }

    setLoading(true);
    const message = await getAiInsight(boardId);
    if (message) {
      setInsight(message);
      lastTaskSignature.current = currentSignature;
      if (forceRequest || timeSinceLastForce >= FORCE_RE_EVALUATE_INTERVAL) {
        lastForcedFetchTime.current = now; // Reset our 15-minute timer
      }
    }
    setLoading(false);
  };

  // 1. Initial Load Hook
  useEffect(() => {
    handleFetchInsight(true); // Force an initial insight generation on board load
  }, [boardId]); // Only triggers when switching to a completely different board

  // 2. Automated Background Timer Hook (5-minute cycle)
  useEffect(() => {
    const timer = setInterval(() => {
      console.log("AI Banner: Running automated background check...");
      
      const now = Date.now();
      const timeSinceLastForce = now - lastForcedFetchTime.current;
      
      // If time since last complete AI check is greater than or equal to 15 mins, force re-evaluation
      const shouldForce = timeSinceLastForce >= FORCE_RE_EVALUATE_INTERVAL;
      
      handleFetchInsight(shouldForce);
    }, CHECK_INTERVAL);

    return () => clearInterval(timer); // Clean up the timer when leaving the page
  }, [boardId, columns]);

  const handleBulkPrioritize = async () => {
    if (!boardId) return;
    setUpdating(true);

    try {
      const updatedPriorities = await autoPrioritizeTasks(boardId);
      if (updatedPriorities && updatedPriorities.length > 0) {
        onPrioritiesUpdated(updatedPriorities);
        // Refresh the insight sentence immediately to reflect the new updates
        handleFetchInsight(true);
      }
    } catch (err) {
      console.error("Failed to update bulk priorities:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-pink-900 to-indigo-900 rounded-xl p-4 my-3 text-white shadow-md flex items-center justify-between border border-pink-500/30">
      <div className="flex items-center gap-3">
        <div className="bg-pink-600/30 p-2 rounded-lg border border-pink-400/20 animate-pulse">
          ✨
        </div>
        <div>
          <h4 className="text-xs uppercase font-semibold tracking-wider text-pink-300">
            TaskFlow AI Engine
          </h4>
          <p className="text-sm text-gray-200 font-medium mt-0.5">
            {loading ? (
              <span className="opacity-60 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing board changes...
              </span>
            ) : (
              insight || "No immediate risks detected. Your board structure looks solid!"
            )}
          </p>
        </div>
      </div>

      <button
        onClick={handleBulkPrioritize}
        disabled={updating || loading}
        className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {updating ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Re-calculating...
          </>
        ) : (
          <> Auto-Prioritize Board</>
        )}
      </button>
    </div>
  );
}

export default AiBanner;