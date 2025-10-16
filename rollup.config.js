import peerDepsExternal from "rollup-plugin-peer-deps-external";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

// Plugin to remove 'use client', 'use server', and 'worklet' directives
const removeDirectives = () => ({
  name: 'remove-directives',
  transform(code, id) {
    if (id.includes('node_modules')) {
      const newCode = code
        .replace(/['"]use (client|server)['"];?\s*/g, '')
        .replace(/['"]worklet['"];?\s*/g, '');
      if (newCode !== code) {
        return { code: newCode, map: null };
      }
    }
    return null;
  }
});

// Centralized list of entry points. Each becomes dist/<name>/index.mjs and index.js
// Keep this list in sync with package.json exports.

const entries = [
  { name: "index", input: "index.ts", useNative: true }, // Special case: creates both index.mjs/js and index.native.mjs/js
  { name: "ui", input: "ui/index.ts" },
  { name: "native", input: "native/index.ts" },
  { name: "web", input: "web/index.ts" },
];

// Extra externals that might not be declared as peer deps but should not be bundled.
const extraExternal = [
  "react",
  "react/jsx-runtime",
  "react-native",
  "@react-native-firebase/app",
  "@react-native-firebase/auth",
  "firebase/app",
  "firebase/auth",
  "expo-linear-gradient",
  "expo-router",
  "@expo/vector-icons",
  "@react-native-community/datetimepicker",
  "react-native-reanimated",
  "react-native-worklets",
  "react-native-gesture-handler",
];

const dependencyNames = [
  ...Object.keys(pkg.peerDependencies ?? {}),
];

const isPackageExternal = (id) =>
  dependencyNames.some(
    (depName) => id === depName || id.startsWith(`${depName}/`)
  );

const isExtraExternal = (id) =>
  extraExternal.some(
    (depName) => id === depName || id.startsWith(`${depName}/`)
  );

// Check for React Native specific modules
const isReactNativeModule = (id) => {
  return id.startsWith('react-native/') || 
         id === 'react-native' ||
         id.startsWith('@react-native/') ||
         id.startsWith('@react-native-community/') ||
         id.startsWith('expo/') ||
         id.startsWith('expo-') ||
         id.startsWith('@expo/') ||
         id === 'expo';
};

// Centralized warning handler
const handleWarning = (warning, warn) => {
  // Ignore 'THIS_IS_UNDEFINED' warnings
  if (warning.code === "THIS_IS_UNDEFINED") return;
  
  // Ignore 'UNRESOLVED_IMPORT' for known external packages
  if (warning.code === "UNRESOLVED_IMPORT") {
    const unresolved = warning.source;
    if (
      unresolved === "react-native-worklets" ||
      unresolved?.startsWith("react-native-reanimated") ||
      unresolved?.startsWith("expo-") ||
      unresolved?.startsWith("@expo/")
    ) {
      return;
    }
  }
  
  // Ignore 'MODULE_LEVEL_DIRECTIVE' for worklet directives
  if (
    warning.code === "MODULE_LEVEL_DIRECTIVE" &&
    warning.message?.includes("worklet")
  ) {
    return;
  }
  
  // Ignore circular dependencies in third-party packages
  if (
    warning.code === "CIRCULAR_DEPENDENCY" &&
    warning.ids?.some(id => id.includes("node_modules"))
  ) {
    return;
  }
  
  warn(warning);
};

const extensions = [".mjs", ".js", ".json", ".ts", ".tsx"];

// Produce one config per entry (tree-shaking friendly, small output bundles)
/** @type {import('rollup').RollupOptions[]} */
const config = entries.flatMap(({ name, input, useNative }) => {
  const configs = [];
  const isRoot = name === "index";

  // ESM config
  configs.push({
    input,
    output: [
      {
        file: isRoot ? `dist/index.mjs` : `dist/${name}/index.mjs`,
        format: "esm",
        sourcemap: true,
        exports: "named",
      },
    ],
    external: (id) => isPackageExternal(id) || isExtraExternal(id) || isReactNativeModule(id),
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      removeDirectives(),
      peerDepsExternal(),
      nodeResolve({
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        preferBuiltins: false,
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: isRoot,
        declarationDir: isRoot ? "dist" : undefined,
        declarationMap: false,
        noForceEmit: true,
      }),
      json(),
      babel({
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        plugins: ["babel-plugin-react-compiler"],
        babelHelpers: "bundled",
        exclude: "node_modules/**",
      }),
    ],
    onwarn: handleWarning,
  });

  // CommonJS config (per React Native)
  configs.push({
    input,
    output: [
      {
        file: isRoot ? `dist/index.js` : `dist/${name}/index.js`,
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    external: (id) => isPackageExternal(id) || isExtraExternal(id) || isReactNativeModule(id),
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      removeDirectives(),
      peerDepsExternal(),
      nodeResolve({
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        preferBuiltins: false,
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false, // Declarations already generated by ESM config
        declarationMap: false,
        noForceEmit: true,
      }),
      json(),
      babel({
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        plugins: ["babel-plugin-react-compiler"],
        babelHelpers: "bundled",
        exclude: "node_modules/**",
      }),
    ],
    onwarn: handleWarning,
  });

  // Native configs for React Native (only for main index)
  if (useNative) {
    // Native ESM
    configs.push({
      input: "index.native.ts", // Use the native entry point
      output: [
        {
          file: `dist/index.native.mjs`,
          format: "esm",
          sourcemap: true,
          exports: "named",
        },
      ],
      external: (id) => isPackageExternal(id) || isExtraExternal(id) || isReactNativeModule(id),
      treeshake: {
        moduleSideEffects: false,
      },
      plugins: [
      removeDirectives(),
        peerDepsExternal(),
        nodeResolve({
          extensions: [
            ".native.ts",
            ".native.tsx",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
          ],
          preferBuiltins: false,
          browser: false,
        }),
        commonjs(),
        typescript({
          tsconfig: "./tsconfig.json",
          declaration: false, // Declarations already generated by web config
          declarationMap: false,
          noForceEmit: true,
        }),
        json(),
        babel({
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          plugins: ["babel-plugin-react-compiler"],
          babelHelpers: "bundled",
          exclude: "node_modules/**",
        }),
      ],
      onwarn: handleWarning,
    });

    // Native CommonJS
    configs.push({
      input: "index.native.ts",
      output: [
        {
          file: `dist/index.native.js`,
          format: "cjs",
          sourcemap: true,
          exports: "named",
        },
      ],
      external: (id) => isPackageExternal(id) || isExtraExternal(id) || isReactNativeModule(id),
      treeshake: {
        moduleSideEffects: false,
      },
      plugins: [
      removeDirectives(),
        peerDepsExternal(),
        nodeResolve({
          extensions: [
            ".native.ts",
            ".native.tsx",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
          ],
          preferBuiltins: false,
          browser: false,
        }),
        commonjs(),
        typescript({
          tsconfig: "./tsconfig.json",
          declaration: false,
          declarationMap: false,
          noForceEmit: true,
        }),
        json(),
        babel({
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          plugins: ["babel-plugin-react-compiler"],
          babelHelpers: "bundled",
          exclude: "node_modules/**",
        }),
      ],
      onwarn: handleWarning,
    });
  }

  return configs;
});

export default config;
