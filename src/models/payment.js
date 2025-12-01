import moongoose from 'mongoose';

const paymentSchema = new moongoose.Schema({
    // Liên kết với user thực hiện thanh toán
    user: {
        type: moongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    order: {
        type: moongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Order'
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        Enum: ['COD', 'Bank Transfer'],
        required: true
    },
    status: {
        type: String,
        Enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
        default: 'Pending'
    }
}, { timestamps: true });

const Payment = moongoose.model('Payment', paymentSchema);
export default Payment;