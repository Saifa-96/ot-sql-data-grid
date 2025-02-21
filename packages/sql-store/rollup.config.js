const typescript = require("@rollup/plugin-typescript");
const peerDependencies = require("rollup-plugin-peer-deps-external");
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
      peerDependencies({
        includeDependencies: true,
      }),
    ],
  },
  {
    input: "src/index.ts",
    output: { file: "dist/index.cjs", format: "cjs" },
    plugins: [
      typescript(typescriptOptions),
      peerDependencies({
        includeDependencies: true,
      }),
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
