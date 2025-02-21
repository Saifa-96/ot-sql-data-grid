const typescript = require("@rollup/plugin-typescript");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const peerDependencies = require("rollup-plugin-peer-deps-external");
const commonjs = require("@rollup/plugin-commonjs");
import { dts } from "rollup-plugin-dts";

const typescriptOptions = {
  exclude: ["src/**/*.test.ts"],
  compilerOptions: { declaration: false, declarationDir: undefined },
};

const data = [
  {
    input: "src/index.ts",
    output: { file: "dist/index.js", format: "esm" },
    plugins: [
      typescript(typescriptOptions),
      nodeResolve(),
      commonjs(),
      peerDependencies(),
    ],
  },
  {
    input: "src/index.ts",
    output: { file: "dist/index.cjs", format: "cjs" },
    plugins: [
      typescript(typescriptOptions),
      nodeResolve(),
      commonjs(),
      peerDependencies(),
    ],
  },
  {
    input: "src/index.ts", // Entry point for dts plugin
    output: {
      file: "dist/index.d.ts", // Output declaration file
      format: "es",
    },
    plugins: [
      dts(), // Bundles declaration files
    ],
  },
];

module.exports = data;
