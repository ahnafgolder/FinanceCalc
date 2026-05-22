import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true,
  },
  accountHolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHolder',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide payment amount'],
    min: 0,
  },
  type: {
    type: String,
    enum: ['received', 'paid'],
    default: 'received',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'mobile_banking', 'other'],
    default: 'cash',
  },
  referenceNumber: {
    type: String,
    trim: true,
    default: '',
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

PaymentSchema.index({ userId: 1, paymentDate: -1 });
PaymentSchema.index({ billId: 1 });
PaymentSchema.index({ accountHolderId: 1, type: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
