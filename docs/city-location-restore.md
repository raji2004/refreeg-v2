# Restore device location matching

Cause creation resolves browser coordinates against `cities`. An empty table
causes every valid reading to fail with “We could not match your current position
to a supported city”. City names alone are insufficient: latitude and longitude
must also be populated.

Download and inspect the restore before applying it to the intended database:

```sh
curl -fL --max-time 120 https://github.com/dr5hn/countries-states-cities-database/releases/latest/download/json-cities.json.gz -o /tmp/refreeg-cities.json.gz
pnpm exec tsx scripts/restore-city-locations.ts /tmp/refreeg-cities.json.gz
pnpm exec tsx scripts/restore-city-locations.ts /tmp/refreeg-cities.json.gz --apply
```

The script uses an existing `DATABASE_URL` first, then `.env.local` and `.env`.
It validates records before writing and inserts in batches, skipping existing IDs.
It does not delete or overwrite records. It can resume after a partial import.
It restores missing records; it does not repair coordinates on existing IDs.
Keep the downloaded archive if you need to repeat the same restore snapshot.

The archive used for the September 16, 2026 restore contains 152,970 cities,
including 491 in Nigeria. Its SHA-256 is
`311575e7b90512b15cc1ba6c9e897b3e8f3905a9c6e09db344a7dc1cac1ba2f5`.

The existing lookup selects a nearby database city from the device coordinates
and rejects matches beyond 250 km. This identifies a city or nearby locality,
not a street address. Browser location permission is still required. The lookup
does not send device coordinates to an external geocoding service.

After restoring, sign in, open Create a cause, and click **Use my location**.
The `/api/locations/current` response should contain a city/state/country label.
The same resolver runs again when the cause is saved.

Data attribution: [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database)
by dr5hn and contributors, available under the
[Open Database License (ODbL-1.0)](https://github.com/dr5hn/countries-states-cities-database/blob/master/LICENSE).
