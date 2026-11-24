import { describe, expect, it } from "vitest";
import { DRIVER_REVIEW_DOCUMENTS, canApproveDriverReview, driverDecisionPayload, driverReferenceSummary, parseDriverReview, safeDriverDocumentUrl } from "../src/lib/driverVerification";

const uid = "fixture-driver";
const revision = "a".repeat(64);
const url = (key, owner = uid) => `https://firebasestorage.googleapis.com/v0/b/hy3n26.firebasestorage.app/o/${encodeURIComponent(`drivers/${owner}/${key}.jpg`)}?alt=media&token=fixture-token`;
function fixture(count = 6, status = "pending") {
  return {
    account: { userId: uid, fullName: "Fixture Driver", approvalStatus: status, isTestDriver: false },
    manifest: { userId: uid, profileId: uid, approvalStatus: status, documentRevision: revision, documentsComplete: count === 6,
      documents: Object.fromEntries(DRIVER_REVIEW_DOCUMENTS.map((entry, index) => [entry.key, {
        required: entry.required, status: index < count ? "valid" : "missing", reference: index < count ? url(entry.key) : null,
      }])) },
  };
}

describe("fresh admin Driver document review", () => {
  it.each([0, 1, 5])("blocks ordinary approval with %i valid required files", (count) => {
    const review = parseDriverReview(fixture(count), uid);
    expect(review.documents).toHaveLength(8);
    expect(review.requiredValid).toBe(count);
    expect(canApproveDriverReview(review)).toBe(false);
    expect(() => driverDecisionPayload(review, "approved")).toThrow("All six");
  });
  it("allows manually confirmed six-required-file review while optional files are missing", () => {
    const review = parseDriverReview(fixture(), uid);
    expect(canApproveDriverReview(review)).toBe(true);
    expect(driverDecisionPayload(review, "approved")).toEqual({ approvalStatus: "approved", reason: "", documentRevision: revision });
  });
  it.each(DRIVER_REVIEW_DOCUMENTS.filter((entry) => entry.required).map((entry) => entry.key))("blocks an invalid required %s", (key) => {
    const data = fixture(); data.manifest.documents[key] = { required: true, status: "invalid", reference: null }; data.manifest.documentsComplete = false;
    expect(canApproveDriverReview(parseDriverReview(data, uid))).toBe(false);
  });
  it("does not silently trust the server completion boolean over its checklist", () => {
    const data = fixture(1); data.manifest.documentsComplete = true;
    expect(() => parseDriverReview(data, uid)).toThrow("inconsistent");
  });
  it("requires matching account/manifest UID and status", () => {
    for (const change of [data => { data.account.userId = "other"; }, data => { data.manifest.userId = "other"; }, data => { data.account.approvalStatus = "approved"; }]) {
      const data = fixture(); change(data); expect(() => parseDriverReview(data, uid)).toThrow();
    }
  });
  it.each([undefined, "", "old", "a".repeat(63), "g".repeat(64)])("requires a confirmed opaque revision: %s", (value) => {
    const data = fixture(); data.manifest.documentRevision = value; expect(() => parseDriverReview(data, uid)).toThrow();
  });
  it("requires all checklist entries, their policy and safe references", () => {
    for (const change of [data => { delete data.manifest.documents.licenseBack; }, data => { data.manifest.documents.licenseBack.required = false; }, data => { data.manifest.documents.licenseBack.reference = url("licenseBack", "other"); }]) {
      const data = fixture(); change(data); expect(() => parseDriverReview(data, uid)).toThrow();
    }
  });
  it("keeps all required labels including front/back and photos", () => {
    const labels = parseDriverReview(fixture(), uid).documents.filter(entry => entry.required).map(entry => entry.label);
    expect(labels).toEqual(["Ghana Card — front", "Ghana Card — back", "Driver’s licence — front", "Driver’s licence — back", "Driver photo", "Vehicle photo"]);
  });
  it("rejects unknown checks, already approved decisions and preview failures", () => {
    expect(canApproveDriverReview(null)).toBe(false);
    expect(canApproveDriverReview(parseDriverReview(fixture(6, "approved"), uid))).toBe(false);
    expect(canApproveDriverReview(parseDriverReview(fixture(), uid), true)).toBe(false);
  });
  it("preserves only a strict server-labelled supervised Test Driver exception", () => {
    const data = fixture(0); data.account.isTestDriver = true;
    expect(canApproveDriverReview(parseDriverReview(data, uid))).toBe(true);
    data.account.isTestDriver = "true";
    expect(canApproveDriverReview(parseDriverReview(data, uid))).toBe(false);
  });
  it("binds trimmed rejection reason to the exact reviewed revision", () => {
    expect(driverDecisionPayload(parseDriverReview(fixture(0), uid), "rejected", "  Missing card back  ")).toEqual({ approvalStatus: "rejected", reason: "Missing card back", documentRevision: revision });
  });
  it.each(["", "  ", "ab", "x".repeat(501)])("requires a meaningful bounded rejection reason", (reason) => {
    expect(() => driverDecisionPayload(parseDriverReview(fixture(), uid), "rejected", reason)).toThrow("3 and 500");
  });
  it("does not describe saved references as checked or uploaded", () => {
    expect(driverReferenceSummary({ documents: {} })).toBe("No saved references · Review checklist");
    expect(driverReferenceSummary({ documents: { ghanaCardFront: "file:///local.jpg" } })).toBe("1/6 required references · Check on review");
    expect(driverReferenceSummary({ documents: { vehicleRegistration: "registration-scan" } })).toBe("No saved references · Review checklist");
  });
});

describe("safe identity document links", () => {
  it("accepts only the validated UID-owned current Firebase download URL shape", () => {
    expect(safeDriverDocumentUrl(url("card"), uid)).toBe(url("card"));
  });
  it.each(["javascript:alert(1)", "file:///secret.jpg", "https://example.com/private.jpg", url("card", "other"), url("card").replace("hy3n26", "foreign"), url("card") + "&extra=true", url("card") + "#fragment", url("card").replace("drivers%2F", "drivers%252F"), url("card").replace("card.jpg", "%2E%2E%2Fcard.jpg")])("rejects unsafe link %s", (value) => {
    expect(safeDriverDocumentUrl(value, uid)).toBe(null);
  });
});
