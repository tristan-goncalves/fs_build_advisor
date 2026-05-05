import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "FS Build Advisor",
  version: pkg.version,
  description: pkg.description,

  action: {
    default_title: "FS Build Advisor — ouvrir le panneau",
  },

  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },

  side_panel: {
    default_path: "src/sidepanel/index.html",
  },

  options_page: "src/options/index.html",

  permissions: ["sidePanel", "storage", "declarativeNetRequestWithHostAccess"],

  host_permissions: [
    "http://localhost:11434/*",
    "http://127.0.0.1:11434/*",
  ],

  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
});
