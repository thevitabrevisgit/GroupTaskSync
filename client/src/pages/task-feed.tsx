import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Menu, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserColor } from "@/lib/utils";
import TaskCard from "@/components/task-card";
import TaskDetailModal from "@/components/task-detail-modal";
import AddTaskModal from "@/components/add-task-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocation } from "wouter";

const PRIMARY_FILTERS = [
  { value: "all", label: "All Tasks" },
  { value: "assigned", label: "My Tasks" },
  { value: "unassigned", label: "Unassigned" },
  { value: "priority", label: "Priority" },
];

const SECONDARY_FILTERS = [
  { value: "all", label: "All Tags" },
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "chores", label: "Chores" },
  { value: "projects", label: "Projects" },
];

export default function TaskFeed() {
  const [, setLocation] = useLocation();
  const { currentUser, currentUserId } = useCurrentUser();
  const [primaryFilter, setPrimaryFilter] = useState("all");
  const [secondaryFilter, setSecondaryFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [completedDateRange, setCompletedDateRange] = useState("today");
  const [completedUserFilter, setCompletedUserFilter] = useState("all");

  // Redirect to profile selection if no user is selected, but only after loading
  useEffect(() => {
    if (!currentUser && !currentUserId) {
      // Only redirect if we're sure there's no stored user
      const storedUserId = localStorage.getItem("currentUserId");
      if (!storedUserId) {
        setLocation("/");
      }
    }
  }, [currentUser, currentUserId, setLocation]);

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/tasks", primaryFilter, secondaryFilter, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (primaryFilter !== "all") {
        params.set("filter", primaryFilter);
      }
      if (secondaryFilter !== "all") {
        params.set("tagFilter", secondaryFilter);
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

  // Query for completed tasks
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: showCompletedTasks,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ["/api/tasks/completed", completedDateRange, completedUserFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("completed", "true");
      params.set("dateRange", completedDateRange);
      if (completedUserFilter !== "all") {
        params.set("userId", completedUserFilter);
      }
      const response = await fetch(`/api/tasks/completed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch completed tasks');
      return response.json();
    },
    enabled: showCompletedTasks,
  });

  if (!currentUser) {
    return null;
  }

  return (
    <div className="task-feed-bg pb-safe">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 sticky top-0 z-40 safe-area-inset-top">
        <div className="px-4 py-3 pt-safe">
          <div className="flex items-center justify-between">
            {/* Left side - Hamburger menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Access additional features and settings
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setShowCompletedTasks(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completed Tasks
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Center - User name */}
            <div className="text-center">
              <p className="text-sm text-gray-300">{currentUser.name}</p>
            </div>
            
            {/* Right side - User circle and refresh */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleProfileMenu}>
                <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold ${getUserColor(currentUser.username).bg} ${getUserColor(currentUser.username).text}`}>
                  {currentUser.name.charAt(0)}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Section */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        {/* Primary filters row */}
        <div className="flex space-x-2 overflow-x-auto mb-2">
          {PRIMARY_FILTERS.map((option) => (
            <Button
              key={option.value}
              variant={primaryFilter === option.value ? "default" : "secondary"}
              size="sm"
              className="whitespace-nowrap h-8 px-3 py-1"
              onClick={() => setPrimaryFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        {/* Secondary filters row */}
        <div className="flex space-x-2 overflow-x-auto">
          {SECONDARY_FILTERS.map((option) => (
            <Button
              key={option.value}
              variant={secondaryFilter === option.value ? "default" : "secondary"}
              size="sm"
              className="whitespace-nowrap h-8 px-3 py-1"
              onClick={() => setSecondaryFilter(option.value)}
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
              {primaryFilter === "assigned" 
                ? "You don't have any assigned tasks yet."
                : primaryFilter === "unassigned"
                ? "No unassigned tasks found."
                : primaryFilter === "priority"
                ? "No priority tasks found."
                : "No tasks match the current filters."}
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

      {/* Floating Action Button (Available to Everyone) */}
      <div className="fixed bottom-6 right-6 z-50 pb-safe">
        <Button
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
          onClick={() => setShowAddTask(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Completed Tasks Modal */}
      <Sheet open={showCompletedTasks} onOpenChange={setShowCompletedTasks}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Completed Tasks</SheetTitle>
            <SheetDescription>
              View tasks that have been completed
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Select value={completedDateRange} onValueChange={setCompletedDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="user-filter">User</Label>
                <Select value={completedUserFilter} onValueChange={setCompletedUserFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Completed Tasks List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {completedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No completed tasks found for the selected filters.
                </p>
              ) : (
                completedTasks.map((task: any) => (
                  <div key={task.id} className="p-3 border rounded-lg bg-gray-50">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Completed by {task.completedByUser?.name} on{' '}
                      {new Date(task.completedAt).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags?.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
