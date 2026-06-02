import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import Toast from './Toast';
import { deleteTask, deleteColumn } from '../services/board';
import { useTheme } from '../context/ThemeContext';

function TaskCard({ task, onTaskDeleted, onTaskUpdated, members, isOwner }) {
  const { isDark } = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' },
  });
  const [isHovered, setIsHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [toast, setToast] = useState(null);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const priorityColors = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400' };

  // Due date color coding
  const getDueDateStyle = () => {
    if (!task.dueDate) return null;
    const daysUntilDue = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 2) return 'soon';
    return 'normal';
  };
  const dueDateStatus = getDueDateStyle();

  const cardBorderClass = () => {
    if (dueDateStatus === 'overdue') return isDark ? 'border border-red-500 bg-red-950/30' : 'border border-red-400 bg-red-50';
    if (dueDateStatus === 'soon') return isDark ? 'border border-orange-400 bg-orange-950/20' : 'border border-orange-300 bg-orange-50';
    return isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200';
  };

  const handleDelete = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isOwner) {
      setToast({ message: 'Only the board owner can delete tasks.', type: 'error' });
      return;
    }
    if (deleting) return;
    setDeleting(true);
    try { await deleteTask(task._id); onTaskDeleted(task._id); }
    catch (err) { console.error('Failed to delete task:', err); setDeleting(false); }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-xl p-3 transition duration-200 relative ${cardBorderClass()}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div {...listeners} {...attributes} className="cursor-grab" onClick={() => setShowDetail(true)}>

          {/* Title row with done icon */}
          <div className="flex items-center gap-2 pr-6">
            {task.isDone ? (
              <span className="text-green-500 text-base flex-shrink-0">✅</span>
            ) : (
              <span className={`text-base flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-300'}`}>○</span>
            )}
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} ${task.isDone ? 'line-through opacity-60' : ''}`}>
              {task.title}
            </p>
          </div>

          {task.description && (
            <p className={`text-xs mt-1 truncate ml-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{task.description}</p>
          )}

          {/* Priority + Label */}
          <div className="flex items-center gap-2 mt-2 ml-6">
            <span className={`text-xs font-medium flex items-center gap-1 ${priorityColors[task.priority] || 'text-gray-400'}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${
                task.priority === 'high' ? 'bg-red-400' :
                task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
              }`} />
              {task.priority}
            </span>
            {task.label && task.label !== 'Other' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                {task.label}
              </span>
            )}
          </div>

          {/* Due date */}
          {task.dueDate && (
            <div className="flex items-center gap-2 mt-1 ml-6">
              {dueDateStatus === 'overdue' ? (
                <span
                  className="text-xs text-red-400 font-medium cursor-help"
                  title={`Original due date: ${new Date(task.dueDate).toLocaleDateString()}`}
                >
                  Overdue · {new Date(task.dueDate).toLocaleDateString()}
                </span>
              ) : (
                <span className={`text-xs ${
                  dueDateStatus === 'soon' ? 'text-orange-400 font-medium' :
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: assignee + createdBy + comments */}
          <div className="flex items-center justify-between mt-2 ml-6">
            <div className="flex items-center gap-2">
              {task.assignedTo && typeof task.assignedTo === 'object' && task.assignedTo.username && (
                <div
                  className="w-6 h-6 rounded-full bg-pink-700 flex items-center justify-center text-white text-xs font-bold"
                  title={`Assigned to: ${task.assignedTo.username}`}
                >
                  {task.assignedTo.username[0].toUpperCase()}
                </div>
              )}
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                by {task.createdBy?.username || '—'}
              </span>
            </div>

            {/* Comment count */}
            {task.comments && task.comments.length > 0 && (
              <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" />
                </svg>
                {task.comments.length}
              </div>
            )}
          </div>

        </div>

        {isHovered && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            disabled={deleting}
            className={`absolute top-2 right-2 text-sm font-bold transition duration-200 ${
              isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            {deleting ? '·' : '×'}
          </button>
        )}
      </div>

      {showDetail && (
        <TaskDetailModal task={task} members={members} onClose={() => setShowDetail(false)} onTaskUpdated={onTaskUpdated} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

function Column({ id, title, color, tasks, onTaskCreated, onTaskDeleted, onColumnDeleted, onTaskUpdated, members, dragHandleProps, isOwner }) {
  const { isDark } = useTheme();
  const { setNodeRef } = useDroppable({ id, data: { type: 'column' } });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [columnColor, setColumnColor] = useState(color);
  const [toast, setToast] = useState(null);

  const isDoneColumn = title?.toLowerCase() === 'done';

  const colors = ['bg-gray-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-red-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400'];
  const borderColorMap = {
    'bg-gray-400': 'border-gray-400', 'bg-blue-400': 'border-blue-400',
    'bg-green-400': 'border-green-400', 'bg-yellow-400': 'border-yellow-400',
    'bg-red-400': 'border-red-400', 'bg-purple-400': 'border-purple-400',
    'bg-pink-400': 'border-pink-400', 'bg-orange-400': 'border-orange-400',
  };

  const taskIds = tasks.map(t => t.id);

  const handleDeleteColumn = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isOwner) {
      setToast({ message: 'Only the board owner can delete columns.', type: 'error' });
      return;
    }
    if (deleting) return;
    if (!window.confirm(`Delete column "${title}" and all its tasks?`)) return;
    setDeleting(true);
    try { await deleteColumn(id); onColumnDeleted(id); }
    catch (err) { console.error('Failed to delete column:', err); setDeleting(false); }
  };

  return (
    <div
      className={`rounded-2xl p-4 w-72 flex-shrink-0 border-t-2 ${borderColorMap[columnColor] || 'border-gray-400'} ${
        isDark ? 'bg-gray-800' : 'bg-white border border-gray-200 border-t-2'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 cursor-grab flex-1" {...dragHandleProps}>
          <h3 className={`font-semibold uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHovered && (
            <div className="relative">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setShowColorPicker(prev => !prev)}
                className={`w-3 h-3 rounded-full ${columnColor} hover:scale-125 transition-transform duration-200`}
                title="Change color"
              />
              {showColorPicker && (
                <div className={`absolute top-5 right-0 rounded-xl p-2 flex gap-1.5 z-10 shadow-xl ${
                  isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  {colors.map(c => (
                    <button
                      key={c}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => { setColumnColor(c); setShowColorPicker(false); }}
                      className={`w-4 h-4 rounded-full ${c} hover:scale-125 transition-transform duration-200 ${columnColor === c ? 'ring-2 ring-white' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {isHovered && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleDeleteColumn}
              disabled={deleting}
              className={`text-sm font-bold transition duration-200 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
            >
              {deleting ? '·' : '×'}
            </button>
          )}
          {/* Hide + button on Done column */}
          {!isDoneColumn && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowTaskModal(true)}
              className={`text-xl leading-none transition duration-200 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
            >+</button>
          )}
        </div>
      </div>

      <div ref={setNodeRef} className="flex flex-col gap-3 min-h-20">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              isOwner={isOwner}
              onTaskDeleted={onTaskDeleted}
              onTaskUpdated={onTaskUpdated}
            />
          ))}
        </SortableContext>
      </div>

      {showTaskModal && (
        <CreateTaskModal columnId={id} members={members} onClose={() => setShowTaskModal(false)} onTaskCreated={onTaskCreated} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Column;