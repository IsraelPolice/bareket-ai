import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  onSnapshot, // נוסיף את onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB56oMLBTIZnrDf0Qbw2mRrb2acQiSrmac",
  authDomain: "bareket-ai.firebaseapp.com",
  projectId: "bareket-ai",
  storageBucket: "bareket-ai.firebasestorage.app",
  messagingSenderId: "809495614883",
  appId: "1:809495614883:web:c281b8b978252198f13616",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  auth,
  db,
  storage,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  onSnapshot, // נוסיף את onSnapshot לייצוא
  ref,
  uploadBytes,
  getDownloadURL,
};
