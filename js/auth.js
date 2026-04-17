// js/auth.js
import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Função para fazer login com Google
export async function loginComGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("✅ Login bem-sucedido:", result.user.displayName);
    return result.user;
  } catch (error) {
    console.error("❌ Erro no login:", error);
    alert("Falha no login. Tente novamente.");
    return null;
  }
}

// Função para fazer logout
export async function logout() {
  try {
    await signOut(auth);
    console.log("👋 Logout realizado");
  } catch (error) {
    console.error("Erro no logout:", error);
    alert("Falha ao sair.");
  }
}

// Observa mudanças no estado de autenticação (login/logout)
export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}