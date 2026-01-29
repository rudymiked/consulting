import { TableEntity } from "@azure/data-tables";

export interface IInvoiceRequest {
    id: string;
    name: string;
    amount: number; // in cents
    notes: string;
    contact: string;
    clientId?: string; // Client/Company ID for partitioning
    paymentIntentId?: string; // Optional Stripe Payment Intent ID
    status: IInvoiceStatus; // Status of the invoice
    dueDate?: Date; // Optional due date for the invoice
}

export enum IInvoiceStatus {
    NEW = 'NEW',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export interface IInvoiceResult {
    Success: boolean;
    Message: string;
    InvoiceId: string;
    ClientSecret?: string;
}

export interface IInvoice extends TableEntity {
    id: string; // Unique identifier for the invoice
    name: string; // Name of the client or entity being invoiced
    amount: number; // Amount in cents (e.g., $50.00 is stored
    notes: string; // Additional notes or description for the invoice
    contact: string; // Contact information for the client
    clientId?: string; // Client/Company ID for partitioning
    createdDate: Date; // Timestamp of when the invoice was created
    updatedDate: Date; // Timestamp of when the invoice was last updated
    status: IInvoiceStatus; // Status of the invoice
    paymentIntentId?: string; // Optional Stripe Payment Intent ID
    dueDate?: Date; // Optional due date for the invoice
}

export interface IWarmerEntity extends TableEntity { 
    lastPing: Date;
}

export interface IEmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    sent: boolean;
}

export interface IContactLog extends IEmailOptions, TableEntity { }

export enum TableNames {
    Invoices = 'Invoices',
    Warmer = 'Warmer',
    ContactLogs = 'ContactLogs',
    Users = 'Users',
    Clients = 'Clients',
}

export interface IUser extends TableEntity {
    email: string;
    salt: string;
    hash: string;
    createdAt: string;
    approved: boolean;
    siteAdmin?: boolean;
    clientId: string;
}

export interface IClient extends TableEntity {
    id: string;
    name: string;
    contactEmail: string;
    address: string;
    phone: string;
}
