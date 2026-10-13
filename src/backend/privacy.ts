// No-patient-data boundary (praxis-cockpit.md §11): the backend is for WEBSITE OPERATIONS only.
// Checked when the Payload config is built and in tests — a collection with a patient-like
// field fails loudly instead of slowly evolving into a patient system.

const FORBIDDEN = [
  /patient/i,
  /geburt/i,
  /birth/i,
  /\bdob\b/i,
  /diagnos/i,
  /befund/i,
  /behandlung/i,
  /treatment/i,
  /termin/i,
  /appointment/i,
  /versicher/i,
  /insurance/i,
  /medicalRecord/i,
  /krankenakte/i,
  /nachricht/i,
  /messag/i,
  /anliegen/i,
  /symptom/i,
];

/** Allowed names that merely contain a forbidden fragment (operational wording, not patient data). */
const ALLOWED = new Set(["publicMessage"]);

type FieldLike = { name?: string; fields?: FieldLike[]; type?: string };
type CollectionLike = { slug: string; fields: FieldLike[] };

export function patientLikeFields(collections: CollectionLike[]): string[] {
  const hits: string[] = [];
  const walk = (slug: string, fields: FieldLike[], path: string[]) => {
    for (const f of fields) {
      if (f.name && !ALLOWED.has(f.name) && FORBIDDEN.some((re) => re.test(f.name!))) hits.push(`${slug}.${[...path, f.name].join(".")}`);
      if (f.fields) walk(slug, f.fields, f.name ? [...path, f.name] : path);
    }
  };
  for (const c of collections) walk(c.slug, c.fields, []);
  return hits;
}

export function assertNoPatientFields(collections: CollectionLike[]): void {
  const hits = patientLikeFields(collections);
  if (hits.length) throw new Error(`Patient-like fields are not allowed in the practice backend: ${hits.join(", ")}`);
}
