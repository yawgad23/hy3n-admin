import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  UserRoundX,
  X,
} from "lucide-react";
import { adminApi } from "@/api/adminApi";
import {
  canApproveDriverReview,
  driverDecisionPayload,
  parseDriverReview,
} from "@/lib/driverVerification";
import { driverApprovalDisplay } from "@/lib/driverApprovalDisplay";

const statusClasses = {
  valid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  missing: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  invalid: "border-red-500/30 bg-red-500/10 text-red-200",
};

export default function DriverDocumentReview({
  driver,
  initialAction = "review",
  onClose,
  onDecision,
}) {
  const [review, setReview] = useState(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [unavailableImages, setUnavailableImages] = useState([]);
  const generation = useRef(0);
  const controller = useRef(null);
  const dialog = useRef(null);
  const scrolling = useRef(null);
  const userId = driver.userId;

  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30000);
    setChecking(true);
    setReview(null);
    setError("");
    setUnavailableImages([]);
    try {
      const result = await adminApi.driverDocuments(userId, {
        signal: abort.signal,
      });
      if (requestGeneration !== generation.current) return;
      setReview(parseDriverReview(result, userId));
    } catch (err) {
      if (requestGeneration === generation.current)
        setError(
          err.name === "AbortError"
            ? "The document check timed out. Refresh and try again."
            : err.message || "Documents could not be checked. Try again.",
        );
    } finally {
      clearTimeout(timeout);
      if (requestGeneration === generation.current) setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    setNotice("");
    setReason("");
    setRejecting(initialAction === "reject");
    refresh();
    return () => {
      ++generation.current;
      controller.current?.abort();
    };
  }, [refresh, initialAction]);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (notice) scrolling.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [notice]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll(
        'button:not(:disabled), a[href], textarea, input, [tabindex="0"]',
      ),
    ];
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialog.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === dialog.current)
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const decide = async (approvalStatus) => {
    if (review?.manifest.approvalStatus === "approved") {
      setError(
        "This application is already approved. Use the separate account suspension control if needed.",
      );
      return;
    }
    let payload;
    try {
      payload = driverDecisionPayload(review, approvalStatus, reason);
    } catch (err) {
      setError(err.message);
      return;
    }
    if (approvalStatus === "approved") {
      if (!canApproveDriverReview(review, unavailableImages.length > 0)) return;
      const text =
        review.account.isTestDriver === true
          ? `Approve ${review.account.fullName} as a supervised Test Driver? This does not verify production documents.`
          : `Approve ${review.account.fullName}? Confirm that you have opened and reviewed both sides of the Ghana Card and licence, the Driver photo and vehicle photo.`;
      if (!window.confirm(text)) return;
    }
    const requestGeneration = ++generation.current;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Deliberately no automatic retry: a lost mutation response is unknown,
      // not permission to submit the decision a second time.
      const result = await adminApi.setDriverApproval(
        userId,
        payload.approvalStatus,
        payload.reason,
        payload.documentRevision,
      );
      if (requestGeneration !== generation.current) return;
      if (
        result?.account?.userId !== userId ||
        result.account.approvalStatus !== approvalStatus
      )
        throw new Error(
          "The decision response could not be confirmed. Refresh before trying again.",
        );
      setNotice(
        approvalStatus === "approved"
          ? "Driver approved — confirmed by the server."
          : `Driver rejected — confirmed by the server. Reason: ${result.account.rejectionReason || payload.reason}`,
      );
      setRejecting(false);
      setReason("");
      setReview(null);
      // Update the card only from the server-confirmed account. Keep this
      // dialog open so the decision and rejection reason remain visible.
      onDecision(result.account);
      if (result.manifest) {
        try {
          setReview(parseDriverReview(result, userId));
        } catch {
          setError(
            "The decision was saved, but its refreshed checklist could not be confirmed. Refresh before another decision.",
          );
        }
      } else {
        setSaving(false);
        await refresh();
      }
    } catch (err) {
      if (requestGeneration !== generation.current) return;
      setReview(null);
      setError(
        `${err.message || "The decision could not be confirmed."} Refresh the checklist before making another decision.`,
      );
      // A stale revision must never be silently replaced and resubmitted.
    } finally {
      if (requestGeneration === generation.current) setSaving(false);
    }
  };

  const account = review?.account || driver;
  const approvalDisplay = driverApprovalDisplay(account);
  const approved = approvalDisplay.status === "approved";
  const approvalEnabled =
    !checking &&
    !saving &&
    canApproveDriverReview(review, unavailableImages.length > 0);
  const canDecide = Boolean(review && !checking && !saving && !approved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-review-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-hy3n-border bg-hy3n-surface shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hy3n-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-hy3n-gold">
              Driver verification
            </p>
            <h2
              id="driver-review-title"
              className="mt-1 break-words text-lg font-bold text-white"
            >
              {account.fullName || "Driver application"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Review every required image. Saved files are not automatic
              approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close verification review"
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <div
          ref={scrolling}
          data-testid="driver-review-scroll"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6"
        >
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Driver type", account.serviceType],
              ["Vehicle", account.vehicle],
              ["Plate", account.plate],
              ["Contact", account.phone || account.email],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 break-words text-white">
                  {value || "Not recorded"}
                </p>
              </div>
            ))}
          </div>
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100"
            >
              {notice}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}
          {checking && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <RefreshCw size={16} className="animate-spin" /> Checking saved
              files with the server…
            </p>
          )}
          {review && (
            <>
              <div
                className={`rounded-xl border p-3 text-sm ${review.manifest.documentsComplete ? statusClasses.valid : statusClasses.missing}`}
              >
                <p className="font-semibold">
                  {review.requiredValid}/6 required files valid —{" "}
                  {review.manifest.documentsComplete
                    ? "Ready for administrator review"
                    : "Missing or invalid documents"}
                </p>
                <p className="mt-1 text-xs">
                  Storage checks confirm availability, not identity or document
                  authenticity. Verification: {approvalDisplay.label}. Login
                  account:{" "}
                  {account.accountStatus === "active"
                    ? "enabled (not approval)"
                    : account.accountStatus || "unknown"}
                  .
                </p>
              </div>
              {review.account.isTestDriver === true && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-100">
                  <strong>Supervised Test Driver.</strong> This server-labelled
                  account may use the existing test approval exception. It is
                  not production document verification.
                </div>
              )}
              {review.manifest.approvalStatus === "rejected" &&
                account.rejectionReason && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                    <strong>Rejection reason:</strong> {account.rejectionReason}
                  </div>
                )}
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-hy3n-gold" />
                <h3 className="font-semibold text-white">Document checklist</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {review.documents.map((entry) => {
                  const imageUnavailable = unavailableImages.includes(
                    entry.key,
                  );
                  const label = imageUnavailable
                    ? "Preview unavailable"
                    : entry.status === "valid"
                      ? "Ready for review"
                      : entry.status === "missing"
                        ? "Missing"
                        : "Invalid / unavailable file";
                  return (
                    <article
                      key={`${review.manifest.documentRevision}-${entry.key}`}
                      className="overflow-hidden rounded-xl border border-hy3n-border bg-hy3n-bg"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 p-3">
                        <div>
                          <h4 className="text-sm font-medium text-white">
                            {entry.label}
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.required
                              ? "Required"
                              : "Optional under current policy"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] ${imageUnavailable ? statusClasses.invalid : statusClasses[entry.status]}`}
                        >
                          {label}
                        </span>
                      </div>
                      {entry.status === "valid" ? (
                        <>
                          <a
                            href={entry.reference}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            aria-label={`Open ${entry.label}`}
                            className="block border-y border-hy3n-border bg-black/20"
                          >
                            {!imageUnavailable && (
                              <img
                                src={entry.reference}
                                alt={entry.label}
                                referrerPolicy="no-referrer"
                                className="h-40 w-full object-contain"
                                onError={() =>
                                  setUnavailableImages((current) =>
                                    current.includes(entry.key)
                                      ? current
                                      : [...current, entry.key],
                                  )
                                }
                              />
                            )}
                            {imageUnavailable && (
                              <p className="p-4 text-xs text-red-200">
                                The image could not be displayed. Open the file
                                or refresh; approval remains disabled while a
                                preview is unavailable.
                              </p>
                            )}
                          </a>
                          <a
                            href={entry.reference}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex items-center justify-between gap-2 p-3 text-xs font-medium text-hy3n-gold hover:bg-white/5"
                          >
                            <span>Open full image</span>
                            <ExternalLink size={14} />
                          </a>
                        </>
                      ) : (
                        <p className="px-3 pb-3 text-xs text-muted-foreground">
                          {entry.status === "missing"
                            ? "No saved reference for this document."
                            : "The reference, ownership, image type, token or saved file could not be validated."}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              {!review.manifest.documentsComplete && (
                <p className="flex gap-2 text-xs text-amber-200">
                  <AlertTriangle size={15} className="shrink-0" /> Ask the
                  Driver to complete or replace the listed documents. Do not
                  approve an ordinary Driver until all six required files are
                  valid.
                </p>
              )}
            </>
          )}
          {rejecting && !approved && (
            <label className="block text-sm text-white">
              Reason for rejection
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                rows={3}
                disabled={saving}
                placeholder="Explain which documents need correction."
                className="mt-2 w-full rounded-xl border border-hy3n-border bg-hy3n-bg p-3 text-sm outline-none focus:border-hy3n-gold"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                3–500 characters. The reason is saved with the decision.
              </span>
            </label>
          )}
        </div>

        <footer
          data-testid="driver-review-footer"
          className="shrink-0 border-t border-hy3n-border bg-hy3n-surface px-4 py-3 sm:px-6"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              {approved
                ? "Approved application — document view"
                : "Administrator decision"}
            </p>
            <span
              className={`text-xs font-semibold ${approved ? "text-emerald-300" : "text-amber-200"}`}
            >
              {approved && <BadgeCheck size={14} className="mr-1 inline" />}
              {approvalDisplay.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!approved && (
              <>
                <button
                  type="button"
                  disabled={rejecting || !approvalEnabled}
                  onClick={() => decide("approved")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {saving && !rejecting ? "Saving…" : "Approve Driver"}
                </button>
                <button
                  type="button"
                  disabled={!canDecide || rejecting}
                  onClick={() => {
                    setRejecting(true);
                    setError("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <UserRoundX size={15} /> Reject Driver
                </button>
                {rejecting && (
                  <>
                    <button
                      type="button"
                      disabled={
                        !canDecide ||
                        reason.trim().length < 3 ||
                        reason.trim().length > 500
                      }
                      onClick={() => decide("rejected")}
                      className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-xs font-semibold text-red-200 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Confirm rejection"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setRejecting(false)}
                      className="rounded-xl border border-hy3n-border px-3 py-2.5 text-xs text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
            {account.phone && (
              <a
                href={`tel:${account.phone}`}
                className="rounded-xl border border-hy3n-border px-3 py-2.5 text-xs font-medium text-white hover:bg-white/5"
              >
                Call Driver
              </a>
            )}
            <button
              type="button"
              disabled={checking || saving}
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hy3n-border px-3 py-2.5 text-xs text-white hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {approved
              ? "Already approved. You can inspect the saved documents here. Suspension is a separate account action."
              : checking
                ? "Decisions are disabled until the fresh server check completes."
                : !review
                  ? "Refresh required — the current document revision is not confirmed."
                  : rejecting
                    ? "Enter the rejection reason above, then confirm. No decision has been saved yet."
                    : unavailableImages.length
                      ? "An image preview failed. Refresh before approval."
                      : !review.manifest.documentsComplete &&
                          review.account.isTestDriver !== true
                        ? "Approval blocked: complete or replace the missing/invalid required files. You can still reject with a reason."
                        : "Review all required images, then approve or reject. Uploading files never saves an approval."}
          </p>
        </footer>
      </section>
    </div>
  );
}
