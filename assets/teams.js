// Snapshot of the public directories embedded by pcbl.com, retrieved 2026-10-09.
// Names/divisions are sourced; demo batting orders and GameDay games are not official records.
export const teamSources = {
  retrieved: '2026-10-09',
  la: 'https://www.htosports.com/teams/default.asp?u=PCBLLA&s=baseball&p=teams',
  majors: 'https://www.htosports.com/teams/default.asp?u=PCBLMAJORS&s=baseball&p=teams',
  league: 'https://www.pcbl.com/la-league',
  majorsPage: 'https://www.pcbl.com/majors-division'
};
const divisionRows = [
  ['AAA', 'Triple A Division', [
    ['berserkers', 'Berserkers', 'BERSERKERS', 'BK'],
    ['braves', 'Braves', 'PCBLLA-BRAVES', 'BR'],
    ['cerveceros', 'Cerveceros', 'PCBLL-BURBANKBREWERS', 'CV'],
    ['commanders', 'Commanders', 'PCBLLA-COMMANDERS', 'CM'],
    ['pirates', 'Pirates', 'PCBLLCPIRATES', 'PI'],
    ['the-bats', 'The Bats', 'PCBLLA-THEBEES', 'BT'],
    ['valencia-hops', 'Valencia Hops', 'PCBLLA-VALENCIAHOPS', 'VH'],
    ['valley-kings', 'Valley Kings', 'PCBLLA-VALLEYKINGS', 'VK']
  ]],
  ['AA', 'Double A Division', [
    ['barons', 'Barons', 'BARONS2', 'BA'],
    ['hellcats', 'Hellcats', 'PCBLLA-HELLCATS', 'HC'],
    ['jokers', 'Jokers', 'PCBLLA-JOKERS', 'JK'],
    ['mariachis', 'Mariachis', 'PCBLLA-MARIACHIS', 'MA'],
    ['smokies', 'Smokies', 'PCBLMUDHENS', 'SM']
  ]],
  ['A', 'Single A Division', [
    ['big-dawgs', 'Big Dawgs', 'PCBLLA-BIGDAWGS', 'BD'],
    ['doinks-and-dingers', 'Doinks and Dingers', 'PCB-DOINKSANDDINGERS', 'DD'],
    ['glendale-falcons', 'Glendale Falcons', 'PCBL-GLENDALEFALCONS', 'GF'],
    ['mariachis-a', 'Mariachis A', 'PCBLLA-MARIACHISA', 'MA'],
    ['rough-riders', 'Rough Riders', 'PCBLLA-ROUGHRIDERS', 'RR'],
    ['royals', 'Royals', 'PCBLROYALS', 'RY'],
    ['threshers', 'Threshers', 'PCBLLA-THRESHERS', 'TH'],
    ['soldiers', 'Soldiers', 'PCBLLA-SOLDIERS', 'SO']
  ]],
  ['Majors', 'Major Division · Wood Bat ONLY', [
    ['cba-tigers', 'CBA Tigers', 'PCBLCBATIGERS', 'CT'],
    ['drillers', 'Drillers', 'PCBLLA-DRILLERS', 'DR'],
    ['la-rats', 'LA Rats', 'PCBLLA-LARATS', 'LR'],
    ['maniacs', 'Maniacs', 'MANIACS', 'MN'],
    ['platoon', 'PLATOON', 'PCBLPLATOON2', 'PL'],
    ['raptors', 'Raptors', 'PCBLRAPTORS', 'RP']
  ]],
  ['Inactive', 'Inactive · Majors directory', [
    ['crooks', 'Crooks', 'PCBLLA-CROOKS', 'CR']
  ]]
];
export const divisions = divisionRows.map(([id, name]) => ({id, name}));
export const teams = divisionRows.flatMap(([division, divisionName, rows]) => rows.map(([id, name, sourceId, initials]) => ({
  id, name, initials, division, divisionName, sourceId,
  region: 'Los Angeles', active: division !== 'Inactive',
  source: ['Majors', 'Inactive'].includes(division) ? teamSources.majors : teamSources.la,
  url: `https://www.htosports.com/teams/?u=${sourceId}&p=home&s=baseball`
})));

// Retain stable IDs for existing saved demo games and team passwords; not new directory entries.
export const legacyTeams = [
  {id: 'la', name: 'Los Angeles (legacy demo)', initials: 'LA'},
  {id: 'oc', name: 'Orange County (legacy demo)', initials: 'OC'},
  {id: 'sd', name: 'San Diego (legacy demo)', initials: 'SD'},
  {id: 'ie', name: 'Inland Empire (legacy demo)', initials: 'IE'}
];
export const allTeams = [...teams, ...legacyTeams];
export const getTeam = id => allTeams.find(team => team.id === id);
export const mockRoster = id => Array.from({length: 9}, (_, i) => `${getTeam(id)?.initials || 'PC'} Demo Player ${i + 1}`);
