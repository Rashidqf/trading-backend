import fs from 'fs';
import path from 'path';
import axios from 'axios';
import conncetMongoDB from './controllers/mongodb';
import App from './app';
import settings from '../settings.json';
import Account from './services/account/acount.schema';

(() => {
  // Check for clients directory as it is required by this framework
  const statics = path.resolve(__dirname, '..', 'client');
  if (!fs.existsSync(statics)) {
    fs.mkdirSync(statics);
  }

  // Connect to MongoDB
  conncetMongoDB(settings)
    .then(async function (res) {
      console.log(`=> ${res}!`);

      // Start the Bot
      // const accounts = await Account.find();
      // try {
      //   await axios(`${process.env.BOT_SERVER_URL}/accounts`, { method: 'POST', data: accounts });
      // } catch (err) { console.error(err); }

      // Boot Up the server & services
      const app = new App();
      app.start();
    })
    .catch(err => console.log(err));
})();