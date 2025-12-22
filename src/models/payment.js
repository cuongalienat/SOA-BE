import moongoose from 'mongoose';

const paymentSchema = new moongoose.Schema({
    user: {
        type: moongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['DEPOSIT', 'WITHDRAW'],
        default: 'DEPOSIT'
    },
    status: {
        type: String,
        Enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    },
    balanceBefore: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Payment = moongoose.model('Payment', paymentSchema);
export default Payment;