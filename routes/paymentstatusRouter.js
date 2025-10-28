const express = require('express');
const isAuth = require('../middleware/isAuth');
const paymentstatusController = require('../controllers/paymentstatusController');

const paymentstatusRouter = express.Router();

paymentstatusRouter.post('/add', isAuth, paymentstatusController.addTransaction);
paymentstatusRouter.get('/get-all', isAuth, paymentstatusController.getAll);
paymentstatusRouter.put('/edit-total', isAuth, paymentstatusController.totalAmount);
paymentstatusRouter.get('/all-transaction', isAuth, paymentstatusController.allTransactions);
paymentstatusRouter.get('/all-transaction/:customerId', isAuth, paymentstatusController.allTransactionsByCustomer);
paymentstatusRouter.get('/:customerId', isAuth, paymentstatusController.get);
paymentstatusRouter.put('/:id', isAuth, paymentstatusController.editTransactionById);
paymentstatusRouter.delete('/:id', isAuth, paymentstatusController.deleteTransactionById);

module.exports = paymentstatusRouter;