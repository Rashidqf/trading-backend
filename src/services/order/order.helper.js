export const getAmmount = async ({ marketData = {}, account = {}, percentage = 0 }) => {
  try {
    const targetedMarket = account.percentage.find((p) => p.itemName === marketData.marketName);
    if (!targetedMarket) return 0;
    const ammount = targetedMarket[`${percentage}%`];
    if (!ammount || !ammount > 0) return 0;
    return ammount;
  }
  catch (err) {
    console.log(err);
  }
};

export const genLog = async (status = '', message = '') => {
  if (!status || !message) return {};
  const log = { time: new Date().toISOString(), status, message };
  return log;
};

export const calcAmmount = async (ammount, percentage) => {
  if (!ammount || !percentage) return 0;
  return Math.ceil((percentage / 100) * ammount);
};
