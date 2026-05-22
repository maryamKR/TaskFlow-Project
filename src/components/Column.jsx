import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CreateTaskModal from './CreateTaskModal';
import { deleteTask } from '../services/board';

function TaskCard({ task, onTaskDeleted }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task' },
  });

  const [isHovered, setIsHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTask(task._id);
      onTaskDeleted(task._id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setDeleting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-700 rounded-xl p-3 hover:bg-gray-600 transition duration-200 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div {...listeners} {...attributes} className="cursor-grab">
        <p className="text-white text-sm font-medium pr-6">{task.title}</p>
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-medium ${priorityColors[task.priority] || 'text-gray-400'}`}>
            {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} {task.priority}
          </span>
          {task.assignedTo && typeof task.assignedTo === 'object' && task.assignedTo.username && (
  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
    {task.assignedTo.username[0].toUpperCase()}
  </div>
)}
        </div>
      </div>

      {isHovered && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition duration-200 text-sm font-bold"
        >
          {deleting ? '·' : '×'}
        </button>
      )}
    </div>
  );
}

function Column({ id, title, color, tasks, onTaskCreated, onTaskDeleted, members, dragHandleProps }) {
  const { setNodeRef } = useDroppable({
    id,
    data: { type: 'column' },
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="bg-gray-800 rounded-2xl p-4 w-72 flex-shrink-0">

      {/* Column Header — drag handle */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex items-center gap-2 cursor-grab flex-1"
          {...dragHandleProps}
        >
          <span className={`w-3 h-3 rounded-full ${color}`}></span>
          <h3 className="text-white font-semibold">{title}</h3>
          <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowTaskModal(true)}
          className="text-gray-500 hover:text-white text-xl leading-none transition duration-200"
        >
          +
        </button>
      </div>

      {/* Droppable + Sortable tasks */}
      <div ref={setNodeRef} className="flex flex-col gap-3 min-h-20">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </SortableContext>
      </div>

      {showTaskModal && (
        <CreateTaskModal
          columnId={id}
          members={members}
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={onTaskCreated}
        />
      )}
    </div>
  );
}

export default Column;