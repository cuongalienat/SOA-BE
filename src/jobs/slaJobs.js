import Order from "../models/order.js";
import Delivery from "../models/delivery.js";
import { env } from "../config/environment.js";
import { createTransactionAdminToUser } from "../services/walletServices.js";
import { findNearbyShippers } from "../services/shipperServices.js";

const now = () => new Date();

const radiusByAttemptMeters = (attempt) => {
  // attempt: 1..N
  if (attempt <= 1) return 3000;
  if (attempt === 2) return 5000;
  if (attempt === 3) return 10000;
  if (attempt === 4) return 20000;
  return 50000;
};

export const startSlaJobs = (io) => {
  const tickMs = (env.SLA_TICK_SECONDS || 10) * 1000;
  let running = false;

  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await handleOrderPendingSla(io);
      await handleDeliveryMatchingSla(io);
    } catch (e) {
      console.error("⚠️ SLA job error:", e);
    } finally {
      running = false;
    }
  }, tickMs);

  console.log(`⏱️ SLA jobs started (tick=${tickMs}ms)`);
};

const handleOrderPendingSla = async (io) => {
  const nowTime = now();

  // 0) Backfill confirmDeadline for legacy Pending orders (avoid never-cancel)
  const confirmTtlMs = (env.ORDER_CONFIRM_TTL_SECONDS || 300) * 1000;
  const missingDeadline = await Order.find({
    status: "Pending",
    confirmDeadline: null
  })
    .select("_id createdAt")
    .sort({ createdAt: 1 })
    .limit(200);

  for (const order of missingDeadline) {
    const createdAtMs = new Date(order.createdAt).getTime();
    const deadline = new Date(createdAtMs + confirmTtlMs);
    await Order.updateOne(
      { _id: order._id, status: "Pending", confirmDeadline: null },
      { $set: { confirmDeadline: deadline } }
    );
  }

  // 1) Auto-confirm (shop open + autoAccept) when autoConfirmAt reached
  const autoConfirmBatch = await Order.find({
    status: "Pending",
    autoConfirmAt: { $ne: null, $lte: nowTime },
    confirmDeadline: { $ne: null, $gt: nowTime }
  })
    .select("_id shop user")
    .limit(200);

  for (const order of autoConfirmBatch) {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: "Pending", autoConfirmAt: { $ne: null, $lte: nowTime } },
      { $set: { status: "Confirmed", autoConfirmAt: null } },
      { new: true }
    );

    if (!updated) continue;

    io?.to(`shop:${updated.shop.toString()}`).emit("ORDER_AUTO_CONFIRMED", {
      orderId: updated._id,
      msg: "Đơn hàng được tự động xác nhận"
    });

    io?.to(`user:${updated.user.toString()}`).emit("ORDER_UPDATE", {
      status: "confirmed",
      msg: "Đơn hàng của bạn đã được xác nhận"
    });
  }

  // 2) Reminders (30s / 60s / 180s) for pending orders
  // Tighten scan: only recent pending orders, still within deadline, and still missing at least one reminder flag.
  const reminderWindowStart = new Date(nowTime.getTime() - (confirmTtlMs + 60_000));
  const pendingForReminder = await Order.find({
    status: "Pending",
    confirmDeadline: { $ne: null, $gt: nowTime },
    createdAt: { $gte: reminderWindowStart },
    $or: [{ reminded30s: false }, { reminded60s: false }, { reminded180s: false }]
  })
    .select("_id shop createdAt reminded30s reminded60s reminded180s")
    .sort({ createdAt: 1 })
    .limit(300);

  for (const order of pendingForReminder) {
    const ageMs = nowTime.getTime() - new Date(order.createdAt).getTime();

    if (!order.reminded30s && ageMs >= 30_000) {
      await Order.updateOne({ _id: order._id, reminded30s: false }, { $set: { reminded30s: true } });
      io?.to(`shop:${order.shop.toString()}`).emit("ORDER_REMINDER", {
        orderId: order._id,
        level: 1,
        msg: "Bạn có đơn mới cần xác nhận"
      });
    }

    if (!order.reminded60s && ageMs >= 60_000) {
      await Order.updateOne({ _id: order._id, reminded60s: false }, { $set: { reminded60s: true } });
      io?.to(`shop:${order.shop.toString()}`).emit("ORDER_REMINDER", {
        orderId: order._id,
        level: 2,
        msg: "Đơn hàng mới đã chờ 1 phút"
      });
    }

    if (!order.reminded180s && ageMs >= 180_000) {
      await Order.updateOne({ _id: order._id, reminded180s: false }, { $set: { reminded180s: true } });
      io?.to(`shop:${order.shop.toString()}`).emit("ORDER_REMINDER", {
        orderId: order._id,
        level: 3,
        msg: "Đơn sắp hết hạn xác nhận"
      });
    }
  }

  // 3) Auto-cancel when confirm deadline passed
  const expiredBatch = await Order.find({
    status: "Pending",
    confirmDeadline: { $ne: null, $lte: nowTime }
  })
    .select("_id shop user totalAmount payment delivery")
    .limit(200);

  for (const order of expiredBatch) {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: "Pending", confirmDeadline: { $ne: null, $lte: nowTime } },
      { $set: { status: "Canceled", cancelReason: "SHOP_NO_RESPONSE" } },
      { new: true }
    );

    if (!updated) continue;

    // Refund wallet if already paid
    if (updated.payment) {
      try {
        await createTransactionAdminToUser(updated.user, updated.totalAmount, updated._id);
      } catch (e) {
        console.error("⚠️ Refund failed for order", updated._id.toString(), e);
      }
    }

    // Cancel delivery if somehow exists
    if (updated.delivery) {
      await Delivery.findByIdAndUpdate(updated.delivery, {
        status: "CANCELLED",
        $push: { trackingLogs: { status: "CANCELLED", note: "Order auto-cancelled: SHOP_NO_RESPONSE" } }
      }).catch(() => {});
    }

    io?.to(`shop:${updated.shop.toString()}`).emit("ORDER_CANCELLED", {
      orderId: updated._id,
      reason: "SHOP_NO_RESPONSE",
      msg: "Đơn bị huỷ do shop không phản hồi"
    });

    io?.to(`user:${updated.user.toString()}`).emit("ORDER_UPDATE", {
      status: "canceled",
      reason: "SHOP_NO_RESPONSE",
      msg: "Đơn bị huỷ do shop không xác nhận kịp"
    });
  }
};

const handleDeliveryMatchingSla = async (io) => {
  const nowTime = now();
  const maxAttempts = env.DELIVERY_MATCH_MAX_ATTEMPTS || 3;
  const ttlSeconds = env.DELIVERY_MATCH_TTL_SECONDS || 240;

  // 0) Backfill matchDeadline/matchAttempts for legacy SEARCHING deliveries.
  // If a record is too old (older than ttl * maxAttempts), hard-cancel it and cancel the order.
  const hardTimeoutMs = ttlSeconds * 1000 * maxAttempts;
  const legacySearching = await Delivery.find({
    status: "SEARCHING",
    matchDeadline: null
  })
    .select("_id orderId createdAt matchAttempts")
    .sort({ createdAt: 1 })
    .limit(200);

  for (const delivery of legacySearching) {
    const createdAtMs = new Date(delivery.createdAt).getTime();
    const ageMs = nowTime.getTime() - createdAtMs;

    // Too old => hard cancel (avoid infinite searching forever)
    if (ageMs >= hardTimeoutMs) {
      const cancelledLegacy = await Delivery.findOneAndUpdate(
        { _id: delivery._id, status: "SEARCHING", matchDeadline: null },
        {
          $set: { status: "CANCELLED" },
          $push: { trackingLogs: { status: "CANCELLED", note: "MATCHING_TIMEOUT_LEGACY" } }
        },
        { new: true }
      );

      if (!cancelledLegacy) continue;

      const order = await Order.findById(cancelledLegacy.orderId).select("_id status user shop totalAmount payment");
      if (!order) continue;
      if (["Canceled", "Delivered"].includes(order.status)) continue;

      order.status = "Canceled";
      order.cancelReason = "NO_SHIPPER";
      await order.save();

      if (order.payment) {
        try {
          await createTransactionAdminToUser(order.user, order.totalAmount, order._id);
        } catch (e) {
          console.error("⚠️ Refund failed for order", order._id.toString(), e);
        }
      }

      io?.to(`shop:${order.shop.toString()}`).emit("ORDER_CANCELLED", {
        orderId: order._id,
        reason: "NO_SHIPPER",
        msg: "Đơn bị huỷ do không tìm được tài xế"
      });

      io?.to(`user:${order.user.toString()}`).emit("ORDER_UPDATE", {
        status: "canceled",
        reason: "NO_SHIPPER",
        msg: "Không tìm được tài xế. Đơn đã được huỷ và hoàn tiền (nếu có)."
      });

      continue;
    }

    // Recent legacy => seed deadline so normal SLA loop can handle it.
    await Delivery.updateOne(
      { _id: delivery._id, status: "SEARCHING", matchDeadline: null },
      {
        $set: {
          matchAttempts: delivery.matchAttempts || 1,
          matchDeadline: new Date(Date.now() + ttlSeconds * 1000)
        },
        $push: {
          trackingLogs: { status: "SEARCHING", note: "SLA backfill: seeded matchDeadline" }
        }
      }
    );
  }

  const expiredDeliveries = await Delivery.find({
    status: "SEARCHING",
    matchDeadline: { $ne: null, $lte: nowTime }
  })
    .select("_id orderId pickup matchAttempts")
    .limit(200);

  for (const delivery of expiredDeliveries) {
    const currentAttempts = delivery.matchAttempts || 1;

    if (currentAttempts < maxAttempts) {
      const nextAttempt = currentAttempts + 1;
      const updated = await Delivery.findOneAndUpdate(
        { _id: delivery._id, status: "SEARCHING", matchDeadline: { $ne: null, $lte: nowTime } },
        {
          $set: {
            matchAttempts: nextAttempt,
            matchDeadline: new Date(Date.now() + ttlSeconds * 1000)
          },
          $push: {
            trackingLogs: {
              status: "SEARCHING",
              note: `Retry matching (attempt ${nextAttempt})`
            }
          }
        },
        { new: true }
      );

      if (!updated) continue;

      io?.to(`order:${updated.orderId.toString()}`).emit("DELIVERY_MATCH_RETRY", {
        deliveryId: updated._id,
        attempt: nextAttempt
      });

      // Broadcast to nearby shippers with expanding radius
      try {
        const coords = updated.pickup.location.coordinates;
        const radius = radiusByAttemptMeters(nextAttempt);
        const availableShippers = await findNearbyShippers(coords, radius);

        if (availableShippers?.length) {
          const payload = {
            deliveryId: updated._id,
            pickup: updated.pickup.address,
            dropoff: "",
            note: `Retry attempt ${nextAttempt}`
          };

          availableShippers.forEach((shipperDoc) => {
            const userIdToEmit = shipperDoc.user?._id || shipperDoc.user;
            io?.to(`user:${userIdToEmit.toString()}`).emit("NEW_JOB", payload);
          });
        }
      } catch (e) {
        console.error("⚠️ Retry broadcast failed:", e);
      }

      continue;
    }

    // Fail hard: cancel delivery + cancel order (avoid infinite searching)
    const cancelled = await Delivery.findOneAndUpdate(
      { _id: delivery._id, status: "SEARCHING", matchDeadline: { $ne: null, $lte: nowTime } },
      {
        $set: { status: "CANCELLED" },
        $push: { trackingLogs: { status: "CANCELLED", note: "MATCHING_TIMEOUT" } }
      },
      { new: true }
    );

    if (!cancelled) continue;

    const order = await Order.findById(cancelled.orderId).select("_id status user shop totalAmount payment delivery");
    if (!order) continue;

    // Nếu order đã bị hủy/xong thì thôi
    if (["Canceled", "Delivered"].includes(order.status)) continue;

    order.status = "Canceled";
    order.cancelReason = "NO_SHIPPER";
    await order.save();

    if (order.payment) {
      try {
        await createTransactionAdminToUser(order.user, order.totalAmount, order._id);
      } catch (e) {
        console.error("⚠️ Refund failed for order", order._id.toString(), e);
      }
    }

    io?.to(`shop:${order.shop.toString()}`).emit("ORDER_CANCELLED", {
      orderId: order._id,
      reason: "NO_SHIPPER",
      msg: "Đơn bị huỷ do không tìm được tài xế"
    });

    io?.to(`user:${order.user.toString()}`).emit("ORDER_UPDATE", {
      status: "canceled",
      reason: "NO_SHIPPER",
      msg: "Không tìm được tài xế. Đơn đã được huỷ và hoàn tiền (nếu có)."
    });
  }
};