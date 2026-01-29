"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableNames = exports.IInvoiceStatus = void 0;
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
})(TableNames || (exports.TableNames = TableNames = {}));
