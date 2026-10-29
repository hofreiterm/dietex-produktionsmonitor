# DieTex Produktionsmonitor

Live Produktionsmonitor mit Supabase, Tablets, Stationen und Monitoransichten.

## Pflegehilfe (Demo)

Die Hauptnavigation führt über „Pflegehilfe“ zu `/pflegehilfe`. Die eigenständige mobile Seite befindet sich in `public/pflegehilfe` und wird beim bestehenden Vite-Build mit ausgeliefert. Vercel-Rewrites unterstützen den Direktaufruf mit und ohne abschließenden Schrägstrich. Über „Produktionsmonitor“ geht es zurück zur Hauptseite.

Die Demo bietet Kamera/Fotoauswahl, bis zu drei lokale Bildvorschauen und eine druckbare Beispiel-Anleitung. Die Ausgabe ist ausdrücklich simuliert und liest keine Pflegezeichen aus den Fotos. Fotos werden weder an Supabase noch an eine KI gesendet. Es werden keine neuen Umgebungsvariablen oder Datenbanktabellen benötigt.

Für echte KI-Auswertung ist später eine serverseitige Vercel-Funktion mit serverseitigem API-Schlüssel und Zugangsschutz erforderlich. Ein OpenAI-Schlüssel darf nicht als `VITE_*`-Variable im Frontend hinterlegt werden.
