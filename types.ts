
export enum ProjectStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  OnHold = 'On Hold',
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

export interface UserNotificationPreferences {
    inApp: {
        taskUpdates: boolean;
        approvals: boolean;
        costOverruns: boolean;
        deadlines: boolean;
        system: boolean;
    };
    email: {
        taskUpdates: boolean;
        approvals: boolean;
        costOverruns: boolean;
        deadlines: boolean;
        system: boolean;
    };
    priorityThreshold: NotificationPriority;
    projectSubscriptions: string[]; // Array of project IDs
    pushEnabled?: boolean;
}


export interface User {
    id?: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    password?: string;
    teamId?: string;
    notificationPreferences?: UserNotificationPreferences;
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

export interface Document {
    id: string; // Firebase Storage full path
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
    uploadedBy: {
        id: string;
        name: string;
    };
}

export interface Project {
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  teamLeader: User;
  team: User[];
  tags?: string[];
  status: ProjectStatus;
  completionPercentage: number; // This will be calculated from tasks
  budget: number;
  spent: number; // This will be calculated from tasks
  tasks: Task[];
  expenses: Expense[];
  rejectionReason?: string;
  documents?: Document[];
}

export interface Activity {
  id?: string;
  action: string;
  details: string;
  user: {
    id: string;
    name: string;
  };
  timestamp: any; // Firestore ServerTimestamp
}


// User Management Types
export enum UserRole {
    Admin = 'Admin',
    ProjectManager = 'Project Manager',
    Finance = 'Finance',
}

export enum UserStatus {
    Active = 'Active',
    Inactive = 'Inactive',
}

export interface Team {
    id?: string;
    name: string;
    description: string;
    memberIds: string[];
}

// Financial Module Types
export enum FinancialProjectStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Completed = 'Completed',
}

export enum FinancialTaskStatus {
    NotStarted = 'Not Started',
    InProgress = 'In Progress',
    Completed = 'Completed',
}

export interface FinancialTask {
    id: string;
    name: string;
    estimatedCost: number;
    actualCost: number;
    status: FinancialTaskStatus;
    variance?: number; // Calculated
}

export interface FinancialProject {
    id?: string;
    name: string;
    estimatedBudget: number;
    approvedBudget: number;
    status: FinancialProjectStatus;
    tasks: FinancialTask[];
    rejectionReason?: string;
    // Calculated fields
    actualCost?: number;
    remainingBalance?: number;
}

// Notification Module Types
export enum NotificationPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical',
}

export enum NotificationType {
    Deadline = 'Deadline',
    TaskUpdate = 'Task Update',
    ApprovalRequest = 'Approval Request',
    ApprovalResult = 'Approval Result',
    CostOverrun = 'Cost Overrun',
    System = 'System',
}

export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    isRead: boolean;
    timestamp: any; // Firestore ServerTimestamp
    link?: string; // e.g., `/projects/projectId`
}

// Brevo Push
export interface PushSubscriber {
    userId: string;
    subscriberId: string; // Brevo ID or Token
    browser: string;
    createdAt: any;
    isEnabled: boolean;
}
