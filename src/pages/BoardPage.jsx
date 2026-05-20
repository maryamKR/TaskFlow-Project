import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Navbar from '../components/Navbar';
import Column from '../components/Column';

const initialData = {
  columns: [
    { id: 'todo', title: 'To Do', color: 'bg-gray-400' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-400' },
    { id: 'review', title: 'Review', color: 'bg-yellow-400' },
    { id: 'done', title: 'Done', color: 'bg-green-400' },
  ],
  tasks: [
    {
      id: '1', columnId: 'todo',
      title: 'Design login page UI',
      label: 'UI', labelColor: 'bg-purple-900 text-purple-300',
      priority: '🔴 High', priorityColor: 'text-red-400',
      assignee: 'S'
    },
    {
      id: '2', columnId: 'todo',
      title: 'Set up MongoDB schemas',
      label: 'DB', labelColor: 'bg-blue-900 text-blue-300',
      priority: '🔴 High', priorityColor: 'text-red-400',
      assignee: 'A'
    },
    {
      id: '3', columnId: 'inprogress',
      title: 'Build login & register APIs',
      label: 'BE', labelColor: 'bg-green-900 text-green-300',
      priority: '🔴 High', priorityColor: 'text-red-400',
      assignee: 'A'
    },
    {
      id: '4', columnId: 'inprogress',
      title: 'OpenAI API integration',
      label: 'AI', labelColor: 'bg-yellow-900 text-yellow-300',
      priority: '🟡 Med', priorityColor: 'text-yellow-400',
      assignee: 'M'
    },
    {
      id: '5', columnId: 'review',
      title: 'JWT auth middleware',
      label: 'BE', labelColor: 'bg-green-900 text-green-300',
      priority: '🔴 High', priorityColor: 'text-red-400',
      assignee: 'A'
    },
    {
      id: '6', columnId: 'done',
      title: 'Project repo & React setup',
      label: 'FE', labelColor: 'bg-purple-900 text-purple-300',
      priority: '✅ Done', priorityColor: 'text-green-400',
      assignee: 'S'
    },
  ]
};

function BoardPage() {
  const [data, setData] = useState(initialData);

  const sensors = useSensors(useSensor(PointerSensor));

  const getTasksByColumn = (columnId) => {
    return data.tasks.filter(task => task.columnId === columnId);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id;
    const newColumnId = over.id;

    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId
          ? { ...task, columnId: newColumnId }
          : task
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      {/* Board Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Code Arena — Dev Board</h1>
          <p className="text-gray-400 text-sm mt-1">Track your team's progress</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200">
          + Add Task
        </button>
      </div>

      {/* Drag & Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 px-6 pb-6 overflow-x-auto">
          {data.columns.map(column => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={getTasksByColumn(column.id)}
            />
          ))}
        </div>
      </DndContext>

    </div>
  );
}

export default BoardPage;