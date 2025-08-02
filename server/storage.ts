import { users, tasks, timeEntries, taskNotes, type User, type InsertUser, type Task, type InsertTask, type TimeEntry, type InsertTimeEntry, type TaskNote, type InsertTaskNote, type TaskWithRelations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, isNull, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Tasks
  getTask(id: number): Promise<TaskWithRelations | undefined>;
  getAllTasks(): Promise<TaskWithRelations[]>;
  getTasksByUser(userId: number): Promise<TaskWithRelations[]>;
  getUnassignedTasks(): Promise<TaskWithRelations[]>;
  getPriorityTasks(): Promise<TaskWithRelations[]>;
  getTasksByTag(tag: string): Promise<TaskWithRelations[]>;
  getTasksByFilter(filter: string, userId?: number): Promise<TaskWithRelations[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  completeTask(id: number, completedBy: number): Promise<Task | undefined>;

  // Time entries
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntriesForTask(taskId: number): Promise<TimeEntry[]>;

  // Task notes
  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getNotesForTask(taskId: number): Promise<(TaskNote & { user: User })[]>;
  
  // Completed tasks
  getCompletedTasks(startDate: Date, userId?: number): Promise<TaskWithRelations[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  // Tasks
  async getTask(id: number): Promise<TaskWithRelations | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.id, id));

    if (result.length === 0) return undefined;

    const task = result[0].tasks;
    const assignee = result[0].users;

    const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
    const completedByUser = task.completedBy 
      ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
      : undefined;

    const taskTimeEntries = await this.getTimeEntriesForTask(id);
    const taskNotes = await this.getNotesForTask(id);

    return {
      ...task,
      assignee: assignee || undefined,
      creator,
      completedByUser,
      timeEntries: taskTimeEntries,
      notes: taskNotes,
    };
  }

  async getAllTasks(): Promise<TaskWithRelations[]> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .orderBy(desc(tasks.createdAt));

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async getTasksByUser(userId: number): Promise<TaskWithRelations[]> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async getUnassignedTasks(): Promise<TaskWithRelations[]> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(isNull(tasks.assignedTo))
      .orderBy(desc(tasks.createdAt));

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async getPriorityTasks(): Promise<TaskWithRelations[]> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(or(eq(tasks.priority, 'high'), eq(tasks.priority, 'urgent')))
      .orderBy(desc(tasks.createdAt));

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async getTasksByTag(tag: string): Promise<TaskWithRelations[]> {
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(sql`${tag} = ANY(${tasks.tags})`)
      .orderBy(desc(tasks.createdAt));

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async getTasksByFilter(filter: string, userId?: number): Promise<TaskWithRelations[]> {
    let baseQuery = db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id));

    let result;
    if (filter === "assigned" && userId) {
      result = await baseQuery.where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
    } else if (filter !== "all") {
      result = await baseQuery.where(sql`${filter} = ANY(${tasks.tags})`).orderBy(desc(tasks.createdAt));
    } else {
      result = await baseQuery.orderBy(desc(tasks.createdAt));
    }

    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        completedBy,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  // Time entries
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db
      .insert(timeEntries)
      .values(timeEntry)
      .returning();
    return entry;
  }

  async getTimeEntriesForTask(taskId: number): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId))
      .orderBy(desc(timeEntries.createdAt));
  }

  // Task notes
  async createTaskNote(note: InsertTaskNote): Promise<TaskNote> {
    const [taskNote] = await db
      .insert(taskNotes)
      .values(note)
      .returning();
    return taskNote;
  }

  async getNotesForTask(taskId: number): Promise<(TaskNote & { user: User })[]> {
    const result = await db
      .select()
      .from(taskNotes)
      .innerJoin(users, eq(taskNotes.userId, users.id))
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(desc(taskNotes.createdAt));

    return result.map(row => ({
      ...row.task_notes,
      user: row.users,
    }));
  }

  async getCompletedTasks(startDate: Date, userId?: number): Promise<TaskWithRelations[]> {
    let baseWhere = and(
      eq(tasks.isCompleted, true),
      gte(tasks.completedAt, startDate)
    );

    if (userId) {
      baseWhere = and(baseWhere, eq(tasks.completedBy, userId));
    }

    const result = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(baseWhere)
      .orderBy(desc(tasks.completedAt));
    
    const tasksWithAssignees = await Promise.all(
      result.map(async (row) => {
        const task = row.tasks;
        const assignee = row.users;

        const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
        const completedByUser = task.completedBy 
          ? (await db.select().from(users).where(eq(users.id, task.completedBy)))[0]
          : undefined;

        const taskTimeEntries = await this.getTimeEntriesForTask(task.id);
        const taskNotes = await this.getNotesForTask(task.id);

        return {
          ...task,
          assignee: assignee || undefined,
          creator,
          completedByUser,
          timeEntries: taskTimeEntries,
          notes: taskNotes,
        };
      })
    );

    return tasksWithAssignees;
  }
}

export const storage = new DatabaseStorage();
