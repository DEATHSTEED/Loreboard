/** LOREBOARD - register bundled fonts with Foundry */
function registerLoreboardFonts() {
  if (typeof CONFIG === 'undefined' || !CONFIG.fontDefinitions) return;
  const base = 'modules/loreboard-deluxe/fonts/';
  CONFIG.fontDefinitions['LB Alien'] = { editor: true, fonts: [{ urls: [base + 'Alien-vRx4.ttf'] }] };
  CONFIG.fontDefinitions['Anglo-Saxon Runes'] = { editor: true, fonts: [{ urls: [base + 'AnglosaxonRunes-VGne.ttf'] }] };
  CONFIG.fontDefinitions['Cirnaja Bookhand'] = { editor: true, fonts: [{ urls: [base + 'CirnajaBookhand-rgWy.ttf'] }] };
  CONFIG.fontDefinitions['Csenge'] = { editor: true, fonts: [{ urls: [base + 'Csenge-XGoa.ttf'] }] };
  CONFIG.fontDefinitions['Drachenklaue'] = { editor: true, fonts: [{ urls: [base + 'LswDrachenklaueRegular-olYV.ttf'] }] };
  CONFIG.fontDefinitions['Mage Script'] = { editor: true, fonts: [{ urls: [base + 'MageScriptBold-2BKW.ttf'] }] };
  CONFIG.fontDefinitions['Maximal Text'] = { editor: true, fonts: [{ urls: [base + 'MaximalText-q3Y6.ttf'] }] };
  CONFIG.fontDefinitions['Mk Runes Light'] = { editor: true, fonts: [{ urls: [base + 'MkrunesLight-WozY.ttf'] }] };
  CONFIG.fontDefinitions['Modern Cybertronic'] = { editor: true, fonts: [{ urls: [base + 'ModernCybertronic-ge8P.ttf'] }] };
  CONFIG.fontDefinitions['Modern Runes'] = { editor: true, fonts: [{ urls: [base + 'Modernrunes-KJ3A.ttf'] }] };
  CONFIG.fontDefinitions['Ophidean Runes'] = { editor: true, fonts: [{ urls: [base + 'OphideanRunes-1naL.ttf'] }] };
  CONFIG.fontDefinitions['Runar'] = { editor: true, fonts: [{ urls: [base + 'Runar-AR7m.ttf'] }] };
  CONFIG.fontDefinitions['SGA Smooth'] = { editor: true, fonts: [{ urls: [base + 'SgaSmoothRegular-DO0Y3.ttf'] }] };
  CONFIG.fontDefinitions['Tengwar Optime'] = { editor: true, fonts: [{ urls: [base + 'Tengwaroptime-glYP.ttf'] }] };
  CONFIG.fontDefinitions['Wyverns Soul'] = { editor: true, fonts: [{ urls: [base + 'WyvernsSoulSocietyMedium-GnKD.ttf'] }] };
}
window.registerLoreboardFonts = registerLoreboardFonts;