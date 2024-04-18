import account from './account/acount';
import orders from './order/order';
import trades from './trades/trades';

export const services = (app) => {
  app.configure(account);
  app.configure(orders);
  app.configure(trades);
};
