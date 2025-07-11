import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, User } from "lucide-react";
import TaskCard from "@/components/task-card";
import TaskDetailModal from "@/components/task-detail-modal";
import AddTaskModal from "@/components/add-task-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocation } from "wouter";

const FILTER_OPTIONS = [
  { value: "all", label: "All Tasks" },
  { value: "assigned", label: "My Tasks" },
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "chores", label: "Chores" },
  { value: "projects", label: "Projects" },
];

export default function TaskFeed() {
  const [, setLocation] = useLocation();
  const { currentUser, currentUserId } = useCurrentUser();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect to profile selection if no user is selected
  useEffect(() => {
    if (!currentUser) {
      setLocation("/");
    }
  }, [currentUser, setLocation]);

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/tasks", activeFilter, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter !== "all") {
        params.set("filter", activeFilter);
      }
      if (currentUserId) {
        params.set("userId", currentUserId.toString());
      }
      const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!currentUser,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleProfileMenu = () => {
    setLocation("/");
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 safe-area-inset-top">
        <div className="px-4 py-3 pt-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
                alt="Current user"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">TaskShare</h1>
                <p className="text-sm text-gray-600">{currentUser.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleProfileMenu}>
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex space-x-2 overflow-x-auto">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={activeFilter === option.value ? "default" : "secondary"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setActiveFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Task Feed */}
      <main className="p-4 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="w-full h-40 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No tasks found</div>
            <p className="text-gray-400 mb-6">
              {activeFilter === "assigned" 
                ? "You don't have any assigned tasks yet."
                : "No tasks match the current filter."}
            </p>
            {currentUser.isAdmin && (
              <Button onClick={() => setShowAddTask(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.map((task: any) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                onClick={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={handleRefresh}>
              Load More Tasks
            </Button>
          </div>
        )}
      </main>

      {/* Floating Action Button (Admin Only) */}
      {currentUser.isAdmin && (
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
            onClick={() => setShowAddTask(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
      />
    </div>
  );
}
