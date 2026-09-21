import { describe, expect, it } from 'vitest';
import { filterApplications, groupApplications } from '../../src/lib/utilities/applications';
import type { PublicApplication } from '../../src/lib/types';

const app = (id: string, category: string, order: number, name = id): PublicApplication => ({
  id,
  name,
  description: `${name} diagnostics`,
  category,
  icon: 'wrench',
  order,
  isNew: false,
  url: null,
  external: false,
  demo: false,
  visibility: 'guest',
  tags: ['encoder'],
  health: 'unknown'
});

describe('application catalog helpers', () => {
  it('keeps explicit category and application order stable', () => {
    const groups = groupApplications(
      [app('b', 'Furnace', 20), app('a', 'Furnace', 10), app('c', 'Automation', 1)],
      ['Automation', 'Furnace']
    );
    expect(groups.map((group) => group.category)).toEqual(['Automation', 'Furnace']);
    expect(groups[1].apps.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('searches name, description, category, and tags', () => {
    const apps = [
      app('roll', 'Furnace', 1, 'Roll Monitor'),
      app('plc', 'Automation', 2, 'PLC Tools')
    ];
    expect(filterApplications(apps, 'roll furnace').map((item) => item.id)).toEqual(['roll']);
    expect(filterApplications(apps, 'encoder').map((item) => item.id)).toEqual(['roll', 'plc']);
    expect(filterApplications(apps, 'missing')).toEqual([]);
  });
});
