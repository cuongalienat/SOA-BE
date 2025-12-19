import mongoose from 'mongoose';

const COLLECTION_NAME = 'Deliveries';
const DOCUMENT_NAME = 'Delivery';

const TrackingLogSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Nên ref tới User
  note: String,
  // Bổ sung location để lưu vị trí lúc shipper cập nhật trạng thái
  location: {
    lat: Number,
    lng: Number
  }
}, { _id: false }); // Không cần _id cho sub-document này nếu không cần thiết

const DeliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  shipperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Snapshot địa chỉ (Lưu cứng)
  pickup: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phones: [{ type: String, required: true }],
    location: { 
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], required: true } // [Longitude, Latitude]
    }
  },
  dropoff: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    location: { 
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], required: true } 
    }
  },

  // Thông số
  distance: { type: Number, required: true }, // mét
  estimatedDuration: { type: String }, // giây
  shippingFee: { type: Number, required: true },
  status: {
    type: String,
    enum: ['SEARCHING', 'ASSIGNED', 'PICKING_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    default: 'SEARCHING',
    index: true
  },
  
  // Logs
  trackingLogs: [TrackingLogSchema] 
}, {
  timestamps: true,
  collection: COLLECTION_NAME
});

// Index địa lý (Quan trọng)
DeliverySchema.index({ "pickup.location": "2dsphere" });

export default mongoose.model(DOCUMENT_NAME, DeliverySchema);