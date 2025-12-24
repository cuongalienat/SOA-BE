import 'dotenv/config'

const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
};

export const env = {
    MONGODB_URI: process.env.MONGODB_URI,
    DB_NAME: process.env.DB_NAME,
    LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST,
    LOCAL_DEV_APP_PORT: process.env.LOCAL_DEV_APP_PORT,

    // SLA / Timer defaults
    SLA_TICK_SECONDS: toInt(process.env.SLA_TICK_SECONDS, 10),
    ORDER_CONFIRM_TTL_SECONDS: toInt(process.env.ORDER_CONFIRM_TTL_SECONDS, 300),
    ORDER_AUTO_CONFIRM_DELAY_SECONDS: toInt(process.env.ORDER_AUTO_CONFIRM_DELAY_SECONDS, 20),
    DELIVERY_MATCH_TTL_SECONDS: toInt(process.env.DELIVERY_MATCH_TTL_SECONDS, 240),
    DELIVERY_MATCH_MAX_ATTEMPTS: toInt(process.env.DELIVERY_MATCH_MAX_ATTEMPTS, 3)
}