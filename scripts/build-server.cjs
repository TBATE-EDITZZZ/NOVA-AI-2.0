const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["server/_core/index.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outdir: "dist"
}).then(() => {
  console.log("NOVA BACKEND BUILD SUCCESS");
}).catch(error => {
  console.error("NOVA BACKEND BUILD FAILED");
  console.error(error);
  process.exitCode = 1;
});
