// Stands in for the Tauri 2 API to show an app in an ordinary browser, without a backend.
// No command reaches Rust: data is empty unless window.__DESLOP_TAURI__ provides answers,
// for example { get_clients: [{ id: 1, name: 'Martin' }] }.
(() => {
  if (window.__TAURI_INTERNALS__) return;
  const defaults = {
    'plugin:sql|load': 'sqlite:deslop',
    'plugin:sql|select': [],
    'plugin:sql|execute': [0, 0],
    'plugin:event|listen': 1,
  };
  let nextId = 1;
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
    transformCallback(callback) {
      const id = nextId++;
      window[`_${id}`] = callback;
      return id;
    },
    unregisterCallback(id) {
      delete window[`_${id}`];
    },
    async invoke(command, args) {
      const mocks = window.__DESLOP_TAURI__ || {};
      const answer = command in mocks ? mocks[command] : defaults[command];
      if (typeof answer === 'function') return answer(args);
      if (answer !== undefined) return answer;
      // Without a provided answer: an empty list for what looks like a list, otherwise null
      return /^(list|search|find|fetch)_|s$/.test(command) ? [] : null;
    },
    convertFileSrc: (path) => path,
  };
  window.isTauri = true;
})();
