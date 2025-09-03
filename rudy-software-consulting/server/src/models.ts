export interface InvoiceData {
    id: string;
    name: string;
    amount: number; // in cents
    notes: string;
    contact: string;
    status: 'new' | 'paid' | 'cancelled'; // Status of the invoice
}
export interface Invoice {
    id: string; // Unique identifier for the invoice
    name: string; // Name of the client or entity being invoiced
    amount: number; // Amount in cents (e.g., $50.00 is stored
    notes: string; // Additional notes or description for the invoice
    contact: string; // Contact information for the client
    createdDate: Date; // Timestamp of when the invoice was created
    updatedDate: Date; // Timestamp of when the invoice was last updated
    status: 'new' | 'paid' | 'cancelled'; // Status of the invoice
    dueDate?: Date; // Optional due date for the invoice
}