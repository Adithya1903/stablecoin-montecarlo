import type {
  Activity,
  Confidence,
  Jurisdiction,
  Region,
  Scores,
  Status,
} from '@/lib/types';

/**
 * Seed dataset: 195 sovereigns (193 UN members + Vatican + Palestine),
 * 20 territories, and the 5-row UAE perimeter breakdown.
 *
 * Honesty rules baked in:
 *  - `verifiedBy`/`verifiedAt` are null on every row. Nobody has checked
 *    anything yet; the columns exist so that state is visible, not implied.
 *  - URLs appear only where the author was certain of the first-party domain
 *    or the permalink is canonical. Everything else is null. Never invent one.
 *  - Uncurated rows get formulaic scores derived from status/activity and
 *    stay at confidence 'Low'. Absence of regulation cannot be cited.
 */

// ---------------------------------------------------------------------------
// Bulk lists: [iso3, name, region]. Regime membership is applied by set below.
// ---------------------------------------------------------------------------

type BulkRow = [string, string, Region];

const AFRICA: BulkRow[] = [
  ['DZA', 'Algeria', 'Africa'],
  ['AGO', 'Angola', 'Africa'],
  ['BEN', 'Benin', 'Africa'],
  ['BWA', 'Botswana', 'Africa'],
  ['BFA', 'Burkina Faso', 'Africa'],
  ['BDI', 'Burundi', 'Africa'],
  ['CPV', 'Cabo Verde', 'Africa'],
  ['CMR', 'Cameroon', 'Africa'],
  ['CAF', 'Central African Republic', 'Africa'],
  ['TCD', 'Chad', 'Africa'],
  ['COM', 'Comoros', 'Africa'],
  ['COG', 'Congo (Republic)', 'Africa'],
  ['COD', 'DR Congo', 'Africa'],
  ['CIV', "Côte d'Ivoire", 'Africa'],
  ['DJI', 'Djibouti', 'Africa'],
  ['EGY', 'Egypt', 'Africa'],
  ['GNQ', 'Equatorial Guinea', 'Africa'],
  ['ERI', 'Eritrea', 'Africa'],
  ['SWZ', 'Eswatini', 'Africa'],
  ['ETH', 'Ethiopia', 'Africa'],
  ['GAB', 'Gabon', 'Africa'],
  ['GMB', 'Gambia', 'Africa'],
  ['GHA', 'Ghana', 'Africa'],
  ['GIN', 'Guinea', 'Africa'],
  ['GNB', 'Guinea-Bissau', 'Africa'],
  ['KEN', 'Kenya', 'Africa'],
  ['LSO', 'Lesotho', 'Africa'],
  ['LBR', 'Liberia', 'Africa'],
  ['LBY', 'Libya', 'Africa'],
  ['MDG', 'Madagascar', 'Africa'],
  ['MWI', 'Malawi', 'Africa'],
  ['MLI', 'Mali', 'Africa'],
  ['MRT', 'Mauritania', 'Africa'],
  ['MUS', 'Mauritius', 'Africa'],
  ['MAR', 'Morocco', 'Africa'],
  ['MOZ', 'Mozambique', 'Africa'],
  ['NAM', 'Namibia', 'Africa'],
  ['NER', 'Niger', 'Africa'],
  ['NGA', 'Nigeria', 'Africa'],
  ['RWA', 'Rwanda', 'Africa'],
  ['STP', 'São Tomé & Príncipe', 'Africa'],
  ['SEN', 'Senegal', 'Africa'],
  ['SYC', 'Seychelles', 'Africa'],
  ['SLE', 'Sierra Leone', 'Africa'],
  ['SOM', 'Somalia', 'Africa'],
  ['ZAF', 'South Africa', 'Africa'],
  ['SSD', 'South Sudan', 'Africa'],
  ['SDN', 'Sudan', 'Africa'],
  ['TZA', 'Tanzania', 'Africa'],
  ['TGO', 'Togo', 'Africa'],
  ['TUN', 'Tunisia', 'Africa'],
  ['UGA', 'Uganda', 'Africa'],
  ['ZMB', 'Zambia', 'Africa'],
  ['ZWE', 'Zimbabwe', 'Africa'],
];

const ASIA_PACIFIC: BulkRow[] = [
  ['AFG', 'Afghanistan', 'Asia-Pacific'],
  ['AUS', 'Australia', 'Asia-Pacific'],
  ['BGD', 'Bangladesh', 'Asia-Pacific'],
  ['BTN', 'Bhutan', 'Asia-Pacific'],
  ['BRN', 'Brunei', 'Asia-Pacific'],
  ['KHM', 'Cambodia', 'Asia-Pacific'],
  ['CHN', 'China', 'Asia-Pacific'],
  ['FJI', 'Fiji', 'Asia-Pacific'],
  ['IND', 'India', 'Asia-Pacific'],
  ['IDN', 'Indonesia', 'Asia-Pacific'],
  ['JPN', 'Japan', 'Asia-Pacific'],
  ['KAZ', 'Kazakhstan', 'Asia-Pacific'],
  ['KIR', 'Kiribati', 'Asia-Pacific'],
  ['KGZ', 'Kyrgyzstan', 'Asia-Pacific'],
  ['LAO', 'Laos', 'Asia-Pacific'],
  ['MYS', 'Malaysia', 'Asia-Pacific'],
  ['MDV', 'Maldives', 'Asia-Pacific'],
  ['MHL', 'Marshall Islands', 'Asia-Pacific'],
  ['FSM', 'Micronesia', 'Asia-Pacific'],
  ['MNG', 'Mongolia', 'Asia-Pacific'],
  ['MMR', 'Myanmar', 'Asia-Pacific'],
  ['NRU', 'Nauru', 'Asia-Pacific'],
  ['NPL', 'Nepal', 'Asia-Pacific'],
  ['NZL', 'New Zealand', 'Asia-Pacific'],
  ['PRK', 'North Korea', 'Asia-Pacific'],
  ['PAK', 'Pakistan', 'Asia-Pacific'],
  ['PLW', 'Palau', 'Asia-Pacific'],
  ['PNG', 'Papua New Guinea', 'Asia-Pacific'],
  ['PHL', 'Philippines', 'Asia-Pacific'],
  ['WSM', 'Samoa', 'Asia-Pacific'],
  ['SGP', 'Singapore', 'Asia-Pacific'],
  ['SLB', 'Solomon Islands', 'Asia-Pacific'],
  ['KOR', 'South Korea', 'Asia-Pacific'],
  ['LKA', 'Sri Lanka', 'Asia-Pacific'],
  ['TJK', 'Tajikistan', 'Asia-Pacific'],
  ['THA', 'Thailand', 'Asia-Pacific'],
  ['TLS', 'Timor-Leste', 'Asia-Pacific'],
  ['TON', 'Tonga', 'Asia-Pacific'],
  ['TKM', 'Turkmenistan', 'Asia-Pacific'],
  ['TUV', 'Tuvalu', 'Asia-Pacific'],
  ['UZB', 'Uzbekistan', 'Asia-Pacific'],
  ['VUT', 'Vanuatu', 'Asia-Pacific'],
  ['VNM', 'Vietnam', 'Asia-Pacific'],
];

const MIDDLE_EAST: BulkRow[] = [
  ['BHR', 'Bahrain', 'Middle East'],
  ['IRN', 'Iran', 'Middle East'],
  ['IRQ', 'Iraq', 'Middle East'],
  ['ISR', 'Israel', 'Middle East'],
  ['JOR', 'Jordan', 'Middle East'],
  ['KWT', 'Kuwait', 'Middle East'],
  ['LBN', 'Lebanon', 'Middle East'],
  ['OMN', 'Oman', 'Middle East'],
  ['PSE', 'Palestine', 'Middle East'],
  ['QAT', 'Qatar', 'Middle East'],
  ['SAU', 'Saudi Arabia', 'Middle East'],
  ['SYR', 'Syria', 'Middle East'],
  ['ARE', 'United Arab Emirates', 'Middle East'],
  ['YEM', 'Yemen', 'Middle East'],
];

const EUROPE: BulkRow[] = [
  ['ALB', 'Albania', 'Europe'],
  ['AND', 'Andorra', 'Europe'],
  ['ARM', 'Armenia', 'Europe'],
  ['AUT', 'Austria', 'Europe'],
  ['AZE', 'Azerbaijan', 'Europe'],
  ['BLR', 'Belarus', 'Europe'],
  ['BEL', 'Belgium', 'Europe'],
  ['BIH', 'Bosnia & Herzegovina', 'Europe'],
  ['BGR', 'Bulgaria', 'Europe'],
  ['HRV', 'Croatia', 'Europe'],
  ['CYP', 'Cyprus', 'Europe'],
  ['CZE', 'Czechia', 'Europe'],
  ['DNK', 'Denmark', 'Europe'],
  ['EST', 'Estonia', 'Europe'],
  ['FIN', 'Finland', 'Europe'],
  ['FRA', 'France', 'Europe'],
  ['GEO', 'Georgia', 'Europe'],
  ['DEU', 'Germany', 'Europe'],
  ['GRC', 'Greece', 'Europe'],
  ['HUN', 'Hungary', 'Europe'],
  ['ISL', 'Iceland', 'Europe'],
  ['IRL', 'Ireland', 'Europe'],
  ['ITA', 'Italy', 'Europe'],
  ['LVA', 'Latvia', 'Europe'],
  ['LIE', 'Liechtenstein', 'Europe'],
  ['LTU', 'Lithuania', 'Europe'],
  ['LUX', 'Luxembourg', 'Europe'],
  ['MLT', 'Malta', 'Europe'],
  ['MDA', 'Moldova', 'Europe'],
  ['MCO', 'Monaco', 'Europe'],
  ['MNE', 'Montenegro', 'Europe'],
  ['NLD', 'Netherlands', 'Europe'],
  ['MKD', 'North Macedonia', 'Europe'],
  ['NOR', 'Norway', 'Europe'],
  ['POL', 'Poland', 'Europe'],
  ['PRT', 'Portugal', 'Europe'],
  ['ROU', 'Romania', 'Europe'],
  ['RUS', 'Russia', 'Europe'],
  ['SMR', 'San Marino', 'Europe'],
  ['SRB', 'Serbia', 'Europe'],
  ['SVK', 'Slovakia', 'Europe'],
  ['SVN', 'Slovenia', 'Europe'],
  ['ESP', 'Spain', 'Europe'],
  ['SWE', 'Sweden', 'Europe'],
  ['CHE', 'Switzerland', 'Europe'],
  ['TUR', 'Türkiye', 'Europe'],
  ['UKR', 'Ukraine', 'Europe'],
  ['GBR', 'United Kingdom', 'Europe'],
  ['VAT', 'Vatican City (Holy See)', 'Europe'],
];

const AMERICAS: BulkRow[] = [
  ['ATG', 'Antigua & Barbuda', 'Americas'],
  ['ARG', 'Argentina', 'Americas'],
  ['BHS', 'Bahamas', 'Americas'],
  ['BRB', 'Barbados', 'Americas'],
  ['BLZ', 'Belize', 'Americas'],
  ['BOL', 'Bolivia', 'Americas'],
  ['BRA', 'Brazil', 'Americas'],
  ['CAN', 'Canada', 'Americas'],
  ['CHL', 'Chile', 'Americas'],
  ['COL', 'Colombia', 'Americas'],
  ['CRI', 'Costa Rica', 'Americas'],
  ['CUB', 'Cuba', 'Americas'],
  ['DMA', 'Dominica', 'Americas'],
  ['DOM', 'Dominican Republic', 'Americas'],
  ['ECU', 'Ecuador', 'Americas'],
  ['SLV', 'El Salvador', 'Americas'],
  ['GRD', 'Grenada', 'Americas'],
  ['GTM', 'Guatemala', 'Americas'],
  ['GUY', 'Guyana', 'Americas'],
  ['HTI', 'Haiti', 'Americas'],
  ['HND', 'Honduras', 'Americas'],
  ['JAM', 'Jamaica', 'Americas'],
  ['MEX', 'Mexico', 'Americas'],
  ['NIC', 'Nicaragua', 'Americas'],
  ['PAN', 'Panama', 'Americas'],
  ['PRY', 'Paraguay', 'Americas'],
  ['PER', 'Peru', 'Americas'],
  ['KNA', 'St Kitts & Nevis', 'Americas'],
  ['LCA', 'St Lucia', 'Americas'],
  ['VCT', 'St Vincent & the Grenadines', 'Americas'],
  ['SUR', 'Suriname', 'Americas'],
  ['TTO', 'Trinidad & Tobago', 'Americas'],
  ['USA', 'United States', 'Americas'],
  ['URY', 'Uruguay', 'Americas'],
  ['VEN', 'Venezuela', 'Americas'],
];

const TERRITORIES: BulkRow[] = [
  ['HKG', 'Hong Kong', 'Asia-Pacific'],
  ['MAC', 'Macao', 'Asia-Pacific'],
  ['TWN', 'Taiwan', 'Asia-Pacific'],
  ['PRI', 'Puerto Rico', 'Americas'],
  ['CYM', 'Cayman Islands', 'Americas'],
  ['BMU', 'Bermuda', 'Americas'],
  ['VGB', 'British Virgin Islands', 'Americas'],
  ['AIA', 'Anguilla', 'Americas'],
  ['MSR', 'Montserrat', 'Americas'],
  ['TCA', 'Turks & Caicos', 'Americas'],
  ['CUW', 'Curaçao', 'Americas'],
  ['ABW', 'Aruba', 'Americas'],
  ['GIB', 'Gibraltar', 'Europe'],
  ['JEY', 'Jersey', 'Europe'],
  ['GGY', 'Guernsey', 'Europe'],
  ['IMN', 'Isle of Man', 'Europe'],
  ['GRL', 'Greenland', 'Europe'],
  ['FRO', 'Faroe Islands', 'Europe'],
  ['NCL', 'New Caledonia', 'Asia-Pacific'],
  ['PYF', 'French Polynesia', 'Asia-Pacific'],
];

// ---------------------------------------------------------------------------
// Regime membership
// ---------------------------------------------------------------------------

const MICA = new Set([
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
  'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD',
  'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'ISL', 'LIE', 'NOR',
]);
const WAEMU = new Set(['BEN', 'BFA', 'CIV', 'GNB', 'MLI', 'NER', 'SEN', 'TGO']);
const CEMAC = new Set(['CMR', 'CAF', 'TCD', 'COG', 'GNQ', 'GAB']);
const ECCU = new Set(['ATG', 'DMA', 'GRD', 'KNA', 'LCA', 'VCT', 'AIA', 'MSR']);
const US_FED_STATE = new Set(['USA', 'PRI']);
const UAE = new Set(['ARE']);
const PRC = new Set(['CHN', 'MAC']);

function regimeFor(iso3: string): string {
  if (MICA.has(iso3)) return 'mica';
  if (WAEMU.has(iso3)) return 'waemu';
  if (CEMAC.has(iso3)) return 'cemac';
  if (ECCU.has(iso3)) return 'eccu';
  if (US_FED_STATE.has(iso3)) return 'us-federal-state';
  if (UAE.has(iso3)) return 'uae';
  if (PRC.has(iso3)) return 'prc';
  return 'national';
}

// ---------------------------------------------------------------------------
// Formulaic score defaults for uncurated rows (disclosed on /methodology)
// ---------------------------------------------------------------------------

const STATUS_BASE_SCORES: Record<Status, Scores> = {
  Comprehensive: { clarity: 74, licensing: 70, stablecoin: 58, banking: 58, tax: 52, stability: 64 },
  Partial:       { clarity: 48, licensing: 42, stablecoin: 32, banking: 44, tax: 48, stability: 54 },
  Drafting:      { clarity: 30, licensing: 22, stablecoin: 20, banking: 36, tax: 44, stability: 48 },
  Prohibition:   { clarity: 24, licensing: 4,  stablecoin: 4,  banking: 8,  tax: 20, stability: 42 },
  None:          { clarity: 12, licensing: 8,  stablecoin: 8,  banking: 26, tax: 36, stability: 40 },
};

type Curated = Partial<Omit<Jurisdiction, 'scores' | 'sourcing'>> & {
  scores?: Partial<Scores>;
  regulatorSite?: string | null;
  instrumentUrl?: string | null;
  confidence?: Confidence;
};

// ---------------------------------------------------------------------------
// Curated overlay — editorial judgement, authored 2026-08. Status/notes are
// the author's read of public reporting; scores are editorial (see
// /methodology). URLs only where the first-party domain is beyond doubt.
// ---------------------------------------------------------------------------

const MICA_BASE: Curated = {
  status: 'Comprehensive',
  activity: 'Moderate',
  confidence: 'Medium',
  notes:
    'Covered by MiCA: CASP authorisation with EU-wide passporting; ART/EMT (stablecoin) issuance rules in force since mid-2024, full regime since end-2024. National authority handles licensing; the rulebook is union-level.',
  scores: { clarity: 76, licensing: 72, stablecoin: 78, banking: 58, tax: 50, stability: 68 },
  lastReviewed: '2026-08',
};

function mica(authority: string, site: string | null, extra?: Curated): Curated {
  return { ...MICA_BASE, authority, regulatorSite: site, ...extra, scores: { ...MICA_BASE.scores, ...extra?.scores } };
}

const CURATED: Record<string, Curated> = {
  // --- MiCA members: national competent authorities -----------------------
  AUT: mica('Financial Market Authority (FMA)', 'https://www.fma.gv.at'),
  BEL: mica('FSMA', 'https://www.fsma.be'),
  BGR: mica('Financial Supervision Commission', null),
  HRV: mica('HANFA / Croatian National Bank', 'https://www.hanfa.hr'),
  CYP: mica('CySEC', 'https://www.cysec.gov.cy', { activity: 'High' }),
  CZE: mica('Czech National Bank', 'https://www.cnb.cz'),
  DNK: mica('Finanstilsynet (DFSA)', 'https://www.dfsa.dk'),
  EST: mica('Finantsinspektsioon', 'https://www.fi.ee', {
    notes:
      'Covered by MiCA. Estonia ran an early, then sharply tightened, national VASP regime before MiCA superseded it — licensing culture remains strict.',
  }),
  FIN: mica('FIN-FSA (Finanssivalvonta)', 'https://www.finanssivalvonta.fi'),
  FRA: mica('AMF / ACPR', 'https://www.amf-france.org', {
    activity: 'High',
    notes:
      'Covered by MiCA; France ran the PACTE-law PSAN registration regime beforehand and was a favoured EU base, so the CASP pipeline is deep.',
    scores: { licensing: 75 },
  }),
  DEU: mica('BaFin', 'https://www.bafin.de', {
    activity: 'High',
    notes:
      'Covered by MiCA; BaFin previously ran a national crypto-custody licence and is among the more demanding CASP gatekeepers. Strong institutional market.',
    scores: { banking: 62 },
  }),
  GRC: mica('Hellenic Capital Market Commission', null),
  HUN: mica('Magyar Nemzeti Bank (MNB)', 'https://www.mnb.hu'),
  IRL: mica('Central Bank of Ireland', 'https://www.centralbank.ie'),
  ITA: mica('Consob / Banca d’Italia', 'https://www.consob.it'),
  LVA: mica('Latvijas Banka', 'https://www.bank.lv'),
  LTU: mica('Bank of Lithuania', 'https://www.lb.lt', {
    activity: 'High',
    notes:
      'Covered by MiCA. Lithuania hosted one of the EU’s largest VASP populations pre-MiCA; the transition thinned it considerably.',
  }),
  LUX: mica('CSSF', 'https://www.cssf.lu', { activity: 'High' }),
  MLT: mica('Malta Financial Services Authority (MFSA)', 'https://www.mfsa.mt', {
    activity: 'High',
    notes:
      'Covered by MiCA. Malta’s 2018 VFA Act made it an early hub; VFA licensees transitioned into CASP authorisations.',
    scores: { licensing: 76 },
  }),
  NLD: mica('AFM / DNB', 'https://www.afm.nl', { activity: 'High' }),
  POL: mica('KNF', 'https://www.knf.gov.pl'),
  PRT: mica('Banco de Portugal / CMVM', 'https://www.bportugal.pt', {
    scores: { tax: 60 },
    notes:
      'Covered by MiCA. Historically favourable personal crypto tax treatment (narrowed in 2023) still makes Portugal comparatively attractive on tax.',
  }),
  ROU: mica('Financial Supervisory Authority (ASF)', null),
  SVK: mica('National Bank of Slovakia', 'https://nbs.sk'),
  SVN: mica('Securities Market Agency (ATVP) / Bank of Slovenia', null),
  ESP: mica('CNMV / Banco de España', 'https://www.cnmv.es', { activity: 'High' }),
  SWE: mica('Finansinspektionen', 'https://www.fi.se'),
  ISL: mica('Central Bank of Iceland — Financial Supervision', 'https://www.cb.is', {
    notes: 'EEA member: MiCA applies via the EEA Agreement; supervision sits with the central bank’s FSA arm.',
  }),
  LIE: mica('Financial Market Authority (FMA) Liechtenstein', 'https://www.fma-li.li', {
    activity: 'High',
    notes:
      'EEA member: MiCA applies, layered over the 2020 Token and TT Service Provider Act (TVTG) — one of the earliest full token frameworks anywhere.',
    scores: { clarity: 82, licensing: 78 },
  }),
  NOR: mica('Finanstilsynet', 'https://www.finanstilsynet.no', {
    notes: 'EEA member: MiCA applies via the EEA Agreement.',
  }),

  // --- Major national regimes --------------------------------------------
  GBR: {
    status: 'Partial',
    activity: 'High',
    authority: 'Financial Conduct Authority (FCA) / Bank of England',
    instrument: 'Financial Services and Markets Act 2023 + FCA cryptoasset registration regime',
    regulatorSite: 'https://www.fca.org.uk',
    instrumentUrl: 'https://www.legislation.gov.uk/ukpga/2023/29',
    confidence: 'Medium',
    notes:
      'FSMA 2023 brought cryptoassets into the regulatory perimeter and secondary legislation to create a full authorisation regime (including fiat-backed stablecoins) has been progressing since; until it lands, firms operate under AML registration plus the financial-promotions regime. Banking access is uneven.',
    scores: { clarity: 62, licensing: 55, stablecoin: 60, banking: 50, tax: 52, stability: 72 },
    lastReviewed: '2026-08',
  },
  CHE: {
    status: 'Comprehensive',
    activity: 'High',
    authority: 'FINMA',
    instrument: 'DLT Act (2021) + FINMA guidance; banking/securities law applies by token category',
    regulatorSite: 'https://www.finma.ch',
    confidence: 'Medium',
    notes:
      'Technology-neutral framework refined since 2018: token taxonomy, DLT trading-facility licence, and two crypto-focused banks. Zug/Zurich remain a first-tier base; FINMA is conservative but predictable.',
    scores: { clarity: 85, licensing: 78, stablecoin: 70, banking: 75, tax: 62, stability: 85 },
    lastReviewed: '2026-08',
  },
  SGP: {
    status: 'Comprehensive',
    activity: 'High',
    authority: 'Monetary Authority of Singapore (MAS)',
    instrument: 'Payment Services Act 2019 + FSM Act 2022; MAS stablecoin framework (2023)',
    regulatorSite: 'https://www.mas.gov.sg',
    instrumentUrl: 'https://sso.agc.gov.sg/Act/PSA2019',
    confidence: 'Medium',
    notes:
      'DPT licensing under the PS Act with strict retail-access limits; single-currency stablecoin framework finalised 2023. MAS licenses slowly and supervises hard — high bar, high credibility. Domestic banking for crypto firms is selective.',
    scores: { clarity: 86, licensing: 75, stablecoin: 82, banking: 58, tax: 70, stability: 82 },
    lastReviewed: '2026-08',
  },
  JPN: {
    status: 'Comprehensive',
    activity: 'High',
    authority: 'Financial Services Agency (FSA)',
    instrument: 'Payment Services Act + FIEA (as amended); 2023 stablecoin amendments',
    regulatorSite: 'https://www.fsa.go.jp',
    confidence: 'Medium',
    notes:
      'Licensing since 2017; the 2023 PSA amendments created one of the first bank/trust-based stablecoin issuance regimes. Historically punitive tax treatment has been easing. Deep, orderly domestic market.',
    scores: { clarity: 82, licensing: 72, stablecoin: 80, banking: 70, tax: 48, stability: 80 },
    lastReviewed: '2026-08',
  },
  HKG: {
    kind: 'territory',
    parentIso3: 'CHN',
    status: 'Comprehensive',
    activity: 'High',
    authority: 'SFC / HKMA',
    instrument: 'AMLO VASP licensing regime (2023) + Stablecoins Ordinance (2025)',
    regulatorSite: 'https://www.sfc.hk',
    confidence: 'Medium',
    notes:
      'Deliberately separate from the mainland prohibition: SFC-licensed VATPs may serve retail, and the 2025 Stablecoins Ordinance put fiat-referenced issuers under HKMA licence. Policy is actively pro-hub; banking access improving via the majors.',
    scores: { clarity: 80, licensing: 74, stablecoin: 82, banking: 66, tax: 72, stability: 70 },
    lastReviewed: '2026-08',
  },
  KOR: {
    status: 'Partial',
    activity: 'High',
    authority: 'Financial Services Commission (FSC) / FIU',
    instrument: 'Virtual Asset User Protection Act (2024) + Specific Financial Information Act',
    regulatorSite: 'https://www.fsc.go.kr',
    confidence: 'Medium',
    notes:
      'User-protection and market-abuse rules in force since 2024; a second-phase framework covering issuance and stablecoins is in progress. Real-name banking rules concentrate the market on a few exchanges.',
    scores: { clarity: 60, licensing: 55, stablecoin: 40, banking: 55, tax: 55, stability: 65 },
    lastReviewed: '2026-08',
  },
  AUS: {
    status: 'Drafting',
    activity: 'High',
    authority: 'ASIC / AUSTRAC / Treasury',
    instrument: 'AUSTRAC DCE registration; Treasury digital-asset platform legislation in development',
    regulatorSite: 'https://www.austrac.gov.au',
    confidence: 'Medium',
    notes:
      'Exchanges operate under AML registration while a licensing regime for digital-asset platforms and payment stablecoins works through Treasury. Existing financial-services law already catches many tokens — the gap is a bespoke regime, not a vacuum.',
    scores: { clarity: 48, licensing: 42, stablecoin: 38, banking: 52, tax: 50, stability: 70 },
    lastReviewed: '2026-08',
  },
  NZL: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Financial Markets Authority (FMA)',
    instrument: 'Existing financial-markets law applied case-by-case; no bespoke regime',
    regulatorSite: 'https://www.fma.govt.nz',
    confidence: 'Low',
    notes: 'No bespoke crypto statute; FMA applies existing law and has signalled no urgency for one.',
    scores: { clarity: 40, licensing: 35, stablecoin: 25, banking: 45, tax: 50, stability: 68 },
    lastReviewed: '2026-08',
  },
  CAN: {
    status: 'Partial',
    activity: 'High',
    authority: 'CSA (provincial securities regulators) / FINTRAC',
    instrument: 'CSA guidance treating trading platforms as securities dealers + PCMLTFA MSB registration',
    regulatorSite: 'https://www.securities-administrators.ca',
    confidence: 'Medium',
    notes:
      'No federal crypto statute: platforms register as restricted dealers under CSA pre-registration undertakings, with FINTRAC MSB registration underneath. Stablecoin listings require CSA value-referenced-asset undertakings.',
    scores: { clarity: 55, licensing: 50, stablecoin: 45, banking: 50, tax: 48, stability: 68 },
    lastReviewed: '2026-08',
  },
  USA: {
    status: 'Partial',
    activity: 'High',
    authority: 'SEC / CFTC / FinCEN / OCC + state regulators',
    regulatorSite: 'https://www.sec.gov',
    confidence: 'Medium',
    notes:
      'The 2025 GENIUS Act finally gave payment stablecoins a federal charter path, and market-structure legislation has advanced — but most activity still sits on a patchwork of securities/commodities case law plus state money-transmitter licensing. Deepest capital market, least unified rulebook.',
    scores: { clarity: 50, licensing: 45, stablecoin: 75, banking: 52, tax: 45, stability: 58 },
    lastReviewed: '2026-08',
  },
  PRI: {
    kind: 'territory',
    parentIso3: 'USA',
    status: 'Partial',
    activity: 'Moderate',
    authority: 'OCIF (Office of the Commissioner of Financial Institutions) + US federal law',
    confidence: 'Low',
    notes:
      'US federal law applies in full; OCIF licenses money transmitters and international financial entities locally. Attractive Act 60 tax incentives drive most crypto interest.',
    scores: { clarity: 45, licensing: 42, stablecoin: 60, banking: 45, tax: 70, stability: 55 },
    lastReviewed: '2026-08',
  },

  // --- UAE and perimeters --------------------------------------------------
  ARE: {
    status: 'Comprehensive',
    activity: 'High',
    authority: 'CBUAE / SCA / VARA / FSRA / DFSA (stacked — see perimeters)',
    regulatorSite: 'https://www.centralbank.ae',
    confidence: 'Medium',
    notes:
      'Five regulators whose perimeters stack: payment tokens need CBUAE regardless of other licences; VARA covers Dubai ex-DIFC; SCA covers other mainland virtual-asset activity; ADGM and DIFC free zones run their own regimes. Zero personal income tax; 9% corporate tax with free-zone reliefs.',
    scores: { clarity: 74, licensing: 80, stablecoin: 72, banking: 62, tax: 92, stability: 70 },
    lastReviewed: '2026-08',
  },
  'ARE-CB': {
    name: 'UAE — CBUAE (mainland payments)',
    kind: 'sub-perimeter',
    parentIso3: 'ARE',
    region: 'Middle East',
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Central Bank of the UAE',
    instrument: 'Payment Token Services Regulation (2024)',
    regulatorSite: 'https://www.centralbank.ae',
    confidence: 'Medium',
    notes:
      'Licenses dirham payment-token issuance and custody/transfer of payment tokens. This perimeter stacks on the others: a VARA or free-zone licence does not authorise payment-token services.',
    scores: { clarity: 70, licensing: 62, stablecoin: 78, banking: 65, tax: 92, stability: 70 },
    lastReviewed: '2026-08',
  },
  'ARE-VARA': {
    name: 'UAE — VARA (Dubai ex-DIFC)',
    kind: 'sub-perimeter',
    parentIso3: 'ARE',
    region: 'Middle East',
    status: 'Comprehensive',
    activity: 'High',
    authority: 'Dubai Virtual Assets Regulatory Authority (VARA)',
    instrument: 'Dubai VA Law No. 4 of 2022 + VARA rulebooks',
    regulatorSite: 'https://www.vara.ae',
    confidence: 'Medium',
    notes:
      'Activity-based VASP licensing across seven regulated activities in the Emirate of Dubai outside DIFC. The most active licensing pipeline in the region.',
    scores: { clarity: 78, licensing: 82, stablecoin: 60, banking: 58, tax: 92, stability: 66 },
    lastReviewed: '2026-08',
  },
  'ARE-ADGM': {
    name: 'UAE — FSRA (ADGM free zone)',
    kind: 'sub-perimeter',
    parentIso3: 'ARE',
    region: 'Middle East',
    status: 'Comprehensive',
    activity: 'High',
    authority: 'Financial Services Regulatory Authority (ADGM)',
    instrument: 'FSRA virtual-asset framework (2018, as amended)',
    regulatorSite: 'https://www.adgm.com',
    confidence: 'Medium',
    notes:
      'The oldest bespoke virtual-asset framework in the region (2018), inside Abu Dhabi’s common-law financial free zone. English-law courts; institutional tilt.',
    scores: { clarity: 82, licensing: 78, stablecoin: 66, banking: 62, tax: 92, stability: 74 },
    lastReviewed: '2026-08',
  },
  'ARE-DIFC': {
    name: 'UAE — DFSA (DIFC free zone)',
    kind: 'sub-perimeter',
    parentIso3: 'ARE',
    region: 'Middle East',
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Dubai Financial Services Authority (DFSA)',
    instrument: 'DFSA crypto-token regime (2022, as amended)',
    regulatorSite: 'https://www.dfsa.ae',
    confidence: 'Medium',
    notes:
      'Recognised-token model inside the DIFC common-law free zone: firms may only deal in tokens the DFSA has recognised. Narrower but highly predictable.',
    scores: { clarity: 76, licensing: 70, stablecoin: 62, banking: 60, tax: 92, stability: 74 },
    lastReviewed: '2026-08',
  },
  'ARE-SCA': {
    name: 'UAE — SCA (federal markets)',
    kind: 'sub-perimeter',
    parentIso3: 'ARE',
    region: 'Middle East',
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Securities & Commodities Authority (SCA)',
    instrument: 'SCA virtual-asset regulations (2023, under Cabinet Decision 111/2022)',
    regulatorSite: 'https://www.sca.gov.ae',
    confidence: 'Medium',
    notes:
      'Federal licensing for virtual-asset activity on the mainland outside Dubai (VARA handles Dubai under delegation). Coordinates the mainland perimeter with CBUAE.',
    scores: { clarity: 68, licensing: 66, stablecoin: 58, banking: 58, tax: 92, stability: 68 },
    lastReviewed: '2026-08',
  },

  // --- Middle East ---------------------------------------------------------
  BHR: {
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Central Bank of Bahrain (CBB)',
    instrument: 'CBB Rulebook — Crypto-Asset Module (2019, as amended)',
    regulatorSite: 'https://www.cbb.gov.bh',
    confidence: 'Medium',
    notes:
      'First full crypto-asset rulebook in the Gulf (2019); licenses exchanges and custodians and hosts regional players. Smaller market than the UAE but a clean, single-regulator perimeter.',
    scores: { clarity: 74, licensing: 70, stablecoin: 60, banking: 58, tax: 85, stability: 66 },
    lastReviewed: '2026-08',
  },
  QAT: {
    status: 'Partial',
    activity: 'Low',
    authority: 'QFC Regulatory Authority / Qatar Central Bank',
    instrument: 'QFC Digital Assets Framework (2024); mainland retail crypto restricted',
    confidence: 'Medium',
    notes:
      'The QFC framework covers tokenisation and investment tokens inside the financial centre while mainland retail crypto trading remains restricted — a deliberately narrow opening.',
    scores: { clarity: 50, licensing: 45, stablecoin: 30, banking: 45, tax: 85, stability: 60 },
    lastReviewed: '2026-08',
  },
  SAU: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'SAMA / Capital Market Authority',
    regulatorSite: 'https://www.sama.gov.sa',
    confidence: 'Low',
    notes:
      'No licensing regime; banks are warned off crypto while SAMA runs CBDC and tokenisation experiments and studies virtual-asset rules. Activity is grey-market retail.',
    scores: { clarity: 25, licensing: 15, stablecoin: 15, banking: 20, tax: 85, stability: 55 },
    lastReviewed: '2026-08',
  },
  KWT: {
    status: 'Prohibition',
    activity: 'Low',
    authority: 'Central Bank of Kuwait / CMA',
    confidence: 'Medium',
    notes: 'Regulators issued a broad prohibition on virtual-asset business and payments use in 2023.',
    scores: { clarity: 30, licensing: 4, stablecoin: 4, banking: 8, tax: 80, stability: 50 },
    lastReviewed: '2026-08',
  },
  OMN: {
    status: 'Drafting',
    activity: 'Low',
    authority: 'Capital Market Authority (Oman) / Central Bank of Oman',
    confidence: 'Low',
    notes: 'A virtual-asset regulatory framework has been under CMA consultation; mining saw state-linked investment. Nothing licensed yet.',
    scores: { clarity: 28, licensing: 18, stablecoin: 15, banking: 30, tax: 80, stability: 52 },
    lastReviewed: '2026-08',
  },
  ISR: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Israel Securities Authority / Capital Market Authority / Bank of Israel',
    regulatorSite: 'https://www.isa.gov.il',
    confidence: 'Medium',
    notes:
      'Financial-asset service providers need CMISA licences; ISA applies securities law to tokens and has run DLT pilot issuances. Banking access remains the practical bottleneck despite court pushback.',
    scores: { clarity: 52, licensing: 48, stablecoin: 35, banking: 35, tax: 45, stability: 60 },
    lastReviewed: '2026-08',
  },
  JOR: {
    status: 'Drafting',
    activity: 'Low',
    authority: 'Central Bank of Jordan / JSC',
    confidence: 'Low',
    notes: 'Long-standing CBJ ban on banks touching crypto, but a 2025 virtual-asset law process signalled a shift toward regulation.',
    scores: { clarity: 22, licensing: 12, stablecoin: 10, banking: 12, tax: 55, stability: 52 },
    lastReviewed: '2026-08',
  },
  LBN: {
    status: 'None',
    activity: 'Moderate',
    authority: 'Banque du Liban',
    confidence: 'Low',
    notes: 'No framework; stablecoins are widely used informally as a hedge against the collapsed banking system — exactly the kind of activity no instrument covers.',
    scores: { clarity: 8, licensing: 5, stablecoin: 10, banking: 5, tax: 40, stability: 20 },
    lastReviewed: '2026-08',
  },
  IRN: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Central Bank of Iran',
    confidence: 'Low',
    notes: 'Licensed mining regime with mandatory sale of mined coins to the central bank; trading restricted; sanctions dominate every practical question.',
    scores: { clarity: 20, licensing: 12, stablecoin: 8, banking: 5, tax: 40, stability: 30 },
    lastReviewed: '2026-08',
  },
  IRQ: {
    status: 'Prohibition',
    activity: 'Minimal',
    authority: 'Central Bank of Iraq',
    confidence: 'Low',
    notes: 'CBI banned dealing in cryptocurrencies; enforcement is bank-channel based.',
    scores: { clarity: 22, licensing: 4, stablecoin: 4, banking: 5, tax: 45, stability: 35 },
    lastReviewed: '2026-08',
  },

  // --- Asia ---------------------------------------------------------------
  CHN: {
    status: 'Prohibition',
    activity: 'Moderate',
    authority: "People's Bank of China / CAC",
    confidence: 'Medium',
    notes:
      'The 2021 ten-agency notice made virtual-currency business illegal on the mainland, including offshore exchanges serving residents. Holding is not criminal; courts treat coins as property in disputes. Substantial grey-market activity persists.',
    scores: { clarity: 35, licensing: 2, stablecoin: 2, banking: 3, tax: 30, stability: 55 },
    lastReviewed: '2026-08',
  },
  MAC: {
    kind: 'territory',
    parentIso3: 'CHN',
    status: 'Prohibition',
    activity: 'Minimal',
    authority: 'Monetary Authority of Macao (AMCM)',
    confidence: 'Low',
    notes: 'AMCM has repeatedly warned that virtual-asset activity is unauthorised; policy tracks the mainland line.',
    scores: { clarity: 25, licensing: 3, stablecoin: 3, banking: 5, tax: 45, stability: 50 },
    lastReviewed: '2026-08',
  },
  TWN: {
    status: 'Drafting',
    activity: 'High',
    authority: 'Financial Supervisory Commission (FSC)',
    confidence: 'Medium',
    notes:
      'AML registration plus FSC guiding principles today; a dedicated VASP statute has been in the legislative pipeline. Active domestic exchanges and an industry self-regulatory association.',
    scores: { clarity: 42, licensing: 35, stablecoin: 28, banking: 45, tax: 55, stability: 55 },
    lastReviewed: '2026-08',
  },
  IND: {
    status: 'Partial',
    activity: 'High',
    authority: 'FIU-IND / RBI / SEBI (no single regulator)',
    confidence: 'Medium',
    notes:
      'No licensing regime: exchanges register with FIU-IND under AML rules, while a 30% gains tax plus 1% TDS suppresses onshore volume. RBI remains hostile; policy papers keep promising a framework.',
    scores: { clarity: 30, licensing: 22, stablecoin: 15, banking: 25, tax: 15, stability: 50 },
    lastReviewed: '2026-08',
  },
  PAK: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'State Bank of Pakistan / (new virtual-asset authority in formation)',
    confidence: 'Low',
    notes: 'After years of central-bank hostility, 2025 saw moves to stand up a virtual-asset regulatory authority. Nothing operational to license against yet.',
    scores: { clarity: 22, licensing: 15, stablecoin: 12, banking: 15, tax: 40, stability: 42 },
    lastReviewed: '2026-08',
  },
  BGD: {
    status: 'Prohibition',
    activity: 'Minimal',
    authority: 'Bangladesh Bank',
    confidence: 'Low',
    notes: 'Bangladesh Bank has repeatedly declared crypto transactions impermissible under FX and AML law.',
    scores: { clarity: 20, licensing: 3, stablecoin: 3, banking: 5, tax: 40, stability: 40 },
    lastReviewed: '2026-08',
  },
  LKA: {
    status: 'None',
    activity: 'Low',
    authority: 'Central Bank of Sri Lanka',
    confidence: 'Low',
    notes: 'CBSL warnings against crypto use; no framework and none drafted publicly.',
    scores: { clarity: 10, licensing: 6, stablecoin: 6, banking: 15, tax: 40, stability: 38 },
    lastReviewed: '2026-08',
  },
  NPL: {
    status: 'Prohibition',
    activity: 'Minimal',
    authority: 'Nepal Rastra Bank',
    confidence: 'Medium',
    notes: 'Trading and mining are banned; the telecom authority has ordered ISP blocking of exchange sites.',
    scores: { clarity: 22, licensing: 2, stablecoin: 2, banking: 4, tax: 40, stability: 40 },
    lastReviewed: '2026-08',
  },
  THA: {
    status: 'Comprehensive',
    activity: 'High',
    authority: 'Thai SEC',
    instrument: 'Emergency Decree on Digital Asset Businesses (2018, as amended)',
    regulatorSite: 'https://www.sec.or.th',
    confidence: 'Medium',
    notes:
      'One of Asia’s earliest full licensing regimes: exchanges, brokers, dealers, custodians and ICO portals. Payments use of crypto is banned; enforcement against offshore platforms is active.',
    scores: { clarity: 72, licensing: 66, stablecoin: 40, banking: 55, tax: 55, stability: 62 },
    lastReviewed: '2026-08',
  },
  MYS: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Securities Commission Malaysia / BNM',
    regulatorSite: 'https://www.sc.com.my',
    confidence: 'Medium',
    notes:
      'Digital assets regulated as securities under 2019 prescription order; registered exchanges operate. BNM rejects crypto as payment; stablecoin policy unresolved.',
    scores: { clarity: 60, licensing: 55, stablecoin: 25, banking: 50, tax: 60, stability: 60 },
    lastReviewed: '2026-08',
  },
  IDN: {
    status: 'Partial',
    activity: 'High',
    authority: 'OJK (transferred from Bappebti in 2025)',
    regulatorSite: 'https://www.ojk.go.id',
    confidence: 'Medium',
    notes:
      'Crypto traded legally as a regulated asset class (not payment) on registered exchanges; supervision moved from the commodities regulator to OJK, pulling digital assets into the financial-sector perimeter.',
    scores: { clarity: 55, licensing: 50, stablecoin: 25, banking: 45, tax: 50, stability: 55 },
    lastReviewed: '2026-08',
  },
  PHL: {
    status: 'Partial',
    activity: 'High',
    authority: 'Bangko Sentral ng Pilipinas (BSP) / SEC',
    regulatorSite: 'https://www.bsp.gov.ph',
    confidence: 'Medium',
    notes: 'BSP VASP licensing since 2021 (moratorium on new licences has applied); active remittance-driven usage. SEC pursues offshore platforms.',
    scores: { clarity: 55, licensing: 48, stablecoin: 40, banking: 50, tax: 48, stability: 55 },
    lastReviewed: '2026-08',
  },
  VNM: {
    status: 'Drafting',
    activity: 'High',
    authority: 'Ministry of Finance / SBV',
    confidence: 'Low',
    notes:
      'Very high grassroots adoption with no legal framework; 2025 digital-technology legislation began defining digital assets, with pilots planned. Payments use remains prohibited.',
    scores: { clarity: 25, licensing: 18, stablecoin: 15, banking: 25, tax: 45, stability: 48 },
    lastReviewed: '2026-08',
  },
  KHM: {
    status: 'Partial',
    activity: 'Low',
    authority: 'National Bank of Cambodia / SERC',
    confidence: 'Low',
    notes: 'Long-hostile stance softened by 2024 NBC rules letting banks touch category-1 (backed) crypto assets under approval; retail exchange licensing narrow.',
    scores: { clarity: 30, licensing: 22, stablecoin: 25, banking: 30, tax: 45, stability: 45 },
    lastReviewed: '2026-08',
  },
  KAZ: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'AFSA (AIFC) / National Bank',
    confidence: 'Medium',
    notes:
      'Licensed digital-asset exchanges operate inside the AIFC financial centre with limited mainland interoperability; mining is licensed and taxed after the 2021 boom strained the grid.',
    scores: { clarity: 48, licensing: 45, stablecoin: 28, banking: 38, tax: 55, stability: 50 },
    lastReviewed: '2026-08',
  },
  UZB: {
    status: 'Partial',
    activity: 'Low',
    authority: 'National Agency of Perspective Projects (NAPP)',
    confidence: 'Low',
    notes: 'Licensed-exchange model with residents restricted to authorised platforms; mining licensed with energy conditions.',
    scores: { clarity: 40, licensing: 35, stablecoin: 20, banking: 30, tax: 50, stability: 45 },
    lastReviewed: '2026-08',
  },
  MNG: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Financial Regulatory Commission',
    confidence: 'Low',
    notes: 'Virtual-asset service provider law since 2021; domestic exchanges registered.',
    scores: { clarity: 40, licensing: 35, stablecoin: 18, banking: 30, tax: 45, stability: 45 },
    lastReviewed: '2026-08',
  },
  BTN: {
    status: 'None',
    activity: 'Low',
    authority: 'Royal Monetary Authority',
    confidence: 'Low',
    notes: 'No public framework, but the state has run sovereign bitcoin mining via Druk Holding — policy is pragmatic silence.',
    scores: { clarity: 12, licensing: 8, stablecoin: 8, banking: 25, tax: 45, stability: 45 },
    lastReviewed: '2026-08',
  },
  PRK: {
    status: 'Prohibition',
    activity: 'Minimal',
    authority: '—',
    confidence: 'Low',
    notes: 'No lawful private crypto activity; the state itself is the notable actor via sanctioned hacking groups.',
    scores: { clarity: 5, licensing: 0, stablecoin: 0, banking: 0, tax: 10, stability: 20 },
    lastReviewed: '2026-08',
  },

  // --- Europe (non-MiCA) ---------------------------------------------------
  UKR: {
    status: 'Drafting',
    activity: 'High',
    authority: 'NSSMC / NBU',
    confidence: 'Low',
    notes:
      'The 2022 Virtual Assets Law never entered force pending tax provisions; a MiCA-aligned rewrite has been moving through parliament. High wartime stablecoin usage.',
    scores: { clarity: 30, licensing: 22, stablecoin: 25, banking: 25, tax: 40, stability: 30 },
    lastReviewed: '2026-08',
  },
  RUS: {
    status: 'Partial',
    activity: 'High',
    authority: 'Bank of Russia / Ministry of Finance',
    confidence: 'Low',
    notes:
      'Digital financial assets law (2020) plus 2024 legalisation of industrial mining and experimental cross-border crypto settlement under sanctions; domestic payments use banned. Sanctions dominate every practical question.',
    scores: { clarity: 35, licensing: 25, stablecoin: 20, banking: 15, tax: 40, stability: 30 },
    lastReviewed: '2026-08',
  },
  TUR: {
    status: 'Partial',
    activity: 'High',
    authority: 'Capital Markets Board (CMB)',
    confidence: 'Medium',
    notes:
      '2024 Capital Markets Law amendments created CASP licensing under the CMB; payments use has been banned since 2021. Very high retail adoption driven by lira depreciation.',
    scores: { clarity: 50, licensing: 45, stablecoin: 25, banking: 45, tax: 50, stability: 45 },
    lastReviewed: '2026-08',
  },
  GEO: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'National Bank of Georgia',
    confidence: 'Low',
    notes: 'VASP registration under 2023 NBG rules; historically significant mining. Free-zone offerings target crypto firms.',
    scores: { clarity: 42, licensing: 38, stablecoin: 25, banking: 40, tax: 55, stability: 50 },
    lastReviewed: '2026-08',
  },
  ARM: {
    status: 'Drafting',
    activity: 'Low',
    authority: 'Central Bank of Armenia',
    confidence: 'Low',
    notes: 'Crypto-asset regulation law adopted 2024/25 bringing CASPs under central-bank licence, phasing in.',
    scores: { clarity: 35, licensing: 28, stablecoin: 20, banking: 35, tax: 48, stability: 48 },
    lastReviewed: '2026-08',
  },
  BLR: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Hi-Tech Park (HTP) administration / National Bank',
    confidence: 'Low',
    notes: 'Decree No. 8 (2017) legalised crypto business inside the HTP perimeter; residents must use HTP-registered platforms. Sanctions-era caveats apply.',
    scores: { clarity: 40, licensing: 35, stablecoin: 20, banking: 20, tax: 55, stability: 35 },
    lastReviewed: '2026-08',
  },
  SRB: {
    status: 'Comprehensive',
    activity: 'Low',
    authority: 'Securities Commission / National Bank of Serbia',
    confidence: 'Low',
    notes: 'The 2020 Digital Assets Law licenses issuance and secondary trading — comprehensive on paper, thin in practice.',
    scores: { clarity: 58, licensing: 52, stablecoin: 35, banking: 40, tax: 48, stability: 52 },
    lastReviewed: '2026-08',
  },
  AND: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'Andorran Financial Authority (AFA)',
    confidence: 'Low',
    notes: 'Digital Assets Act 2022 provides a framework; adoption minimal. EU association agreement may pull it toward MiCA.',
    scores: { clarity: 45, licensing: 38, stablecoin: 25, banking: 35, tax: 60, stability: 55 },
    lastReviewed: '2026-08',
  },
  MCO: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'CCAF / Government of Monaco',
    confidence: 'Low',
    notes: 'Token-offering law (2022) and service-provider authorisations exist; tiny market, French banking dependency.',
    scores: { clarity: 42, licensing: 36, stablecoin: 25, banking: 40, tax: 75, stability: 58 },
    lastReviewed: '2026-08',
  },
  SMR: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'Central Bank of San Marino',
    confidence: 'Low',
    notes: 'Blockchain-entity decree (2019) exists on paper; negligible activity.',
    scores: { clarity: 35, licensing: 28, stablecoin: 18, banking: 30, tax: 55, stability: 52 },
    lastReviewed: '2026-08',
  },
  MDA: {
    status: 'Drafting',
    activity: 'Minimal',
    authority: 'National Bank of Moldova',
    confidence: 'Low',
    notes: 'MiCA-inspired framework advancing as part of EU accession alignment.',
    scores: { clarity: 25, licensing: 18, stablecoin: 15, banking: 30, tax: 45, stability: 42 },
    lastReviewed: '2026-08',
  },
  ALB: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'Albanian FSA / Bank of Albania',
    confidence: 'Low',
    notes: 'An early (2020) DLT markets law exists; implementation has been halting. EU accession will pull toward MiCA.',
    scores: { clarity: 35, licensing: 30, stablecoin: 18, banking: 30, tax: 45, stability: 45 },
    lastReviewed: '2026-08',
  },

  // --- Americas ------------------------------------------------------------
  BRA: {
    status: 'Partial',
    activity: 'High',
    authority: 'Banco Central do Brasil / CVM',
    instrument: 'Law 14,478/2022 (Legal Framework for Virtual Assets) + BCB regulations',
    regulatorSite: 'https://www.bcb.gov.br',
    confidence: 'Medium',
    notes:
      'The 2022 framework made BCB the VASP supervisor; implementing regulations (issued 2024-25) phase in licensing. Largest crypto market in Latin America; stablecoin flows dominate.',
    scores: { clarity: 55, licensing: 50, stablecoin: 45, banking: 55, tax: 48, stability: 58 },
    lastReviewed: '2026-08',
  },
  ARG: {
    status: 'Partial',
    activity: 'High',
    authority: 'CNV',
    confidence: 'Medium',
    notes:
      'Mandatory VASP registry under CNV since 2024 with fuller rules phasing in; massive stablecoin adoption as an inflation hedge. Tax and FX rules shift frequently.',
    scores: { clarity: 42, licensing: 40, stablecoin: 45, banking: 35, tax: 35, stability: 40 },
    lastReviewed: '2026-08',
  },
  MEX: {
    status: 'Partial',
    activity: 'High',
    authority: 'CNBV / Banxico',
    confidence: 'Medium',
    notes:
      'The 2018 Fintech Law nominally covers virtual assets but Banxico guidance effectively keeps them out of the regulated financial system; large remittance-driven usage rides on exchanges regulated lightly.',
    scores: { clarity: 40, licensing: 35, stablecoin: 30, banking: 35, tax: 45, stability: 52 },
    lastReviewed: '2026-08',
  },
  CHL: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'CMF',
    confidence: 'Medium',
    notes: 'The 2023 Fintech Law brought crypto-asset service providers under CMF registration; implementation ongoing.',
    scores: { clarity: 50, licensing: 45, stablecoin: 32, banking: 45, tax: 48, stability: 58 },
    lastReviewed: '2026-08',
  },
  COL: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'SFC / Banco de la República',
    confidence: 'Low',
    notes: 'Sandbox pilots for bank-exchange cooperation ran; framework bills have repeatedly stalled in congress.',
    scores: { clarity: 25, licensing: 18, stablecoin: 18, banking: 30, tax: 42, stability: 48 },
    lastReviewed: '2026-08',
  },
  PER: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'SBS / SMV',
    confidence: 'Low',
    notes: 'VASP AML registration in place; broader framework under discussion.',
    scores: { clarity: 25, licensing: 20, stablecoin: 15, banking: 30, tax: 42, stability: 48 },
    lastReviewed: '2026-08',
  },
  SLV: {
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'CNAD (National Commission of Digital Assets)',
    instrument: 'Bitcoin Law (2021, amended 2025) + Digital Assets Issuance Law (2023)',
    confidence: 'Medium',
    notes:
      'Bitcoin’s legal-tender status was rolled back to voluntary under the 2025 IMF programme, but the digital-asset issuance and service-provider regime remains one of the most permissive anywhere.',
    scores: { clarity: 65, licensing: 62, stablecoin: 60, banking: 40, tax: 70, stability: 45 },
    lastReviewed: '2026-08',
  },
  BOL: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Banco Central de Bolivia',
    confidence: 'Low',
    notes: 'The long-standing ban was lifted in 2024; banks may channel crypto payments. No licensing regime yet.',
    scores: { clarity: 25, licensing: 15, stablecoin: 25, banking: 30, tax: 45, stability: 40 },
    lastReviewed: '2026-08',
  },
  VEN: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Sunacrip (reorganised)',
    confidence: 'Low',
    notes: 'The state crypto regulator was gutted by corruption scandal (2023); the Petro is dead; stablecoin use is pervasive and informal.',
    scores: { clarity: 15, licensing: 10, stablecoin: 15, banking: 10, tax: 30, stability: 15 },
    lastReviewed: '2026-08',
  },
  PAN: {
    status: 'None',
    activity: 'Moderate',
    authority: '—',
    confidence: 'Low',
    notes: 'A crypto bill was passed then struck down as unconstitutional (2023); crypto businesses operate under general law. Territorial tax makes it attractive anyway.',
    scores: { clarity: 18, licensing: 12, stablecoin: 15, banking: 30, tax: 75, stability: 50 },
    lastReviewed: '2026-08',
  },
  PRY: {
    status: 'Partial',
    activity: 'Low',
    authority: 'SEPRELAD / Ministry of Industry',
    confidence: 'Low',
    notes: 'Mining registration exists (cheap hydro); a fuller framework was vetoed in 2022.',
    scores: { clarity: 25, licensing: 20, stablecoin: 12, banking: 28, tax: 55, stability: 48 },
    lastReviewed: '2026-08',
  },
  URY: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Banco Central del Uruguay',
    confidence: 'Low',
    notes: 'A 2024 law gave BCU authority over virtual-asset service providers; implementation early.',
    scores: { clarity: 40, licensing: 35, stablecoin: 25, banking: 40, tax: 50, stability: 60 },
    lastReviewed: '2026-08',
  },
  BHS: {
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Securities Commission of The Bahamas',
    instrument: 'DARE Act 2024 (replacing DARE 2020)',
    confidence: 'Medium',
    notes:
      'DARE 2024 rebuilt the regime post-FTX with tightened custody and stablecoin provisions. The collapse happened here; the response was to regulate harder, not exit.',
    scores: { clarity: 62, licensing: 58, stablecoin: 55, banking: 40, tax: 78, stability: 48 },
    lastReviewed: '2026-08',
  },
  ATG: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Financial Services Regulatory Commission',
    instrument: 'Digital Assets Business Act 2020',
    confidence: 'Low',
    notes: 'DABA 2020 licenses digital-asset business; ECCU banking rails apply underneath.',
    scores: { clarity: 48, licensing: 45, stablecoin: 30, banking: 32, tax: 70, stability: 50 },
    lastReviewed: '2026-08',
  },
  CUB: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Banco Central de Cuba',
    confidence: 'Low',
    notes: 'BCC resolution permits licensed VASPs (2022), driven by sanctions workarounds; practical licensing negligible.',
    scores: { clarity: 22, licensing: 15, stablecoin: 12, banking: 8, tax: 40, stability: 30 },
    lastReviewed: '2026-08',
  },

  // --- Caribbean/Crown dependencies & other territories --------------------
  CYM: {
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Cayman Islands Monetary Authority (CIMA)',
    instrument: 'Virtual Asset (Service Providers) Act (2020, as amended)',
    confidence: 'Medium',
    notes:
      'VASP registration/licensing phased in fully by 2025; the default domicile for crypto funds and many foundation structures. Zero direct tax; banking via correspondent relationships.',
    scores: { clarity: 68, licensing: 62, stablecoin: 45, banking: 45, tax: 90, stability: 62 },
    lastReviewed: '2026-08',
  },
  BMU: {
    status: 'Comprehensive',
    activity: 'Low',
    authority: 'Bermuda Monetary Authority (BMA)',
    instrument: 'Digital Asset Business Act 2018',
    confidence: 'Medium',
    notes: 'DABA 2018 was among the first full digital-asset statutes; respected supervisor, small licensee base.',
    scores: { clarity: 70, licensing: 62, stablecoin: 55, banking: 42, tax: 85, stability: 62 },
    lastReviewed: '2026-08',
  },
  VGB: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'BVI Financial Services Commission',
    instrument: 'Virtual Assets Service Providers Act 2022',
    confidence: 'Medium',
    notes: 'VASP registration since 2023; enormous incorporation base means many token issuers are BVI entities regardless of where teams sit.',
    scores: { clarity: 52, licensing: 48, stablecoin: 35, banking: 35, tax: 88, stability: 55 },
    lastReviewed: '2026-08',
  },
  GIB: {
    status: 'Comprehensive',
    activity: 'Moderate',
    authority: 'Gibraltar Financial Services Commission (GFSC)',
    instrument: 'DLT Provider regime (2018) under the Financial Services Act',
    confidence: 'Medium',
    notes: 'The 2018 DLT-provider framework was the first purpose-built one in Europe; small but stable licensee base.',
    scores: { clarity: 70, licensing: 64, stablecoin: 48, banking: 45, tax: 72, stability: 60 },
    lastReviewed: '2026-08',
  },
  JEY: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Jersey Financial Services Commission (JFSC)',
    confidence: 'Medium',
    notes: 'Exchange registration under AML law plus fund-domicile activity; no bespoke statute, but a clear supervisory posture.',
    scores: { clarity: 52, licensing: 45, stablecoin: 35, banking: 48, tax: 80, stability: 65 },
    lastReviewed: '2026-08',
  },
  GGY: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Guernsey Financial Services Commission (GFSC)',
    instrument: 'Lending, Credit and Finance Law 2022 (VASP registration)',
    confidence: 'Low',
    notes: 'VASP registration under the 2022 LCF Law; niche fund and structure work.',
    scores: { clarity: 50, licensing: 44, stablecoin: 32, banking: 45, tax: 80, stability: 64 },
    lastReviewed: '2026-08',
  },
  IMN: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Isle of Man Financial Services Authority',
    confidence: 'Low',
    notes: 'Designated-business AML registration for crypto firms; long-standing e-gaming/crypto adjacency.',
    scores: { clarity: 48, licensing: 42, stablecoin: 32, banking: 45, tax: 78, stability: 64 },
    lastReviewed: '2026-08',
  },
  AIA: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'Anguilla FSC (Utility Token Offering Act)',
    confidence: 'Low',
    notes: 'Utility-token offering registration (2020); best known for selling .ai domains, not licences. ECCB rails underneath.',
    scores: { clarity: 38, licensing: 32, stablecoin: 20, banking: 30, tax: 80, stability: 50 },
    lastReviewed: '2026-08',
  },
  TCA: {
    status: 'None',
    activity: 'Minimal',
    authority: 'TCI Financial Services Commission',
    confidence: 'Low',
    notes: 'No bespoke regime; general financial-services and AML law only.',
    scores: { clarity: 12, licensing: 10, stablecoin: 8, banking: 28, tax: 82, stability: 52 },
    lastReviewed: '2026-08',
  },
  CUW: {
    status: 'Partial',
    activity: 'Low',
    authority: 'Central Bank of Curaçao and Sint Maarten',
    confidence: 'Low',
    notes: 'Known for (e-)gaming licences used by crypto casinos; the 2024 gaming-authority reform (LOK) is tightening that channel.',
    scores: { clarity: 30, licensing: 28, stablecoin: 18, banking: 30, tax: 65, stability: 50 },
    lastReviewed: '2026-08',
  },

  // --- Africa --------------------------------------------------------------
  NGA: {
    status: 'Partial',
    activity: 'High',
    authority: 'Securities and Exchange Commission (Nigeria) / CBN',
    instrument: 'Investments and Securities Act 2025 (digital assets as securities) + SEC rules',
    regulatorSite: 'https://sec.gov.ng',
    confidence: 'Medium',
    notes:
      'The 2021 banking ban was lifted (2023) and the ISA 2025 put digital assets under SEC jurisdiction, with provisional exchange licences issued. Africa’s largest P2P/stablecoin market; enforcement against offshore platforms has been aggressive.',
    scores: { clarity: 45, licensing: 40, stablecoin: 40, banking: 32, tax: 45, stability: 42 },
    lastReviewed: '2026-08',
  },
  ZAF: {
    status: 'Partial',
    activity: 'High',
    authority: 'FSCA / SARB',
    regulatorSite: 'https://www.fsca.co.za',
    confidence: 'Medium',
    notes:
      'Crypto assets declared financial products (2022): FSCA licenses CASPs under FAIS, with hundreds licensed. Africa’s most conventional, supervisable regime.',
    scores: { clarity: 60, licensing: 58, stablecoin: 38, banking: 50, tax: 48, stability: 58 },
    lastReviewed: '2026-08',
  },
  KEN: {
    status: 'Drafting',
    activity: 'High',
    authority: 'CBK / Capital Markets Authority',
    confidence: 'Low',
    notes: 'The VASP bill (2025) moved toward creating a licensing regime after years of warnings; digital-asset tax preceded regulation.',
    scores: { clarity: 28, licensing: 20, stablecoin: 20, banking: 28, tax: 35, stability: 45 },
    lastReviewed: '2026-08',
  },
  GHA: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'Bank of Ghana / SEC',
    confidence: 'Low',
    notes: 'Bank of Ghana published draft VASP guidelines and has signalled licensing; nothing in force.',
    scores: { clarity: 25, licensing: 18, stablecoin: 18, banking: 28, tax: 42, stability: 45 },
    lastReviewed: '2026-08',
  },
  MUS: {
    status: 'Comprehensive',
    activity: 'Low',
    authority: 'Financial Services Commission (Mauritius)',
    instrument: 'Virtual Asset and Initial Token Offering Services Act 2021',
    confidence: 'Medium',
    notes: 'VAITOS 2021 is a full FATF-aligned licensing statute; Mauritius positions as the African fund/VASP domicile.',
    scores: { clarity: 66, licensing: 60, stablecoin: 42, banking: 45, tax: 70, stability: 58 },
    lastReviewed: '2026-08',
  },
  SYC: {
    status: 'Partial',
    activity: 'Moderate',
    authority: 'Financial Services Authority (Seychelles)',
    instrument: 'Virtual Asset Service Providers Act 2024',
    confidence: 'Medium',
    notes: 'The 2024 VASP Act ended the era of brass-plate crypto exchanges (several majors were incorporated here) by requiring substantive local licensing.',
    scores: { clarity: 50, licensing: 45, stablecoin: 30, banking: 35, tax: 75, stability: 50 },
    lastReviewed: '2026-08',
  },
  EGY: {
    status: 'Prohibition',
    activity: 'Low',
    authority: 'Central Bank of Egypt',
    confidence: 'Medium',
    notes: 'The 2020 banking law requires CBE licence for crypto dealing and none have been granted — a de facto ban with religious-authority reinforcement.',
    scores: { clarity: 24, licensing: 4, stablecoin: 4, banking: 6, tax: 40, stability: 45 },
    lastReviewed: '2026-08',
  },
  MAR: {
    status: 'Drafting',
    activity: 'Moderate',
    authority: 'Bank Al-Maghrib / AMMC',
    confidence: 'Low',
    notes: 'The 2017 ban remains formally in place while a draft crypto law prepared with central-bank backing awaits adoption; P2P usage is high regardless.',
    scores: { clarity: 22, licensing: 10, stablecoin: 10, banking: 12, tax: 42, stability: 48 },
    lastReviewed: '2026-08',
  },
  DZA: {
    status: 'Prohibition',
    activity: 'Minimal',
    authority: 'Banque d’Algérie',
    confidence: 'Medium',
    notes: 'Purchase, sale, use and holding of virtual currencies prohibited by finance law since 2018.',
    scores: { clarity: 24, licensing: 3, stablecoin: 3, banking: 5, tax: 40, stability: 45 },
    lastReviewed: '2026-08',
  },
  TUN: {
    status: 'None',
    activity: 'Low',
    authority: 'Banque Centrale de Tunisie',
    confidence: 'Low',
    notes: 'No framework; FX law makes most crypto activity practically impermissible without being a formal ban.',
    scores: { clarity: 12, licensing: 8, stablecoin: 8, banking: 15, tax: 40, stability: 42 },
    lastReviewed: '2026-08',
  },
  CAF: {
    status: 'Partial',
    activity: 'Minimal',
    authority: 'Ministry of Digital Economy (CAR) / BEAC constraints',
    confidence: 'Low',
    notes:
      'Made bitcoin legal tender in 2022, repealed it in 2023 under BEAC/IMF pressure — the clearest demonstration that CEMAC members cannot diverge from the union.',
    scores: { clarity: 18, licensing: 10, stablecoin: 10, banking: 8, tax: 40, stability: 25 },
    lastReviewed: '2026-08',
  },
  ETH: {
    status: 'Prohibition',
    activity: 'Low',
    authority: 'National Bank of Ethiopia',
    confidence: 'Low',
    notes: 'Crypto transactions declared illegal (2022); licensed data-centre mining nevertheless grew around cheap hydropower.',
    scores: { clarity: 20, licensing: 5, stablecoin: 4, banking: 6, tax: 40, stability: 40 },
    lastReviewed: '2026-08',
  },
  TZA: {
    status: 'None',
    activity: 'Low',
    authority: 'Bank of Tanzania',
    confidence: 'Low',
    notes: 'Warnings since 2019; presidential signals to study crypto never became a framework.',
    scores: { clarity: 10, licensing: 8, stablecoin: 8, banking: 20, tax: 40, stability: 45 },
    lastReviewed: '2026-08',
  },
  ZWE: {
    status: 'None',
    activity: 'Moderate',
    authority: 'Reserve Bank of Zimbabwe',
    confidence: 'Low',
    notes: 'Banking ban on crypto (2018) sits alongside the state’s own gold-backed digital token (ZiG) experiment — prohibition for the market, tokenisation for the state.',
    scores: { clarity: 15, licensing: 8, stablecoin: 10, banking: 10, tax: 38, stability: 25 },
    lastReviewed: '2026-08',
  },
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const UAE_PERIMETER_IDS = ['ARE-CB', 'ARE-VARA', 'ARE-ADGM', 'ARE-DIFC', 'ARE-SCA'];

function buildRow(iso3: string, name: string, region: Region, kind: 'sovereign' | 'territory'): Jurisdiction {
  const regimeId = regimeFor(iso3);
  const curated = CURATED[iso3];
  const status: Status = curated?.status ?? 'None';
  const activity: Activity = curated?.activity ?? 'Minimal';
  const baseScores = STATUS_BASE_SCORES[status];
  return {
    iso3,
    name: curated?.name ?? name,
    region: curated?.region ?? region,
    kind: curated?.kind ?? kind,
    regimeId: curated?.regimeId ?? regimeId,
    parentIso3: curated?.parentIso3 ?? null,
    activity,
    status,
    authority: curated?.authority ?? '—',
    instrument: curated?.instrument ?? null,
    notes:
      curated?.notes ??
      'No dedicated crypto framework identified at time of review. Absence of regulation cannot be cited to a source; treat this row as a research starting point, not a conclusion.',
    scores: { ...baseScores, ...curated?.scores },
    sourcing: {
      regulatorSite: curated?.regulatorSite ?? null,
      instrumentUrl: curated?.instrumentUrl ?? null,
      verifiedBy: null,
      verifiedAt: null,
      confidence: curated?.confidence ?? 'Low',
    },
    lastReviewed: curated?.lastReviewed ?? '2026-07',
  };
}

function buildPerimeter(id: string): Jurisdiction {
  const curated = CURATED[id];
  if (!curated) throw new Error(`missing curated entry for perimeter ${id}`);
  const status = curated.status ?? 'None';
  return {
    iso3: id,
    name: curated.name ?? id,
    region: 'Middle East',
    kind: 'sub-perimeter',
    regimeId: 'uae',
    parentIso3: 'ARE',
    activity: curated.activity ?? 'Minimal',
    status,
    authority: curated.authority ?? '—',
    instrument: curated.instrument ?? null,
    notes: curated.notes ?? '',
    scores: { ...STATUS_BASE_SCORES[status], ...curated.scores },
    sourcing: {
      regulatorSite: curated.regulatorSite ?? null,
      instrumentUrl: curated.instrumentUrl ?? null,
      verifiedBy: null,
      verifiedAt: null,
      confidence: curated.confidence ?? 'Low',
    },
    lastReviewed: curated.lastReviewed ?? '2026-07',
  };
}

const SOVEREIGNS: BulkRow[] = [...AFRICA, ...ASIA_PACIFIC, ...MIDDLE_EAST, ...EUROPE, ...AMERICAS];

export const SEED_JURISDICTIONS: Jurisdiction[] = [
  ...SOVEREIGNS.map(([iso3, name, region]) => buildRow(iso3, name, region, 'sovereign')),
  ...TERRITORIES.map(([iso3, name, region]) => buildRow(iso3, name, region, 'territory')),
  ...UAE_PERIMETER_IDS.map(buildPerimeter),
];
