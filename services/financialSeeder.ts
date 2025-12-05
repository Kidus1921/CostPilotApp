import { supabase } from '../supabaseClient';
import { FinancialProject, FinancialProjectStatus, FinancialTask, FinancialTaskStatus } from '../types';

export const seedFinancialData = async () => {
    console.log("Checking if financial data seeding is needed...");
    
    const { count, error } = await supabase
        .from('financial_projects')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error checking financial data:", error);
        return;
    }

    if (count === 0) {
        console.log("Financial database is empty. Seeding data...");

        const project1Tasks: FinancialTask[] = [
            { id: 'ft1-1', name: 'Venue Booking', estimatedCost: 5000, actualCost: 5500, status: FinancialTaskStatus.Completed },
            { id: 'ft1-2', name: 'Catering Service', estimatedCost: 3000, actualCost: 2800, status: FinancialTaskStatus.Completed },
            { id: 'ft1-3', name: 'Speaker Fees', estimatedCost: 2000, actualCost: 0, status: FinancialTaskStatus.InProgress },
        ];

        const project2Tasks: FinancialTask[] = [
            { id: 'ft2-1', name: 'Ad Spend - Social Media', estimatedCost: 10000, actualCost: 8500, status: FinancialTaskStatus.Completed },
            { id: 'ft2-2', name: 'Content Creation', estimatedCost: 5000, actualCost: 0, status: FinancialTaskStatus.NotStarted },
        ];
        
        const mockProjects: Omit<FinancialProject, 'id'>[] = [
            {
                name: 'Annual Tech Conference 2024',
                estimatedBudget: 10000,
                approvedBudget: 10000,
                status: FinancialProjectStatus.Approved,
                tasks: project1Tasks,
            },
            {
                name: 'Q4 Marketing Campaign',
                estimatedBudget: 15000,
                approvedBudget: 0,
                status: FinancialProjectStatus.Pending,
                tasks: project2Tasks,
            },
            {
                name: 'Office Renovation',
                estimatedBudget: 50000,
                approvedBudget: 45000,
                status: FinancialProjectStatus.Rejected,
                rejectionReason: 'Budget exceeds quarterly allocation. Please resubmit with a phased approach.',
                tasks: [],
            },
            {
                name: 'Website Redesign',
                estimatedBudget: 25000,
                approvedBudget: 25000,
                status: FinancialProjectStatus.Completed,
                tasks: [
                    { id: 'ft3-1', name: 'UI/UX Design', estimatedCost: 8000, actualCost: 7500, status: FinancialTaskStatus.Completed },
                    { id: 'ft3-2', name: 'Frontend Development', estimatedCost: 12000, actualCost: 13000, status: FinancialTaskStatus.Completed },
                    { id: 'ft3-3', name: 'Backend Integration', estimatedCost: 5000, actualCost: 5000, status: FinancialTaskStatus.Completed },
                ],
            }
        ];

        const { error: insertError } = await supabase.from('financial_projects').insert(mockProjects);
        
        if (insertError) {
             console.error("Error seeding financial data:", insertError);
        } else {
             console.log("Financial data seeding complete.");
        }
    } else {
        console.log("Financial database already contains data. Skipping seed.");
    }
};