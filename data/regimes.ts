import type { Regime } from '@/lib/types';

/**
 * Regimes are first-class. Editing a regime's instrument fields cascades to
 * every member jurisdiction at read time — one write, thirty rows moved.
 *
 * URL policy: web egress was unavailable when this file was authored, so only
 * canonical, deterministic URLs are included (EUR-Lex ELI). Everything else is
 * null until a human verifies it. Never backfill a URL you have not opened.
 */
export const SEED_REGIMES: Regime[] = [
  {
    id: 'mica',
    name: 'EU / EEA — MiCA',
    leadBody: 'European Commission / ESMA / EBA',
    rationale:
      'One directly applicable regulation covers all 30 EEA states. National authorities license, but the rulebook is made in Brussels/Paris — an amendment to MiCA moves every member at once.',
    hubUrl: 'https://www.esma.europa.eu',
    instrument: 'Regulation (EU) 2023/1114 on markets in crypto-assets (MiCA)',
    instrumentUrl: 'https://eur-lex.europa.eu/eli/reg/2023/1114/oj',
  },
  {
    id: 'waemu',
    name: 'West African Economic & Monetary Union (WAEMU)',
    leadBody: 'BCEAO / AMF-UMOA',
    rationale:
      'Eight states share one central bank (BCEAO) and one markets authority. Any crypto framework will be issued at union level; no member can meaningfully diverge on payments or banking.',
    hubUrl: 'https://www.bceao.int',
    instrument: null,
    instrumentUrl: null,
  },
  {
    id: 'cemac',
    name: 'Central African Economic & Monetary Community (CEMAC)',
    leadBody: 'BEAC / COBAC',
    rationale:
      'Six states share the BEAC central bank and the COBAC banking supervisor, which has restricted credit-institution exposure to crypto-assets. Banking access is decided at union level.',
    hubUrl: 'https://www.beac.int',
    instrument: null,
    instrumentUrl: null,
  },
  {
    id: 'eccu',
    name: 'Eastern Caribbean Currency Union (ECCU)',
    leadBody: 'Eastern Caribbean Central Bank (ECCB)',
    rationale:
      'Members share the EC dollar and the ECCB. Virtual-asset business statutes have been enacted from a broadly harmonised model, and monetary/banking policy moves together.',
    hubUrl: 'https://www.eccb-centralbank.org',
    instrument: null,
    instrumentUrl: null,
  },
  {
    id: 'us-federal-state',
    name: 'United States — federal + state overlay',
    leadBody: 'SEC / CFTC / FinCEN / OCC + state regulators',
    rationale:
      'Federal securities, commodities, banking and AML law stacks on top of ~50 state money-transmitter and virtual-currency regimes. A federal change (e.g. the 2025 GENIUS Act for payment stablecoins) moves the whole perimeter; state licensing still applies underneath.',
    hubUrl: 'https://www.sec.gov',
    instrument:
      'Federal securities/commodities/BSA law; GENIUS Act (2025) for payment stablecoins; state money-transmitter statutes',
    instrumentUrl: null,
  },
  {
    id: 'uae',
    name: 'United Arab Emirates — stacked perimeters',
    leadBody: 'CBUAE / SCA / VARA / FSRA (ADGM) / DFSA (DIFC)',
    rationale:
      'One flag, five regulators whose perimeters stack rather than substitute: a VARA licence does not authorise payment-token services (CBUAE), and the two financial free zones (ADGM, DIFC) run their own rulebooks.',
    hubUrl: 'https://www.centralbank.ae',
    instrument: null,
    instrumentUrl: null,
  },
  {
    id: 'prc',
    name: "People's Republic of China — mainland restrictions",
    leadBody: "People's Bank of China / CAC",
    rationale:
      'The 2021 ten-agency notice declared virtual-currency business activities illegal on the mainland; Macao follows materially the same restrictive line. Hong Kong runs a separate, permissive regime and is modelled independently.',
    hubUrl: 'http://www.pbc.gov.cn',
    instrument: 'Joint notice on further preventing and dealing with risks of virtual-currency trading speculation (2021)',
    instrumentUrl: null,
  },
  {
    id: 'national',
    name: 'National (standalone)',
    leadBody: '—',
    rationale: 'Default regime: the jurisdiction legislates and supervises independently.',
    hubUrl: null,
    instrument: null,
    instrumentUrl: null,
  },
];
