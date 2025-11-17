export interface IInvoiceRequest {
    id: string;
    name: string;
    amount: number; // in cents
    notes: string;
    contact: string;
    paymentIntentId?: string; // Optional Stripe Payment Intent ID
    status: IInvoiceStatus; // Status of the invoice
    dueDate?: Date; // Optional due date for the invoice
}

export enum IInvoiceStatus {
    NEW = 'new',
    PAID = 'paid',
    PARTIAL_PAYMENT = 'partial_payment',
    CANCELLED = 'cancelled',
}

export interface IInvoiceResult {
    Success: boolean;
    Message: string;
    InvoiceId: string;
    ClientSecret?: string;
}

export interface IInvoice {
    id: string; // Unique identifier for the invoice
    name: string; // Name of the client or entity being invoiced
    amount: number; // Amount in cents (e.g., $50.00 is stored
    notes: string; // Additional notes or description for the invoice
    contact: string; // Contact information for the client
    createdDate: Date; // Timestamp of when the invoice was created
    updatedDate: Date; // Timestamp of when the invoice was last updated
    status: IInvoiceStatus; // Status of the invoice
    paymentIntentId?: string; // Optional Stripe Payment Intent ID
    dueDate?: Date; // Optional due date for the invoice
}