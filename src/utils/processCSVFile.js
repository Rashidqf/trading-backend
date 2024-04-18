const csv = require('csv-parser');
const fs = require('node:fs');

// int field that need to be converted to a number
const intData = ['100%', '75%', '50%', '25%'];

/**
 * Processes a CSV file and returns its contents as an array of objects.
 * The file is deleted after processing.
 * @param {string} filepath - The path to the CSV file.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of objects representing the CSV data.
 * @throws {Error} - If the function fails to read the data.
 */
export const processCSVFile = async (filePath) => {
  if (!filePath) return null;
  try {
    const res = new Promise((resolve, reject) => {
      let entries = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // convert the amount into number form string
          Object.keys(data).forEach((key) => {
            if (intData.includes(key)) {
              data[key] = parseFloat(data[key]);
            }
          });
          entries.push(data);
        })
        .on('end', () => {
          fs.unlinkSync(filePath);
          entries = entries.map((r) => ({ email: r.Username, accountId: r.AccountId, percentage: [{ itemName: r.Item, '100%': r['100%'] || 0, '75%': r['75%'] || 0, '50%': r['50%'] || 0, '25%': r['25%'] || 0 }] }));
          const combined = {};
          entries.forEach((entry) => {
            const { email, percentage, accountId } = entry;
            if (combined[email]) {
              combined[email].percentage.push(...percentage);
            }
            else {
              combined[email] = { email, accountId, percentage: [...percentage] };
            }
          });
          entries = Object.values(combined);
          entries = entries.filter(Boolean);
          resolve(entries);
        })
        .on('error', (err) => {
          console.log(err);
          reject(err);
        });
    });
    return res;
  }
  catch (err) {
    throw new Error('Failed to read data');
  }
};
