
export enum ProjectStatus {
  InProgress = 'In Progress',
  Completed = 'Completed',
  OnHold = 'On Hold',
  NotStarted = 'Not Started',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export enum ExpenseCategory {
    Labor = 'Labor',
    Materials = 'Materials',
    Equipment = 'Equipment',
    Transportation = 'Transportation',
    Logistics = 'Logistics',
    Miscellaneous = 'Miscellaneous',
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface Expense {
  id:string;
  taskId: string;
  projectId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  addedBy: User;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignedTo: User;
  priority: Priority;
  deadline?: string;
  status: TaskStatus;
  estimatedCost?: number;
  completionDetails?: {
    description: string;
    category: ExpenseCategory;
    actualCost: number;
    completedAt: string;
    attachments?: File[];
  }
}

export interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: Priority;
  teamLeader: User;
  team: User[];
  tags?: string[];
  status: ProjectStatus;
  completionPercentage: number; // This will be calculated from tasks
  budget: number;
  spent: number; // This will be calculated from tasks
  tasks: Task[];
  expenses: Expense[];
}

export interface Activity {
  id: string;
  type: 'project' | 'task' | 'report' | 'finance';
  description: string;
  timestamp: string;
  user: User;
}
