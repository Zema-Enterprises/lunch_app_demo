import ts from 'typescript';
const formatHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => '\n',
};
const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
if (!configPath) {
  console.error('tsconfig not found');
  process.exit(1);
}
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  console.error(ts.formatDiagnostic(configFile.error, formatHost));
  process.exit(1);
}
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');
const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (!diagnostics.length) {
  console.log('No diagnostics');
  process.exit(0);
}
for (const diagnostic of diagnostics) {
  console.log(ts.formatDiagnostic(diagnostic, formatHost));
}
console.log(`Found ${diagnostics.length} diagnostics`);
process.exit(1);
