# Arbeitssuche

> [English version below](#english)

Eine Desktop-App, die deutsche Jobbörsen durchsucht, deine Bewerbungen verwaltet und Anschreiben schreibt — damit du es nicht (schon wieder) tun musst.

## Funktionen

- **Bewerberprofile** mit PDF-Lebenslauf-Export (4 Vorlagen)
- **Jobbörsen-Crawling** — Agentur für Arbeit, Xing, Zalando, DM
- **KI-gestützte Stellenanalyse** — Matching-Score, Kontaktextraktion, Anschreiben-Entwürfe
- **Bewerbungsverfolgung** über den gesamten Lebenszyklus: Neu → Beworben → Eingeladen → Angebot (hoffentlich)
- **Pendelzeit-Schätzung** über Google Maps

## Erste Schritte

Den neuesten Build gibt es unter [Releases](../../releases). Verfügbar für macOS, Windows und Linux.

Für den vollen Funktionsumfang, API-Schlüssel in den Einstellungen hinterlegen:
- [OpenRouter](https://openrouter.ai/) — für Matching-Score, Anschreiben-Generierung und Jobsuche-Vorschläge
- [Google Maps](https://developers.google.com/maps) — für Pendelzeit-Schätzungen

Beides ist optional. Die App funktioniert auch ohne, nur mit eingeschränktem Funktionsumfang.

## Warum

Jobsuche in Deutschland, besonders außerhalb der IT, heißt: mehrere Portale jonglieren, überall die gleichen Infos reinkopieren und das 147. Bewerbungsanschreiben verfassen. Diese App übernimmt den langweiligen Teil.

Außerdem ein Experiment in KI-gestützter Entwicklung: Der gesamte Code wurde von Claude geschrieben — aber mit sehr präzisen Anweisungen, sorgfältiger Prüfung jeder Änderung und konsequenter Architekturpflege, im Wechsel zwischen Features und Tech-Debt-Abbau.

## Entwicklung

Siehe [CLAUDE.md](CLAUDE.md) für Architektur, Konventionen und Befehle.

## Lizenz

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)

---

<a id="english"></a>

## English

A desktop app that crawls German job boards, tracks your applications, and writes cover letters so you don't have to. Again.

### Features

- **Applicant profiles** with PDF resume export (4 templates)
- **Job board crawling** — Agentur für Arbeit, Xing, Zalando, DM
- **AI-powered vacancy analysis** — match scoring, contact extraction, cover letter drafts
- **Application tracking** through the full lifecycle: new → applied → invited → offered (hopefully)
- **Commute estimation** via Google Maps

### Getting started

Grab the latest build from [Releases](../../releases). Available for macOS, Windows, and Linux.

For the full experience, add your API keys in Settings:
- [OpenRouter](https://openrouter.ai/) — powers match scoring, cover letter generation, and job search suggestions
- [Google Maps](https://developers.google.com/maps) — estimates commute times

Both are optional. The app works fine without them, just with some of the functionality disabled.

### Why

Job searching in Germany, especially outside IT, means juggling multiple portals, copy-pasting the same info everywhere, and writing your 147th Bewerbungsanschreiben. This app handles the boring parts.

Also an experiment in AI-assisted development: the entire codebase was written by Claude, but with me giving very precise instructions and carefully reviewing every change and keeping the architecture in check, by alternating between features and tech debt fixing.

### Development

See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and commands.

### License

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)
