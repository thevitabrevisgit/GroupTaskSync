import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTaskSchema, insertTimeEntrySchema, insertTaskNoteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default users if they don't exist
  await initializeUsers();

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users/:id/avatar", upload.single('avatar'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarUrl = `/uploads/${req.file.filename}`;
      const updatedUser = await storage.updateUser(id, { avatar: avatarUrl });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { filter, userId } = req.query;
      let tasks;

      if (filter && filter !== "all") {
        tasks = await storage.getTasksByFilter(
          filter as string,
          userId ? parseInt(userId as string) : undefined
        );
      } else {
        tasks = await storage.getAllTasks();
      }

      // Sort tasks by priority algorithm
      const sortedTasks = sortTasksByPriority(tasks, userId ? parseInt(userId as string) : undefined);
      res.json(sortedTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", upload.single('image'), async (req, res) => {
    try {
      console.log("📸 Image upload debug:", {
        hasFile: !!(req as any).file,
        filename: (req as any).file?.filename,
        originalname: (req as any).file?.originalname,
        size: (req as any).file?.size,
        environment: process.env.NODE_ENV
      });

      const taskData = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo) : null,
        createdBy: parseInt(req.body.createdBy),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate + 'T00:00:00-06:00') : null,
      };

      if ((req as any).file) {
        const imagePath = `/uploads/${(req as any).file.filename}`;
        taskData.image = imagePath;
        console.log("📸 WARNING: File uploaded to development environment. Files may not persist across restarts.");
        console.log("📸 Image path saved to database:", imagePath);
      }

      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      
      res.json({
        ...task,
        _imageWarning: (req as any).file ? "Image uploaded to development environment - may not persist" : undefined
      });
    } catch (error) {
      console.error("📸 Upload error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate + 'T00:00:00-06:00') : null,
      };
      
      const task = await storage.updateTask(taskId, updateData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completedBy } = req.body;
      
      if (!completedBy) {
        return res.status(400).json({ message: "completedBy is required" });
      }

      const task = await storage.completeTask(id, parseInt(completedBy));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Time entry routes
  app.post("/api/tasks/:taskId/time", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const timeEntryData = {
        ...req.body,
        taskId,
        userId: parseInt(req.body.userId),
        hours: parseInt(req.body.hours),
      };

      const validatedData = insertTimeEntrySchema.parse(timeEntryData);
      const timeEntry = await storage.createTimeEntry(validatedData);
      res.json(timeEntry);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create time entry" });
      }
    }
  });

  // Task notes routes
  app.post("/api/tasks/:taskId/notes", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const noteData = {
        ...req.body,
        taskId,
        userId: parseInt(req.body.userId),
      };

      const validatedData = insertTaskNoteSchema.parse(noteData);
      const note = await storage.createTaskNote(validatedData);
      res.json(note);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create note" });
      }
    }
  });

  // Admin verification
  app.post("/api/admin/verify", async (req, res) => {
    try {
      const { pin } = req.body;
      if (pin === "0525") {
        res.json({ valid: true });
      } else {
        res.status(401).json({ valid: false, message: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to sort tasks by priority algorithm
function sortTasksByPriority(tasks: any[], currentUserId?: number) {
  return tasks
    .filter(task => !task.isCompleted) // Don't show completed tasks by default
    .sort((a, b) => {
      // 1. Tasks assigned to current user get highest priority
      if (currentUserId) {
        const aAssigned = a.assignedTo === currentUserId;
        const bAssigned = b.assignedTo === currentUserId;
        if (aAssigned && !bAssigned) return -1;
        if (!aAssigned && bAssigned) return 1;
      }

      // 2. High priority tasks
      const priorityOrder = { urgent: 3, high: 2, normal: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      if (aPriority !== bPriority) return bPriority - aPriority;

      // 3. Overdue tasks (mix them in)
      const now = new Date();
      const aOverdue = a.dueDate && new Date(a.dueDate) < now;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 4. Sort by creation date (recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

// Initialize default users
async function initializeUsers() {
  const defaultUsers = [
    { username: "sam", name: "Sam", isAdmin: false },
    { username: "sean", name: "Sean", isAdmin: false },
    { username: "gabe", name: "Gabe", isAdmin: false },
    { username: "evelyn", name: "Evelyn", isAdmin: false },
    { username: "beth", name: "Beth", isAdmin: true },
    { username: "tim", name: "Tim", isAdmin: true },
  ];

  for (const userData of defaultUsers) {
    const existingUser = await storage.getUserByUsername(userData.username);
    if (!existingUser) {
      await storage.createUser(userData);
    }
  }
}
