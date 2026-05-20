import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 999,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-gray-700 rounded-xl p-3 cursor-grab hover:bg-gray-600 transition duration-200"
    >
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.labelColor}`}>
        {task.label}
      </span>
      <p className="text-white text-sm font-medium mt-2">{task.title}</p>
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-medium ${task.priorityColor}`}>
          {task.priority}
        </span>
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {task.assignee}
        </div>
      </div>
    </div>
  );
}

function Column({ id, title, color, tasks }) {
  const { setNodeRef } = useDroppable({ id });

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
        <button className="text-gray-500 hover:text-white text-xl leading-none">
          +
        </button>
      </div>

      {/* Droppable area */}
      <div ref={setNodeRef} className="flex flex-col gap-3 min-h-20">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

    </div>
  );
}

export default Column;