import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Clock, CheckCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskDetailModalProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
  const { currentUserId } = useCurrentUser();
  const { toast } = useToast();
  const [timeHours, setTimeHours] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const { data: task, isLoading } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  const addTimeMutation = useMutation({
    mutationFn: async (data: { hours: number; description?: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          hours: data.hours,
          description: data.description,
        }),
      });
      if (!response.ok) throw new Error("Failed to add time");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTimeHours("");
      toast({ title: "Time added successfully" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          content,
        }),
      });
      if (!response.ok) throw new Error("Failed to add note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNoteContent("");
      toast({ title: "Note saved successfully" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedBy: currentUserId }),
      });
      if (!response.ok) throw new Error("Failed to complete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task completed!" });
      onClose();
    },
  });

  const handleAddTime = () => {
    const hours = parseInt(timeHours);
    if (hours > 0) {
      addTimeMutation.mutate({ hours });
    }
  };

  const handleSaveNote = () => {
    if (noteContent.trim()) {
      addNoteMutation.mutate(noteContent.trim());
    }
  };

  const handleCompleteTask = () => {
    completeTaskMutation.mutate();
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      indoor: "bg-purple-100 text-purple-800",
      outdoor: "bg-green-100 text-green-800",
      chores: "bg-blue-100 text-blue-800",
      projects: "bg-orange-100 text-orange-800",
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

  const totalHours = task?.timeEntries?.reduce((sum: number, entry: any) => sum + entry.hours, 0) || 0;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-48 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ) : task ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
            </DialogHeader>

            {/* Task Image */}
            {task.image && (
              <div className="mb-6">
                <img
                  src={task.image}
                  alt={task.title}
                  className="w-full h-48 object-cover rounded-xl"
                  onError={(e) => {
                    // Hide image if it fails to load
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      container.style.display = 'none';
                    }
                  }}
                />
              </div>
            )}

            {/* Task Info */}
            <div className="space-y-4">
              <p className="text-gray-600">{task.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Assigned to:{" "}
                  <span className="font-medium">
                    {task.assignee?.name || "Unassigned"}
                  </span>
                </span>
                {task.dueDate && (
                  <span>
                    Due:{" "}
                    <span className="font-medium">
                      {new Date(task.dueDate + 'T00:00:00-06:00').toLocaleDateString('en-US', { 
                        timeZone: 'America/Chicago',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} (CST)
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {task.tags?.map((tag: string) => (
                  <Badge key={tag} className={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
                {task.priority !== "normal" && (
                  <Badge variant="destructive">
                    {task.priority.toUpperCase()} PRIORITY
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Time Tracking */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Time Tracking
                </h3>
                <div className="flex items-center space-x-3 mb-3">
                  <Input
                    type="number"
                    placeholder="Hours spent"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    className="flex-1"
                    min="0"
                    step="0.5"
                  />
                  <Button
                    onClick={handleAddTime}
                    disabled={!timeHours || addTimeMutation.isPending}
                  >
                    Add Time
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Total time spent:{" "}
                  <span className="font-medium">{totalHours} hours</span>
                </p>
              </div>

              <Separator />

              {/* Notes Section */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Add Note</h3>
                <Textarea
                  placeholder="Add notes about your progress..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="mb-2"
                />
                <Button
                  variant="outline"
                  onClick={handleSaveNote}
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                >
                  Save Note
                </Button>
              </div>

              {/* Previous Notes */}
              {task.notes && task.notes.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Previous Notes</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {task.notes.map((note: any) => (
                      <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">{note.content}</p>
                        <span className="text-xs text-gray-400">
                          {note.user.name} •{" "}
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                {!task.isCompleted && (
                  <Button
                    onClick={handleCompleteTask}
                    disabled={completeTaskMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">Task not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
