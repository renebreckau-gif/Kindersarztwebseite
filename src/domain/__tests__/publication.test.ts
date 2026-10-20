import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { acuteEditorMessage, decideAnnouncement, decideEmergency, decidePerson, decidePersonPhoto, decidePublication, replacementEditorMessage } from "../publication.ts";
import { evaluateFreshness } from "../verification.ts";
import { zonedParts, zonedToInstant } from "../time.ts";
import type { Announcement, Doctor, EmergencyInformation, MediaAsset } from "../content-types.ts";
import { ACUTE_TYPE, OUTDATED, UNCONFIRMED, VERIFIED, baseData, rule, withRules } from "./fixtures.ts";

const TODAY = "2026-10-07";

describe("verification & freshness", () => {
  test("old is not false: review due within grace stays usable", () => {
    assert.equal(evaluateFreshness({ ...VERIFIED, reviewDue: "2026-09-01" }, TODAY, "openingHours"), "REVIEW_DUE");
  });
  test("high-risk categories have no grace", () => {
    assert.equal(evaluateFreshness({ ...VERIFIED, reviewDue: "2026-10-06" }, TODAY, "emergency"), "REVIEW_EXPIRED");
  });
  test("three states map to distinct publication modes", () => {
    assert.equal(decidePublication(VERIFIED, "editorial", TODAY).mode, "PUBLIC");
    assert.equal(decidePublication(UNCONFIRMED, "editorial", TODAY).mode, "FALLBACK");
    assert.equal(decidePublication(OUTDATED, "editorial", TODAY).mode, "BLOCKED");
  });
});

describe("announcements", () => {
  const a: Announcement = {
    id: "n1",
    category: "INFO",
    title: "Test",
    shortText: "Test",
    validFrom: "2026-10-01",
    validUntil: "2026-10-18",
    priority: 1,
    homepageHighlight: false,
    published: true,
    verification: VERIFIED,
  };
  test("current announcement shows its automatic end date to the editor", () => {
    const d = decideAnnouncement(a, TODAY);
    assert.equal(d.visible, true);
    assert.ok(d.editorMessages.includes("Diese Meldung endet automatisch am 18.10.2026."));
  });
  test("expired announcement is not shown as current", () => {
    assert.equal(decideAnnouncement(a, "2026-10-19").visible, false);
  });
  test("future announcement waits for validFrom", () => {
    assert.equal(decideAnnouncement({ ...a, validFrom: "2026-10-10" }, TODAY).visible, false);
  });
  test("unverified announcement is not public", () => {
    assert.equal(decideAnnouncement({ ...a, verification: UNCONFIRMED }, TODAY).visible, false);
  });
});

describe("people", () => {
  const doc: Doctor = {
    id: "d1",
    name: "Testärztin",
    professionalTitles: ["Test"],
    specialties: [],
    additionalQualifications: [],
    displayOrder: 1,
    active: true,
    publicationConsent: { value: true, verification: VERIFIED },
    verification: VERIFIED,
  };
  test("active, consented, verified person is public", () => assert.equal(decidePerson(doc, TODAY).visible, true));
  test("inactive person is never shown as current staff", () => assert.equal(decidePerson({ ...doc, active: false }, TODAY).visible, false));
  test("missing consent blocks publication", () =>
    assert.equal(decidePerson({ ...doc, publicationConsent: { value: true, verification: UNCONFIRMED } }, TODAY).visible, false));

  // Media policy + 10.5A consent model: name and photo are separate gates.
  const photo: MediaAsset = {
    id: "m1",
    class: "REAL",
    kind: "IMAGE",
    purpose: "Porträt",
    file: "x.jpg",
    rightsOwner: "Praxis",
    aiGenerated: false,
    depictsRealPractice: true,
    peopleDepicted: [{ name: "Testärztin", consent: "GIVEN" }],
  };
  const withPhoto: Doctor = { ...doc, photo: { mediaAssetId: "m1", alt: "Porträt" } };
  test("photo: REAL + consent + rights + public person → public", () => assert.equal(decidePersonPhoto(withPhoto, photo, TODAY).visible, true));
  test("photo: a public person without a photo stays public, the photo slot does not", () => {
    assert.equal(decidePerson(doc, TODAY).visible, true);
    assert.equal(decidePersonPhoto(doc, undefined, TODAY).visible, false);
  });
  test("photo: never without person consent, never for another asset", () => {
    assert.equal(decidePersonPhoto({ ...withPhoto, publicationConsent: { value: false, verification: UNCONFIRMED } }, photo, TODAY).visible, false);
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, id: "m2" }, TODAY).visible, false);
  });
  test("photo: AI_CONCEPTUAL, PLACEHOLDER, AI-generated or non-practice images never represent a real person", () => {
    for (const bad of [{ class: "AI_CONCEPTUAL" as const }, { class: "PLACEHOLDER" as const }, { aiGenerated: true }, { depictsRealPractice: false }])
      assert.equal(decidePersonPhoto(withPhoto, { ...photo, ...bad }, TODAY).visible, false, JSON.stringify(bad));
  });
  test("photo: missing / withdrawn image consent, unknown or expired rights block it", () => {
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, peopleDepicted: [{ consent: "MISSING" }] }, TODAY).visible, false);
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, peopleDepicted: [] }, TODAY).visible, false);
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, rightsOwner: " " }, TODAY).visible, false);
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, rightsUntil: "2026-10-06" }, TODAY).visible, false);
    assert.equal(decidePersonPhoto(withPhoto, { ...photo, rightsUntil: TODAY }, TODAY).visible, true);
  });
});

describe("emergency information", () => {
  const e: EmergencyInformation = {
    id: "e1",
    type: "MEDICAL_ON_CALL",
    name: "Testdienst",
    whenToUse: "Test",
    priority: 2,
    publicVisible: true,
    verification: { ...VERIFIED, lastVerified: "2026-04-01", reviewDue: "2026-12-31" },
  };
  test("verified emergency entry is public, editor warned after 90 days without check", () => {
    const d = decideEmergency(e, TODAY);
    assert.equal(d.visible, true);
    assert.ok(d.editorMessages.some((m) => m.startsWith("Diese Notfallinformation wurde seit 189 Tagen nicht geprüft.")));
  });
  test("emergency entry past review date falls back (hidden)", () => {
    assert.equal(decideEmergency({ ...e, verification: { ...e.verification, reviewDue: "2026-10-01" } }, TODAY).visible, false);
  });
});

describe("editor messages", () => {
  test("stale replacement practice must be re-confirmed", () => {
    assert.equal(replacementEditorMessage({ ...VERIFIED, reviewDue: "2026-09-01" }, TODAY), "Diese Vertretungspraxis muss erneut bestätigt werden.");
  });
  test("acute rules that are not confirmed cannot be published", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [rule("a", 1, "10:00", "11:00", { consultationType: "ACUTE", verification: UNCONFIRMED })]);
    assert.equal(acuteEditorMessage(d, TODAY), "Akutsprechstunden können nicht veröffentlicht werden, weil die Zeiten noch nicht bestätigt sind.");
  });
});

describe("time helpers", () => {
  test("zonedParts uses Europe/Berlin, not the host zone", () => {
    assert.deepEqual(zonedParts(new Date("2026-10-07T22:30:00Z")), { date: "2026-10-08", weekday: 4, minutes: 30 });
  });
  test("zonedToInstant handles both DST offsets", () => {
    assert.equal(zonedToInstant("2026-01-15", "08:00").toISOString(), "2026-01-15T07:00:00.000Z");
    assert.equal(zonedToInstant("2026-07-15", "08:00").toISOString(), "2026-07-15T06:00:00.000Z");
  });
});
