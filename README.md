# DieTex Produktionsmonitor

Live Produktionsmonitor mit Supabase, Tablets, Stationen und Monitoransichten.

## Pflegehilfe mit KI

Die Hauptnavigation führt über „Pflegehilfe“ zu `/pflegehilfe`. Die eigenständige mobile Seite befindet sich in `public/pflegehilfe` und wird beim bestehenden Vite-Build mit ausgeliefert. Vercel-Rewrites unterstützen den Direktaufruf mit und ohne abschließenden Schrägstrich. Über „Produktionsmonitor“ geht es zurück zur Hauptseite.

Die Pflegehilfe bietet Kamera/Fotoauswahl, bis zu drei Bildvorschauen und eine druckbare deutsche Pflegeanleitung. Fotos werden im Browser auf maximal 1800 Pixel verkleinert, als JPEG ohne ursprüngliche EXIF-Metadaten exportiert und erst nach „Fotos analysieren“ an `/api/pflegehilfe` gesendet. Diese Vercel-Funktion ruft die OpenAI Responses API mit Bilddaten, JSON-Schema und `store: false` auf. Diese App persistiert weder Fotos noch Ergebnisse. Für die Verarbeitung durch OpenAI gelten dessen API-Datenbedingungen; `store: false` ist keine Zusage über sämtliche Anbieterprotokolle.

### Einrichtung in Vercel

Serverseitige Umgebungsvariablen für Production und Preview eintragen und erneut deployen:

- `OPENAI_API_KEY`: Schlüssel aus dem OpenAI-API-Projekt mit verfügbarem Kontingent. Niemals als `VITE_*`-Variable anlegen.
- `OPENAI_MODEL`: optional; Standard `gpt-5.6-terra`, mit Bildinput, Structured Outputs und `reasoning.effort: low` kompatibel.

Ohne gültige Konfiguration ist die Analyse gesperrt; es werden keine Demo-Ergebnisse als echte Analysen ausgegeben. Bestehende Produktionsansichten benötigen diese Variablen nicht. Neue Datenbanktabellen sind nicht erforderlich.

Die Pflegehilfe ist ohne Anmeldung und ohne Team-Code nutzbar. Das optionale Hinweisfeld ist als normales Textfeld mit deaktiviertem Autofill gekennzeichnet; es befindet sich kein Passwortfeld auf der Seite. Pro Funktionsinstanz werden 20 Anfragen je IP in 15 Minuten zugelassen; diese Begrenzung ist bei Neustarts oder mehreren Instanzen nicht global. Herkunftsprüfung und Eingabevalidierung bleiben aktiv. Für höheren Betrieb gegebenenfalls eine zentrale Ratenbegrenzung oder Vercel-Firewall ergänzen und die API-Ausgaben im Anbieterprojekt begrenzen.

### Prüfen

`node --test tests/pflegehilfe.test.js` prüft Konfiguration, Nutzung ohne Team-Code, Herkunftsprüfung, Eingabevalidierung, KI-Anfragen, unklare Ergebnisse, Quotenfehler und Zeitüberschreitungen mit simulierten API-Antworten. `pnpm build` baut das Frontend. Bei lokalen Windows-Problemen mit dem Vite-Konfigurationsloader: `node node_modules/vite/bin/vite.js build --configLoader runner`.

Vite allein führt die Vercel-Funktion nicht aus; für einen lokalen Test mit API ist Vercel Dev erforderlich. Echte Bildanalysen erst nach Einrichtung des Schlüssels am Deployment testen. Pflegeangaben vor Anwendung am Originaletikett prüfen; unlesbare oder fehlende Zeichen und Schutzkleidung erfordern Klärung bzw. Herstellerangaben.
