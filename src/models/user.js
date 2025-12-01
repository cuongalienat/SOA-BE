import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: function () { return !this.googleId; } },
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    age: { type: String, required: function () { return !this.googleId } },
    phone: { type: String, required: function () { return !this.googleId } },
    verifyCode: { type: String, required: false },
    verifyCodeExpires: { type: Date, required: false },
    isVerified: { type: String, enum: ["yes", "no"], default: "no" },
    googleId: { type: String, required: false },
    role: { type: String, enum: ["customer", "driver", "admin", "restaurant_manager"], default: "customer" },
}, { timestamps: true });

// Hash password
userSchema.pre("save", async function (next) {
    if (!this.password) {
        return next();
    }
    if (!this.isModified('password')) {
        return next();
    }
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Check password
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
