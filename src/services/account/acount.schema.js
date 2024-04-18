import { Schema, model } from 'mongoose';
const paginate = require('mongoose-paginate-v2');
const jwt = require('jsonwebtoken');

const schema = new Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
  },
  percentage: [
    {
      itemName: {
        type: String,
        trim: true,
      },
      '100%': {
        type: Number,
        trim: true,
      },
      '75%': {
        type: Number,
        trim: true,
      },
      '50%': {
        type: Number,
        trim: true,
      },
      '25%': {
        type: Number,
        trim: true,
      },
      _id: false,
    }
  ],
  accountType: {
    type: String,
    enum: ['Primary', 'Secondary'],
  },
}, { timestamps: true });

schema.plugin(paginate);
schema.methods.toJSON = function () {
  const accountObj = this.toObject();
  delete accountObj.__v;
  delete accountObj.createdAt;
  delete accountObj.updatedAt;
  return JSON.parse(JSON.stringify(accountObj).replace(/_id/g, 'id'));
};

schema.methods.generateToken = function () {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.SECRET_KEY);
  return token;
};

// schema.methods.comparePassword = async function (pass) {
//   return await bcrypt.compare(pass, this.password);
// };

// schema.pre('save', async function (next) {
//   try {
//     if (!this.isModified('password')) return next();
//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(this.password, salt);
//     this.password = hashed;
//   }
//   catch (err) {
//     throw new Error(err.message);
//   }
// });

export default model('Account', schema);