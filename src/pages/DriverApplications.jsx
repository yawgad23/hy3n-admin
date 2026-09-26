import { Navigate } from "react-router-dom";

/**
 * Legacy application review used direct browser-to-Firestore writes. The secure
 * Driver screen now contains the document review and approval workflow.
 */
export default function DriverApplications() {
  return <Navigate to="/drivers" replace />;
}
