/**
 * Discipline ids + the names their "+N to <Discipline> Skills" item prefixes
 * use. Kept separate from disciplines.ts so item tables can import it without
 * pulling in every skill tree.
 */
export const DISCIPLINE_IDS_FOR_AFFIXES = ['bulwark', 'emberwright', 'galeborn', 'hollowcaller'] as const;
export type DisciplineId = (typeof DISCIPLINE_IDS_FOR_AFFIXES)[number];

/** [tier 1 name, tier 2 name] for the +skills prefix. */
export const DISCIPLINE_AFFIX_NAMES: Record<DisciplineId, [string, string]> = {
    bulwark: ['Ironclad', 'Unbreaking'],
    emberwright: ['Forgeborn', 'Kilnheart'],
    galeborn: ['Stormtouched', 'Tempest-Born'],
    hollowcaller: ['Gravebound', 'Hollow-Sworn'],
};
