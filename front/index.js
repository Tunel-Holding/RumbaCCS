import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './src/App';

/**
 * En versión web, react-navigation/stack aplica overflow:hidden y
 * position:absolute a cada pantalla, bloqueando el scroll nativo del navegador.
 *
 * Inyectamos CSS global que revierte esos estilos para que todas las
 * pantallas sean scrolleables de forma nativa en el browser.
 */
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.id = 'rn-web-scroll-fix';
  style.innerHTML = `
    /* ── Base reset ──────────────────────────────────────────────── */
    html, body {
      height: 100%;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      background-color: #0f172a;
      margin: 0;
      padding: 0;
    }

    /* Contenedor raíz de Expo */
    #root {
      height: auto !important;
      min-height: 100%;
      overflow: visible !important;
      display: flex;
      flex-direction: column;
    }

    /* ── Contenedores del NavigationContainer ────────────────────── */
    /*
     * react-navigation renderiza varios divs anidados entre el #root y
     * la pantalla real. Todos necesitan permitir overflow para que el
     * contenido de la pantalla pueda crecer más allá del viewport.
     */
    #root > div,
    #root > div > div,
    #root > div > div > div {
      overflow: visible !important;
      height: auto !important;
      flex-shrink: 0;
    }

    /* ── Contenedores de la "card" del stack ─────────────────────── */
    /*
     * Cada pantalla del Stack.Navigator se monta dentro de un div que
     * react-navigation llama "card". Por defecto tiene:
     *   position: absolute; top: 0; bottom: 0; overflow: hidden
     * Lo convertimos en un bloque normal del flujo del documento.
     */
    [data-testid="card-container"],
    [data-testid="stack-item"],
    .r-overflow-hidden {
      overflow: visible !important;
      height: auto !important;
    }

    /*
     * Selector genérico de emergencia: cualquier div dentro de #root
     * que tenga overflow:hidden Y position:absolute con bottom:0
     * (el patrón exacto del card container de react-navigation).
     * Esto asegura compatibilidad con distintas versiones de la lib.
     */
    #root * {
      max-height: none !important;
    }

    /* ── Scrollbar personalizado (Chromium / Safari) ─────────────── */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
  `;
  document.head.appendChild(style);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
