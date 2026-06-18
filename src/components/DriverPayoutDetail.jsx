import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { X, Receipt, TrendingUp, TrendingDown, CheckCircle, Clock, Calendar } from "lucide-react";

const statusColors = {
  Pending: "text-hy3n-gold bg-hy3n-gold/10",
  Processing: "text-blue-400 bg-blue-400/10",
  Paid: "text-hy3n-green bg-hy3n-green/10",
};

export default function DriverPayoutDetail({ driver, onClose, onUpdated }) {
  const [payouts, setPayouts] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const [ref, setRef] = useState("");
  const [method, setMethod] = useState("Mobile Money");

  useEffect(() => {
    Promise.all([
      firebaseClient.entities.Payout.filter({ driver_id: driver.id }, "-created_date", 100),
      firebaseClient.entities.Ride.filter({ driver_id: driver.id }, "-created_date", 200),
    ]).then(([p, r]) => {
      setPayouts(p);
      setRides(r.filter(r => r.status === "completed"));
      setLoading(false);
    });
  }, [driver.id]);

  const markPaid = async (payout) => {
    setMarking(payout.id);
    await firebaseClient.entities.Payout.update(payout.id, {
      status: "Paid",
      paid_date: new Date().toISOString(),
      payment_method: method,
      reference: ref || `PAY-${Date.now()}`,
    });
    const updated = await firebaseClient.entities.Payout.filter({ driver_id: driver.id }, "-created_date", 100);
    setPayouts(updated);
    setMarking(null);
    onUpdated();
  };

  const totalEarnings = rides.reduce((s, r) => s + (r.fare || 0), 0);
  const totalPaid = payouts.filter(p => p.status === "Paid").reduce((s, p) => s + (p.net_amount || 0), 0);
  const totalPending = payouts.filter(p => p.status === "Pending").reduce((s, p) => s + (p.net_amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-hy3n-surface border border-hy3n-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hy3n-border sticky top-0 bg-hy3n-surface z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hy3n-gold/15 border border-hy3n-gold/30 flex items-center justify-center text-hy3n-gold font-bold">
              {driver.full_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-white font-bold">{driver.full_name}</h2>
              <p className="text-xs text-muted-foreground">{driver.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-hy3n-gold/30 border-t-hy3n-gold rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <TrendingUp size={16} className="text-hy3n-green mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-lg font-bold text-white mt-0.5">GHS {totalEarnings.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{rides.length} rides</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <Clock size={16} className="text-hy3n-gold mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-hy3n-gold mt-0.5">GHS {totalPending.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{payouts.filter(p => p.status === "Pending").length} payouts</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <CheckCircle size={16} className="text-hy3n-green mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Paid Out</p>
                  <p className="text-lg font-bold text-hy3n-green mt-0.5">GHS {totalPaid.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{payouts.filter(p => p.status === "Paid").length} payouts</p>
                </div>
              </div>

              {/* Payment method for marking paid */}
              {payouts.some(p => p.status === "Pending") && (
                <div className="bg-hy3n-gold/5 border border-hy3n-gold/20 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">Payment Details (for marking as paid)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Payment Method</label>
                      <select value={method} onChange={e => setMethod(e.target.value)}
                        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                        {["Mobile Money","Bank Transfer","Cash"].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Reference (optional)</label>
                      <input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. TXN-12345"
                        className="w-full bg-hy3n-bg border border-hy3n-border text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-hy3n-gold/60" />
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction history */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt size={15} className="text-hy3n-gold" />
                  <h3 className="text-sm font-semibold text-white">Transaction History</h3>
                </div>
                {payouts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-hy3n-border rounded-xl">
                    No payouts generated yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payouts.map(p => (
                      <div key={p.id} className="bg-white/3 border border-hy3n-border rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">GHS {p.net_amount?.toFixed(2)}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{p.status}</span>
                            {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>Gross: GHS {p.gross_earnings?.toFixed(2)}</span>
                            <span>Commission: GHS {p.commission_deducted?.toFixed(2)}</span>
                            {p.ride_count && <span>{p.ride_count} rides</span>}
                            {p.paid_date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {new Date(p.paid_date).toLocaleDateString()}
                              </span>
                            )}
                            {p.reference && <span className="text-hy3n-gold">#{p.reference}</span>}
                          </div>
                        </div>
                        {p.status === "Pending" && (
                          <button onClick={() => markPaid(p)} disabled={marking === p.id}
                            className="shrink-0 flex items-center gap-1.5 text-xs bg-hy3n-green/10 text-hy3n-green border border-hy3n-green/30 hover:bg-hy3n-green/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            <CheckCircle size={13} />
                            {marking === p.id ? "Saving…" : "Mark Paid"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}