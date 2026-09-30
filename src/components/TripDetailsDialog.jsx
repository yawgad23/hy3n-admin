import { useEffect, useState } from "react";
import { AlertTriangle, Car, Clock3, LoaderCircle, MapPin, Phone, User, X } from "lucide-react";
import { adminApi } from "@/api/adminApi";

function displayTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function detailValue(value) {
  return value || "Not available";
}

function PersonCard({ title, person, driver = false }) {
  if (!person) {
    return <section className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p><p className="mt-2 text-sm text-muted-foreground">No Driver has been matched to this trip.</p></section>;
  }
  const Icon = driver ? Car : User;
  return <section className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Icon size={14} /> {title}</div>
    <p className="text-base font-semibold text-white">{detailValue(person.name)}</p>
    <p className="mt-1 text-xs text-muted-foreground">Account: {detailValue(person.accountStatus)}</p>
    {person.phone && <a href={`tel:${person.phone}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-hy3n-gold px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"><Phone size={13} /> Call {title}</a>}
    {!person.phone && <p className="mt-3 text-xs text-muted-foreground">No verified phone is available for this account.</p>}
    {person.email && <p className="mt-3 break-all text-xs text-muted-foreground">{person.email}</p>}
    {driver && <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-muted-foreground"><p>Type: <span className="text-white">{detailValue(person.serviceType)}</span></p><p>Approval: <span className="text-white">{detailValue(person.approvalStatus)}</span></p><p>Vehicle: <span className="text-white">{detailValue(person.vehicle)}</span></p><p>Plate: <span className="text-white">{detailValue(person.plate)}</span></p></div>}
  </section>;
}

export default function TripDetailsDialog({ rideId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setDetail(null); setError("");
    adminApi.tripDetails(rideId).then((result) => {
      if (active) setDetail(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Trip details could not be loaded.");
    });
    return () => { active = false; };
  }, [rideId]);

  const trip = detail?.trip;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Protected trip details">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-hy3n-border bg-hy3n-surface shadow-2xl sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-hy3n-border bg-hy3n-surface px-5 py-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-hy3n-gold">Protected trip dossier</p><h2 className="mt-1 text-lg font-bold text-white">Matched Rider & Driver</h2><p className="mt-1 font-mono text-[11px] text-muted-foreground">{trip?.id || rideId}</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-white" aria-label="Close trip details"><X size={19} /></button>
      </header>
      {!detail && !error && <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin" /> Loading protected trip information…</div>}
      {error && <div className="m-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {detail && <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2"><PersonCard title="Rider" person={detail.rider} /><PersonCard title="Driver" person={detail.driver} driver /></div>
        {trip.bookingForOther && trip.bookingContact && <section className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm"><p className="font-semibold text-amber-300">Booked for another person</p><p className="mt-1 text-white">{detailValue(trip.bookingContact.name)}</p>{trip.bookingContact.phone && <a href={`tel:${trip.bookingContact.phone}`} className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-hy3n-gold hover:underline"><Phone size={13} /> Call trip recipient</a>}</section>}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><MapPin size={14} /> Trip</div><p className="text-sm text-white">{detailValue(trip.pickupAddress)}</p><p className="my-2 text-xs text-muted-foreground">to</p><p className="text-sm text-white">{detailValue(trip.destinationAddress)}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs"><p className="text-muted-foreground">Status <span className="ml-1 font-semibold capitalize text-white">{detailValue(trip.status)}</span></p><p className="text-muted-foreground">Category <span className="ml-1 font-semibold capitalize text-white">{detailValue(trip.category)}</span></p><p className="text-muted-foreground">Payment <span className="ml-1 font-semibold text-white">{detailValue(trip.paymentMethod)}</span></p><p className="text-muted-foreground">Final fare <span className="ml-1 font-semibold text-white">{trip.finalFare === null ? "—" : `GH₵${Number(trip.finalFare).toFixed(2)}`}</span></p></div></section>
        <section className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Clock3 size={14} /> Timeline</div><div className="grid gap-2 text-xs sm:grid-cols-2"><p className="text-muted-foreground">Booked <span className="ml-1 text-white">{displayTime(trip.createdAt)}</span></p><p className="text-muted-foreground">Matched <span className="ml-1 text-white">{displayTime(trip.matchedAt)}</span></p><p className="text-muted-foreground">Driver arrived <span className="ml-1 text-white">{displayTime(trip.arrivedAt)}</span></p><p className="text-muted-foreground">Trip started <span className="ml-1 text-white">{displayTime(trip.startedAt)}</span></p><p className="text-muted-foreground">Completed <span className="ml-1 text-white">{displayTime(trip.completedAt)}</span></p><p className="text-muted-foreground">Cancelled <span className="ml-1 text-white">{displayTime(trip.cancelledAt)}</span></p></div></section>
      </div>}
    </div>
  </div>;
}
