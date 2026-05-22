import mongoose from 'mongoose';

const BillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  accountHolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHolder',
    required: true,
    index: true,
  },
  billNumber: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide bill amount'],
    min: 0,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  type: {
    type: String,
    enum: ['receivable', 'payable'],
    default: 'receivable',
  },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

BillSchema.index({ userId: 1, status: 1 });
BillSchema.index({ userId: 1, accountHolderId: 1 });
BillSchema.index({ userId: 1, createdAt: -1 });
BillSchema.index({ accountHolderId: 1, type: 1 });

export default mongoose.models.Bill || mongoose.model('Bill', BillSchema);
