// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABhYUJ0kiU89YIq7aHwCEBAIUP7x2j108",
  authDomain: "costpilotapp.firebaseapp.com",
  projectId: "costpilotapp",
  storageBucket: "costpilotapp.appspot.com",
  messagingSenderId: "472347026394",
  appId: "1:472347026394:web:06241fd9c10d0d6e386da5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);