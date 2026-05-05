import mongoose from 'mongoose';

const AccountHolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide account holder name'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['vendor', 'client', 'both'],
    default: 'vendor',
  },
  bankAccountName: {
    type: String,
    trim: true,
    default: '',
  },
  bankAccountNumber: {
    type: String,
    trim: true,
    default: '',
  },
  bankName: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.AccountHolder || mongoose.model('AccountHolder', AccountHolderSchema);
