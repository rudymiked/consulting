/// <reference types="jest" />
import request from 'supertest';
import app from '../src/index';
import { expect, jest, describe, it } from '@jest/globals';

// Mock the paymentHelper module so tests don't call Azure
jest.mock('../src/paymentHelper', () => ({
  createInvoice: jest.fn(async (invoiceData: any) => ({
    success: true,
    message: 'Invoice created successfully',
    invoiceId: invoiceData.id,
  })),
  getInvoiceDetails: jest.fn(),
  updateInvoice: jest.fn(),
}));

describe('POST /api/invoice (createInvoice)', () => {
  it('returns 201 and invoice info when payload is valid', async () => {
    const payload = {
      name: 'Michael Rudy',
      amount: 100,
      notes: 'Test!',
      contact: 'rudymiked@gmail.com',
    };

    const res = await request(app).post('/api/invoice').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('invoiceId');
    // invoiceId should start with inv-
    expect(res.body.invoiceId).toMatch(/^inv-/);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/invoice').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
