import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { calculateDistance } from "../utils/calculateDistance";
import useGeolocation from "./useGeolocation";
import useNetworkInfo from "./useNetworkInfo";

export default function useSiteValidation(siteId) {
    const { location, error: geoError } = useGeolocation();
    const { ssid } = useNetworkInfo();

    const [siteData, setSiteData] = useState(null);
    const [status, setStatus] = useState({
        isWithinRadius: false,
        isCorrectWiFi: false,
        distance: null,
        loading: true,
    });

    useEffect(() => {
        const fetchSite = async () => {
            if (!siteId) return;
            try {
                const snap = await getDoc(doc(db, "sites", siteId));
                if (snap.exists()) setSiteData(snap.data());
            } catch (err) {
                console.error("Error fetching site data", err);
            }
        };
        fetchSite();
    }, [siteId]);

    useEffect(() => {
        // If we're still loading site data or waiting for GPS
        if (!siteId) {
            setStatus(prev => ({ ...prev, loading: false }));
            return;
        }
        if (!siteData) return; // Keep loading

        if (!location) {
            // Location not yet found (or permission denied)
            // We do not set loading false here because we technically are still "checking"
            // But if error exists, we might want to stop
            return;
        }

        const distance = calculateDistance(
            siteData.location.lat,
            siteData.location.lng,
            location.lat,
            location.lng
        );

        const isWithinRadius = distance <= (siteData.radius || 50);
        // Flexible matching for testing: simple string compare
        const isCorrectWiFi = ssid === siteData.wifiSSID;

        setStatus({
            isWithinRadius,
            isCorrectWiFi,
            distance: Math.round(distance),
            loading: false,
        });
    }, [siteData, location, ssid, siteId]);

    return { ...status, geoError };
}
