import { createTypeDeclarations } from "../../rollup.common.config.js";

// Definizione degli entry points (deve essere sincronizzata con rollup.config.js)
const entries = [
  { name: "index", input: "index.ts" },
  { name: "index", input: "index.ts" },
  { name: "native", input: "native/index.ts" },
  { name: "ui", input: "ui/index.ts" },
  { name: "web", input: "web/index.ts" },
];

// Configurazione per le dichiarazioni TypeScript
export default createTypeDeclarations(entries);
