import { Badge } from "@/components/ui/badge";
import { getUserColor } from "@/lib/utils";

interface TaskCardProps {
  task: any;
  currentUserId?: number;
  onClick: () => void;
}

export default function TaskCard({ task, currentUserId, onClick }: TaskCardProps) {
  const getDaysOverdue = () => {
    if (!task.dueDate) return 0;
    
    // Get current date in Central time zone
    const now = new Date();
    const centralTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const todayCST = new Date(centralTime.getFullYear(), centralTime.getMonth(), centralTime.getDate());
    
    // Parse the due date from database (already in CST)
    const dueDate = new Date(task.dueDate);
    const dueDateCST = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const diffTime = todayCST.getTime() - dueDateCST.getTime();
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
      // Get current date in Central time zone
      const now = new Date();
      const centralTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
      const todayCST = new Date(centralTime.getFullYear(), centralTime.getMonth(), centralTime.getDate());
      
      // Parse the due date from database
      const dueDate = new Date(task.dueDate);
      const dueDateCST = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      const diffTime = dueDateCST.getTime() - todayCST.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft === 0) {
        return "Due Today";
      } else if (daysLeft === 1) {
        return "Due Tomorrow";
      } else {
        return `Due in ${daysLeft} days`;
      }
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
            console.log(`📸 Image failed to load: ${task.image} for task: ${task.title}`);
            // If the uploaded image fails to load, fallback to placeholder
            const target = e.target as HTMLImageElement;
            const fallbackUrl = "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300";
            if (target.src !== fallbackUrl) {
              console.log(`📸 Falling back to placeholder for task: ${task.title}`);
              target.src = fallbackUrl;
            }
          }}
          onLoad={() => {
            if (task.image && (task.image.startsWith('/uploads/') || task.image.includes('onedrive') || task.image.includes('sharepoint'))) {
              console.log(`📸 Image loaded successfully: ${task.image} for task: ${task.title}`);
            }
          }}
        />
        
        {/* Assigned To You Badge - Below Priority */}
        {task.assignedTo === currentUserId && (
          <div className="absolute top-10 left-2 z-10">
            <Badge className="bg-primary text-primary-foreground text-xs">
              ASSIGNED TO YOU
            </Badge>
          </div>
        )}

        {/* Priority Badge - Upper Left */}
        {task.priority && task.priority !== 'normal' && (
          <div className="absolute top-2 left-2 z-10">
            <Badge 
              variant={task.priority === 'urgent' ? "destructive" : "default"}
              className="text-xs font-semibold"
            >
              {task.priority === 'urgent' ? 'URGENT' : 'HIGH'}
            </Badge>
          </div>
        )}
        
        {/* Due Date Badge - Upper Right */}
        {overdueText && (
          <div className="absolute top-2 right-2 z-10">
            <Badge 
              variant={daysOverdue > 0 ? "destructive" : "secondary"}
              className="text-xs font-semibold"
            >
              {overdueText}
            </Badge>
          </div>
        )}
        
        {/* Avatar Badge */}
        {task.assignee && (
          <div className="absolute bottom-2 left-2">
            <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${getUserColor(task.assignee.username).bg} ${getUserColor(task.assignee.username).text}`}>
              {task.assignee.name.charAt(0)}
            </div>
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
