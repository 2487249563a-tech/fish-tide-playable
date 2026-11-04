import { loadAssets, artwork, background, assetURL } from './assets.js';
import { availableTiers, effectiveMultiplier, ROUTES, CREW, RODS, SAVE_KEY, restoreState } from './rules.mjs';
const QUALITY = {
  white: { name: '白', label: '常见', dot: 'white' }, green: { name: '绿', label: '优良', dot: 'green' }, blue: { name: '蓝', label: '稀有', dot: 'blue' }, purple: { name: '紫', label: '史诗', dot: 'purple' }, orange: { name: '橙', label: '史诗+', dot: 'orange' }, red: { name: '红', label: '传说', dot: 'red' }, pink: { name: '粉', label: '传说+', dot: 'pink' }, black: { name: '黑', label: '神话', dot: 'black' }, prismatic: { name: '炫彩', label: '神话+', dot: 'prismatic' }, hongmeng: { name: '鸿蒙', label: '终焉', dot: 'hongmeng' },
};

let saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { /* Storage may be disabled. */ }
const state = restoreState(saved);
let voyageMultiplier = 1;
let currentPage = 'fish';
let assetsReady = false;
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, busy: false, version: 1 })); }
  catch { showToast('浏览器未允许保存进度，本次仍可继续游玩'); }
}
function resetDaily() {
  const date = new Date().toLocaleDateString('sv-SE');
  if (state.adDay !== date) { state.adDay = date; state.adUses = 0; }
}
const hasCrew = id => state.activeCrew.includes(id);
const nodePositions = [[6, 78], [17, 64], [29, 57], [39, 31], [52, 40], [63, 68], [77, 60], [88, 31], [96, 17]];
const nodes = document.querySelector('#routeNodes');
const ship = document.querySelector('#ship');

nodePositions.forEach(([x, y], index) => {
  const node = document.createElement('span');
  node.className = `node ${index < state.node ? 'done' : ''} ${index === state.node ? 'current' : ''} ${index % 3 === 0 ? 'event' : ''}`;
  node.style.left = `${x}%`; node.style.top = `${y}%`; node.dataset.index = index;
  nodes.append(node);
});

const $ = (selector) => document.querySelector(selector);
const format = (number) => number.toLocaleString('zh-CN');
const multiplierLabel = (value) => `${value >= 1000 ? '1K' : value}×`;
function availableMultipliers() {
  return availableTiers(state.stamina);
}
function syncMultiplier() {
  const available = availableMultipliers();
  // 体力不足时保留 1× 作为基础结算档，但它不会被列为可切换档位。
  if (!available.some((tier) => tier.value === state.multiplier)) state.multiplier = 1;
  const currentIndex = available.findIndex((tier) => tier.value === state.multiplier);
  const next = available.length > 1 ? available[(currentIndex + 1) % available.length] : null;
  $('#currentMultiplier').textContent = available.length ? multiplierLabel(state.multiplier) : '普通收益';
  $('#nextMultiplier').textContent = next ? multiplierLabel(next.value) : '暂无';
  $('#multiplierGate').textContent = available.length ? `当前体力可切换：${available.map((tier) => multiplierLabel(tier.value)).join('、')} · 门槛：体力 > 推荐体力×10` : '暂无可选档位，仍可普通出航 · 门槛：体力 > 推荐体力×10';
}
function cycleMultiplier() {
  if (state.busy) return;
  const available = availableMultipliers();
  if (!available.length) { showToast('当前体力不足以切换加倍档位'); return; }
  const currentIndex = available.findIndex((tier) => tier.value === state.multiplier);
  const next = available[(currentIndex + 1) % available.length];
  state.multiplier = next.value;
  renderStats();
  showToast(`已切换至 ${multiplierLabel(state.multiplier)} 奖励`);
}
function renderPosition() {
  const [x, y] = nodePositions[state.node];
  ship.style.left = `${x}%`; ship.style.top = `${y}%`;
  document.querySelectorAll('.node').forEach((node, index) => { node.classList.toggle('done', index < state.node); node.classList.toggle('current', index === state.node); });
  $('#nodeLabel').textContent = `第 ${state.node + 1} 节点`;
}
function renderStats() {
  resetDaily();
  syncMultiplier();
  $('#staminaValue').textContent = `${state.stamina}/${state.staminaMax}`;
  $('#coinValue').textContent = format(state.coins);
  $('#fishProgress').textContent = format(state.fish);
  $('#buttonMultiplier').textContent = availableMultipliers().length ? multiplierLabel(state.multiplier) : '普通';
  $('#multiplierHint').textContent = `消耗 1 体力 · 点击“体力”切换`;
  $('#sailButton').disabled = state.busy || state.stamina <= 0 || state.durability <= 0;
  $('#adButton').disabled = state.adUses >= 5 || state.busy;
  $('#staminaToggle').disabled = state.busy || !availableMultipliers().length;
  $('#staminaToggle').setAttribute('aria-label', `体力，${availableMultipliers().length ? '当前' + multiplierLabel(state.multiplier) + '，点击循环切换' : '暂无可用倍率'}`);
  if (assetsReady) renderRoute();
  if (!state.busy) save();
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const fishPool = [
  { name: '月光沙丁鱼', quality: 'white', emoji: '🐟', asset: 'fish_moon_sardine_white', min: 8, max: 16, weight: [0.2, 0.6], length: [12, 24], desc: '银色鱼群在月光下拐过船舷。' },
  { name: '霓虹鲷', quality: 'green', emoji: '🐠', asset: 'fish_neon_snapper_green', min: 5, max: 12, weight: [0.8, 1.6], length: [24, 38], desc: '鳞片像霓虹灯一样亮起。' },
  { name: '深潮鳗', quality: 'blue', emoji: '🪱', asset: 'fish_deep_tide_eel_blue', min: 3, max: 8, weight: [2, 4.5], length: [45, 80], desc: '深潮里游来的蓝色长影。' },
  { name: '星陨旗鱼', quality: 'purple', emoji: '🦄', asset: 'fish_starfall_marlin_purple', min: 2, max: 4, weight: [8, 15], length: [110, 165], desc: '额角拖着星屑的幻想旗鱼！', rare: true },
  { name: '炽冠鲸鲨', quality: 'red', emoji: '🐋', asset: 'fish_crown_whaleshark_red', min: 1, max: 2, weight: [60, 120], length: [420, 680], desc: '赤色光冠划开整片海面。', rare: true, legendary: true },
  { name: '虚空海龙', quality: 'prismatic', emoji: '🐉', asset: 'fish_void_seadragon_prismatic', min: 1, max: 1, weight: [180, 360], length: [720, 980], desc: '来自裂隙彼端的神话海龙！', rare: true, legendary: true, mythic: true },
];
function randomBetween(min, max) { return min + Math.random() * (max - min); }
function pickFish() {
  const roll = Math.min(.999, Math.random() + state.route * .025 + (hasCrew('ache') ? .05 : 0) + (state.rod === 'deep' ? .08 : 0));
  let fish = roll > .975 ? fishPool[5] : roll > .91 ? fishPool[4] : roll > .77 ? fishPool[3] : roll > .58 ? fishPool[2] : roll > .31 ? fishPool[1] : fishPool[0];
  if (fish === fishPool[3] && state.route > 0 && Math.random() > .5) fish = { ...fish, quality: 'orange', asset: 'fish_starfall_marlin_legendary' };
  if (fish === fishPool[4] && state.route > 0 && Math.random() > .5) fish = { ...fish, quality: 'black', asset: 'fish_crown_whaleshark_mythic', mythic: true };
  if (fish === fishPool[5] && state.route === 2 && Math.random() > .5) fish = { ...fish, quality: 'hongmeng', asset: 'fish_void_seadragon_hongmeng' };
  // 10×以上仍放大数量，但不会改变单条鱼的体重和长度。
  return { ...fish, count: Math.max(1, Math.floor(randomBetween(fish.min, fish.max + 1) * voyageMultiplier * (state.rod === 'floating' ? 1.2 : state.rod === 'hongmeng' ? 1.5 : 1))), weight: randomBetween(...fish.weight).toFixed(1), length: Math.round(randomBetween(...fish.length)) };
}
function setEvent({ pill, title, description, emoji, quality = 'white', reward, art = '', asset, rare = false }) {
  const q = QUALITY[quality];
  $('#eventPill').textContent = pill;
  $('#eventTitle').textContent = title;
  $('#eventDescription').textContent = description;
  $('#rewardLine').innerHTML = `<span class="rarity-dot ${q.dot}"></span><b>${q.name} · ${q.label}</b><span>${reward}</span>`;
  const artNode = document.querySelector('.event-art'); artNode.textContent = emoji; artNode.className = `event-art ${art}`;
  const eventAssets = { '友善船只': 'event_friendly_sea_salt', '强制战斗': 'event_pirate_battle', '潮汐海岛': 'event_coral_supply_island', '神秘商队': 'event_starfan_merchant', '海怪出没': 'event_sea_monster_lure', '潮印发现': 'event_lighthouse_tide_seal', '海心回响': 'event_hongmeng_seaheart' };
  if (assetsReady) {
    artNode.replaceChildren(artwork(asset || eventAssets[pill] || 'fish_moon_sardine_white', title));
    background($('#eventCard'), rare ? 'ui_card_rare' : 'ui_card_event');
    const strip = document.createElement('span'); strip.className = 'quality-strip'; strip.setAttribute('aria-hidden', 'true');
    // The delivered atlas has ten segments with padding; crop its colored center.
    strip.style.backgroundImage = `url("${assetURL('ui_quality_strips')}")`;
    strip.style.backgroundPosition = `${2.1 + Object.keys(QUALITY).indexOf(quality) * 10.65}% 50%`;
    $('#rewardLine').prepend(strip);
  }
  $('#eventCard').classList.toggle('rare', rare);
}
function resolveFish() {
  const fish = pickFish(); state.fish += fish.count; state.cargo += fish.count;
  const q = QUALITY[fish.quality];
  const bonusText = voyageMultiplier > 1 ? ` · ${voyageMultiplier >= 1000 ? '1K' : voyageMultiplier}× 放鱼` : '';
  setEvent({ pill: fish.mythic ? '神话钓获' : fish.legendary ? '传说钓获' : '钓鱼成功', title: `${fish.name} 入网`, description: `${fish.desc} 单条 ${fish.weight} kg · ${fish.length} cm`, emoji: fish.emoji, asset: fish.asset, quality: fish.quality, reward: `+${format(fish.count)} 条${bonusText}`, art: fish.mythic ? 'mythic-art' : fish.rare ? 'legendary-art' : '', rare: fish.rare });
  if (fish.rare) showToast(`${q.name}品质！海面出现稀有光柱`); else showToast(`收获 ${format(fish.count)} 条${fish.name}`);
}
function resolveEncounter() {
  const roll = Math.random();
  if (roll < .58) { resolveFish(); return; }
  if (roll < .72) {
    const gain = Math.floor(30 * voyageMultiplier * (hasCrew('lanlan') ? 1.2 : 1)); state.coins += gain;
    setEvent({ pill: '友善船只', title: '遇见「海盐号」', description: '交换了航线情报，对方送来一箱闪亮贝币。', emoji: '⚓', quality: 'green', reward: `+${format(gain)} 金币` }); showToast('友善互动成功'); return;
  }
  if (roll < .82) {
    const win = Math.random() > Math.max(.02, .2 - (hasCrew('huoli') ? .15 : 0) - (state.shipLevel - 1) * .01); const gain = win ? Math.floor(80 * voyageMultiplier * (state.rod === 'storm' ? 1.25 : 1)) : 0;
    if (win) state.coins += gain; else state.durability = Math.max(0, state.durability - 1); setEvent({ pill: '强制战斗', title: win ? '击退黑潮海盗' : '海盗掠过船舷', description: win ? '炮手抓住风向，夺回了补给箱。' : '船身轻微受损，先回到安全航线。', emoji: win ? '⚔️' : '🏴‍☠️', quality: win ? 'orange' : 'red', reward: win ? `+${format(gain)} 金币` : '耐久 -1', art: 'legendary-art', rare: win }); showToast(win ? '战斗胜利，战利品已加倍' : '战斗失败，损失 1 点耐久'); return;
  }
  if (roll < .91) { const gain = Math.floor(12 * voyageMultiplier * (hasCrew('mia') ? 1.3 : 1)); state.coins += gain; setEvent({ pill: '潮汐海岛', title: '靠岸 · 珊瑚补给岛', description: '岛民将多余补给换成金币，潮汐加倍也生效了。', emoji: '🏝️', quality: 'blue', reward: `+${format(gain)} 金币` }); showToast('海岛补给已入舱'); return; }
  if (roll < .94) { const gain = 25 * voyageMultiplier; state.coins += gain; setEvent({ pill: '海怪出没', title: '引开深海巨影', description: '投下诱饵，海怪留下了一袋沉船金币。', reward: `+${format(gain)} 金币`, quality: 'purple' }); return; }
  if (roll < .97) { const gain = 40 * voyageMultiplier; state.coins += gain; setEvent({ pill: state.route === 2 ? '海心回响' : '潮印发现', title: state.route === 2 ? '鸿蒙海心苏醒' : '点亮搁浅灯塔', description: '潮光照亮了前路，古老的宝箱浮上海面。', reward: `+${format(gain)} 金币`, quality: state.route === 2 ? 'hongmeng' : 'blue', rare: true }); return; }
  const gain = 60 * voyageMultiplier; state.coins += gain; setEvent({ pill: '神秘商队', title: '遇见星帆商队', description: '商队用闪亮晶核换走了你的多余鱼饵。', emoji: '🧭', quality: 'purple', reward: `+${format(gain)} 金币`, rare: true }); showToast('商队交易完成');
}

async function sail() {
  if (state.busy || state.stamina <= 0 || state.durability <= 0) return;
  voyageMultiplier = effectiveMultiplier(state.stamina, state.multiplier);
  state.busy = true; state.stamina -= 1; renderStats(); $('#statusMessage').textContent = '船帆已张开，正在自动航行…'; ship.classList.add('sailing');
  state.node = (state.node + 1) % nodePositions.length; renderPosition(); await wait(1450); ship.classList.remove('sailing'); $('#statusMessage').textContent = '抵达节点，正在侦测海面…'; await wait(500); resolveEncounter(); state.busy = false; renderStats(); $('#statusMessage').textContent = state.durability <= 0 ? '耐久耗尽，请到船坞免费应急修理' : state.stamina ? '点击出航，自动沿海图前进' : '体力不足，请领取补给或到商店购买';
}
$('#staminaToggle').addEventListener('click', cycleMultiplier);
$('#sailButton').addEventListener('click', sail);
$('#adButton').addEventListener('click', async () => {
  resetDaily();
  if (state.adUses >= 5 || state.busy) return;
  state.busy = true; renderStats();
  showToast('港口正在装载补给…');
  await wait(900);
  state.adUses += 1; state.stamina += 10; state.busy = false;
  renderStats(); renderPage(); showToast('体力 +10，今日剩余 ' + (5 - state.adUses) + ' 次');
});
$('#settingsButton').addEventListener('click', () => showToast('进度自动保存在本机浏览器；每日可领取 5 次演示补给'));

function renderRoute() {
  const route = ROUTES[state.route];
  $('#routeTitle').textContent = route.name;
  $('.map-heading .eyebrow').textContent = `CURRENT ROUTE · 0${state.route + 1}`;
  $('#routeGoal').textContent = `/ ${format(route.goal)} 条`;
  background($('#mapViewport'), route.art);
}
function action(label, callback, disabled = false) {
  const button = document.createElement('button');
  button.className = 'page-action'; button.textContent = label; button.disabled = disabled || state.busy;
  button.addEventListener('click', () => {
    if (state.busy) return;
    callback(); renderStats(); renderPage();
  });
  return button;
}
function spend(cost, callback) {
  if (state.coins < cost) { showToast('金币不足，出航或出售渔获可获得金币'); return; }
  state.coins -= cost; callback();
}
function panel(title, description, art) {
  const card = document.createElement('article'); card.className = 'inventory-card';
  if (art) card.append(artwork(art, title));
  const copy = document.createElement('div'); copy.className = 'inventory-copy';
  const h = document.createElement('h3'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = description;
  copy.append(h, p); card.append(copy);
  return { card, copy };
}
function renderPage() {
  if (currentPage === 'crew') {
    const list = $('#crewList'); list.replaceChildren();
    CREW.forEach(crew => {
      const owned = state.crew.includes(crew.id), active = hasCrew(crew.id);
      const { card, copy } = panel(crew.name, crew.skill, crew.art);
      copy.append(action(!owned ? `招募 · ${crew.cost} 金币` : active ? '下阵' : '上阵', () => {
        if (!owned) spend(crew.cost, () => { state.crew.push(crew.id); if (state.activeCrew.length < 3) state.activeCrew.push(crew.id); showToast('招募成功'); });
        else if (active) state.activeCrew = state.activeCrew.filter(id => id !== crew.id);
        else if (state.activeCrew.length < 3) state.activeCrew.push(crew.id);
        else showToast('最多上阵 3 人，请先让一名伙伴下阵');
      }, !owned && state.coins < crew.cost));
      list.append(card);
    });
  }
  if (currentPage === 'shipyard') {
    const list = $('#shipyardContent'); list.replaceChildren();
    const max = 5 + state.shipLevel - 1;
    const { card, copy } = panel(`逐潮号 · Lv.${state.shipLevel}`, `耐久 ${state.durability}/${max} · 基础体力容量 ${state.staminaMax}（补给可溢出）`);
    copy.append(action(`升级 · ${state.shipLevel * 200} 金币`, () => spend(state.shipLevel * 200, () => {
      state.shipLevel += 1; state.staminaMax += 5; state.stamina += 5; state.durability = 5 + state.shipLevel - 1;
      showToast('船只升级，体力 +5，耐久全满');
    }), state.shipLevel >= 10 || state.coins < state.shipLevel * 200));
    copy.append(action('修理 · 50 金币', () => spend(50, () => { state.durability = max; }), state.durability === max || state.coins < 50));
    if (!state.durability) copy.append(action('免费应急修理 · 恢复 1 耐久', () => { state.durability = 1; }));
    list.append(card);
    ROUTES.forEach((route, index) => {
      const unlocked = state.fish >= route.unlock;
      // Locked routes use text only, so their artwork is not downloaded early.
      const { card, copy } = panel(route.name, unlocked ? `累计捕鱼目标 ${route.goal} 条` : `累计捕鱼 ${route.unlock} 条后开放`);
      copy.append(action(index === state.route ? '当前航线' : unlocked ? '前往航线' : '尚未解锁', () => {
        if (!unlocked) return;
        state.route = index; state.node = 0; renderPosition(); switchPage('fish');
      }, !unlocked || index === state.route)); list.append(card);
    });
  }
  if (currentPage === 'shop') {
    const list = $('#shopContent'); list.replaceChildren();
    const { card, copy } = panel('港口补给', `鱼舱 ${format(state.cargo)} 条 · 累计捕鱼 ${format(state.fish)} 条（出售不影响航线解锁）`);
    copy.append(action('体力 +20 · 100 金币', () => spend(100, () => { state.stamina += 20; showToast('补给已入舱，体力 +20'); }), state.coins < 100));
    copy.append(action('出售 10 条鱼 · +50 金币', () => { if (state.cargo < 10) return; state.cargo -= 10; state.coins += 50; }, state.cargo < 10));
    list.append(card);
    RODS.forEach(rod => {
      const owned = state.rods.includes(rod.id), equipped = state.rod === rod.id;
      const { card, copy } = panel(rod.name, rod.skill, rod.art);
      copy.append(action(equipped ? '已装备' : owned ? '装备鱼竿' : `购买并装备 · ${rod.cost} 金币`, () => {
        if (owned) state.rod = rod.id;
        else spend(rod.cost, () => { state.rods.push(rod.id); state.rod = rod.id; });
      }, equipped || (!owned && state.coins < rod.cost))); list.append(card);
    });
  }
}
function switchPage(page) {
  if (state.busy) { showToast('请等待本次航行或补给结束'); return; }
  currentPage = page;
  document.querySelectorAll('.page').forEach(element => { element.hidden = element.id !== `${page}Page`; });
  document.querySelectorAll('[data-page]').forEach(button => {
    button.classList.toggle('active', button.dataset.page === page);
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  renderPage();
}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => switchPage(button.dataset.page)));
async function boot() {
  try {
    await loadAssets(); assetsReady = true;
    const icons = [
      ['.brand-mark', 'ui_logo_fish_tide'], ['#settingsButton', 'ui_icon_settings'],
      ['.stamina-chip .resource-icon', 'ui_icon_stamina'], ['.coin-chip .resource-icon', 'ui_icon_coin'],
    ];
    icons.forEach(([selector, key]) => $(selector).replaceChildren(artwork(key, '', true)));
    for (const page of ['fish', 'crew', 'shipyard', 'shop']) $(`[data-page="${page}"] span`).replaceChildren(artwork(`ui_nav_${page}`, '', true));
    $('#adButton').prepend(artwork('ui_icon_ad', '', true));
    $('.progress-copy').prepend(artwork('ui_icon_fish', '', true));
    $('.multiplier-status').prepend(artwork('ui_icon_multiplier', '', true));
    background($('#adButton'), 'ui_button_ad'); background($('#sailButton'), 'ui_button_sail');
    background($('#splash'), 'splash_fish_white_sail');
    $('#splash > div').prepend(artwork('ui_logo_fish_tide', '', true));
    setEvent({ pill: '航行日志', title: '白帆已备好', description: '点击出航探索海域，招募船员并升级逐潮号。', reward: '向大海出发', asset: 'fish_moon_sardine_white' });
    renderPosition(); renderStats();
    $('#loadingMessage').textContent = '循着潮汐，寻找下一次惊喜';
    $('#startButton').disabled = false; $('#startButton').textContent = '扬帆 · 继续旅程';
    $('#startButton').onclick = () => { $('#splash').hidden = true; $('.app-shell').hidden = false; };
  } catch (error) {
    console.error(error);
    $('#loadingMessage').textContent = '海图加载失败，请检查网络后重试';
    $('#startButton').disabled = false; $('#startButton').textContent = '重试'; $('#startButton').onclick = boot;
  }
}
boot();
