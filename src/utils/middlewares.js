import jwt from 'jsonwebtoken';
import * as operations from '../controllers/operations';
import Account from '../services/account/acount.schema';

/**
 * This function is used for decoding auth token.
 * @param {String} token The token to decode.
 * @returns returns the decoded user found in database.
 */
export default async function decodeAuthToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await operations.findOne({ table: Account, key: { _id: decoded._id } });
    if (!user) throw new Error('user not found');
    return user;
  }
  catch (e) {
    console.log(e);
  }
}

/**
 * This function is used to authenticate request.
 * After authetication it inserts the user data to reqest object.
 */
async function auth(req, res, next) {
  try {
    const token = req.cookies?.copytrade;
    if (!token) return res.status(401).send({ error: 'Please authenticate' });
    const user = await decodeAuthToken(token);
    if (!user) return res.status(401).send({ error: 'Please authenticate' });
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    console.log(e);
    res.status(401).send({ error: 'Please authenticate' });
  }
}

export { auth };