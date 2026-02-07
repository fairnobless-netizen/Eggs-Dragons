
import { jsPDF } from 'jspdf';
import { PurchaseRecord } from '../net/types';

export const ReceiptGenerator = {
  /**
   * Generates a PDF receipt for the given purchase.
   * Returns a Blob URL for client-side preview/download simulation.
   * In a real backend, this would return a Buffer or Stream to be sent via Telegram API.
   */
  generate(purchase: PurchaseRecord): string {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Dragon Egg Catcher", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Official Store Receipt", margin, y);
    y += 20;

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Thank you for your purchase.", margin, y);
    y += 15;

    // --- DETAILS TABLE ---
    const drawRow = (label: string, value: string) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(label, margin, y);
        
        doc.setTextColor(0);
        doc.text(value, margin + 50, y);
        y += 10;
    };

    drawRow("Order Number:", purchase.orderNumber);
    drawRow("Date:", new Date(purchase.createdAt).toLocaleString());
    drawRow("Paid with:", "Telegram Stars (XTR)");
    y += 5; // Extra spacing

    // --- ITEM ---
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Item", margin, y);
    doc.text("Price", 150, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.text(purchase.productTitle, margin, y);
    doc.text(`${purchase.price} ⭐`, 150, y);
    y += 15;

    doc.line(margin, y, 190, y);
    y += 10;

    // --- TOTAL ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total Paid:", margin, y);
    doc.text(`${purchase.price} XTR`, 150, y);
    y += 30;

    // --- FOOTER ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(128);
    doc.text("Support: @DragonEggGameBot", margin, 280); // Bottom of page
    
    // Return Blob URL for browser demo
    return doc.output('bloburl').toString();
  }
};
