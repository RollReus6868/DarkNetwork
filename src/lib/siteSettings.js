import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Site-wide switches set in Admin > Cài đặt (table site_setting: id = name, value = JSON).
// Read once per page load and shared by every component; a missing row means the default.
export const SETTING_DEFAULTS = {
  new_badge: { enabled: true, days: 30 },   // NEW badge on books added in the last `days` days
};

const EVENT = "site-settings-updated";
let cache = null;    // Promise<{ [id]: value }>
let loaded = null;   // the same values once the promise has resolved, for a first render without a flash

function load() {
  if (!cache) {
    cache = base44.entities.SiteSetting.list()
      .then((rows) => Object.fromEntries(rows.map((r) => [r.id, r.value])))
      .catch(() => ({}))
      .then((all) => (loaded = all));
  }
  return cache;
}

const withDefaults = (id, value) => ({ ...SETTING_DEFAULTS[id], ...(value && typeof value === "object" ? value : {}) });

// -> the setting's value plus `loaded` (false until the settings have arrived, so a component can
// wait instead of showing the default for a moment, e.g. a NEW badge the owner switched off)
export function useSiteSetting(id) {
  const [value, setValue] = useState(() => ({ ...withDefaults(id, loaded?.[id]), loaded: Boolean(loaded) }));
  useEffect(() => {
    let alive = true;
    const refresh = () => load().then((all) => alive && setValue({ ...withDefaults(id, all[id]), loaded: true }));
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => { alive = false; window.removeEventListener(EVENT, refresh); };
  }, [id]);
  return value;
}

// Admin only (row level security): create or replace one setting, then refresh every reader.
export async function saveSiteSetting(id, value) {
  const api = base44.entities.SiteSetting;
  const exists = (await api.filter({ id })).length > 0;
  if (exists) await api.update(id, { value });
  else await api.create({ id, value });
  const all = { ...(await load()), [id]: value };
  loaded = all;
  cache = Promise.resolve(all);
  window.dispatchEvent(new Event(EVENT));
}
