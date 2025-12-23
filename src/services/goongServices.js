/* File: src/services/goongServices.js */
import axios from 'axios';
import dotenv from 'dotenv';
import ApiError from '../utils/ApiError.js';
dotenv.config();

const GOONG_API_KEY = process.env.GOONG_API_KEY;

// 1. Hàm chuyển Địa chỉ -> Tọa độ (Geocoding)
export const getCoordinates = async (address) => {
    try {
        const url = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`;
        const response = await axios.get(url);

        if (response.data.results && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        }
        return null;
    } catch (error) {
        console.error("Lỗi Goong Geocode:", error.message);
        return null;
    }
};

// 2. Hàm tính khoảng cách giữa 2 điểm (Distance Matrix)
export const getDistance = async (origin, destination) => {
    try {
        // origin & destination format: "lat,lng" (Ví dụ: "21.028511,105.804817")
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${origin}&destinations=${destination}&vehicle=bike&api_key=${GOONG_API_KEY}`;

        const response = await axios.get(url);

        if (response.data.rows && response.data.rows[0].elements && response.data.rows[0].elements[0].distance) {
            return {
                distanceValue: response.data.rows[0].elements[0].distance.value, // Mét (VD: 3500)
                distanceText: response.data.rows[0].elements[0].distance.text,   // Text (VD: "3.5 km")
                durationText: response.data.rows[0].elements[0].duration.text    // Thời gian (VD: "15 mins")
            };
        }
        return null;
    } catch (error) {
        console.error("Lỗi Goong Distance:", error.message);
        return null;
    }
};