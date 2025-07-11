import { Badge } from "@/components/ui/badge";

interface TaskCardProps {
  task: any;
  currentUserId?: number;
  onClick: () => void;
}

export default function TaskCard({ task, currentUserId, onClick }: TaskCardProps) {
  const getDaysOverdue = () => {
    if (!task.dueDate) return 0;
    
    // Get current time in CST
    const now = new Date();
    const cstOffset = -6; // CST is UTC-6
    const nowCST = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
    
    // Parse due date as CST
    const dueDate = new Date(task.dueDate + 'T00:00:00-06:00'); // Force CST interpretation
    
    const diffTime = nowCST.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTaskBorderClass = () => {
    const daysOverdue = getDaysOverdue();
    const isAssigned = task.assignedTo === currentUserId;
    
    if (isAssigned) return "task-card-assigned border-4";
    if (daysOverdue > 7) return "task-card-overdue border-4";
    if (daysOverdue > 3) return "task-card-warning border-4";
    if (daysOverdue > 0) return "task-card-warning border-4";
    return "task-card-normal border-4";
  };

  const getOverdueText = () => {
    const daysOverdue = getDaysOverdue();
    if (daysOverdue > 0) {
      return `${daysOverdue} days overdue`;
    }
    if (task.dueDate) {
      // Get current time in CST
      const now = new Date();
      const cstOffset = -6; // CST is UTC-6
      const nowCST = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
      
      // Parse due date as CST
      const dueDate = new Date(task.dueDate + 'T00:00:00-06:00'); // Force CST interpretation
      
      const diffTime = dueDate.getTime() - nowCST.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Due in ${daysLeft} days`;
    }
    return null;
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

  const overdueText = getOverdueText();
  const daysOverdue = getDaysOverdue();

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${getTaskBorderClass()}`}
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={task.image || "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
          alt={task.title}
          className="w-full h-40 object-cover"
          onError={(e) => {
            // If the uploaded image fails to load, fallback to placeholder
            const target = e.target as HTMLImageElement;
            if (target.src !== "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300") {
              target.src = "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300";
            }
          }}
        />
        
        {/* Priority/Status Badge */}
        <div className="absolute top-2 right-2">
          {task.assignedTo === currentUserId ? (
            <Badge className="bg-primary text-primary-foreground text-xs">
              ASSIGNED TO YOU
            </Badge>
          ) : task.priority === "high" || task.priority === "urgent" ? (
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              HIGH PRIORITY
            </Badge>
          ) : overdueText && daysOverdue > 0 ? (
            <Badge className={`text-xs ${daysOverdue > 7 ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>
              {overdueText}
            </Badge>
          ) : overdueText ? (
            <Badge className="bg-secondary text-secondary-foreground text-xs">
              {overdueText}
            </Badge>
          ) : null}
        </div>
        
        {/* Avatar Badge */}
        {task.assignee && (
          <div className="absolute bottom-2 left-2">
            <img
              src={task.assignee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee.name}`}
              alt={`${task.assignee.name}'s avatar`}
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{task.title}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex flex-wrap gap-1">
            {task.tags?.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className={`px-2 py-1 rounded-full text-xs ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
            {task.tags?.length > 2 && (
              <span className="text-gray-400">+{task.tags.length - 2}</span>
            )}
          </div>
          {task.dueDate && (
            <span>
              Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
