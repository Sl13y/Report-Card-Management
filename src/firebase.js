import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBUdbekXRBui9UsrAZPcPHQFreiSMHv5go",
  authDomain: "track-class-da907.firebaseapp.com",
  projectId: "track-class-da907",
  storageBucket: "track-class-da907.firebasestorage.app",
  messagingSenderId: "508952436799",
  appId: "1:508952436799:web:d12e268b6c393aed27188a",
  measurementId: "G-WJ8S1QTGBV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };