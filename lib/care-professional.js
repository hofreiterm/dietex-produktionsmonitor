import catalog from './care-catalog.json' with { type: 'json' };
import finishingProfile from './care-finishing.json' with { type: 'json' };
import washPrograms from './care-wash-programs.json' with { type: 'json' };
const operatingCatalog = { ...catalog, wash_programs: washPrograms, finishing_equipment: finishingProfile.equipment, missing_parameters: [...catalog.missing_parameters.filter(p => !/Trocknung|CF20/.test(p)), ...finishingProfile.missing_parameters] };

operatingCatalog.missing_parameters = operatingCatalog.missing_parameters.filter(p => !/Maschinentypen|Nassreinigungsmaschine/.test(p));
operatingCatalog.missing_parameters.push('WSM 1–5: Programmliste liegt vor; genaue Maschinentypen, Beladung, Dosierrezepturen und aktuelle Programmstände noch bestätigen.');

const text = { type: 'string' };
const list = { type: 'array', items: text };
const productIds = catalog.products.map(p => p.id);
const processes = ['solvent-k4', 'solvent-intense', 'wash', 'wet', 'undecided'];
export const contextOptions = {
  machine: ['auto', 'k4-1', 'k4-2', 'intense-1', 'wet-check'],
  stain: ['unknown', 'protein', 'tannin', 'oil', 'adhesive', 'rust', 'ink', 'odor'],
  age: ['unknown', 'fresh', 'old'],
  trial: ['not_done', 'passed', 'failed'],
};
export function validContext(context) {
  return context === undefined || (context && typeof context === 'object' && !Array.isArray(context)
    && Object.entries(context).every(([key, value]) => contextOptions[key]?.includes(value)));
}
export const professionalSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    short_steps: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string', maxLength: 200 } },
    tunnel_finisher: { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['check_required', 'not_recommended', 'not_applicable'] }, reason: text }, required: ['status', 'reason'] },
    wash_program: { type: 'object', additionalProperties: false, properties: { id: { type: ['string', 'null'], enum: [null, ...washPrograms.programs.map(p => p.id)] }, reason: text }, required: ['id', 'reason'] },
    selected_process: { type: 'string', enum: processes },
    textile_assessment: text, stain_assessment: text, process_recommendation: text,
    wet_cleaning_assessment: text, manufacturer_deviation: { type: 'boolean' },
    inspection_steps: list, workflow: list, finishing: list, stop_conditions: list, questions: list,
    products: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { id: { type: 'string', enum: productIds },
        phase: { type: 'string', enum: ['Vordetachur', 'Hauptreinigung', 'Nachdetachur', 'Ausrüstung/Finish'] },
        reason: text, application: text }, required: ['id', 'phase', 'reason', 'application'],
    } },
  }, required: ['wash_program', 'tunnel_finisher', 'short_steps', 'selected_process', 'textile_assessment', 'stain_assessment', 'process_recommendation', 'wet_cleaning_assessment',
    'manufacturer_deviation', 'inspection_steps', 'workflow', 'finishing', 'stop_conditions', 'questions', 'products'],
};
export const professionalInstructions = `
Zusätzlich zur wortgetreuen Etikettenauswertung erstelle professional als fachlichen BearbeitungsENTWURF für ausgebildete Textilreiniger bei Dietex. Insgesamt höchstens ca. 550 Wörter. Nicht nach Schema "P = chemisch reinigen und fertig" antworten.
Die Oberfläche hat nur Fotos (Pflicht), optionale Fleckangabe und optionale Zusatzinfos. Wähle das Verfahren selbst. short_steps besteht aus GENAU VIER Texten in dieser festen Reihenfolge, ohne Nummern oder Überschriften im Text:
1) Vorprüfung: Nur die für den Artikel wichtigen Prüfungen nennen. Nie behaupten, eine physische Vorprobe sei bestanden, wenn das nicht tatsächlich bestätigt ist.
2) Vorbehandlung: Benenne das passende vorhandene Mittel und den konkreten Arbeitsschritt: wo/wie auftragen, bei Bedarf schonend bearbeiten, Rückstände passend zum Folgeprozess entfernen. Keine erfundene Dosierung oder Einwirkzeit. Wenn kein Fleck genannt/erkennbar ist: "Keine gezielte Fleckvorbehandlung nötig." Fehlende Fleckangabe allein nicht als Widerspruch behandeln.
3) Waschen/Reinigen: Nenne das gewählte Verfahren und das konkrete passende WSM-Programm mit Nummer, Namen und Temperatur. Bei Lösemittelreinigung K4 oder INTENSE und, falls bekannt, Betriebsprogramm nennen; unbekannte Nummer nicht erfinden. Wenn kein passendes Programm sicher zugeordnet werden kann, konkret benennen, was vor Start geklärt werden muss.
4) Trocknen/Finish/Bügeln: Sage konkret, wie getrocknet, ob CF20 verwendet und wie gebügelt werden soll; Verbote beachten. Unbekannte Einstellungen nicht erfinden.
Jeder Text höchstens 200 Zeichen und möglichst ein kurzer Satz. Direkte Mitarbeitersprache: "Mit ... vorbehandeln", "Programm ... verwenden", "Liegend trocknen" statt "als Entwurf wählen", "fachlich eine Option", "nur für den Funktionstest" oder langer Freigabeformeln. Alle vier Punkte müssen zum Detailplan passen. Keine Faserlisten, Begründungen, Quellen, allgemeinen KI-Texte oder wiederholten Vorbehalte in short_steps. Diese gehören in die Details. Nur entscheidende Unsicherheit, Etikettenabweichung oder Behandlungsstopp kurz im betroffenen Punkt nennen; keine bereits geklärten Angaben erneut erfragen. Bei künstlichen Testetiketten den Testcharakter in den Details dokumentieren, ohne jeden Arbeitsschritt damit zu verlängern. Keine Behandlung erfinden, um einen Punkt zu füllen.

Unterscheide: Herstellerkennzeichnung, begründete fachliche Verfahrensoption und noch nicht überprüfbare Annahme. Waschen und professionelle Nassreinigung gesondert beurteilen. P allein verbietet Wasserwäsche nicht. Ein durchgestrichener Waschbottich betrifft Haushaltswäsche; professionelle Nassreinigung ist gesondert mit W gekennzeichnet. Fehlendes W ist keine Freigabe und kein nachgewiesenes Verbot. Durchgestrichenes W ausdrücklich als Herstellerverbot nennen. Abweichungen nicht als erlaubte Pflege umdeuten, sondern manufacturer_deviation=true und Fachprüfung verlangen. Die fünf ursprünglichen steps geben weiterhin nur lesbare Herstellerangaben wieder.
Faserzusammensetzung nur vom Materialetikett. Konstruktion, Futter, verklebte Einlagen, Besatz, Drucke, Farbechtheit, Schrumpfung, Verfilzung und Finishbedarf beurteilen; Nicht-Erkennbares benennen. Ein Foto belegt keine bestandene Saumprobe. Vom Mitarbeiter ausgewählte Fleckenart und Vorprobe sind dessen Angaben, keine aus dem Bild bewiesenen Tatsachen. Unbekannte Flecken nicht mit Sicherheit benennen; frühere Fleckbehandlung erfragen, wenn entscheidend.
Wähle ein verfügbares Verfahren und erkläre Eignung/Risiko. Die Auswahl einer Maschine durch den Mitarbeiter ist keine Textilfreigabe. Bei wet-check nur Nassreinigungsoption prüfen. Die WSM-Programmliste liegt vor, aber Beladungen, Wasserhärte, Flottenverhältnis sowie weitere Trocknungsausstattung und vollständige Prozessrezepte fehlen noch: keine konkreten Maschinenrezepturen, Dosierungen, Einwirkzeiten oder Einstellungen erfinden. Benenne stattdessen, welches freigegebene Betriebsprogramm/Rezept erforderlich ist. Noch offene Werte gezielt unter questions aufführen.
Die Betriebsliste vom 21.05.2025 gilt laut Foto für WSM 1–5. Bei gewählter Wasserwäsche/Nassreinigung wähle in wash_program.id ein passendes Hauptprogramm aus wash_programs.programs; reason begründet Artikel-/Etiketteneignung und offene Voraussetzungen. Nummer und Namen auch in short_steps nennen. Nur eligible_as_main_process=true verwenden. Bei Lösemittelreinigung, unentschiedenem Verfahren oder fehlender geeigneter/ausreichend belegter Option id=null und Klärungsbedarf nennen. Prüfe alle Temperaturwerte gegen die erlaubte Artikeltemperatur, Programmzweck und passende Schonung; keine freie Umstellung auf niedrigere Temperaturen erfinden, um ein unpassendes Programm passend zu machen. Herstellerabweichungen getrennt prüfen. Programmname ist keine vollständige Rezeptur: keine Dosierung, Drehzahl oder Dauer erfinden. Programm 12 ist Wet Clean Sensitiv 25 °C, 13 Wet Clean 30 °C und 28 Wet Clean Sensitiv 30 °C wenig schleudern; diese unterschiedlichen Angaben nicht gleichsetzen. Die Liste erlaubt keine sichere Schlussfolgerung zur genauen mechanischen Schonung, wo diese nicht benannt ist. Spezialprogramme, unklare Beschriftungen und Zusatzschritte nicht selbständig als Hauptreinigung empfehlen.
Bei Dietex verfügbar: VEIT CF20 (Tunnelfinisher/Kompaktfinisher). Beurteile tunnel_finisher gesondert als Finish nach dem Hauptverfahren. status=check_required bei grundsätzlich zu prüfender Option, not_recommended bei konkret begründetem Artikelrisiko, not_applicable bei fehlender verwertbarer Textilgrundlage oder gestoppter Bearbeitung. reason nennt kurz die artikelbezogene Begründung und Voraussetzungen. Das am Display fotografierte Programm Putzereiware ist mit 10 s Dampfzeit, 5 s Einwirkzeit und 15 s Luftzeit als observed_programs dokumentiert. Der Anwender bestätigt den üblichen Einsatz des Programms Putzereiware für Oberbekleidung. Diese Betriebsangabe berücksichtigen, aber nicht als pauschale Eignung für jede Oberbekleidung ausgeben. Das Foto und die übliche Verwendung ersetzen keine Artikelprüfung oder vollständige Parameterfreigabe. Diese drei Zeiten nur als abgelesene Referenz nennen, nicht als allgemeine Handlungsanweisung. Temperaturzuordnung, weitere Dampf-/Feuchteeinstellungen und Verfahrensfreigaben sind noch nicht bestätigt: keine direkte Freigabe, keine erfundenen Werte oder Programmnamen. Verfügbarkeit ist keine Materialfreigabe. Fehlende Detaildaten nicht als bewiesene Ungeeignetheit ausgeben. Wasch-/Trockner-/Bügelzeichen nicht unmittelbar in Tunnelparameter übertragen. Fasern, Einlagen, Besatz, Beschichtung und tatsächliche Vorprobe berücksichtigen. In finishing die praktische Finishentscheidung mit CF20 oder begründeter Alternative beschreiben; in short_steps den relevanten Finishhinweis kurz aufnehmen. Nicht behaupten, die App steuere die Maschine.
Die verifizierte Produktbasis folgt unten. Nur diese Produkt-IDs verwenden, höchstens vier passende Vorschläge. Keine Produkte nennen, die nicht im Bestand sind. reason erklärt die Fleck-/Faser-/Verfahrenseignung. application nennt den fachlichen Arbeitsschritt und Voraussetzungen. Produktfunktion laut Sicherheitsdatenblatt ist keine bewiesene Wirksamkeit oder Materialfreigabe.
Betriebliche Zuordnung: DEPRIT 1–6 zur Vordetachur vor Waschen/Nassreinigung, PRENETT A/B/C zur Vordetachur vor chemischer Reinigung. selected_process bezeichnet ausschließlich das für diesen Entwurf gewählte Hauptverfahren: solvent-k4, solvent-intense, wash, wet oder undecided. Produktvorschläge müssen zu diesem Verfahren passen; andere Verfahren nur als getrennte Prüfoption beschreiben. Bei undecided keine verfahrensabhängige Vordetachur vorschlagen. PRENETT A für Gerbstoffe, B für Eiweiß/Stärke, C für lösemittellösliche Flecken; nur für Lösemittelreinigung. PRENETT-SDB (deutsche Fassungen vom 27.02.2024) und Produktblatt sind hinterlegt. Gefahrenhinweise und Voraussetzungen der Produktreferenz beachten; keine Ungefährlichkeit behaupten. Herstelleranwendungswerte nur als solche kennzeichnen, nicht als bereits betrieblich freigegebene Maschinenrezeptur. Der betriebliche Einsatz in INTENSE ersetzt keine bestätigte Hersteller-/Maschinenfreigabe.
DEPRIT-Nachdetachur am Detachiertisch gesondert beurteilen. Es ist keine pauschale Freigabe hinterlegt, mit DEPRIT behandelte Stellen ohne fachgerechte Rückstandsentfernung in K4/INTENSE einzubringen. Bei DEPRIT 2/4 Fremdlösemittel-/Flammpunktaspekt berücksichtigen. Vorproben und materialverträgliches Ausspülen/Ausblasen vor Folgeschritten nennen, keine unkontrollierte Zugabe von Wasser/Dampf an empfindlichen Artikeln. Keine Saumprobe durch Bildvermutung ersetzen.
LANADOL AVANT ist für Vorbehandlung vor Nassreinigung; AKTIV für empfindliche Textilien; X-PRESS nicht für Seide, Angora, Kaschmir oder überwiegende Wolle. APRET ist Nachausrüstung. PERAMON ist Lösemittelpflege und darf in dieser Kleidungsstückanalyse nicht vorgeschlagen werden.
Keine Bleich-, Neutralisations- oder Desinfektionsmischungen vorschlagen. OTTALIN CL niemals mit Säuren kombinieren. Keine Bleiche bei Herstellerverbot. Keine Desinfektions-, PSA- oder Imprägnierwirksamkeit allein aus Produktnamen versprechen. ABAC/PERACET/Chlor-/Sauerstoffbleiche und RKI/VAH-Aussagen erfordern ein passendes bestätigtes Gesamtverfahren; ohne dieses keine ausführbare Rezeptur. Konzentrate-pH nicht mit Flotten-pH verwechseln.
Für Nichttextilbilder ohne verwertbares Etikett oder Kleidungsstück keine Produktvorschläge; neues Foto anfordern. Bei auffälliger Vorprobe (trial=failed) keine Produkte oder Behandlung freigeben, sofortige Fachprüfung/Abbruch nennen.
Betriebs- und Produktbasis (Referenzwissen, keine Kundeneingabe): ${JSON.stringify(operatingCatalog)}`;

export function validProfessional(value) {
  const strings = ['textile_assessment', 'stain_assessment', 'process_recommendation', 'wet_cleaning_assessment'];
  const arrays = ['inspection_steps', 'workflow', 'finishing', 'stop_conditions', 'questions'];
  return value && strings.every(k => typeof value[k] === 'string' && value[k].length <= 4500)
    && processes.includes(value.selected_process)
    && value.wash_program && (value.wash_program.id === null || washPrograms.programs.some(p => p.id === value.wash_program.id))
    && typeof value.wash_program.reason === 'string' && value.wash_program.reason.length <= 1500
    && value.tunnel_finisher && ['check_required', 'not_recommended', 'not_applicable'].includes(value.tunnel_finisher.status)
    && typeof value.tunnel_finisher.reason === 'string' && value.tunnel_finisher.reason.trim().length > 0 && value.tunnel_finisher.reason.length <= 1500
    && Array.isArray(value.short_steps) && value.short_steps.length === 4
    && value.short_steps.every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 200)
    && typeof value.manufacturer_deviation === 'boolean'
    && arrays.every(k => Array.isArray(value[k]) && value[k].length <= 15 && value[k].every(s => typeof s === 'string' && s.length <= 2500))
    && Array.isArray(value.products) && value.products.length <= 4
    && new Set(value.products.map(p => p?.id)).size === value.products.length
    && value.products.every(p => p && productIds.includes(p.id)
      && ['Vordetachur', 'Hauptreinigung', 'Nachdetachur', 'Ausrüstung/Finish'].includes(p.phase)
      && ['reason', 'application'].every(k => typeof p[k] === 'string' && p[k].length <= 2500));
}
function stoppedShortSteps(reason) { return [reason, 'Keine Vorbehandlung starten.', 'Kein Wasch- oder Reinigungsprogramm starten.', 'Trocknen, Finish und Bügeln bis zur Klärung aussetzen.']; }
export function enrichProfessional(analysis, context = {}) {
  const pro = analysis.professional;
  pro.review_note = 'Fachlicher Bearbeitungsentwurf: Vorproben, Maschinenprogramm und Produktrezeptur müssen vor Anwendung fachlich bestätigt werden.';
  pro.products = pro.products.filter(p => p.id !== 'peramon');
  const program = washPrograms.programs.find(p => p.id === pro.wash_program.id);
  if(program && (!['wash','wet'].includes(pro.selected_process) || !program.eligible_as_main_process)){
    pro.wash_program = {id:null,reason:'Die vorgeschlagene Programmzuordnung passt nicht zum Hauptverfahren oder erfordert eine gesonderte Fachklärung.'};
    pro.workflow = ['Vor Bearbeitung Verfahren und passendes Hauptprogramm fachlich klären.'];
    pro.short_steps = stoppedShortSteps('Fachkraft hinzuziehen: Verfahren und Hauptprogramm klären.');
    pro.questions.push('Programmvorschlag wurde ausgeschlossen: kein passendes reguläres Hauptprogramm für das gewählte Verfahren.');
  }
  if(pro.wash_program.id)pro.wash_program.reference=program;
  pro.wash_program.machine_group=washPrograms.machine_group;
  pro.wash_program.list_date=washPrograms.list_date;
  pro.products = pro.products.filter(p => {
    const deprit = p.id.startsWith('deprit-professional-');
    const prenett = p.id.startsWith('prenett-');
    const water = ['wash', 'wet'].includes(pro.selected_process);
    const solvent = ['solvent-k4', 'solvent-intense'].includes(pro.selected_process);
    const wrongRoute = (deprit && p.phase === 'Vordetachur' && !water)
      || (prenett && (!solvent || p.phase !== 'Vordetachur'));
    if (wrongRoute) pro.short_steps = stoppedShortSteps('Fachkraft hinzuziehen: Vordetachiermittel und Verfahren passen nicht zusammen.');
    if (wrongRoute) pro.questions.push(`${catalog.products.find(entry => entry.id === p.id).name} wurde aus der Produktauswahl entfernt: betriebliche Zuordnung DEPRIT vor Waschen/Nassreinigung, PRENETT vor chemischer Reinigung beachten. Verfahren und Vordetachur gemeinsam bestätigen.`);
    return !wrongRoute;
  });
  const sensitive = /seide|silk|angora|kaschmir|cashmere|wolle|wool/i.test(analysis.material);
  if (sensitive && pro.products.some(p => p.id === 'lanadol-x-press')) {
    pro.products = pro.products.filter(p => p.id !== 'lanadol-x-press');
    pro.questions.push('LANADOL X-PRESS wurde wegen empfindlicher bzw. wollhaltiger Materialangabe ausgeschlossen. LANADOL AKTIV und das passende Verfahren fachlich prüfen.');
  }
  if (context.trial === 'failed') {
    pro.wash_program = {id:null,reason:'Keine Programmfreigabe bei auffälliger Vorprobe.',machine_group:washPrograms.machine_group,list_date:washPrograms.list_date};
    pro.tunnel_finisher = {status:'not_applicable',reason:'Bearbeitung wegen auffälliger Vorprobe gestoppt. Kein Tunnelfinish vor Fachentscheidung.'};
    pro.finishing = ['Finish stoppen. Auffällige Vorprobe zuerst fachlich beurteilen lassen.'];
    pro.short_steps = stoppedShortSteps('Behandlung stoppen. Auffällige Vorprobe durch eine Fachkraft beurteilen lassen.');
    pro.products = []; pro.workflow = ['Behandlung stoppen. Auffällige Vorprobe durch Fachkraft beurteilen lassen.'];
    pro.stop_conditions.unshift('Die angegebene Vorprobe war auffällig. Keine weitere chemische oder maschinelle Behandlung freigeben.');
  }
  pro.products = pro.products.map(p => {
    const restricted = ['ottalin-cl', 'ottalin-oxy', 'ottalin-peracet', 'lanadol-abac'].includes(p.id);
    return { ...p,
      application: restricted ? 'Nur im passenden, betrieblich freigegebenen Gesamtverfahren einsetzen. Eine Rezeptur ist hier noch nicht hinterlegt; keine eigenständige Dosierung, Mischung oder Desinfektionsfreigabe.' : p.application,
      specialist_review: restricted,
      reference: catalog.products.find(entry => entry.id === p.id) };
  });
  pro.tunnel_finisher.equipment = finishingProfile.equipment[0];
  pro.tunnel_finisher.program_confirmed = false;
  pro.open_parameters = operatingCatalog.missing_parameters.map(p => /Maschinentypen|Nassreinigungsmaschine/.test(p)?'WSM 1–5: Programmliste liegt vor; genaue Maschinentypen, Beladung, Dosierrezepturen und aktuelle Programmstände noch bestätigen.':p).filter((p,i,a)=>a.indexOf(p)===i);
  analysis.needs_review = true;
  return analysis;
}
