import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeIcon = (color) => L.divIcon({
  className: "",
  html: `<div style="background:${color};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -26],
});

const makeDotIcon = (color) => L.divIcon({
  className: "",
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

const geocodeCache = {};

async function geocode(query) {
  if (!query) return null;
  if (geocodeCache[query]) return geocodeCache[query];
  try {
    const q = query.toLowerCase().includes("ghana") ? query : `${query}, Ghana`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, { 
      headers: { 
        "Accept-Language": "en",
        "User-Agent": "HY3N-Admin/1.0"
      } 
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache[query] = coords;
      return coords;
    }
    return null;
  } catch (error) {
    console.error("Geocoding failed for", query, error);
    return null;
  }
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points.length]);
  return null;
}

export default function LiveMap({ rides }) {
  const [rideCoords, setRideCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevRides = useRef([]);

  useEffect(() => {
    if (!rides?.length) { setLoading(false); return; }
    setLoading(true);

    Promise.all(rides.map(async (ride) => {
      const getCoord = async (lat, lng, address) => {
        if (lat && lng) return [lat, lng];
        if (address) return await geocode(address);
        return null;
      };
      
      const [pickup, dropoff] = await Promise.all([
        getCoord(ride.pickup?.lat, ride.pickup?.lng, ride.pickup_location || ride.pickup_address),
        getCoord(ride.destination?.lat, ride.destination?.lng, ride.dropoff_location || ride.destination_address),
      ]);
      return { ride, pickup, dropoff };
    }))
    .then(results => {
      setRideCoords(results.filter(r => r.pickup || r.dropoff));
    })
    .catch(err => console.error("Map geocoding error:", err))
    .finally(() => {
      setLoading(false);
    });
  }, [rides.map(r => r.id).join(",")]);

  const allPoints = rideCoords.flatMap(r => [r.pickup, r.dropoff].filter(Boolean));
  const centerGhana = [7.9465, -1.0232];

  const statusColor = { "searching": "#3B82F6", "matched": "#A855F7", "in_progress": "#22C55E" };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-hy3n-bg/80 flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Locating rides on map…</p>
          </div>
        </div>
      )}

      <MapContainer
        center={centerGhana}
        zoom={7}
        style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <ZoomControl position="bottomright" />
        {allPoints.length > 0 && <FitBounds points={allPoints} />}

        {rideCoords.map(({ ride, pickup, dropoff }) => (
          <div key={ride.id}>
            {pickup && (
              <Marker position={pickup} icon={makeIcon(statusColor[ride.status] || "#6B7280")}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{ride.rider_name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>Pickup</div>
                    <div style={{ fontSize: 12 }}>{ride.pickup_location || ride.pickup_address}</div>
                    <div style={{ marginTop: 6, padding: "2px 8px", borderRadius: 99, display: "inline-block", background: (statusColor[ride.status] || "#6B7280") + "22", color: statusColor[ride.status] || "#6B7280", fontSize: 11, fontWeight: 600 }}>
                      {ride.status === "searching" ? "Waiting for Driver" : ride.status === "matched" ? "Driver Assigned" : "In Progress"}
                    </div>
                    {ride.driver_name && <div style={{ fontSize: 11, marginTop: 4 }}>Driver: {ride.driver_name}</div>}
                    {ride.fare && <div style={{ fontSize: 11 }}>Fare: GHS {ride.fare}</div>}
                  </div>
                </Popup>
              </Marker>
            )}
            {dropoff && (
              <Marker position={dropoff} icon={makeDotIcon(statusColor[ride.status] || "#6B7280")}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{ride.rider_name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>Dropoff</div>
                    <div style={{ fontSize: 12 }}>{ride.dropoff_location || ride.destination_address}</div>
                  </div>
                </Popup>
              </Marker>
            )}
            {pickup && dropoff && (
              <Polyline
                positions={[pickup, dropoff]}
                color={statusColor[ride.status] || "#F5A623"}
                weight={2.5}
                opacity={0.7}
                dashArray={ride.status === "in_progress" ? undefined : "6 6"}
              />
            )}
          </div>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[999] bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 flex items-center gap-4 text-xs text-white">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Searching</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Driver Assigned</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> In Progress</span>
      </div>
    </div>
  );
}