const { BrowserWindow } = require('electron');
const { checkImageBytes } = require('./asset-library.cjs');

const workers = new Set();
let queue = Promise.resolve();
async function decodeImage(bytes, extension) {
  checkImageBytes(bytes, extension);
  const worker = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: 'image-inspection' } });
  workers.add(worker);
  worker.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  worker.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  worker.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'file://*/*'] }, (_details, callback) => callback({ cancel: true }));
  let timer;
  try {
    const work = async () => {
      await worker.loadURL('data:text/html,' + encodeURIComponent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; base-uri \'none\'">'));
      const data = `data:image/${extension === '.svg' ? 'svg+xml' : 'png'};base64,${bytes.toString('base64')}`;
      const svg = extension === '.svg' ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : null;
      return worker.webContents.executeJavaScript(`(async () => {
        const svg = ${JSON.stringify(svg)};
        if (svg !== null) {
          const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
          if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg' || doc.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error('The file is not a valid SVG image.');
          if (doc.querySelector('script, foreignObject')) throw new Error('SVG scripts and embedded HTML are unsupported.');
          for (const node of doc.querySelectorAll('*')) for (const attribute of node.attributes) {
            if (/^on/i.test(attribute.name)) throw new Error('SVG event handlers are unsupported.');
            if (attribute.localName === 'href' && attribute.value && !attribute.value.startsWith('#') && !attribute.value.startsWith('data:image/')) throw new Error('SVG images must be self-contained.');
          }
          if (/@import|url\\(\\s*['\"]?(?:https?:|file:|[/][/])/i.test(svg)) throw new Error('SVG images must be self-contained.');
        }
        const image = new Image(); image.src = ${JSON.stringify(data)};
        await image.decode();
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height || width > 4096 || height > 4096 || width * height > 8000000) throw new Error('Images must fit 4096 per dimension and 8,000,000 pixels.');
        const scale = Math.min(1, 400 / width, 240 / height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return { width, height, preview: canvas.toDataURL('image/png') };
      })()`);
    };
    return await Promise.race([work(), new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Image decoding timed out.')), 10000); })]);
  } finally { clearTimeout(timer); workers.delete(worker); if (!worker.isDestroyed()) worker.destroy(); }
}

function inspectImage(bytes, extension) {
  const result = queue.then(() => decodeImage(bytes, extension));
  queue = result.catch(() => {});
  return result;
}

function closeImageInspectors() { for (const worker of workers) if (!worker.isDestroyed()) worker.destroy(); }
module.exports = { inspectImage, closeImageInspectors };
