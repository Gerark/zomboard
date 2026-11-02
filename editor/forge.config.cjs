const path = require('node:path');
const { version } = require('./package.json');

module.exports = {
  outDir: path.join(__dirname, 'out', version),
  packagerConfig: {
    asar: true,
    executableName: 'ZomBoard Quest Editor',
    ignore: [
      /^\/out(?:\/|$)/,
      /^\/spec(?:\/|$)/,
      /^\/(?:README\.md|forge\.config\.cjs|package-lock\.json|\.gitignore)$/
    ]
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['win32'] }]
};
