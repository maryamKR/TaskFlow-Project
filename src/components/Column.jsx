import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import { deleteTask, deleteColumn } from '../services/board';

function TaskCard({ task, onTaskDeleted, onTaskUpdated, members }) {
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
  const [showDetail, setShowDetail] = useState(false);

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
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-700 rounded-xl p-3 hover:bg-gray-600 transition duration-200 relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag handle + click to open */}
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab"
          onClick={() => setShowDetail(true)}
        >
          {/* Title */}
          <p className="text-white text-sm font-medium pr-6">{task.title}</p>

          {/* Description preview */}
          {task.description && (
            <p className="text-gray-400 text-xs mt-1 truncate">{task.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-medium ${priorityColors[task.priority] || 'text-gray-400'}`}>
              {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} {task.priority}
            </span>
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className="text-gray-500 text-xs">
                  📅 {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.assignedTo && typeof task.assignedTo === 'object' && task.assignedTo.username && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {task.assignedTo.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete button */}
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

      {/* Task Detail Modal */}
      {showDetail && (
        <TaskDetailModal
          task={task}
          members={members}
          onClose={() => setShowDetail(false)}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  );
}

function Column({ id, title, color, tasks, onTaskCreated, onTaskDeleted, onColumnDeleted, onTaskUpdated, members, dragHandleProps }) {
  const { setNodeRef } = useDroppable({
    id,
    data: { type: 'column' },
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [columnColor, setColumnColor] = useState(color);

  const colors = [
    'bg-gray-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-yellow-400',
    'bg-red-400',
    'bg-purple-400',
    'bg-pink-400',
    'bg-orange-400',
  ];

  const taskIds = tasks.map(t => t.id);

  const handleDeleteColumn = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm(`Delete column "${title}" and all its tasks?`)) return;
    setDeleting(true);
    try {
      await deleteColumn(id);
      onColumnDeleted(id);
    } catch (err) {
      console.error('Failed to delete column:', err);
      setDeleting(false);
    }
  };

  return (
    <div
      className="bg-gray-800 rounded-2xl p-4 w-72 flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex items-center gap-2 cursor-grab flex-1"
          {...dragHandleProps}
        >
          <div className="relative">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowColorPicker(prev => !prev)}
              className={`w-3 h-3 rounded-full ${columnColor} hover:scale-125 transition-transform duration-200`}
            />
            {showColorPicker && (
              <div className="absolute top-5 left-0 bg-gray-700 rounded-xl p-2 flex gap-1.5 z-10 shadow-xl">
                {colors.map(c => (
                  <button
                    key={c}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setColumnColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`w-4 h-4 rounded-full ${c} hover:scale-125 transition-transform duration-200 ${columnColor === c ? 'ring-2 ring-white' : ''
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
          <h3 className="text-white font-semibold">{title}</h3>
          <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete column button */}
          {isHovered && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleDeleteColumn}
              disabled={deleting}
              className="text-gray-500 hover:text-red-400 transition duration-200 text-sm font-bold"
            >
              {deleting ? '·' : '×'}
            </button>
          )}
          {/* Add task button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowTaskModal(true)}
            className="text-gray-500 hover:text-white text-xl leading-none transition duration-200"
          >
            +
          </button>
        </div>
      </div>

      {/* Droppable + Sortable tasks */}
      <div ref={setNodeRef} className="flex flex-col gap-3 min-h-20">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onTaskDeleted={onTaskDeleted}
              onTaskUpdated={onTaskUpdated}
            />
          ))}
        </SortableContext>
      </div>

      {/* Create Task Modal */}
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