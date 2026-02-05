import { useState, useEffect } from "react";

export default function useNetworkInfo() {
    const [ssid, setSsid] = useState("Unknown");

    useEffect(() => {
        // Placeholder until native/mobile integration
        const saved = localStorage.getItem("mock_ssid");
        setSsid(saved || "Office_WiFi");
    }, []);

    return { ssid };
}
