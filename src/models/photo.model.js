import mongoose, {Schema} from 'mongoose';

const photoSchema = new Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: true, // If using Cloudinary or similar
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
},{
    timestamps: true,
  });

export const Photo = mongoose.model("Photo", photoSchema);