import mongoose, {Schema} from 'mongoose';
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true,},
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
  emailVerificationString: {type: String, required: true},
  emailVerified: { type: Boolean, default: false },
  mobile: { type: String },
  mobileVerificationString: { type: String, required: true},
  mobileVerified: { type: Boolean, default: false },
  shareEmailWhenListing: { type: Boolean, default: true },
  refreshToken: {type: String}
}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            fullname: this.fullname
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

export const User = mongoose.model("User", userSchema);