// All artwork URLs are resolved exclusively through the manifest.
let manifest = {};
export async function loadAssets() {
  const response = await fetch(new URL('./assets/manifest.json', import.meta.url));
  if (!response.ok) throw new Error('美术资源清单加载失败');
  manifest = await response.json();
}
export function assetURL(key) {
  if (!manifest[key]) throw new Error(`Unknown artwork: ${key}`);
  return new URL(manifest[key], import.meta.url).href;
}
export function artwork(key, alt = '', eager = false) {
  const img = document.createElement('img');
  img.alt = alt;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.src = assetURL(key);
  img.addEventListener('error', () => { img.hidden = true; }, { once: true });
  return img;
}
export function background(element, key) {
  element.style.backgroundImage = `url("${assetURL(key)}")`;
}
