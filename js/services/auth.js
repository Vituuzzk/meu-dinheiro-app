// js/auth.js
import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Função para iniciar login com Google (usando redirecionamento)
export async function loginComGoogle() {
  try {
    await signInWithRedirect(auth, provider);
    // O usuário será redirecionado para o Google e depois voltará automaticamente.
  } catch (error) {
    alert("❌ Erro ao iniciar login: " + error.message);
  }
}

// Função para capturar o resultado do redirecionamento quando o usuário voltar
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("✅ Login via redirect bem-sucedido:", result.user.displayName);
      return result.user;
    }
    return null;
  } catch (error) {
    alert("❌ Erro no redirecionamento: " + error.message);
    return null;
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
    console.log("👋 Logout realizado");
  } catch (error) {
    alert("Erro no logout: " + error.message);
  }
}

// Observador de estado de autenticação
export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}