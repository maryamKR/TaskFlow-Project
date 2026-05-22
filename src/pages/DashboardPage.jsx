import Navbar from '../components/Navbar';

function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Your productivity stats will appear here</p>
      </div>
    </div>
  );
}

export default DashboardPage;