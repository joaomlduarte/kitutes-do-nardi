// index.js — ENTRY POINT ÚNICO do app (carrega antes de qualquer outra coisa)

// 1) Polyfill de Platform, pra evitar "[runtime not ready]: Property 'Platform' doesn't exist"
(function () {
  try {
    const rn = require('react-native');
    if (rn && rn.Platform) {
      if (!global.Platform) global.Platform = rn.Platform;
      return;
    }
  } catch (_) {}
  if (!global.Platform) {
    global.Platform = {
      OS: 'web',
      Version: 0,
      isTesting: false,
      select: (obj = {}) =>
        Object.prototype.hasOwnProperty.call(obj, 'web') ? obj.web : obj.default,
    };
  }
})();

// 2) (Opcional, mas ajuda) garantir Gesture Handler iniciado cedo
try { require('react-native-gesture-handler'); } catch {}

// 3) Registrar o App
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
