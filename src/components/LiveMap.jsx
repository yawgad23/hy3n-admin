import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeIcon = (color) => L.divIcon({ className: "", html: `<div style="background:${color};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div>`, iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -26] });
const makeDotIcon = (color) => L.divIcon({ className: "", html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5);"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10] });

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 }); }, [map, points]);
  return null;
}

export default function LiveMap({ rides = [] }) {
  // Coordinates arrive from the protected HY3N API. No browser geocoder or API key is needed.
  const rideCoords = rides.map((ride) => ({ ride, pickup: ride.pickup || null, dropoff: ride.destination || null })).filter((entry) => entry.pickup || entry.dropoff);
  const allPoints = rideCoords.flatMap((entry) => [entry.pickup, entry.dropoff].filter(Boolean));
  const statusColor = { searching: "#3B82F6", matched: "#A855F7", driver_arriving: "#FBBF24", driver_arrived: "#FBBF24", in_progress: "#22C55E" };

  return <div className="relative h-full w-full overflow-hidden bg-hy3n-bg">
    <MapContainer center={[7.9465, -1.0232]} zoom={7} style={{ height: "100%", width: "100%", background: "#1a1a1a" }} zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <ZoomControl position="bottomright" />
      {allPoints.length > 0 && <FitBounds points={allPoints} />}
      {rideCoords.map(({ ride, pickup, dropoff }) => <div key={ride.id}>
        {pickup && <Marker position={pickup} icon={makeIcon(statusColor[ride.status] || "#6B7280")}><Popup><div style={{ minWidth: 160 }}><strong>{ride.rider_name}</strong><div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>Pickup</div><div>{ride.pickup_address || "Location"}</div><div style={{ fontSize: 11, marginTop: 6 }}>Driver: {ride.driver_name || "Unassigned"}</div></div></Popup></Marker>}
        {dropoff && <Marker position={dropoff} icon={makeDotIcon(statusColor[ride.status] || "#6B7280")}><Popup><div style={{ minWidth: 160 }}><strong>{ride.rider_name}</strong><div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>Destination</div><div>{ride.destination_address || "Location"}</div></div></Popup></Marker>}
        {pickup && dropoff && <Polyline positions={[pickup, dropoff]} color={statusColor[ride.status] || "#F5A623"} weight={2.5} opacity={0.7} dashArray={ride.status === "in_progress" ? undefined : "6 6"} />}
      </div>)}
    </MapContainer>
    {!rideCoords.length && <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center bg-hy3n-bg/75 p-6 text-center"><p className="max-w-sm text-sm text-muted-foreground">No active ride has a saved pickup or destination coordinate yet. The map will update automatically when live ride coordinates are available.</p></div>}
    <div className="absolute bottom-3 left-3 z-[999] flex gap-3 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-white"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Searching</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Assigned</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> In progress</span></div>
  </div>;
}
