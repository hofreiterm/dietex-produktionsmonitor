# DieTex Produktionsmonitor

Live Produktionsmonitor mit Supabase, Tablets, Stationen und Monitoransichten.

## Pflegehilfe mit KI

### Fachmodus (0.3)

Die Analyse ergänzt die Herstellerkennzeichnung um einen fachlichen Bearbeitungsentwurf: Textil/Konstruktion, Fleckeneinschätzung, Verfahrensvorschlag, gesonderte Nassreinigungsbewertung, Vorproben, Bearbeitungsfolge, Produktkandidaten, Trocknung/Finish, Abbruchkriterien und offene Fragen. Mitarbeiter können K4-Maschine 1/2, INTENSE oder die Prüfung einer Nassreinigungsoption wählen und Fleckengruppe, Fleckenalter und Vorprobenergebnis angeben.

`lib/care-catalog.json` enthält 28 betrieblich benannte Kreussler-Produkte mit Anwendungsgebiet, Grenzen, SDB-Revisionsstand und Gefahrenhinweisen. Es werden weder die Original-PDFs noch interne Serverpfade veröffentlicht. Herstelleranweisungen ergänzen die SDB; ein SDB allein ist keine Dosierrezeptur oder Textilfreigabe.

Noch nicht hinterlegt sind Maschinenmodelle/-programme, Flottenverhältnis, Wasserhärte, Dosierrezepturen und Trocknungs-/Finishaustattung. Der Entwurf muss diese Punkte offenlegen. Alternative Verfahren außerhalb der Herstellerkennzeichnung bleiben fachlich zu prüfende Optionen. Es wird keine PSA-, Desinfektions- oder Imprägnierwirkung zugesichert.

Produkt-IDs werden serverseitig validiert. PERAMON wird nicht zur Textilbehandlung vorgeschlagen; LANADOL X-PRESS wird bei empfindlichen bzw. wollhaltigen Materialangaben entfernt. Bei auffälliger Vorprobe entfallen sämtliche Produktvorschläge und die Behandlung wird gestoppt. Für Chlor-/Sauerstoffbleiche und ABAC/PERACET gibt die Oberfläche ohne hinterlegte Verfahrensfreigabe keine Dosier- oder Mischrezeptur aus. Diese Prüfungen ergänzen die Fachprüfung, sie ersetzen keine vollständige Material-/Verfahrensvalidierung.

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

Betriebliche Vordetachur: DEPRIT 1–6 vor Waschen/Nassreinigung; PRENETT A/B/C vor Lösemittelreinigung. Die strukturierte Verfahrenswahl wird serverseitig gegen diese Zuordnung geprüft. PRENETT-Produktblatt sowie die deutschen Sicherheitsdatenblätter vom 27.02.2024 sind ausgewertet; österreichische Fassungen sind nicht hinterlegt. Herstelleranwendung und betriebliche Maschinenfreigabe bleiben getrennt. DEPRIT-Nachdetachur bleibt getrennt zu beurteilen.

Die Eingabe umfasst ausschließlich 1–3 Pflichtfotos, eine optionale Fleckangabe mit festen Vorschlägen und lokal gespeicherten eigenen Angaben sowie optionale Zusatzinfos. Es gibt keine Verfahrens-, Maschinen-, Fleckalter- oder Vorprobenauswahl. Die KI wählt das Verfahren. Zuerst erscheinen maximal fünf kurze Arbeitsanweisungen; der vollständige Fachmodus und die Etikettenauswertung stehen unter Details. Eigene Fleckvorschläge bleiben im Browser dieses Geräts; Fotos/Ergebnisse werden nicht lokal gespeichert.

Finishausstattung: VEIT CF20 vom Betrieb bestätigt. Die KI beurteilt Tunnelfinish artikelbezogen, zeigt die Begründung unter Details und berücksichtigt die Entscheidung in den kurzen Arbeitsschritten. Konkrete Programme und Temperatur-/Dampf-/Feuchte-/Zeitwerte fehlen; eine direkte Verfahrensfreigabe wird nicht ausgegeben. Eine auffällige Vorprobe stoppt auch das Finish. Keine zusätzliche Verfahrensauswahl oder Maschinensteuerung.
