/** Search radius options in meters: 500 m, 1 km, 5 km, 10 km. */
export const SEARCH_RADIUS_METERS_CHOICES = [500, 1000, 5000, 10000] as const;

export type SearchRadiusMetersChoice =
  (typeof SEARCH_RADIUS_METERS_CHOICES)[number];

export const DEFAULT_SEARCH_RADIUS_METERS: SearchRadiusMetersChoice = 1000;

export function clampRadiusChoiceIndex(i: number): 0 | 1 | 2 | 3 {
  if (i <= 0) {
    return 0;
  }
  if (i >= 3) {
    return 3;
  }
  return Math.round(i) as 0 | 1 | 2 | 3;
}

export function radiusMetersToChoiceIndex(
  m: number,
): 0 | 1 | 2 | 3 {
  const idx = SEARCH_RADIUS_METERS_CHOICES.indexOf(
    m as SearchRadiusMetersChoice,
  );
  if (idx >= 0) {
    return idx as 0 | 1 | 2 | 3;
  }
  return 1;
}
