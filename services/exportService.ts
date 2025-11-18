// @ts-nocheck
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const exportTableToExcel = (tableId: string, filename: string = 'report.xlsx') => {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with id ${tableId} not found.`);
        return;
    }
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, filename);
};


export const exportElementAsPDF = async (elementId: string, filename: string = 'report.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found.`);
        return;
    }

    const canvas = await html2canvas(element, { 
        useCORS: true,
        scale: 2, // Higher scale for better quality
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
};
