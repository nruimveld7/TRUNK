import type { PublicApplication } from '$lib/types';

export function groupApplications(
  apps: PublicApplication[],
  categoryOrder: string[]
): Array<{ category: string; apps: PublicApplication[] }> {
  const map = new Map<string, PublicApplication[]>();
  for (const app of apps) map.set(app.category, [...(map.get(app.category) ?? []), app]);
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi) || a.localeCompare(b);
    })
    .map(([category, categoryApps]) => ({
      category,
      apps: categoryApps.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    }));
}

export function filterApplications(apps: PublicApplication[], query: string): PublicApplication[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return apps;
  return apps.filter((app) =>
    words.every((word) =>
      [app.name, app.description, app.category, ...app.tags]
        .join(' ')
        .toLocaleLowerCase()
        .includes(word)
    )
  );
}
