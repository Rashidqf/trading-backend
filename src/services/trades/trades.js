import { closeOrder, createTrade, getAll, getMarketData, getOne, manageOrder, updateTrade } from './trades.entity';

export default function trades() {
  this.route.post('/trade', createTrade(this));
  this.route.get('/trade/:id', getOne(this));
  this.route.get('/trades', getAll(this));
  this.route.post('/marketdata', getMarketData(this));
  this.route.patch('/close-order/:id', closeOrder(this));
  this.route.post('/order/status', manageOrder(this));
  this.route.patch('/trade/:id', updateTrade(this));
}
