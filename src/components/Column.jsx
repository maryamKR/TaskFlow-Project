import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import CreateTaskModal from './CreateTaskModal';

function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 999,
  } : undefined;

  const priorityColors = {
    High: 'text-red-400',
    Med: 'text-yellow-400',
    Low: 'text-green-400',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-gray-700 rounded-xl p-3 cursor-grab hover:bg-gray-600 transition duration-200"
    >
      {/* Title */}
      <p className="text-white text-sm font-medium">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-medium ${priorityColors[task.priority] || 'text-gray-400'}`}>
          {task.priority === 'High' ? '🔴' : task.priority === 'Med' ? '🟡' : '🟢'} {task.priority}
        </span>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {task.assignee[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Subtasks progress */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-xs">
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
            </span>
          </div>
          <div className="h-1 bg-gray-600 rounded-full">
            <div
              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
              style={{
                width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Column({ id, title, color, tasks, onTaskCreated }) {
  const { setNodeRef } = useDroppable({ id });
  const [showTaskModal, setShowTaskModal] = useState(false);

  return (
    <div className="bg-gray-800 rounded-2xl p-4 w-72 flex-shrink-0">

      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${color}`}></span>
          <h3 className="text-white font-semibold">{title}</h3>
          <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowTaskModal(true)}
          className="text-gray-500 hover:text-white text-xl leading-none transition duration-200"
        >
          +
        </button>
      </div>

      {/* Droppable area */}
      <div ref={setNodeRef} className="flex flex-col gap-3 min-h-20">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <CreateTaskModal
          columnId={id}
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={onTaskCreated}
        />
      )}

    </div>
  );
}

export default Column;