export const MULTIPLIER_TIERS = [1, 2, 10, 100, 1000].map(value => ({ value, recommendedStamina: value }));
export const availableTiers = stamina => MULTIPLIER_TIERS.filter(tier => stamina > tier.recommendedStamina * 10);
export const effectiveMultiplier = (stamina, selected) => availableTiers(stamina).some(tier => tier.value === selected) ? selected : 1;
export const ROUTES = [
  { name: '浅湾 · 白帆港', art: 'map_white_sail_bay', unlock: 0, goal: 100 },
  { name: '风暴 · 蓝鲸环礁', art: 'map_bluewhale_storm_atoll', unlock: 100, goal: 500 },
  { name: '星海 · 鸿蒙裂隙', art: 'map_hongmeng_rift_starsea', unlock: 500, goal: 2000 },
];
export const CREW = [
  { id: 'lanlan', name: '澜澜 · 航海家', art: 'crew_lanlan_navigator', cost: 200, skill: '友善船只金币 +20%' },
  { id: 'huoli', name: '火鲤 · 炮手', art: 'crew_huo_li_gunner', cost: 350, skill: '海盗战胜率 +15%' },
  { id: 'ache', name: '阿澈 · 观测员', art: 'crew_a_che_observer', cost: 450, skill: '钓鱼抽选向高品质偏移 5%' },
  { id: 'mia', name: '米娅 · 补给官', art: 'crew_mia_quartermaster', cost: 250, skill: '海岛金币 +30%' },
];
export const RODS = [
  { id: 'floating', name: '浮光竿', art: 'rod_floating_glow', cost: 300, skill: '渔获数量 +20%' },
  { id: 'deep', name: '深潜竿', art: 'rod_deep_dive', cost: 600, skill: '钓鱼抽选向高品质偏移 8%' },
  { id: 'storm', name: '风暴竿', art: 'rod_storm_breaker', cost: 900, skill: '海盗胜利金币 +25%' },
  { id: 'hongmeng', name: '鸿蒙竿', art: 'rod_hongmeng_bone', cost: 1500, skill: '渔获数量 +50%' },
];
export const SAVE_KEY = 'fish-tide-save-v1';
export function newState() {
  return { stamina: 30, staminaMax: 30, coins: 1280, fish: 18, cargo: 18, node: 3, multiplier: 1, busy: false, adUses: 0, adDay: '', route: 0, shipLevel: 1, durability: 5, crew: [], activeCrew: [], rods: [], rod: null };
}
export function restoreState(raw) {
  const state = newState();
  try {
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1) return state;
    for (const key of ['stamina', 'coins', 'fish', 'cargo', 'node', 'multiplier', 'adUses', 'route', 'shipLevel', 'durability']) {
      if (Number.isSafeInteger(saved[key]) && saved[key] >= 0) state[key] = saved[key];
    }
    state.shipLevel = Math.max(1, Math.min(10, state.shipLevel));
    state.staminaMax = 30 + (state.shipLevel - 1) * 5;
    state.node %= 9;
    state.route = Math.min(2, state.route);
    if (state.fish < ROUTES[state.route].unlock) state.route = 0;
    state.cargo = Math.min(state.cargo, state.fish);
    state.durability = Math.min(state.durability, 5 + state.shipLevel - 1);
    state.crew = CREW.filter(c => saved.crew?.includes(c.id)).map(c => c.id);
    state.activeCrew = state.crew.filter(id => saved.activeCrew?.includes(id)).slice(0, 3);
    state.rods = RODS.filter(r => saved.rods?.includes(r.id)).map(r => r.id);
    state.rod = state.rods.includes(saved.rod) ? saved.rod : null;
    state.adDay = typeof saved.adDay === 'string' ? saved.adDay : '';
    state.multiplier = effectiveMultiplier(state.stamina, state.multiplier);
  } catch { /* Corrupt or unavailable saves start a fresh voyage. */ }
  return state;
}
