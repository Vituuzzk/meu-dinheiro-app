// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// SUAS CHAVES AQUI (já preenchidas com o que você enviou)
const firebaseConfig = {
  apiKey: "AIzaSyByiPio8vzM6GwjvxBSpHA31k6hsZLwSa0",
  authDomain: "meu-dinheiro-app-c130f.firebaseapp.com",
  projectId: "meu-dinheiro-app-c130f",
  storageBucket: "meu-dinheiro-app-c130f.firebasestorage.app",
  messagingSenderId: "1096736887665",
  appId: "1:1096736887665:web:e4ce166a17d98523385cd0"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que vamos usar
export const db = getFirestore(app);
export const auth = getAuth(app);