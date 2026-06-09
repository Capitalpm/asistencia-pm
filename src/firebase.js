import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdFtl8-VH_Au-9di7g4d7yuEIFVHrkYz4",
  authDomain: "capital-pm-asistencia.firebaseapp.com",
  projectId: "capital-pm-asistencia",
  storageBucket: "capital-pm-asistencia.firebasestorage.app",
  messagingSenderId: "515513972298",
  appId: "1:515513972298:web:c81a611b6d8c59bda198b3",
  measurementId: "G-EJT5RCJ0NH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Firestore helpers ──────────────────────────────────────────────────────

const COMPANY_ID = "capital-pm-001";

// Company
export const fbGetCompany = async () => {
  try {
    const snap = await getDoc(doc(db, "companies", COMPANY_ID));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};
export const fbSetCompany = async (data) => {
  try { await setDoc(doc(db, "companies", COMPANY_ID), data); return true; }
  catch { return false; }
};

// Config
export const fbGetConfig = async () => {
  try {
    const snap = await getDoc(doc(db, "configs", COMPANY_ID));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};
export const fbSetConfig = async (data) => {
  try { await setDoc(doc(db, "configs", COMPANY_ID), data); return true; }
  catch { return false; }
};

// Employees
export const fbGetEmployees = async () => {
  try {
    const snap = await getDocs(collection(db, "companies", COMPANY_ID, "employees"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error("fbGetEmployees error:", e); return []; }
};
export const fbSetEmployees = async (employees) => {
  try {
    for (const emp of employees) {
      await setDoc(doc(db, "companies", COMPANY_ID, "employees", emp.id), emp);
    }
    return true;
  } catch { return false; }
};
export const fbDeleteEmployee = async (empId) => {
  try { await deleteDoc(doc(db, "companies", COMPANY_ID, "employees", empId)); return true; }
  catch { return false; }
};
export const fbSaveEmployee = async (emp) => {
  try {
    // Exclude photo from Firestore (too large for documents, keep in localStorage)
    const { photo, ...empData } = emp;
    await setDoc(doc(db, "companies", COMPANY_ID, "employees", emp.id), empData);
    return true;
  }
  catch(e) { console.error("fbSaveEmployee error:", e); return false; }
};

// Records
export const fbGetRecords = async () => {
  try {
    const snap = await getDocs(collection(db, "companies", COMPANY_ID, "records"));
    const recs = {};
    snap.docs.forEach(d => { recs[d.id] = d.data().entries || []; });
    return recs;
  } catch { return {}; }
};
export const fbSaveRecord = async (date, entries) => {
  try {
    await setDoc(doc(db, "companies", COMPANY_ID, "records", date), { entries });
    return true;
  } catch(e) { console.error("fbSaveRecord error:", e); return false; }
};
export const fbGetRecord = async (date) => {
  try {
    const snap = await getDoc(doc(db, "companies", COMPANY_ID, "records", date));
    return snap.exists() ? snap.data().entries || [] : [];
  } catch { return []; }
};

// Listen to records in real time (for admin dashboard)
export const fbListenRecords = (date, callback) => {
  return onSnapshot(
    doc(db, "companies", COMPANY_ID, "records", date),
    (snap) => callback(snap.exists() ? snap.data().entries || [] : []),
    () => callback([])
  );
};

// Listen to employees in real time
export const fbListenEmployees = (callback) => {
  return onSnapshot(
    collection(db, "companies", COMPANY_ID, "employees"),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
};
