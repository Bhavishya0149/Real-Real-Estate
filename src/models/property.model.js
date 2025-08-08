import mongoose, {Schema} from "mongoose";

const propertySchema = new Schema({
    title: {type: String,required: true,trim: true,},
    description: {type: String, required: true,},
    propertyType: {type: String,enum: ["Apartment", "House", "Villa", "Plot", "Studio", "Other"],required: true,},
    status: {type: String,enum: ["For Sale", "For Rent", "Sold"],default: "For Sale",},
    price: {type: Number,required: true,},
    securityDeposit: {type: Number,default: 0,},
    area: {type: Number, required: true,},
    address: {type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true,},
    amenities: [{type: String, trim: true,},],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true,},
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photo",
      },
    ],
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    listedFlag: {
      type: Boolean, 
      default: true,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    listedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ location: "2dsphere" });

export const Property = mongoose.model("Property", propertySchema);