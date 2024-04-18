import Trade from './trades.schema'; // this is OrderSchema Named as Trade 
import Account from '../account/acount.schema';
import { ObjectId } from 'mongodb';
const axios = require('axios');

// allowed filed for creating a new trade
const CREATE_ALLOWED = new Set(['account', 'childrens', 'orderType', 'percentage', 'type', 'side', 'amount', 'hedging', 'stopTrailing', 'stop', 'trailing', 'limit', 'guarantee', 'orderLevel', 'pointsAway', 'atPrice', 'limitPointsAway', 'limitAtPrice', 'status', 'marketData', 'partialExit', 'ammend', 'exitFrom', 'marketPath', 'exit', 'placeOrder', 'stopLimit', 'orderCreated', 'openPrice']);

// used for populating the 'account' field in  query result.
const populate = { path: 'account', select: 'email password percentage accountId' };

// allowed query
const allowedQuery = new Set(['page', 'orderType', 'childrens']);

/**
 * Creates a new trade based on the provided request data and saves it to the database.
 * Also updates the specified trade (if exitFrom is provided) to set partialExit as true in the database.
 *
 * @async
 * @function
 * @param {Object} options - The options object containing the required parameters.
 * @param {Object} options.db - The database object used for performing database operations.
 * @param {Object} options.ws - The WebSocket object used for emitting WebSocket events.
 * @returns {Function} An asynchronous function that handles the HTTP request and response.
 *
 * @param {Object} req - The HTTP request object containing trade information in the body.
 * @param {Object} res - The HTTP response object used for sending the response back to the client.
 * @throws {Error} Will throw an error if something goes wrong during the trade creation process.
 *
*/
export const createTrade = ({ db, ws }) => async (req, res) => {
  console.log(req.body);
  try {
    if (!req.body.amount) return res.status(400).send({ message: 'Amount is required' });
    const isValid = Object.keys(req.body).every((key) => CREATE_ALLOWED.has(key));
    if (!isValid) return res.status(400).send({ message: 'Bad Request' });
    const accounts = await db.find({ table: Account, key: { paginate: req.query.paginate === 'false' } });
    if (!accounts) return res.status(404).send({ message: 'No accounts found' });
    const updated = [];
    const orders = [];
    await Promise.all(accounts.map(async (account) => {
      const marketData = account.percentage.find((p) => p.itemName === req.body.marketData.marketName) || {};
      const percentage = marketData[`${req.body.amount}%`];
      console.log(percentage);
      if (percentage && percentage !== 0) {
        req.body.percentage = percentage;
        if (req.body.exitFrom) {
          req.body.ammend = undefined;
          const parent = await db.find({ table: Trade, key: { query: { childrens: { $in: [ObjectId(req.body.exitFrom)] } }, allowedQuery, populate: { path: 'childrens' } } });
          await Promise.all(parent.docs[0].childrens.map(async (children) => {
            const single = await db.update({ table: Trade, key: { _id: children._id, body: { partialExit: true, percentage, amount: req.body.amount } } });
            updated.push(single);
            req.body.orderCreated = single.orderCreated;
          }));
          await ws.emit('partialExit', { id: req.body.exitFrom, parentId: parent.docs[0]._id, partialExit: true, parent: updated });
        }
        const newTrade = await db.create({ table: Trade, key: { ...req.body, account: account._id, populate } });
        orders.push(newTrade);
      }
    }));

    if (!orders.length > 0) return res.status(422).send({ message: 'Unprocessable Content' });
    const orderIds = orders.map((order) => order._id);
    const data = {
      orderType: 'parent',
      childrens: orderIds
    };
    const parentOrder = await db.create({ table: Trade, key: { ...data, populate: { path: 'childrens' } } });
    res.status(200).send({ orders, parentOrder });
    try {
      const payLoad = {
        accounts: accounts,
        order: orders,
      };
      const response = await axios(`${process.env.BOT_SERVER_URL}/order`, { method: 'POST', data: payLoad });
      await ws.emit('account', response.data);
    }
    catch (err) {
      console.log(err);
    }
  }
  catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};


/**
 * Get a single trade by ID.
 * @param {Object} options - Options for fetching the trade.
 * @param {Object} options.db - The database instance for performing the fetch operation.
 * @returns {Function} - Express middleware function to handle the get trade request.
 */
export const getOne = ({ db }) => async (req, res) => {
  try {
    const trade = await db.findOne({ table: Trade, key: { _id: req.params.id } });
    if (!trade) return res.status(404).send({ message: 'No trades found' });
    res.status(200).send(trade);
  }
  catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};


/**
 * Get all trades.
 * @param {Object} options - Options for fetching the trades.
 * @param {Object} options.db - The database instance for performing the fetch operation.
 * @returns {Function} - Express middleware function to handle the get trades request.
 */
export const getAll = ({ db }) => async (req, res) => {
  try {
    const agg = [
      {
        '$match': {
          'orderType': 'parent'
        }
      }, {
        '$match': {
          'childrens.status': {
            '$ne': 'Closed'
          }
        }
      }
    ];

    let trades;
    if (req.query.orderType === 'parent') {
      const results = await Trade.aggregate(agg);
      const all = await Trade.populate(results, { path: 'childrens', strictPopulate: false });
      trades = all.filter((a) => !a.childrens.some((c) => c.status === 'Closed' || c.exitFrom));
    }
    else trades = await db.find({ table: Trade, key: { query: { ...req.query }, populate: { path: 'account childrens' }, allowedQuery } });
    if (!trades) return res.status(404).send({ message: 'Trades not found' });
    res.status(200).send(trades);
  }
  catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};


/**
 * UPDATE a single trade by ID.
 * @param {Object} options - Options for fetching the trade.
 * @param {Object} options.db - The database instance for performing the fetch operation.
 * @returns {Function} - Express middleware function to handle the get trade request.
 */
export const updateTrade = ({ db, ws }) => async (req, res) => {
  try {
    const isExist = await db.findOne({ table: Trade, key: { _id: req.params.id } });
    if (!isExist) return res.status(404).send({ message: 'No Order found' });
    const orders = await db.find({ table: Trade, key: { query: { childrens: { $in: [ObjectId(req.params.id)] } }, allowedQuery, populate: { path: 'childrens' } } });
    const updated = [];
    await Promise.all(orders.docs[0].childrens.map(async (order) => {
      if (req.body.exit === 'Partial Exit' && order.ammend === true) req.body.ammend = undefined;
      if (req.body.exit === 'Exit' && order.ammend === true) req.body.ammend = undefined;
      if (req.body.ammend === true && order.exit === 'Partial Exit') req.body.exit = undefined;
      req.body.placeOrder = false;
      const single = await db.update({ table: Trade, key: { _id: order._id, body: req.body, populate } });
      updated.push(single);
    }));
    orders.docs[0].childrens = updated;
    res.status(200).send({ updated, orders: orders.docs[0] });
    try {
      const accounts = await db.find({ table: Account, key: { paginate: req.query.paginate === 'true' } });
      const payLoad = {
        accounts,
        order: updated
      };
      const response = await axios(`${process.env.BOT_SERVER_URL}/order`, { method: 'POST', data: payLoad });
      ws.emit('account', response.data);
    }
    catch (err) {
      console.log(err);
    }
  }
  catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};


/**
 * Retrieves market data from a specified URL using Axios.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A Promise that resolves when the data is retrieved and sent.
 */
export const getMarketData = () => async (req, res) => {
  try {
    const { reqUrl, payLoad } = req.body;
    const response = await axios(reqUrl, {
      'headers': {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json; charset=UTF-8',
        'sec-ch-ua': '\'Google Chrome\';v=\'113\', \'Chromium\';v=\'113\', \'Not-A.Brand\';v=\'24\'',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '\'Linux\'',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'cookie': 'HSKCUBJH=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; HSKCUBJH_exp=2023-05-29T05:44:39.634Z; NINSBNNI=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; NINSBNNI_exp=2023-05-29T09:08:35.236Z; REGOWJJH=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; REGOWJJH_exp=2023-05-30T04:39:13.842Z; BFTAKTLS=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; BFTAKTLS_exp=2023-05-31T04:56:41.715Z; GSCRGDRH=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; GSCRGDRH_exp=2023-05-31T07:55:01.235Z; GYLPQTRJ=vuacXT1ajIx9L7p+KMBUaXjssOlNEyrmzJwpvrazaMVUzf8lstxBctljU+/udtNbzN2sQulg/xGGzzF8; GYLPQTRJ_exp=2023-05-31T08:26:45.316Z; FJHYGBKW=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; FJHYGBKW_exp=2023-05-31T08:36:13.738Z; MCVCIIEM=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; MCVCIIEM_exp=2023-05-31T12:24:11.077Z; FHDLEUUF=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; FHDLEUUF_exp=2023-06-01T04:35:08.639Z; PGRWSFKS=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; PGRWSFKS_exp=2023-06-02T04:43:38.002Z; WQHBNAIQ=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; WQHBNAIQ_exp=2023-06-02T10:02:21.902Z; ASP.NET_SessionId=gcrru0bute0uip40xfoou22d; JEXJHBJE=MeTqYcd0nt0oRHNFh9tSrlAzLXfM9h8hziCEr3xW1IW5dI8/yFOcR9aqiWykrq04U0U9p7dgvlLeoula; JEXJHBJE_exp=2023-06-05T04:38:42.009Z; AWSALB=8M8SZu16j7FOKvEZPydUmzf+Zu+uw/m0F4opSVk5L50G2pJuzOJSRKTp5Qa0YQplkeTNUov4AIkHlUMXTYJXIEghR8wpz9z0woa766SvrXuNxRsQqnA+wPLY2Mwz; AWSALBCORS=8M8SZu16j7FOKvEZPydUmzf+Zu+uw/m0F4opSVk5L50G2pJuzOJSRKTp5Qa0YQplkeTNUov4AIkHlUMXTYJXIEghR8wpz9z0woa766SvrXuNxRsQqnA+wPLY2Mwz',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      data: payLoad,
      method: 'POST'
    });
    return res.status(200).send(response.data.d);
  }
  catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Something went wrong' });
  }
};


/**
 * Close an order and update its status to 'Closed' along with its child orders.
 *
 * @function
 * @async
 * @param {Object} options - The options object containing a reference to the database.
 * @param {Object} options.db - The database instance used for operations.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 *
 * @throws {Error} If an error occurs during the database operations or request processing.
 *
 */
export const closeOrder = ({ db }) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).send({ message: 'Invalid Request' });
    const trade = await db.find({ table: Trade, key: { query: { childrens: { $in: [ObjectId(id)] }, orderType: 'parent' }, allowedQuery, populate: { path: 'childrens' } } });
    if (!trade) return res.status(404).send({ message: 'No order found' });
    await Promise.all(trade.docs[0].childrens.map(async (children) => {
      await db.update({ table: Trade, key: { _id: children._id, body: { status: 'Closed' } } });
    }));
    return res.status(200).send(trade);
  }
  catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Something went wrong' });
  }
};

/**
 * Updates the status of an order and emits it through a WebSocket.
 * @param {Object} options - The options object containing the database (db) and WebSocket (ws) instances.
 * @returns {Promise<void>} - A Promise that resolves when the order is updated and emitted.
 */
export const manageOrder = ({ db, ws }) => async (req, res) => {
  try {
    const { status, orderCreated, openPrice, id } = req.body;
    const order = await db.findOne({ table: Trade, key: { _id: id, populate } });
    if (!order) return res.send(404).send({ message: 'Order not found' });
    order.status = status;
    order.orderCreated = orderCreated;
    order.openPrice = openPrice;
    await db.save(order);
    ws.emit('order', { order, message: `Order has been ${status} from account ${order.account.email}` });
    return res.status(200).send(order);
  }
  catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Something went wrong' });
  }
};
