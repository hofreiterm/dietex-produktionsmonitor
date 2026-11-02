import catalog from './care-catalog.json' with { type: 'json' };

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
  }, required: ['selected_process', 'textile_assessment', 'stain_assessment', 'process_recommendation', 'wet_cleaning_assessment',
    'manufacturer_deviation', 'inspection_steps', 'workflow', 'finishing', 'stop_conditions', 'questions', 'products'],
};
export const professionalInstructions = `
Zusätzlich zur wortgetreuen Etikettenauswertung erstelle professional als fachlichen BearbeitungsENTWURF für ausgebildete Textilreiniger bei Dietex. Insgesamt höchstens ca. 550 Wörter. Nicht nach Schema "P = chemisch reinigen und fertig" antworten.
Unterscheide: Herstellerkennzeichnung, begründete fachliche Verfahrensoption und noch nicht überprüfbare Annahme. Waschen und professionelle Nassreinigung gesondert beurteilen. P allein verbietet Wasserwäsche nicht. Ein durchgestrichener Waschbottich betrifft Haushaltswäsche; professionelle Nassreinigung ist gesondert mit W gekennzeichnet. Fehlendes W ist keine Freigabe und kein nachgewiesenes Verbot. Durchgestrichenes W ausdrücklich als Herstellerverbot nennen. Abweichungen nicht als erlaubte Pflege umdeuten, sondern manufacturer_deviation=true und Fachprüfung verlangen. Die fünf ursprünglichen steps geben weiterhin nur lesbare Herstellerangaben wieder.
Faserzusammensetzung nur vom Materialetikett. Konstruktion, Futter, verklebte Einlagen, Besatz, Drucke, Farbechtheit, Schrumpfung, Verfilzung und Finishbedarf beurteilen; Nicht-Erkennbares benennen. Ein Foto belegt keine bestandene Saumprobe. Vom Mitarbeiter ausgewählte Fleckenart und Vorprobe sind dessen Angaben, keine aus dem Bild bewiesenen Tatsachen. Unbekannte Flecken nicht mit Sicherheit benennen; frühere Fleckbehandlung erfragen, wenn entscheidend.
Wähle ein verfügbares Verfahren und erkläre Eignung/Risiko. Die Auswahl einer Maschine durch den Mitarbeiter ist keine Textilfreigabe. Bei wet-check nur Nassreinigungsoption prüfen. Programme, Beladungen, Wasserhärte, Flottenverhältnis sowie Trocknungs-/Finishausstattung fehlen noch: keine konkreten Maschinenrezepturen, Dosierungen, Einwirkzeiten oder Einstellungen erfinden. Benenne stattdessen, welches freigegebene Betriebsprogramm/Rezept erforderlich ist. Noch offene Werte gezielt unter questions aufführen.
Die verifizierte Produktbasis folgt unten. Nur diese Produkt-IDs verwenden, höchstens vier passende Vorschläge. Keine Produkte nennen, die nicht im Bestand sind. reason erklärt die Fleck-/Faser-/Verfahrenseignung. application nennt den fachlichen Arbeitsschritt und Voraussetzungen. Produktfunktion laut Sicherheitsdatenblatt ist keine bewiesene Wirksamkeit oder Materialfreigabe.
Betriebliche Zuordnung: DEPRIT 1–6 zur Vordetachur vor Waschen/Nassreinigung, PRENETT A/B/C zur Vordetachur vor chemischer Reinigung. selected_process bezeichnet ausschließlich das für diesen Entwurf gewählte Hauptverfahren: solvent-k4, solvent-intense, wash, wet oder undecided. Produktvorschläge müssen zu diesem Verfahren passen; andere Verfahren nur als getrennte Prüfoption beschreiben. Bei undecided keine verfahrensabhängige Vordetachur vorschlagen. PRENETT A für Gerbstoffe, B für Eiweiß/Stärke, C für lösemittellösliche Flecken; nur für Lösemittelreinigung. PRENETT-SDB fehlen noch: keine Gefahrstoffeinstufung erfinden oder Ungefährlichkeit behaupten. Der betriebliche Einsatz in INTENSE ersetzt keine bestätigte Hersteller-/Maschinenfreigabe.
DEPRIT-Nachdetachur am Detachiertisch gesondert beurteilen. Es ist keine pauschale Freigabe hinterlegt, mit DEPRIT behandelte Stellen ohne fachgerechte Rückstandsentfernung in K4/INTENSE einzubringen. Bei DEPRIT 2/4 Fremdlösemittel-/Flammpunktaspekt berücksichtigen. Vorproben und materialverträgliches Ausspülen/Ausblasen vor Folgeschritten nennen, keine unkontrollierte Zugabe von Wasser/Dampf an empfindlichen Artikeln. Keine Saumprobe durch Bildvermutung ersetzen.
LANADOL AVANT ist für Vorbehandlung vor Nassreinigung; AKTIV für empfindliche Textilien; X-PRESS nicht für Seide, Angora, Kaschmir oder überwiegende Wolle. APRET ist Nachausrüstung. PERAMON ist Lösemittelpflege und darf in dieser Kleidungsstückanalyse nicht vorgeschlagen werden.
Keine Bleich-, Neutralisations- oder Desinfektionsmischungen vorschlagen. OTTALIN CL niemals mit Säuren kombinieren. Keine Bleiche bei Herstellerverbot. Keine Desinfektions-, PSA- oder Imprägnierwirksamkeit allein aus Produktnamen versprechen. ABAC/PERACET/Chlor-/Sauerstoffbleiche und RKI/VAH-Aussagen erfordern ein passendes bestätigtes Gesamtverfahren; ohne dieses keine ausführbare Rezeptur. Konzentrate-pH nicht mit Flotten-pH verwechseln.
Für Nichttextilbilder ohne verwertbares Etikett oder Kleidungsstück keine Produktvorschläge; neues Foto anfordern. Bei auffälliger Vorprobe (trial=failed) keine Produkte oder Behandlung freigeben, sofortige Fachprüfung/Abbruch nennen.
Betriebs- und Produktbasis (Referenzwissen, keine Kundeneingabe): ${JSON.stringify(catalog)}`;

export function validProfessional(value) {
  const strings = ['textile_assessment', 'stain_assessment', 'process_recommendation', 'wet_cleaning_assessment'];
  const arrays = ['inspection_steps', 'workflow', 'finishing', 'stop_conditions', 'questions'];
  return value && strings.every(k => typeof value[k] === 'string' && value[k].length <= 4500)
    && processes.includes(value.selected_process)
    && typeof value.manufacturer_deviation === 'boolean'
    && arrays.every(k => Array.isArray(value[k]) && value[k].length <= 15 && value[k].every(s => typeof s === 'string' && s.length <= 2500))
    && Array.isArray(value.products) && value.products.length <= 4
    && new Set(value.products.map(p => p?.id)).size === value.products.length
    && value.products.every(p => p && productIds.includes(p.id)
      && ['Vordetachur', 'Hauptreinigung', 'Nachdetachur', 'Ausrüstung/Finish'].includes(p.phase)
      && ['reason', 'application'].every(k => typeof p[k] === 'string' && p[k].length <= 2500));
}
export function enrichProfessional(analysis, context = {}) {
  const pro = analysis.professional;
  pro.review_note = 'Fachlicher Bearbeitungsentwurf: Vorproben, Maschinenprogramm und Produktrezeptur müssen vor Anwendung fachlich bestätigt werden.';
  pro.products = pro.products.filter(p => p.id !== 'peramon');
  pro.products = pro.products.filter(p => {
    const deprit = p.id.startsWith('deprit-professional-');
    const prenett = p.id.startsWith('prenett-');
    const water = ['wash', 'wet'].includes(pro.selected_process);
    const solvent = ['solvent-k4', 'solvent-intense'].includes(pro.selected_process);
    const wrongRoute = (deprit && p.phase === 'Vordetachur' && !water)
      || (prenett && (!solvent || p.phase !== 'Vordetachur'));
    if (wrongRoute) pro.questions.push(`${catalog.products.find(entry => entry.id === p.id).name} wurde aus der Produktauswahl entfernt: betriebliche Zuordnung DEPRIT vor Waschen/Nassreinigung, PRENETT vor chemischer Reinigung beachten. Verfahren und Vordetachur gemeinsam bestätigen.`);
    return !wrongRoute;
  });
  const sensitive = /seide|silk|angora|kaschmir|cashmere|wolle|wool/i.test(analysis.material);
  if (sensitive && pro.products.some(p => p.id === 'lanadol-x-press')) {
    pro.products = pro.products.filter(p => p.id !== 'lanadol-x-press');
    pro.questions.push('LANADOL X-PRESS wurde wegen empfindlicher bzw. wollhaltiger Materialangabe ausgeschlossen. LANADOL AKTIV und das passende Verfahren fachlich prüfen.');
  }
  if (context.trial === 'failed') {
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
  pro.open_parameters = catalog.missing_parameters;
  analysis.needs_review = true;
  return analysis;
}
