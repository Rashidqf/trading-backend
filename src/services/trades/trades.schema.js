import { Schema, model } from 'mongoose';
const paginate = require('mongoose-paginate-v2');

const schema = new Schema({
  childrens: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    }
  ],
  orderType: {
    type: String,
    enum: ['parent', 'child'],
    default: 'child'
  },
  placeOrder: {
    type: Boolean,
    default: true,
  },
  account: {
    type: Object,
    ref: 'Account'
  },
  percentage: {
    type: Number,
  },
  openPrice: {
    type: Number
  },
  type: {
    type: String,
    enum: ['trade', 'order'],
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
  },
  amount: {
    type: Number,
    trim: true,
  },
  hedging: {
    type: Boolean,
    default: false,
  },
  stopTrailing: {
    type: String,
  },
  stop: {
    type: Boolean,
    default: false,
  },
  trailing: {
    type: Boolean,
    default: false,
  },
  limit: {
    type: Boolean,
    default: false,
  },
  guarantee: {
    type: Boolean,
    default: false,
  },
  orderLevel: {
    type: Number,
    trim: true,
  },
  pointsAway: {
    type: Number,
  },
  atPrice: {
    type: Number,
  },
  limitPointsAway: {
    type: Number,
  },
  limitAtPrice: {
    type: Number,
  },
  marketPath: {
    type: String,
  },
  marketData: {
    type: Object,
  },
  status: {
    type: String,
    enum: ['Pending', 'Failed', 'Active', 'Closed', 'Cancelled'],
    default: 'Pending',
  },
  partialExit: {
    type: Boolean,
    default: false,
  },
  ammend: {
    type: Boolean,
    default: false,
  },
  exitFrom: {
    type: Schema.Types.ObjectId,
  },
  exit: {
    type: String,
    enum: ['Exit', 'Partial Exit']
  },
  stopLimit: {
    type: Boolean,
  },
  orderCreated: {
    type: String
  }
}, { timestamps: true });

schema.plugin(paginate);
schema.methods.toJSON = function () {
  const tradeObj = this.toObject();
  delete tradeObj.__v;
  return JSON.parse(JSON.stringify(tradeObj).replace(/_id/g, 'id'));
};

export default model('Order', schema);
