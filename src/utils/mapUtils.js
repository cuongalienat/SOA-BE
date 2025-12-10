import axios from 'axios';
import * as turf from '@turf/turf';

export const calculateDistance = async (origin, destination) => {
    // origin, destination format: "lat,lng"
    try {
        // 1. Ưu tiên dùng Goong API
        const apiKey = process.env.GOONG_API_KEY || "YOUR_KEY";
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${origin}&destinations=${destination}&vehicle=bike&api_key=${apiKey}`;
        
        const res = await axios.get(url);
        const distance = res.data?.rows?.[0]?.elements?.[0]?.distance?.value;

        if (distance) return distance; // Trả về mét
    } catch (error) {
        console.warn("⚠️ Goong API Error, fallback to Turf.");
    }

    // 2. Fallback dùng Turf (Đường chim bay) nếu Goong lỗi
    try {
        const [lat1, lng1] = origin.split(',').map(Number);
        const [lat2, lng2] = destination.split(',').map(Number);
        
        const from = turf.point([lng1, lat1]);
        const to = turf.point([lng2, lat2]);
        
        // Convert km to meters
        return Math.round(turf.distance(from, to, { units: 'kilometers' }) * 1000);
    } catch (e) {
        return 5000; // Default 5km nếu lỗi toàn tập
    }
};