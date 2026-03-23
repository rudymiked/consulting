"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.TableNames = exports.IInvoiceStatus = void 0;
var IInvoiceStatus;
(function (IInvoiceStatus) {
    IInvoiceStatus["NEW"] = "NEW";
    IInvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    IInvoiceStatus["PAID"] = "PAID";
    IInvoiceStatus["CANCELLED"] = "CANCELLED";
})(IInvoiceStatus || (exports.IInvoiceStatus = IInvoiceStatus = {}));
var TableNames;
(function (TableNames) {
    TableNames["Invoices"] = "Invoices";
    TableNames["Warmer"] = "Warmer";
    TableNames["ContactLogs"] = "ContactLogs";
    TableNames["Users"] = "Users";
    TableNames["Clients"] = "Clients";
    TableNames["Domains"] = "Domains";
    TableNames["DomainHealth"] = "DomainHealth";
})(TableNames || (exports.TableNames = TableNames = {}));
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DOWN"] = "down";
    HealthStatus["UNKNOWN"] = "unknown";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
