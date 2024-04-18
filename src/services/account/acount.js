import { createNew, getAll, manageAccount, removeAccount, sendAll, updateAccount, updateFromCSV } from './acount.entity';

export default function account() {

  /**
  * POST /account
  * @description this route is used to create a account.
  * @response {Object} 200 - the new user account object.
  */
  this.route.post('/account', createNew(this));

  /**
  * PATCH /account/:id
  * @description this route is used to update a account.
  * @response {Object} 200 - the account object.
  */
  this.route.patch('/account/:id', updateAccount(this));

  /**
  * GET /accounts
  * @description this route is used to get all account.
  * @response {Object} 200 - all the account object.
  */
  this.route.get('/accounts', getAll(this));


  /**
   * DELETE /account/:id
   * @description this route is used to delete an account
   * @response {Object} 200 - with a successful response
   */
  this.route.delete('/account/:id', removeAccount(this));


  /**
   * PATCH /accounts
   * @description this route is used to update accounts from csv file data
   * @response {Object} 200 - with a successful response
   */
  this.route.patch('/accounts', updateFromCSV(this));


  /**
 * POST /account/status
 * @description this route is used to know the status of an account
 * @response {Object} 200 - with a successful response
 */
  this.route.post('/account/status', manageAccount(this));

  /**
   * GET /account/all
   * @description this route is used to send all the accounts to the bot server
   * @response {Object} 200 - with a successful response
   */
  this.route.get('/account/all', sendAll(this));
}