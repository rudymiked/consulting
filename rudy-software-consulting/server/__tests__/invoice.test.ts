// import request from 'supertest';
// import express from 'express';
// import { saveInvoice, getInvoiceDetails } from '../src/paymentHelper';
// // Jest provides describe and it globally

// const app = express();
// app.use(express.json());

// app.post('/api/invoice', async (req, res) => {
//   const { name, amount, notes, contact } = req.body;
//   const id = `inv-${Date.now()}`;
//   if (!id || !name || !amount || !contact) {
//     return res.status(400).json({ error: 'Missing required fields.' });
//   }
//   try {
//     const result = await saveInvoice({ id, name, amount, notes, contact, status: 'new' });
//     res.status(201).json(result);
//   } catch (error: any) {
//     res.status(500).json({ error: 'Failed to save invoice.' });
//   }
// });

// app.get('/api/invoice/:invoiceId', async (req, res) => {
//   const { invoiceId } = req.params;
//   const invoiceDetails = await getInvoiceDetails(invoiceId);
//   if (!invoiceDetails) {
//     return res.status(404).json({ error: 'Invoice not found' });
//   }
//   res.json(invoiceDetails);
// });

// describe('Invoice API', () => {
//   it('should create a new invoice', async () => {
//     const response = await request(app)
//       .post('/api/invoice')
//       .send({
//         name: 'Test User',
//         amount: 100,
//         notes: 'Test notes',
//         contact: 'test@email.com'
//       });
//     expect(response.status).toBe(201);
//     expect(response.body).toHaveProperty('id');
//     expect(response.body.name).toBe('Test User');
//   });

//   it('should return 400 for missing fields', async () => {
//     const response = await request(app)
//       .post('/api/invoice')
//       .send({ name: '', amount: '', notes: '', contact: '' });
//     expect(response.status).toBe(400);
//     expect(response.body).toHaveProperty('error');
//   });

//   it('should get invoice details', async () => {
//     const createRes = await request(app)
//       .post('/api/invoice')
//       .send({
//         name: 'Test User',
//         amount: 100,
//         notes: 'Test notes',
//         contact: 'test@email.com'
//       });
//     const invoiceId = createRes.body.id;
//     const fetchRes = await request(app).get(`/api/invoice/${invoiceId}`);
//     expect(fetchRes.status).toBe(200);
//     expect(fetchRes.body).toHaveProperty('name', 'Test User');
//   });

//   it('should return 404 for missing invoice', async () => {
//     const response = await request(app).get('/api/invoice/inv-0000000000');
//     expect(response.status).toBe(404);
//     expect(response.body).toHaveProperty('error');
//   });
// });
