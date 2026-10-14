// Phase 09.5B — lifecycle, supersede, multi-day safety, undo planning, history wording,
// trusted lifecycle context (pure; synthetic data; no database).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, OpeningHourException, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { closureToDoc, exceptionToDoc } from "../../data/payload-mapping.ts";
import { closedTodayDraft, earlyCloseDraft } from "../workflows/today.ts";
import { businessOf, planUndo, UNDO_WINDOW_MS, type HistoryEvent } from "../workflows/undo.ts";
import { describeGroup, groupChanges, relativeTime } from "../history.ts";
import type { ReadyDraft } from "../workflows/types.ts";
import { LIFECYCLE_FIELDS } from "../../backend/collections.ts";
import { provenanceHook, retiredRecordGuard } from "../../backend/hooks.ts";
import { auditOperationOf, revertOfIn, SERVER_CONTEXT } from "../../backend/server-context.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const TODAY = "2026-10-13";
const NOW = zonedToInstant(TODAY, "09:30");
const special = (id: string, from = TODAY, to = TODAY, end = "11:00"): OpeningHourException => ({ id, kind: "SPECIAL_HOURS", startDate: from, endDate: to, intervals: [{ start: "08:00", end, consultationType: "GENERAL" }], priority: 100, verification: V });
const closed = (id: string, kind: Closure["kind"] = "SHORT_NOTICE", from = TODAY, to = TODAY): Closure => ({ id, kind, startDate: from, endDate: to, replacements: [], verification: V });
const CS = "11111111-1111-4111-8111-111111111111";
const ev = (p: Partial<HistoryEvent> & Pick<HistoryEvent, "eventId" | "entityType" | "entityId" | "operation">): HistoryEvent => ({
  at: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
  actorId: "1",
  actorName: "Test Team",
  actorRole: "STAFF",
  previous: null,
  next: null,
  changeSetId: CS,
  ...p,
});

describe("explicit supersede (single-day only)", () => {
  test("Heute geschlossen replaces a single-day SPECIAL_HOURS only on explicit choice", () => {
    const data = { ...DATA, exceptions: [special("s")] };
    const offered = closedTodayDraft(data, NOW, { mode: "NOW", reason: "KEINER", replacementIds: [] }, "fp");
    assert.equal(!offered.ok && offered.blocked.code, "SUPERSEDE_AVAILABLE");
    assert.match(!offered.ok ? offered.blocked.suggestion!.href : "", /ersetzen=1/);
    const d = closedTodayDraft(data, NOW, { mode: "NOW", reason: "KEINER", replacementIds: [], replaceExisting: true }, "fp") as ReadyDraft;
    assert.equal(d.ok, true);
    assert.equal(d.mode, "SUPERSEDE");
    assert.deepEqual(d.changeSet.removeExceptionIds, ["s"]);
    assert.deepEqual(d.supersedes?.map((s) => [s.collection, s.recordId]), [["openingHourExceptions", "s"]]);
    assert.equal(d.after.activeClosure?.kind, "SHORT_NOTICE");
    assert.equal(d.actionLabel, "Änderung ersetzen und heute geschlossen melden");
  });

  test("reverse: early close replaces a single-day SHORT_NOTICE closure only on explicit choice", () => {
    const data = { ...DATA, closures: [closed("c")] };
    const offered = earlyCloseDraft(data, NOW, { time: "11:00" }, "fp");
    assert.equal(!offered.ok && offered.blocked.code, "SUPERSEDE_AVAILABLE");
    const d = earlyCloseDraft(data, NOW, { time: "11:00", replaceExisting: true }, "fp") as ReadyDraft;
    assert.equal(d.mode, "SUPERSEDE");
    assert.deepEqual(d.changeSet.removeClosureIds, ["c"]);
    assert.equal(d.after.activeClosure, undefined);
    assert.match(d.after.detail, /11:00/);
  });

  test("multi-day records are never shrunk, edited or retired by a today workflow", () => {
    const multiSpecial = { ...DATA, exceptions: [special("woche", "2026-10-12", "2026-10-16")] };
    for (const replaceExisting of [false, true]) {
      const d = closedTodayDraft(multiSpecial, NOW, { mode: "NOW", reason: "KEINER", replacementIds: [], replaceExisting }, "fp");
      assert.equal(!d.ok && d.blocked.code, "MULTI_DAY_EXISTS", String(replaceExisting));
      assert.match(!d.ok ? d.blocked.message : "", /eigenen Ablauf/);
    }
    const vacation = { ...DATA, closures: [closed("urlaub", "VACATION", "2026-10-12", "2026-10-16")] };
    for (const replaceExisting of [false, true]) {
      const d = earlyCloseDraft(vacation, NOW, { time: "11:00", replaceExisting }, "fp");
      assert.equal(!d.ok && d.blocked.code, "MULTI_DAY_EXISTS");
    }
    const multiShort = { ...DATA, closures: [closed("kurz", "SHORT_NOTICE", "2026-10-13", "2026-10-14")] };
    assert.equal((earlyCloseDraft(multiShort, NOW, { time: "11:00", replaceExisting: true }, "fp") as { ok: boolean }).ok, false);
  });
});

describe("undo planning (server history only)", () => {
  const exDoc = (x: OpeningHourException) => ({ ...exceptionToDoc(x), recordState: "ACTIVE" });
  const base = (records: Record<string, Record<string, unknown> | undefined>, group: HistoryEvent[], data: PulsData, latest?: Record<string, string>, now = NOW, role: "STAFF" | null = "STAFF") =>
    planUndo({ group, latest: latest ?? Object.fromEntries(group.map((e) => [`${e.entityType}:${e.entityId}`, e.eventId])), records, data, now, role });

  test("CREATE undo → RETIRE (no delete); engine returns to the state without the record", () => {
    const x = special("frueh");
    const data = { ...DATA, exceptions: [x] };
    const p = base({ "openingHourExceptions:frueh": exDoc(x) }, [ev({ eventId: "e1", entityType: "openingHourExceptions", entityId: "frueh", operation: "CREATE", next: exceptionToDoc(x) })], data);
    assert.equal(p.ok, true);
    assert.deepEqual(p.ok && p.actions.map((a) => [a.kind, a.entityId, a.revertOf]), [["RETIRE", "frueh", "e1"]]);
    assert.deepEqual(p.ok && getPracticeStatus(NOW, p.after), getPracticeStatus(NOW, DATA));
  });

  test("EDIT undo → RESTORE previous content to the SAME record", () => {
    const v1 = special("frueh", TODAY, TODAY, "11:00");
    const v2 = special("frueh", TODAY, TODAY, "10:00");
    const p = base({ "openingHourExceptions:frueh": exDoc(v2) }, [ev({ eventId: "e2", entityType: "openingHourExceptions", entityId: "frueh", operation: "UPDATE", previous: exceptionToDoc(v1), next: exceptionToDoc(v2) })], { ...DATA, exceptions: [v2] });
    assert.equal(p.ok, true);
    const a = p.ok ? p.actions[0] : null;
    assert.equal(a?.kind, "RESTORE");
    assert.equal(a?.entityId, "frueh");
    assert.equal(p.ok && p.after.exceptions[0].intervals[0].end, "11:00");
  });

  test("latest-change rule: an older change of the same record is blocked", () => {
    const v2 = special("frueh", TODAY, TODAY, "10:00");
    const older = ev({ eventId: "eA", entityType: "openingHourExceptions", entityId: "frueh", operation: "UPDATE", previous: exceptionToDoc(special("frueh")), next: exceptionToDoc(special("frueh", TODAY, TODAY, "10:30")) });
    const p = base({ "openingHourExceptions:frueh": exDoc(v2) }, [older], { ...DATA, exceptions: [v2] }, { "openingHourExceptions:frueh": "eB" });
    assert.equal(!p.ok && p.code, "LATER_CHANGE");
    assert.match(!p.ok ? p.message : "", /inzwischen erneut geändert/);
  });

  test("record no longer matching the event's result → blocked (no silent merge)", () => {
    const stored = special("frueh", TODAY, TODAY, "09:45");
    const e = ev({ eventId: "e2", entityType: "openingHourExceptions", entityId: "frueh", operation: "UPDATE", previous: exceptionToDoc(special("frueh")), next: exceptionToDoc(special("frueh", TODAY, TODAY, "10:00")) });
    assert.equal((base({ "openingHourExceptions:frueh": exDoc(stored) }, [e], { ...DATA, exceptions: [stored] }) as { code?: string }).code, "LATER_CHANGE");
  });

  test("24-hour window, effect over, REVERT groups, foreign changes, signed-out", () => {
    const x = special("frueh");
    const rec = { "openingHourExceptions:frueh": exDoc(x) };
    const create = ev({ eventId: "e1", entityType: "openingHourExceptions", entityId: "frueh", operation: "CREATE", next: exceptionToDoc(x) });
    const late = new Date(Date.parse(create.at) + UNDO_WINDOW_MS + 60_000);
    assert.equal((base(rec, [create], DATA, undefined, late) as { code?: string }).code, "EXPIRED");
    const past = special("alt", "2026-10-12", "2026-10-12");
    assert.equal((base({ "openingHourExceptions:alt": exDoc(past) }, [ev({ eventId: "e9", entityType: "openingHourExceptions", entityId: "alt", operation: "CREATE", next: exceptionToDoc(past) })], DATA) as { code?: string }).code, "EFFECT_OVER");
    assert.equal((base(rec, [{ ...create, operation: "REVERT" }], DATA) as { code?: string }).code, "NOT_UNDOABLE");
    assert.equal((base(rec, [{ ...create, changeSetId: undefined }], DATA) as { code?: string }).code, "NOT_UNDOABLE");
    assert.equal((base(rec, [create], DATA, undefined, NOW, null) as { code?: string }).code, "NOT_ALLOWED");
    assert.equal((base({ "openingHourExceptions:frueh": { ...exDoc(x), recordState: "RETIRED" } }, [create], DATA) as { code?: string }).code, "STATE_CHANGED");
  });

  test("change-set level: CREATE + SUPERSEDE in one set → retire new, reactivate old (multi-record grouping)", () => {
    const old = special("s");
    const neu = closed("heute-zu");
    const records = {
      "closures:heute-zu": { ...closureToDoc(neu), recordState: "ACTIVE" },
      "openingHourExceptions:s": { ...exceptionToDoc(old), recordState: "RETIRED", retiredReason: "SUPERSEDED", retiredByChangeSetId: CS },
    };
    const group = [
      ev({ eventId: "eS", entityType: "openingHourExceptions", entityId: "s", operation: "SUPERSEDE", previous: exceptionToDoc(old), next: { ...exceptionToDoc(old), recordState: "RETIRED" } }),
      ev({ eventId: "eC", entityType: "closures", entityId: "heute-zu", operation: "CREATE", next: closureToDoc(neu) }),
    ];
    const p = base(records, group, { ...DATA, closures: [neu] });
    assert.equal(p.ok, true, !p.ok ? p.message : "");
    assert.deepEqual(p.ok && p.actions.map((a) => [a.kind, a.entityId, a.revertOf]), [["RETIRE", "heute-zu", "eC"], ["REACTIVATE", "s", "eS"]]);
    assert.deepEqual(p.ok && p.after.exceptions.map((x) => x.id), ["s"]);
    assert.deepEqual(p.ok && p.after.closures, []);
  });

  test("undo that would introduce UNKNOWN is blocked", () => {
    const holiday = { ...DATA, publicHolidays: [TODAY] };
    const c = closed("feiertag-zu");
    const p = base({ "closures:feiertag-zu": { ...closureToDoc(c), recordState: "ACTIVE" } }, [ev({ eventId: "e1", entityType: "closures", entityId: "feiertag-zu", operation: "CREATE", next: closureToDoc(c) })], { ...holiday, closures: [c] });
    assert.equal(!p.ok && p.code, "UNSAFE");
  });

  test("business comparison ignores verification and lifecycle metadata", () => {
    const x = special("frueh");
    assert.equal(businessOf("openingHourExceptions", { ...exceptionToDoc(x), recordState: "ACTIVE", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } }), businessOf("openingHourExceptions", exceptionToDoc(x)));
  });
});

describe("history wording (plain German, no technical codes)", () => {
  test("titles", () => {
    const x = special("frueh", TODAY, TODAY, "13:00");
    const create = ev({ eventId: "e1", entityType: "openingHourExceptions", entityId: "frueh", operation: "CREATE", next: exceptionToDoc(x) });
    assert.equal(describeGroup([create], TODAY), "Heute um 13:00 Uhr schließen");
    const c = ev({ eventId: "e2", entityType: "closures", entityId: "z", operation: "CREATE", next: closureToDoc(closed("z")), changeSetId: "22222222-2222-4222-8222-222222222222" });
    assert.equal(describeGroup([c], TODAY), "Praxis heute geschlossen");
    assert.equal(describeGroup([{ ...c, operation: "REVERT" }], TODAY), "Änderung zurückgenommen");
    const sup = ev({ eventId: "e3", entityType: "openingHourExceptions", entityId: "s", operation: "SUPERSEDE", previous: exceptionToDoc(special("s")) });
    assert.equal(describeGroup([sup, c], TODAY), "Bestehende Änderung ersetzt: Praxis heute geschlossen");
    for (const t of [describeGroup([create], TODAY), describeGroup([sup, c], TODAY)]) assert.doesNotMatch(t, /UPDATE|REVERT|SUPERSEDE|CREATE/);
  });

  test("grouping by change set; relative time", () => {
    const a = ev({ eventId: "e1", entityType: "closures", entityId: "z", operation: "CREATE" });
    const b = ev({ eventId: "e2", entityType: "openingHourExceptions", entityId: "s", operation: "SUPERSEDE" });
    const c = ev({ eventId: "e3", entityType: "closures", entityId: "y", operation: "CREATE", changeSetId: undefined });
    const groups = groupChanges([a, b, c], TODAY);
    assert.deepEqual(groups.map((g) => [g.key, g.events.length]), [[CS, 2], ["event-e3", 1]]);
    assert.equal(relativeTime(new Date(NOW.getTime() - 4 * 60_000).toISOString(), NOW), "vor 4 Minuten");
    assert.equal(relativeTime(new Date(NOW.getTime() - 20_000).toISOString(), NOW), "gerade eben");
    assert.equal(relativeTime(new Date(NOW.getTime() - 3 * 3600_000).toISOString(), NOW), "vor 3 Stunden");
  });
});

describe("lifecycle metadata is server-controlled", () => {
  type FieldAccess = { create: (a: unknown) => boolean; update: (a: unknown) => boolean };
  test("lifecycle fields: writable only with the trusted lifecycle context", () => {
    assert.deepEqual(LIFECYCLE_FIELDS.map((f) => (f as { name: string }).name), ["recordState", "retiredReason", "retiredAt", "retiredByChangeSetId", "supersededByRecordId"]);
    for (const f of LIFECYCLE_FIELDS) {
      const access = (f as { access: FieldAccess }).access;
      for (const op of ["create", "update"] as const) {
        assert.equal(access[op]({ req: { context: {} } }), false, `${(f as { name: string }).name} ${op} untrusted`);
        assert.equal(access[op]({ req: { context: { [SERVER_CONTEXT.LIFECYCLE]: "true" } } }), false);
        assert.equal(access[op]({ req: { context: { [SERVER_CONTEXT.LIFECYCLE]: true } } }), true);
      }
    }
    const state = LIFECYCLE_FIELDS[0] as { defaultValue: string; admin: { readOnly: boolean } };
    assert.equal(state.defaultValue, "ACTIVE");
    assert.equal(state.admin.readOnly, true);
  });

  test("retired records cannot be changed by ordinary writes", () => {
    const run = (ctx: Record<string, unknown>) => (retiredRecordGuard as unknown as (a: unknown) => unknown)({ data: { endDate: "2030-01-01" }, originalDoc: { recordState: "RETIRED" }, req: { context: ctx } });
    assert.throws(() => run({}), /Archivierte Einträge/);
    assert.doesNotThrow(() => run({ [SERVER_CONTEXT.LIFECYCLE]: true }));
  });

  test("lifecycle-only writes keep factual provenance (no manufactured verification)", () => {
    const hook = provenanceHook("CLOSURE") as unknown as (a: unknown) => Record<string, unknown>;
    const data = { recordState: "RETIRED", retiredReason: "REVERTED" };
    assert.deepEqual(hook({ data, req: { user: { id: 1, role: "STAFF", active: true, name: "T" }, context: { [SERVER_CONTEXT.LIFECYCLE]: true } } }), data);
  });

  test("semantic audit operation and revertOf come only from validated trusted context", () => {
    assert.equal(auditOperationOf({ [SERVER_CONTEXT.AUDIT_OPERATION]: "REVERT" }), "REVERT");
    assert.equal(auditOperationOf({ [SERVER_CONTEXT.AUDIT_OPERATION]: "DELETE" }), undefined);
    assert.equal(revertOfIn({ [SERVER_CONTEXT.REVERT_OF]: CS }), CS);
    assert.equal(revertOfIn({ [SERVER_CONTEXT.REVERT_OF]: "irgendwas" }), undefined);
  });
});
