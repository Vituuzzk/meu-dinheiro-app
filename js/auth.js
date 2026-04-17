// js/auth.js
import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export async function loginComGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    alert("✅ Login bem-sucedido: " + result.user.displayName);
    return result.user;
  } catch (error) {
    // Mostra o erro em um pop-up no celular
    alert("❌ ERRO NO LOGIN:\n" + error.message + "\n\nCódigo: " + error.code);
    console.error(error);
    return null;
  }
}

export async function logout() {
  try {
    await signOut(auth);
    alert("👋 Logout realizado");
  } catch (error) {
    alert("Erro no logout: " + error.message);
  }
}

export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}