import { closeOrder, createOrder, getAll, manageOrder, updateOrder } from './order.entity';

export default function orders() {
  this.route.post('/order/create', createOrder(this));
  this.route.get('/order/getall', getAll(this));
  this.route.patch('/order/update/:id', updateOrder(this));
  this.route.patch('/order/close/:id', closeOrder(this));
  this.route.post('/order/status', manageOrder(this));
}
