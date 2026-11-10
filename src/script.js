// MANUS — alle replikker uden for minispillene (minispil ejer selv <spil-id>_intro/_ok/_wrong i deres egen fil).
// Tone: tørt, deadpan edutainment-sprog. Hyggeligt og underligt, aldrig uhyggeligt. Kun opdigtede sorter og Krater-kroner.
//
// TIL LYD-SPORET: hver replik er en FAST tekst. allLines() giver [{ id, key, i, who, text }] — id er "<nøgle>" eller
// "<nøgle>_<nr>" for lister. Spillerens navn står ALDRIG i en replik (det vises kun i grafikken), og tal, klokkeslæt og
// beløb er skrevet, som de skal siges ("klokken seksten tyve", "nul kroner og nul øre"). Ingen specialtegn.
// En liste er enten en sekvens (siges i rækkefølge), varianter (tilfældig) eller ét pr. akt — det står ved nøglen.
import { say } from './core/dialog.js';

const MANUS = {
  // ------------------------------------------------------------------ Skipper Sløv (hjælperen; uden navn i boksen)
  sloev: {
    // sekvens: allerførste gang i Drivhus 7
    akt1_sloev: [
      'Velkommen til Måneby. Jeg er Skipper Sløv. Jeg skal hjælpe dig med, øh. Det kommer.',
      'Høstfesten. Det er snart Høstfest. Festkomitéen kan bare ikke huske, hvad vi fejrer.',
      'Du er ny festbestyrer og praktikant her i Drivhus 7. Det er to stillinger. Lønnen er den samme.',
      'Klokken er seksten tyve. Det har den været længe. Vi når det hele.',
    ],
    akt2_sloev: ['Anden akt. Planten er vokset. Jeg har ikke rørt mig. Sådan er arbejdsfordelingen.'],
    akt3_sloev: ['Tredje akt. Nu blomstrer det. Komitéen har holdt møde. De nåede frem til, at de har holdt møde.'],
    akt4_sloev: ['Fjerde akt. Høst. Det er i dag, der er Høstfest. Det har det været hele tiden.'],
    akt4_sloev2: ['Jeg ligger her. Jeg ligger også derude i tågen. Det er en cd-rom. Sådan noget kan lade sig gøre.'],
    hub_first: 'Klik på et sted i byen. Hvis du mangler hjælp, så klik på mig. Jeg ligger her alligevel.',
    // pr. akt (2, 3, 4): første gang i byen i en ny akt
    hub_ny: [
      'Byen har fået tre nye steder. De har været der hele tiden. Nu må du bare klikke på dem.',
      'Popcorn-fabrikken, Lampen og Kiosken er åbne. Jeg ville vise vej, men jeg ligger så godt.',
      'Der er kun ét sted tilbage. Og en tåge. Tågen tager vi bagefter.',
    ],
    // varianter: tilbage i byen
    hub_back: [
      'Godt. Hvad nu. Der er syv minutter til bussen.',
      'Udmærket. Vælg et nyt sted.',
      'Komitéen venter. De har ventet siden klokken seksten tyve.',
      'Det gik jo. Jeg så det meste.',
      'Videre. Stille og roligt.',
      'Bussen kører om syv minutter. Den kommer ikke forbi her.',
    ],
    // pr. akt: aktens minispil er løst
    hub_klar: [
      'Alle tre steder er klaret. Marianne venter i Drivhus 7 med regnskabet.',
      'Akten er regnet færdig. Marianne mangler stadig sin vandkande. Gå til Drivhus 7.',
      'Alt er regnet. Kiosk-Kurt har vist et ærinde til dig. Det foregår i Kiosken.',
      'Stemmerne er talt. Nu mangler kun Krateret. Der er tåget. Det er mig, der snorker derude.',
    ],
    // pr. mission (drivhus, kiosk, taage): tilbage fra ægte 3D
    hub_regn: [
      'Vandkanden er fundet. Nu mangler kun Dagens regnskab. Det ligger i Drivhus 7.',
      'Budgettet gik op. Nu mangler kun Dagens regnskab. Det ligger stadig i Drivhus 7.',
      'Du fandt mig. Tak. Jeg vågnede ikke. Regnskabet ligger i Drivhus 7, og så er der fest.',
    ],
    // varianter: klik på hjælperen i byen
    help: [
      'Klik på et sted i byen, så fortæller jeg, hvad der skal regnes ud.',
      'Rigtige svar giver flotte huse. Forkerte svar kommer i regnskabet. Det gør de rigtige også.',
      'Der går en bus om syv minutter. Det har der altid gjort.',
      'Der er tolv Fnugger i Måneby. Jeg har talt dem. Syv er den, der vinker.',
      'Hvis du er i tvivl, så er svaret, øh. Nej. Nu glemte jeg tallet.',
      'Klokken er seksten tyve. Du behøver ikke kigge efter.',
    ],
    // varianter: klik på hjælperen i Drivhus 7
    drivhus_hjaelp: [
      'Jeg hjælper også her. Det ser ud på samme måde.',
      'Marianne taler med planten. Planten taler med Marianne. Jeg blander mig ikke.',
      'Det er Drivhus 7. De andre seks har jeg aldrig set. Jeg har heller ikke ledt.',
    ],
    // [første gange, derefter]
    gemt: ['Gemt!', 'Gemt. Tror jeg.'],
    // pr. akt stedet åbner i (2, 3, 4)
    laast: [
      'Det sted åbner i anden akt. Det står i programmet.',
      'Det sted åbner i tredje akt. Det står i programmet.',
      'Det sted åbner i fjerde akt. Programmet er meget tydeligt på det punkt.',
    ],
    sticker: 'Du har fået et klistermærke til dit festprogram.',
    ikke_bygget: 'Det sted er ikke bygget endnu i denne udgave. Prøv et andet.',
    // pr. mission (drivhus, kiosk, taage)
    tre_d: [
      'Nu skifter vi til ægte 3D. Hold godt fast i musen.',
      'Nu kommer der ægte 3D igen. Det står på æsken, så vi skal bruge det.',
      'Sidste gang med ægte 3D. Nyd dybden.',
    ],
    // varianter: klik på Syv, uret, busskiltet
    syv: [
      'Det er Syv. Syv vinker. De andre elleve er her også. Alle tolv. Jeg har talt efter.',
      'Syv vinker stadig. Det er ikke til nogen bestemt.',
    ],
    ur: [
      'Klokken er seksten tyve. Uret er ikke gået i stå. Det er bare det, den er.',
      'Stadig seksten tyve.',
      'Seksten tyve. Du kiggede også lige før.',
    ],
    bus: [
      'Bussen kommer om syv minutter. Jeg har aldrig set den. Men køreplanen er meget overbevisende.',
      'Syv minutter endnu. Det er en præcis bus.',
    ],
    // pr. akt: festkomitéens opslagstavle
    program: [
      'Festprogrammet. Punkt et, velkomst. Punkt to, vi fejrer, øh. Der er en plet på papiret.',
      'Komitéen har holdt møde om, hvad vi fejrer. Referatet siger, se sidste referat.',
      'Nyt opslag. Komitéen efterlyser nogen, der var med sidste år og kan huske noget.',
      'Programmet er opdateret. Der står, at vi fejrer det, vi finder ud af. Det er en begyndelse.',
    ],
    // ---- Dagens regnskab (pr. akt)
    regn_intro: [
      'Dagens regnskab. Jeg læser det højt, for det står i min kontrakt.',
      'Dagens regnskab, anden akt. Jeg læser langsomt. Det er ikke med vilje.',
      'Dagens regnskab, tredje akt. Papiret er det samme. Tallene er nye.',
      'Dagens regnskab, fjerde og sidste akt. Derefter er der fest. Tror jeg.',
    ],
    regn_navn_vaegt: 'Vægten.',
    regn_navn_bageri: 'Munchies-bageriet.',
    regn_navn_skole: 'Frøken Decimals time.',
    regn_navn_vanding: 'Vandingen.',
    regn_navn_bed: 'Plantebedet.',
    regn_navn_blanding: 'Blandeforholdet.',
    regn_navn_popcorn: 'Popcorn-fabrikken.',
    regn_navn_lampe: 'Lampen.',
    regn_navn_kiosk: 'Kioskregningen.',
    regn_navn_afstemning: 'Afstemningen.',
    regn_navn_fp_drivhus: 'Drivhuslabyrinten. I ægte 3D.',
    regn_navn_fp_kiosk: 'Munchies-natløbet. I ægte 3D.',
    regn_navn_fp_taage: 'Tågen over Krateret. I ægte 3D.',
    // efter antal forkerte: 0, 1, 2, flere
    regn_dom: [
      'Rigtigt i første forsøg.',
      'Ét forkert svar, derefter rigtigt.',
      'To forkerte svar, derefter rigtigt.',
      'Flere forkerte svar, derefter rigtigt. Det tæller også.',
    ],
    regn_sum: [
      'I alt, øh. Nu glemte jeg tallet. Det står på papiret.',
      'Det giver i alt. Ja. Det samme som der står forneden.',
      'Sammenlagt bliver det, vent. Jeg havde det lige. Kig på papiret.',
      'Det hele giver til sammen et tal. Det får du til festen.',
    ],
    regn_slut: [
      'Første akt er slut. Planten vokser i pausen. Gå ikke nogen steder. Bussen går først om syv minutter.',
      'Anden akt er slut. Jeg bliver liggende. Vi ses i Drivhus 7.',
      'Tredje akt er slut. Nu mangler kun høsten. Og at nogen finder ud af, hvad vi fejrer.',
      'Regnskabet er slut. Nu er der Høstfest. Jeg skal holde tale. Det har ingen sagt til mig.',
    ],
    // ---- Høstfesten
    fest_velkomst: [
      'Velkommen til Høstfesten. Alle er her. Fnuggerne er her. Alle tolv. Syv vinker.',
      'Først regnskabet. Her er alle dine rigtige og forkerte svar, akt for akt. Søjlerne er ægte.',
    ],
    fest_akt: ['Første akt.', 'Anden akt.', 'Tredje akt.', 'Fjerde akt. Den er kortere. Det var planlagt.'],
    fest_soejler: ['Det er flotte søjler. De grønne er de rigtige. De andre er også dine.'],
    // sekvens: talen (alle falder i søvn undervejs)
    tale: [
      'Kære Måneby. Jeg er blevet bedt om at holde tale. Jeg har ikke forberedt noget. Det har jeg brugt lang tid på.',
      'Vi har regnet. Vi har vejet poser, ganget brownies og fundet en vandkande. Det er mere, end man kan forlange.',
      'Festkomitéen har spurgt mig, hvad det er, vi fejrer. Jeg har tænkt over det. I fire akter.',
      'Vi fejrer det, vi regnede ud. Det var, øh. Ja. Tallet står i regnskabet.',
      'Jeg kan se, at nogle af jer hviler øjnene. Det er helt i orden. Jeg fortsætter lidt endnu.',
      'Der er syv minutter til bussen. Klokken er seksten tyve. Planten er høstet. Alt er, som det skal være.',
      'Tak for i dag. Jeg lukker også lige øjnene. Bare et øjeblik.',
    ],
    cd: "Husk at tage cd'en ud.",
  },
  // ------------------------------------------------------------------ Marianne (taler med planten og om den i tredje person)
  marianne: {
    akt1_marianne: [
      'Dav. Jeg er Marianne. Jeg passer planten. Hun er et frø endnu.',
      'Hun kan godt lide, når nogen regner rigtigt i nærheden. Det har hun selv sagt. Til mig.',
      'Gå ud i byen og hjælp komitéen. Der er tre steder. Planten og jeg tæller til tre imens.',
    ],
    akt2_marianne: [
      'Se hende. Hun har fået blade. Planten siger, det er, fordi du regnede. Jeg siger, det er lampen.',
      'I dag skal hun have vand, naboer og det rigtige forhold. Det er tre opgaver. Hun kan godt tælle.',
      'Og så har jeg forlagt min vandkande. Den er her et sted. Planten ved det, men hun siger ingenting.',
    ],
    akt3_marianne: [
      'Hun blomstrer. Planten vil gerne have, at vi ikke gør et stort nummer ud af det.',
      'Hun har bestilt popcorn, bedre lys og noget fra kiosken. Jeg spørger ikke hvorfor. Vi har en aftale.',
    ],
    akt4_marianne: [
      'Hun er færdig. Planten siger tak for hjælpen. Hun siger også, at lampen sad skævt. Det er noteret.',
      'Komitéen skal stemme om festens snack. Bagefter skal nogen hente Skipper Sløv ude i tågen. Han holder talen.',
    ],
    // pr. akt: aktens steder er ikke klaret endnu
    drivhus_vent: [
      'Planten sover. Kom igen, når du har været alle tre steder.',
      'Hun drikker stadig. Der mangler opgaver ude i byen.',
      'Hun blomstrer i sit eget tempo. Byen mangler dig stadig.',
      'Hun venter på afstemningen. Det gør vi alle. Hun er bare bedst til det.',
    ],
    // akt 3 og 4: minispil klaret, 3D-missionen mangler
    drivhus_mangler: [
      'Kiosk-Kurt har spurgt efter dig. Planten siger, du skal gå derned. Hun siger det pænt.',
      'Skipper Sløv ligger stadig ude i tågen over Krateret. Planten kan høre ham herfra.',
    ],
    // varianter: klik på Marianne
    marianne_snak: [
      'Planten kan godt lide dig. Hun siger det ikke direkte.',
      'Jeg taler med hende hver dag. Hun svarer mest om tirsdagen.',
      'Hun hedder ikke noget. Vi er ikke nået dertil.',
      'Planten mener, at klokken er seksten tyve. Der er vi enige.',
      'Folk spørger mig til råds om planter. Jeg har ingen råd. Jeg har en plante.',
    ],
    // pr. vækststadie: klik på planten
    plante: [
      'Hun er et frø. Det er den alder, hvor de ikke siger så meget.',
      'Hun er i vækst. Hun vil helst ikke måles.',
      'Hun blomstrer. Lad være med at stirre. Hun opdager det.',
      'Hun er klar til høst. Hun har selv valgt datoen. Det er i dag.',
    ],
    // sekvens: akt 2, før Drivhuslabyrinten
    drivhus_mission: [
      'Tak for vand, bed og blanding. Nu mangler kun vandkanden. Den står inde mellem planterne.',
      'Bedene derinde skal vandes i rækkefølge. Der hænger et skilt. Planten har selv skrevet det.',
    ],
    // pr. akt: klar til Dagens regnskab
    drivhus_regn: [
      'Tre steder klaret. Planten vil gerne høre regnskabet. Hun kan lide tal, der bliver læst langsomt.',
      'Du fandt vandkanden. Planten sagde, du ville. Hun gætter meget. Nu vil hun høre regnskabet.',
      'Kurt fik sit budget til at gå op. Planten er lettet. Hun skylder ham penge. Så er der regnskab.',
      'Du fandt ham i tågen. Så mangler vi kun det sidste regnskab. Og så festen.',
    ],
    vanding_foer: 'Planten er tørstig. Ventilerne står i brøker. Hun siger, hun kan smage forskel på en halv og en kvart.',
    vanding_efter: 'Hun har drukket. Planten siger tak. Hun siger det meget stille, men jeg hørte det.',
    vanding_igen: 'Planten vil gerne have en tår til. Hun siger, det er sidste gang. Det siger hun hver gang.',
    fest_marianne: 'Planten kunne ikke komme. Hun er blevet høstet. Hun siger, det er helt i orden. Hun sagde det i forvejen.',
    // sekvens: diplomet (Marianne er den sidste, der er vågen)
    diplom: [
      'Her er dit diplom. Festbestyrer, anden grad. Graden er afrundet. Planten har skrevet under.',
      'Godnat. Hun siger også godnat.',
    ],
  },
  // ------------------------------------------------------------------ Vægtmester Gram (vejer alt, også sig selv)
  gram: {
    vaegt_foer: 'Vægtmester Gram. Jeg vejer alt. Poser, breve, mig selv. I dag er det poser.',
    vaegt_efter: 'Det stemte. Nu vejer jeg mig selv for at fejre det. Det samme som i går. Fremragende.',
    vaegt_igen: 'Dig igen. Jeg har flere poser. Der er altid flere poser.',
    lampe_foer: 'Vægtmester Gram igen. Jeg har vejet lyset fra lampen. Det vejer ingenting. Nu skal den drejes i den rigtige vinkel.',
    lampe_efter: 'Lampen står rigtigt. Vinkler kan ikke vejes. Jeg har prøvet. Jeg vejer lampen en ekstra gang i stedet.',
    lampe_igen: 'Lampen har flyttet sig. Eller også har jeg. Vi drejer den igen.',
    fest_gram: 'Jeg har vejet stemningen. Den vejer ingenting. Men den er god.',
  },
  // ------------------------------------------------------------------ Bager Krumme
  krumme: {
    bageri_foer: 'Bager Krumme. Komitéen har bestilt brownies. De har glemt hvor mange. Vi ganger os frem.',
    bageri_efter: 'Så er der bagt. Jeg har smagt på én. Og på dejen. Og på skeen. Regnestykket holder stadig.',
    bageri_igen: 'Mere bagværk. Komitéen har spist det første. De kan ikke huske det.',
    fest_krumme: 'Der er brownies til alle. Jeg har talt dem. Så smagte jeg på tallet. Nu mangler der to.',
  },
  // ------------------------------------------------------------------ Frk. Decimal (accepterer kun brøker)
  decimal: {
    skole_foer: 'Frøken Decimal. Sid ned. Her i klassen svarer vi i brøker. Kommatal er noget, man har derhjemme.',
    skole_efter: 'Det var korrekt. Du får tre fjerdedele af en ros. Den sidste fjerdedel skal du selv finde.',
    skole_igen: 'En ekstra time. Det er frivilligt. Det skriver jeg i protokollen som en halv bemærkning.',
    afstemning_foer: 'Frøken Decimal. Jeg tæller stemmerne. Komitéen skal vælge festens snack. Stemmer afgives i hele tal. Det er jeg ikke glad for.',
    afstemning_efter: 'Afstemningen er gyldig. Snacken er valgt. Hvad vi fejrer, stod ikke på stemmesedlen.',
    afstemning_igen: 'Der er krævet omtælling. Af mig. Vi tæller igen.',
    fest_decimal: 'Komitéen har spurgt, hvad vi fejrer. Jeg accepterer kun svaret som en brøk.',
  },
  // ------------------------------------------------------------------ Ufo-Ulla (stanniolhjelm, teorier om Drivhus 7)
  ulla: {
    bed_foer: 'Ufo-Ulla. Jeg har stanniolhjelm på af faglige årsager. Frøene skal ligge i et gitter. Det er ikke tilfældigt. Intet er tilfældigt.',
    bed_efter: 'Koordinaterne passer. Set ovenfra danner bedet et mønster. Jeg siger ikke hvilket. Men jeg har noteret det.',
    bed_igen: 'Flere frø. Samme gitter. Mønsteret bliver tydeligere. Jeg siger stadig ikke hvilket.',
    krater_foer: 'Tågen over Krateret. Jeg havde en teori. Men det er vist bare tåge. Skipper Sløv ligger derude og snorker. Gå efter lyden.',
    krater_vent: 'Krateret er tåget. Det er det altid klokken seksten tyve. Kom igen efter afstemningen.',
    krater_efter: 'Du fandt ham. Jeg så det hele herfra. Jeg så også noget andet. Det tager vi en anden gang.',
    // to pr. akt
    ulla_hub: [
      'Ufo-Ulla. Jeg holder øje med Drivhus 7. Der er lys derinde. Hele tiden. Det er der ingen, der taler om.',
      'Hjelmen er af stanniol. Den holder tankerne inde og vejret ude. Eller omvendt. Jeg tester stadig.',
      'Planten er vokset. Efter én akt. Regn selv på det. Nå nej, det gør du jo allerede.',
      'Marianne taler med planten. Jeg har lyttet. Planten svarer ikke. Det er det, der er mistænkeligt.',
      'Min teori er, at planten styrer klokken. Den er altid seksten tyve. Hvem har gavn af det. Planten.',
      'Det hedder Drivhus 7, men der er kun ét drivhus. Hvor er de andre seks. Jeg spørger bare.',
      'Jeg har en ny teori. Der er ikke noget mystisk ved Drivhus 7. Det er den teori, jeg har sværest ved.',
      'Jeg har regnet på det. Tolv Fnugger, syv minutter, klokken seksten tyve. Det giver ikke noget. Det er dét, der er sagen.',
    ],
    fest_ulla: 'Fyrværkeri. Præcis klokken seksten tyve. Jeg siger ikke mere.',
  },
  // ------------------------------------------------------------------ Mumle (kan kun én tone)
  mumle: {
    blanding_foer: 'Mumle. Jeg er musiker. Jeg kan én tone. I dag blander vi i faste forhold. To dele af det ene, én del af det andet. Det er næsten musik.',
    blanding_efter: 'Forholdet passer. Jeg spiller en tone for dig. Det er den samme som sidst. Den er god.',
    blanding_igen: 'Vi blander igen. Samme tone, nyt forhold.',
    mumle_hub: [
      'Mumle. Jeg øver til Høstfesten. Jeg kan én tone. Jeg overvejer at spille den to gange.',
      'Hør her. Det var tonen. Jeg kan godt spille den igen, hvis du ikke nåede det.',
      'Jeg har skrevet en ny sang. Det er den samme tone, men jeg tænker på noget andet imens.',
      'Jeg har prøvet en anden tone engang. Den var ikke min.',
      'Folk spørger, om jeg kan spille noget stille. Det kan jeg. Det er min anden tone. Den tæller ikke.',
      'Lampen i drivhuset brummer i min tone. Vi har ikke talt om det. Men vi ved det begge to.',
      'I aften spiller jeg hele mit repertoire. Det tager fire sekunder. Jeg holder pause i midten.',
      'Jeg har fået en forespørgsel på et ekstranummer. Det bliver den samme tone. Baglæns.',
    ],
    fest_mumle: 'Nu spiller jeg min tone. Den er til jer alle.',
  },
  // ------------------------------------------------------------------ Konstabel Knold (distraheres af snacks, bøder på 0,00 kr.)
  knold: {
    popcorn_foer: 'Konstabel Knold. Jeg inspicerer popcornene. Det er tjenstligt. Ram kun dem, der går op. Resten tager jeg mig af.',
    popcorn_efter: 'Godt arbejde. Du får en bøde på nul kroner og nul øre for at larme med maden. Betal, når det passer dig.',
    popcorn_igen: 'Der er kommet flere popcorn. Jeg ved ikke hvorfra. Jeg efterforsker det bagefter.',
    knold_hub: [
      'Konstabel Knold. Jeg patruljerer. Alt er i orden. Er det en kiks, du har der. Nå. Det var en sten.',
      'Du må gerne stå her. Du må også gerne gå. Loven er meget rummelig i Måneby.',
      'Du krydsede pladsen uden at blinke. Det giver en bøde på nul kroner og nul øre. Det er sidste advarsel.',
      'Jeg har udskrevet fire bøder i dag. Samlet beløb nul kroner og nul øre. Det er ny rekord.',
      'Jeg efterforsker en forsvunden pose chips. Sporene ender ved mig. Sagen er kompliceret.',
      'Her lugter af popcorn. Jeg er nødt til at undersøge det nærmere. Det kan tage resten af vagten.',
      'Til festen holder jeg opsyn med buffeten. Tæt opsyn. Det bliver min største sag.',
      'Alle bøder er eftergivet i anledning af festen. Det ændrer ikke på beløbet.',
    ],
    fest_knold: 'Fyrværkeriet er godkendt. Det får en bøde på nul kroner og nul øre for at være højt.',
  },
  // ------------------------------------------------------------------ Kiosk-Kurt (priserne stiger med en ny brøk hver akt)
  kurt: {
    kiosk_foer: 'Kiosk-Kurt. Velkommen. Priserne er steget siden sidst. Det er de altid. Vi regner i procent og Krater-kroner.',
    kiosk_efter: 'Regningen stemmer. Det gør den sjældent. Jeg hænger et nyt prisskilt op for en sikkerheds skyld.',
    kiosk_igen: 'Velkommen tilbage. Priserne er steget, mens du var væk. Vi regner forfra.',
    // sekvens: akt 3, før Munchies-natløbet
    kiosk_mission: [
      'Godt du kom. Jeg skal have fyldt hylderne til festen. Budgettet er i Krater-kroner, og det skal rammes præcis.',
      'Gangene er lange om aftenen. Saml snacks, til beløbet passer. Ikke en krone over. Jeg tæller efter.',
    ],
    kiosk_mission_efter: 'Budgettet gik op. Præcis. Det har jeg aldrig prøvet før. Jeg ved ikke, hvad jeg skal gøre med hænderne.',
    kiosk_vent: 'Kom igen, når popcornene og lampen er ordnet. Så har jeg et ærinde til dig.',
    // pr. akt
    kurt_pris: [
      'Kiosken åbner i tredje akt. Priserne er allerede steget med en halv. Det er for at være på forkant.',
      'Stadig lukket. Priserne er steget med en tredjedel mere. Skiltet hænger udenfor, så ingen bliver overraskede.',
      'Nu er der åbent. Priserne er steget med en fjerdedel oven i det andet. Det er den mindste stigning hidtil. Det er et tilbud.',
      'Priserne er steget med en femtedel. Næste gang bliver det en sjettedel. Jeg har lagt en plan.',
    ],
    fest_kurt: 'Snacks kan købes i kiosken. Prisen er steget med en sjettedel, mens du så på søjler.',
  },
  // ------------------------------------------------------------------ Sofus Sofa (synker længere ind for hver akt)
  sofus: {
    // to pr. akt
    sofus_hub: [
      'Sofus Sofa. Jeg sidder godt. Jeg rejser mig om lidt. Der er syv minutter til bussen.',
      'Jeg ser fjernsyn. Det er ikke tændt. Det er en god udsendelse alligevel.',
      'Jeg er sunket lidt. Det er sofaen, der gør det. Vi har et samarbejde.',
      'Fjernbetjeningen er faldet ned mellem hynderne. Den har det godt dernede. Det får jeg også snart.',
      'Nu kan jeg ikke se mine knæ. De er her et sted. Bussen går om syv minutter. Jeg tager den næste.',
      'Hvis nogen spørger, så er jeg på vej. Jeg er bare på vej nedad.',
      'Der er mest hoved tilbage. Jeg kommer til festen. Sofaen kommer også. Vi følges.',
      'Sofaen og jeg har fået samme postnummer. Det var nemmest sådan.',
    ],
    fest_sofus: 'Jeg er her også. Jeg er nederst i sofaen. Sig til, når der er kage.',
  },
};

// ---------- opslag ----------
export const L = {}; // nøgle → tekst | [tekster]
export const WHO = {}; // nøgle → figur-id
for (const [who, lines] of Object.entries(MANUS)) for (const [k, v] of Object.entries(lines)) { L[k] = v; WHO[k] = who; }

export const pick = (a) => a[Math.floor(Math.random() * a.length)];
/** t(nøgle, i): fast tekst. Liste: i = indeks (klemmes til listen); uden i en tilfældig variant. Ukendt nøgle → undefined. */
export function t(k, i) {
  const v = L[k];
  if (!Array.isArray(v)) return v;
  return i === undefined ? pick(v) : v[Math.max(0, Math.min(v.length - 1, i | 0))];
}
/** Sig en replik med den rigtige figur (navn i boksen + figurens mund). opts.i = indeks i en liste. */
export function tell(k, opts = {}) {
  const { i, ...rest } = opts;
  const text = t(k, i);
  if (!text) return Promise.resolve();
  return say(text, { who: WHO[k] === 'sloev' ? undefined : WHO[k], noPortrait: WHO[k] !== 'sloev', ...rest });
}
/** Sig hele sekvensen bag en nøgle, én replik ad gangen. */
export async function tellAll(k, opts = {}) {
  const v = L[k];
  for (let i = 0; i < (Array.isArray(v) ? v.length : 1); i++) await tell(k, { ...opts, i });
}
/** Alle replikker som faste tekster — til tale-generering og test. */
export function allLines() {
  const out = [];
  for (const [key, v] of Object.entries(L)) {
    if (Array.isArray(v)) v.forEach((text, i) => out.push({ id: `${key}_${i + 1}`, key, i, who: WHO[key], text }));
    else out.push({ id: key, key, i: 0, who: WHO[key], text: v });
  }
  return out;
}
