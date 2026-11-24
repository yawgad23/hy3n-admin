export const DRIVER_REVIEW_DOCUMENTS = [
  { key: "ghanaCardFront", label: "Ghana Card — front", required: true, accountKey: "ghanaCardFront" },
  { key: "ghanaCardBack", label: "Ghana Card — back", required: true, accountKey: "ghanaCardBack" },
  { key: "licenseFront", label: "Driver’s licence — front", required: true, accountKey: "driverLicenseFront" },
  { key: "licenseBack", label: "Driver’s licence — back", required: true, accountKey: "driverLicenseBack" },
  { key: "profilePhoto", label: "Driver photo", required: true, accountKey: "profilePhoto" },
  { key: "vehiclePhoto", label: "Vehicle photo", required: true, accountKey: "vehiclePhoto" },
  { key: "insurance", label: "Insurance", required: false, accountKey: "insurance" },
  { key: "roadworthy", label: "Roadworthy certificate", required: false, accountKey: "roadworthy" },
];

export function safeDriverDocumentUrl(value, userId) {
  if (typeof value !== "string" || value.length > 4000 || value !== value.trim()) return null;
  try {
    const url = new URL(value);
    if (!value.startsWith("https://firebasestorage.googleapis.com/v0/b/") || url.protocol !== "https:" ||
      url.hostname !== "firebasestorage.googleapis.com" || url.username || url.password || url.port || url.hash) return null;
    const match = /^\/v0\/b\/(hy3n26\.(?:firebasestorage\.app|appspot\.com))\/o\/([^/]+)$/.exec(url.pathname);
    if (!match || url.pathname !== value.split("?")[0].slice("https://firebasestorage.googleapis.com".length)) return null;
    if (url.searchParams.getAll("alt").length !== 1 || url.searchParams.get("alt") !== "media" ||
      url.searchParams.getAll("token").length !== 1 || !/^[A-Za-z0-9_-]+$/.test(url.searchParams.get("token") || "")) return null;
    for (const key of url.searchParams.keys()) if (key !== "alt" && key !== "token") return null;
    const objectPath = decodeURIComponent(match[2]);
    if (/[\\%\s\x00-\x1f\x7f?#]/.test(objectPath)) return null;
    const parts = objectPath.split("/");
    if (parts.length < 3 || !["drivers", "driver-documents"].includes(parts[0]) || parts[1] !== userId ||
      parts.some((part) => !part || part === "." || part === "..")) return null;
    return value;
  } catch { return null; }
}

export function parseDriverReview(result, userId) {
  const account = result?.account;
  const manifest = result?.manifest;
  if (!account || !manifest || account.userId !== userId || manifest.userId !== userId ||
    typeof manifest.profileId !== "string" || !manifest.profileId ||
    !/^[a-f0-9]{64}$/.test(manifest.documentRevision || "") ||
    !["pending", "approved", "rejected"].includes(manifest.approvalStatus) ||
    account.approvalStatus !== manifest.approvalStatus) throw new Error("This Driver review could not be confirmed. Refresh the checklist.");
  const documents = DRIVER_REVIEW_DOCUMENTS.map((definition) => {
    const entry = manifest.documents?.[definition.key];
    if (!entry || entry.required !== definition.required || !["valid", "missing", "invalid"].includes(entry.status) ||
      (entry.status === "valid" && !safeDriverDocumentUrl(entry.reference, userId)) ||
      (entry.status !== "valid" && entry.reference !== null)) throw new Error("The document checklist could not be confirmed. Refresh before making a decision.");
    return { ...definition, status: entry.status, reference: entry.reference };
  });
  const requiredValid = documents.filter((document) => document.required && document.status === "valid").length;
  if (typeof manifest.documentsComplete !== "boolean" || manifest.documentsComplete !== (requiredValid === 6)) {
    throw new Error("The document completion check was inconsistent. Refresh the checklist.");
  }
  return { account, manifest, documents, requiredValid };
}

export function canApproveDriverReview(review, imagesUnavailable = false) {
  return Boolean(review && !imagesUnavailable && review.manifest.approvalStatus !== "approved" &&
    (review.manifest.documentsComplete || review.account.isTestDriver === true));
}

export function driverDecisionPayload(review, approvalStatus, reason = "") {
  if (!review || !["approved", "rejected"].includes(approvalStatus)) throw new Error("Refresh the Driver review before deciding.");
  if (review.manifest.approvalStatus === "approved") throw new Error("This application is already approved. Suspension is a separate account action.");
  if (approvalStatus === "approved" && !canApproveDriverReview(review)) throw new Error("All six required files must be valid before approval.");
  const trimmedReason = reason.trim();
  if (approvalStatus === "rejected" && (trimmedReason.length < 3 || trimmedReason.length > 500)) {
    throw new Error("Enter a rejection reason between 3 and 500 characters.");
  }
  return { approvalStatus, reason: approvalStatus === "rejected" ? trimmedReason : "", documentRevision: review.manifest.documentRevision };
}

/** List fields are saved references only; their existence is checked on review. */
export function driverReferenceSummary(driver) {
  const count = DRIVER_REVIEW_DOCUMENTS.filter((definition) => definition.required &&
    typeof driver.documents?.[definition.accountKey] === "string" && driver.documents[definition.accountKey].trim()).length;
  return count ? `${count}/6 required references · Check on review` : "No saved references · Review checklist";
}
