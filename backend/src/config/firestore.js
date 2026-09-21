// Firestore data layer for UPNEX.
//
// This is part (b) of the Firebase migration: an alternative to the Prisma/SQLite
// repository. It mirrors the document shapes defined in backend/prisma/schema.prisma
// so callers can move over collection by collection without a big-bang rewrite.
//
// DELIBERATE DESIGN CHOICE: every function returns plain data with ISO date
// strings, matching what the Prisma version returns through res.json(), so the
// frontend does not care which backend served the request. Firestore Timestamps
// would otherwise serialise to {"_seconds":..,"_nanoseconds":..} and break the UI.
//
// STATUS: provided as the migration target. Controllers still use Prisma until
// you switch them, which is what makes this deployable safely in stages.

import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getApps } from "firebase-admin/app";
import { adminAuth } from "./firebaseAdmin.js";

// Firestore needs the same credentials as Admin Auth, so reuse that app rather
// than initialising a second, competing default app.
let cachedDb = null;
export function db() {
  if (cachedDb) return cachedDb;
  // adminAuth() initialises the default app as a side effect; if credentials are
  // missing it returns null, which means we must not pretend Firestore is usable.
  if (!adminAuth()) return null;
  cachedDb = getFirestore(getApps()[0]);
  return cachedDb;
}

// Firestore returns Timestamp objects that JSON.stringify turns into
// {"_seconds":..,"_nanoseconds":..}. Convert to ISO strings so responses match
// the Prisma shape exactly.
function toISO(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function serialise(data) {
  if (!data) return null;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = toISO(value);
  }
  return out;
}

// Collection names. Kept in one place so a rename is a single edit.
export const COLLECTIONS = {
  users: "users",
  courses: "courses",
  lessons: "lessons",
  enrollments: "enrollments",
  progress: "progress",
  assessments: "assessments",
  assessmentResults: "assessmentResults",
  vaultDocuments: "vaultDocuments",
  academicMarks: "academicMarks",
  projects: "projects"
};

/* ------------------------------------------------------------------ users */

export async function getUser(userId) {
  const store = db();
  if (!store) return null;
  const snap = await store.collection(COLLECTIONS.users).doc(userId).get();
  return snap.exists ? { id: snap.id, ...serialise(snap.data()) } : null;
}

export async function upsertUser(userId, data) {
  const store = db();
  if (!store) return null;
  await store.collection(COLLECTIONS.users).doc(userId).set(
    { ...data, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return getUser(userId);
}

/* ------------------------------------------ per-user subcollections (vault,
   marks, projects) -------------------------------------------------------- */

// All three are user-owned lists, so one helper covers them. Each document gets
// an auto id unless the caller supplies one (which is what makes marks idempotent
// per subject, for example).
async function listForUser(collection, userId, orderField = "createdAt") {
  const store = db();
  if (!store) return [];
  const snap = await store
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(collection)
    .orderBy(orderField, "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...serialise(doc.data()) }));
}

async function addForUser(collection, userId, data, docId) {
  const store = db();
  if (!store) return null;
  const ref = docId
    ? store.collection(COLLECTIONS.users).doc(userId).collection(collection).doc(docId)
    : store.collection(COLLECTIONS.users).doc(userId).collection(collection).doc();
  await ref.set({ ...data, userId, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  const snap = await ref.get();
  return { id: snap.id, ...serialise(snap.data()) };
}

export const listVaultDocuments = (userId) =>
  listForUser(COLLECTIONS.vaultDocuments, userId);

export const addVaultDocument = (userId, data) =>
  addForUser(COLLECTIONS.vaultDocuments, userId, data);

export const listAcademicMarks = (userId) =>
  listForUser(COLLECTIONS.academicMarks, userId, "createdAt");

// Marks are unique per (user, subject) in the Prisma schema. Using the subject
// slug as the document id reproduces that constraint natively in Firestore.
export const upsertAcademicMark = (userId, data) => {
  const docId = data.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120);
  return addForUser(COLLECTIONS.academicMarks, userId, data, docId);
};

export const listProjects = (userId) => listForUser(COLLECTIONS.projects, userId);

export const addProject = (userId, data) =>
  addForUser(COLLECTIONS.projects, userId, data);

/* -------------------------------------------------- shared course content */

export async function listCourses() {
  const store = db();
  if (!store) return [];
  const snap = await store.collection(COLLECTIONS.courses).orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...serialise(doc.data()) }));
}

export async function getCourse(courseId) {
  const store = db();
  if (!store) return null;
  const snap = await store.collection(COLLECTIONS.courses).doc(courseId).get();
  if (!snap.exists) return null;
  const lessons = await store
    .collection(COLLECTIONS.courses)
    .doc(courseId)
    .collection(COLLECTIONS.lessons)
    .orderBy("order", "asc")
    .get();
  return {
    id: snap.id,
    ...serialise(snap.data()),
    lessons: lessons.docs.map((doc) => ({ id: doc.id, ...serialise(doc.data()) }))
  };
}
