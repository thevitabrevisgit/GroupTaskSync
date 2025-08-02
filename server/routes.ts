import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTaskSchema, insertTimeEntrySchema, insertTaskNoteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { OneDriveStorageManager, OneDriveConfig } from "./onedrive-storage";

// Ensure uploads directory exists (fallback for development)
const uploadsDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize OneDrive storage manager
let oneDriveManager: OneDriveStorageManager | null = null;

// Check for OneDrive configuration
if (process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
  const oneDriveConfig: OneDriveConfig = {
    clientId: process.env.ONEDRIVE_CLIENT_ID,
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
    tenantId: process.env.ONEDRIVE_TENANT_ID || 'common',
    accounts: [
      { name: 'Primary Account', refreshToken: process.env.ONEDRIVE_REFRESH_TOKEN_1 || '', userId: 'user1' },
    ].filter(account => account.refreshToken) // Only include accounts with tokens
  };
  
  if (oneDriveConfig.accounts.length > 0) {
    oneDriveManager = new OneDriveStorageManager(oneDriveConfig);
    console.log(`📸 OneDrive storage initialized with ${oneDriveConfig.accounts.length} accounts`);
  }
}

// Multer configuration for file uploads (memory storage for OneDrive upload)
const upload = multer({
  storage: oneDriveManager ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for OneDrive
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
      const { filter, tagFilter, userId } = req.query;
      let tasks;

      // Apply primary filter first
      if (filter === "assigned" && userId) {
        tasks = await storage.getTasksByUser(parseInt(userId as string));
      } else if (filter === "unassigned") {
        tasks = await storage.getUnassignedTasks();
      } else if (filter === "priority") {
        tasks = await storage.getPriorityTasks();
      } else {
        tasks = await storage.getAllTasks();
      }

      // Apply secondary tag filter if specified
      if (tagFilter && tagFilter !== "all" && ["indoor", "outdoor", "chores", "projects"].includes(tagFilter as string)) {
        tasks = tasks.filter(task => task.tags && task.tags.includes(tagFilter as string));
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
        oneDriveEnabled: !!oneDriveManager
      });

      const taskData = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo) : null,
        createdBy: parseInt(req.body.createdBy),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate + 'T00:00:00-06:00') : null,
      };

      if ((req as any).file) {
        if (oneDriveManager) {
          // Upload to OneDrive
          try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = uniqueSuffix + path.extname((req as any).file.originalname);
            
            const result = await oneDriveManager.uploadImage(
              (req as any).file.buffer,
              filename,
              (req as any).file.mimetype
            );
            
            taskData.image = result.url;
            console.log(`📸 Image uploaded to OneDrive (${result.accountUsed}):`, result.url);
          } catch (oneDriveError) {
            console.error("📸 OneDrive upload failed, falling back to local storage:", oneDriveError);
            // Fallback to local storage
            const imagePath = `/uploads/${(req as any).file.filename}`;
            taskData.image = imagePath;
          }
        } else {
          // Local storage fallback for memory storage
          const fs = require('fs');
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = uniqueSuffix + path.extname((req as any).file.originalname);
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, (req as any).file.buffer);
          
          // Local storage fallback
          const imagePath = `/uploads/${filename}`;
          taskData.image = imagePath;
          console.log("📸 Using local storage (OneDrive not configured):", imagePath);
        }
      }

      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      
      res.json(task);
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

  // OneDrive storage info route  
  app.get("/api/onedrive/status", async (req, res) => {
    try {
      if (!oneDriveManager) {
        return res.json({
          enabled: false,
          message: "OneDrive storage not configured",
          setup: "Add ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, and ONEDRIVE_REFRESH_TOKEN_1 environment variables"
        });
      }
      
      const storageInfo = await oneDriveManager.getStorageInfo();
      res.json({
        enabled: true,
        accounts: storageInfo,
        totalAccounts: storageInfo.length
      });
    } catch (error) {
      res.status(500).json({ 
        enabled: false,
        error: error instanceof Error ? error.message : "Failed to get OneDrive status" 
      });
    }
  });

  // OneDrive image proxy route
  app.get("/api/onedrive/image/:accountIndex/:itemId", async (req, res) => {
    try {
      if (!oneDriveManager) {
        return res.status(404).send("OneDrive not configured");
      }

      const accountIndex = parseInt(req.params.accountIndex);
      const itemId = req.params.itemId;
      
      const imageBuffer = await oneDriveManager.downloadImage(accountIndex, itemId);
      
      res.set({
        'Content-Type': 'image/jpeg', // Default to JPEG, could be enhanced to detect type
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });
      
      res.send(imageBuffer);
    } catch (error) {
      console.error("Failed to serve OneDrive image:", error);
      res.status(404).send("Image not found");
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
