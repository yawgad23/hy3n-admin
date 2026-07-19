import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDYUm2xv_8er3oGwk6qVXzAT51hoS4N4dE",
  authDomain: "hy3n26.firebaseapp.com",
  projectId: "hy3n26",
  storageBucket: "hy3n26.firebasestorage.app",
  messagingSenderId: "362594902321",
  appId: "1:362594902321:web:9387b08590e7660216d010",
  measurementId: "G-WH7JZPLP0L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const driverDocId = "eJ4268eRskR35T2U8Qom";
  console.log(`Manually approving driver: ${driverDocId}`);

  const driverRef = doc(db, "driver_profiles", driverDocId);
  await updateDoc(driverRef, {
    approval_status: "approved",
    status: "Active",
    updated_date: new Date().toISOString()
  });
  console.log("Updated driver_profiles status to approved!");

  // Create push notification in Firestore
  const now = new Date().toISOString();
  await addDoc(collection(db, "push_notifications"), {
    user_id: driverDocId,
    type: 'approval_approved',
    title: "You're Approved! 🎉",
    body: 'Welcome to HY3N! Your driver account is ready. Start driving and earning now.',
    read: false,
    created_date: now
  });
  console.log("Created push notification document!");
}

main().catch(console.error);
