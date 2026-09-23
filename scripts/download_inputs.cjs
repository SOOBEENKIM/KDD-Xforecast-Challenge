#!/usr/bin/env node
// Restore original input bytes from the GitHub Release, verifying every part.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'input-manifest.json'), 'utf8'));
const args = process.argv.slice(2);
const destination = path.resolve(args[0] || 'data');
let selected;
if (args.length > 1) {
  if (args[1] !== '--only' || !args[2] || args.length !== 3) throw new Error('Usage: node scripts/download_inputs.cjs [data-directory] [--only relative/path,...]');
  selected = new Set(args[2].split(','));
}
if (!manifest.complete || manifest.schema_version !== 1 || manifest.repository !== 'SOOBEENKIM/KDD-Xforecast-Challenge') throw new Error('Unexpected input manifest');
const base = `https://github.com/${manifest.repository}/releases/download/${encodeURIComponent(manifest.release_tag)}/`;
const hash = () => crypto.createHash('sha256');

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (target.protocol !== 'https:' || !(target.hostname === 'github.com' || target.hostname.endsWith('.githubusercontent.com'))) return reject(new Error('Unexpected download host'));
    if (redirects > 5) return reject(new Error('Too many download redirects'));
    const req = https.get(target, { headers: { 'User-Agent': 'xforecast-input-restore' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume(); resolve(get(new URL(res.headers.location, target).href, redirects + 1));
      } else if (res.statusCode === 200) resolve(res);
      else { res.resume(); reject(new Error(`Download failed: HTTP ${res.statusCode}`)); }
    });
    req.setTimeout(180000, () => req.destroy(new Error('Download timed out')));
    req.on('error', reject);
  });
}

async function fileHash(file) {
  const h = hash(); for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

async function restore(file) {
  if (file.path.includes('\\') || file.path.split('/').some(p => !p || p === '.' || p === '..') || path.isAbsolute(file.path)) throw new Error('Unsafe manifest path');
  const target = path.join(destination, file.path);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const rootReal = await fsp.realpath(destination);
  const parentReal = await fsp.realpath(path.dirname(target));
  if (parentReal !== rootReal && !parentReal.startsWith(rootReal + path.sep)) throw new Error('Destination escapes data directory');
  if (fs.existsSync(target)) {
    if ((await fsp.stat(target)).size === file.size && await fileHash(target) === file.sha256) {
      console.log('Already verified: ' + file.path); return;
    }
    throw new Error('An existing file differs; refusing to overwrite: ' + target);
  }
  const temporary = target + `.download-${process.pid}`;
  let expectedOffset = 0;
  for (const part of file.parts) {
    if (part.offset !== expectedOffset || !Number.isSafeInteger(part.size) || part.size <= 0 || !/^[a-zA-Z0-9_.-]+$/.test(part.name)) throw new Error('Invalid manifest part');
    expectedOffset += part.size;
  }
  if (expectedOffset !== file.size) throw new Error('Invalid manifest file size');
  const handle = await fsp.open(temporary, 'wx');
  let closed = false, next = 0, received = 0, failure;
  const timer = setInterval(() => console.log(`Received ${received} / ${file.size} bytes: ${file.path}`), 30000);
  timer.unref();
  try {
    await handle.truncate(file.size);
    async function worker() {
      while (!failure && next < file.parts.length) {
        const part = file.parts[next++];
        console.log('Downloading: ' + part.name);
        const piece = hash(); let size = 0;
        try {
          for await (const chunk of await get(base + encodeURIComponent(part.name))) {
            if (size + chunk.length > part.size) throw new Error('Part exceeds expected size: ' + part.name);
            piece.update(chunk);
            for (let written = 0; written < chunk.length;) {
              const result = await handle.write(chunk, written, chunk.length - written, part.offset + size + written);
              if (!result.bytesWritten) throw new Error('Failed to write downloaded bytes');
              written += result.bytesWritten;
            }
            size += chunk.length; received += chunk.length;
          }
          if (size !== part.size || piece.digest('hex') !== part.sha256) throw new Error('Part checksum mismatch: ' + part.name);
          console.log('Part verified: ' + part.name);
        } catch (error) { failure = error; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, file.parts.length) }, worker));
    if (failure) throw failure;
    await handle.sync(); await handle.close(); closed = true;
    if (received !== file.size || await fileHash(temporary) !== file.sha256) throw new Error('Restored file checksum mismatch: ' + file.path);
    // A hard link installs the verified file without overwriting a concurrent file.
    await fsp.link(temporary, target); await fsp.unlink(temporary);
    console.log(`Verified: ${file.path} (${received} bytes)`);
  } catch (error) {
    if (!closed) await handle.close().catch(() => {});
    await fsp.unlink(temporary).catch(() => {}); throw error;
  } finally { clearInterval(timer); }
}

(async () => {
  if (selected) for (const name of selected) if (!manifest.files.some(file => file.path === name)) throw new Error('Unknown input: ' + name);
  const files = manifest.files.filter(file => !selected || selected.has(file.path));
  console.log(`Restoring ${files.length} file(s), ${files.reduce((sum, file) => sum + file.size, 0)} bytes to ${destination}`);
  for (const file of files) await restore(file);
  console.log('All selected inputs restored and SHA-256 verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
