// platform-polyfill.js
// Garante que global.Platform exista MESMO antes do runtime estar 100% pronto.
// Evita "[runtime not ready]: ReferenceError: Property 'Platform' doesn't exist".

(function () {
  try {
    // Tenta obter da lib oficial quando já estiver disponível
    const rn = require('react-native');
    if (rn && rn.Platform) {
      if (!global.Platform) global.Platform = rn.Platform;
      return;
    }
  } catch (_) {
    // segue para o fallback
  }

  // Fallback seguro: assume 'web' até o runtime inicializar
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
