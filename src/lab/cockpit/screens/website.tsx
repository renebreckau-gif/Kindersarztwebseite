"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { DateField, PageHead, TimeField, WebsitePreview } from "../ui";
import { longDate, statusAt, visibleAnnouncements } from "../model";
import { isLocalDate } from "@/domain/time";

export function Website({ initialDate, initialTime }: { initialDate?: string; initialTime?: string }) {
  const { state } = useCockpit();
  const { today, now } = useClock();
  const [date, setDate] = useState(initialDate && isLocalDate(initialDate) ? initialDate : today);
  const [time, setTime] = useState(initialTime && /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : now);

  const quick = [
    { label: "Heute, 09:00", date: today, time: "09:00" },
    { label: "Heute, 13:30", date: today, time: "13:30" },
    { label: "25. Dezember, 10:00", date: "2026-12-25", time: "10:00" },
    ...state.data.closures.filter((c) => c.endDate >= today).map((c) => ({ label: `Erster Schließtag, 09:00`, date: c.startDate, time: "09:00" })),
  ];

  const valid = isLocalDate(date) && /^\d{2}:\d{2}$/.test(time);
  const result = valid ? statusAt(state.data, date, time) : null;

  return (
    <div className={s.flowWide}>
      <PageHead title="Website-Vorschau" intro="So sieht es auf der Website aus. Wählen Sie Tag und Uhrzeit – die Vorschau nutzt dieselbe Logik wie die Website, mit Testdaten." />
      <div className={s.previewLayout}>
        <div className={s.form}>
          <div className={s.row2}>
            <DateField label="Tag" value={date} onChange={setDate} />
            <TimeField label="Uhrzeit" value={time} onChange={setTime} />
          </div>
          <div className={s.fieldset}>
            <p className={s.label} id="schnell">
              Schnell auswählen
            </p>
            <div className={s.chips} role="group" aria-labelledby="schnell">
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className={s.chipBtn}
                  aria-pressed={date === q.date && time === q.time}
                  onClick={() => {
                    setDate(q.date);
                    setTime(q.time);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          {result ? (
            <WebsitePreview heading="Aktuell auf der Website" when={`${longDate(date)}, ${time} Uhr`} result={result} announcements={visibleAnnouncements(state.data, date)} />
          ) : (
            <p className={s.note}>Bitte Tag und Uhrzeit vollständig angeben.</p>
          )}
        </div>
      </div>
    </div>
  );
}
