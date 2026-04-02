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
- [OpenRouter](https://openrouter.ai/) oder [Requesty](https://requesty.ai/) (EU-Datenverarbeitung) — für Matching-Score, Anschreiben-Generierung und Jobsuche-Vorschläge
- [Google Maps](https://developers.google.com/maps) — für Pendelzeit-Schätzungen

Alles ist optional. Die App funktioniert auch ohne, nur mit eingeschränktem Funktionsumfang.

## Datenschutz & Sicherheit

Diese App arbeitet mit sehr sensiblen Daten — persönliche Informationen und API-Schlüssel. Dessen bin ich mir bewusst, deshalb:

- **Kein eigenes Backend.** Die App hat keinen Server, dem du vertrauen müsstest. Ich habe keine Möglichkeit, irgendetwas zu sammeln, was du eingibst.
- **Vollständig Open Source.** Der Code kann geprüft werden, und die Binärdateien werden automatisch über CI gebaut — du musst nicht meinem Rechner vertrauen, nur dem Build-Prozess.
- **API-Schlüssel werden verschlüsselt** über den systemeigenen Verschlüsselungsmechanismus (Electron `safeStorage`) gespeichert.
- **KI-Datenverarbeitung.** Wenn du einen API-Schlüssel hinterlegst, werden persönliche Daten zur Analyse an den gewählten KI-Anbieter übertragen — [OpenRouter](https://openrouter.ai/) oder [Requesty](https://requesty.ai/). Laut den [Nutzungsbedingungen](https://openrouter.ai/terms) von OpenRouter werden keine Daten gespeichert oder protokolliert, die zur KI-Analyse gesendet werden — es sei denn, du aktivierst das ausdrücklich in deinem Benutzerkonto. Requesty verspricht darüber hinaus Datenverarbeitung ausschließlich in der EU mit garantierter Null-Daten-Speicherung und DSGVO-Konformität.

## Warum

Jobsuche in Deutschland, besonders außerhalb der IT, heißt: mehrere Portale jonglieren, überall die gleichen Infos reinkopieren und das 147. Bewerbungsanschreiben verfassen. Diese App übernimmt den langweiligen Teil.

Außerdem ein Experiment in KI-gestützter Entwicklung: Der gesamte Code wurde von Claude geschrieben — aber mit sehr präzisen Anweisungen, sorgfältiger Prüfung jeder Änderung und konsequenter Architekturpflege, im Wechsel zwischen Features und Tech-Debt-Abbau.

## Entwicklung

Siehe [AGENTS.md](AGENTS.md) für Architektur, Konventionen und Befehle.

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
- [OpenRouter](https://openrouter.ai/) or [Requesty](https://requesty.ai/) (EU data residency) — powers match scoring, cover letter generation, and job search suggestions
- [Google Maps](https://developers.google.com/maps) — estimates commute times

All are optional. The app works fine without them, just with some functionality disabled.

### Privacy & Security

This app deals with very sensitive data — personal information and API keys. I'm well aware of that, so:

- **No backend.** The app has no server you'd need to trust. I have no means of collecting anything you enter.
- **Fully open source.** The code can be audited, and binaries are built automatically through CI — you don't have to trust my machine, just the build process.
- **API keys are stored encrypted** using the OS-level encryption mechanism (Electron `safeStorage`).
- **AI data processing.** When you provide an API key, personal data is sent to the chosen AI provider for analysis — [OpenRouter](https://openrouter.ai/) or [Requesty](https://requesty.ai/). OpenRouter's [terms of service](https://openrouter.ai/terms) state that they do not log or store any data sent for AI analysis, unless you specifically opt in within your user account. Requesty additionally promises EU-only data residency with guaranteed zero data retention and GDPR Article 44 compliance.

### Why

Job searching in Germany, especially outside IT, means juggling multiple portals, copy-pasting the same info everywhere, and writing your 147th Bewerbungsanschreiben. This app handles the boring parts.

Also an experiment in AI-assisted development: the entire codebase was written by Claude, but with me giving very precise instructions and carefully reviewing every change and keeping the architecture in check, by alternating between features and tech debt fixing.

### Development

See [AGENTS.md](AGENTS.md) for architecture, conventions, and commands.

### License

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)
