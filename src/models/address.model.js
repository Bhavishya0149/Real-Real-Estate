import mongoose, {Schema} from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  pinCode: Number,
  country: String,
},{
    timestamps: true,
  }
);

export const Address = mongoose.model("Address", addressSchema);