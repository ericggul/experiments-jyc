// Material compositions by mass. Shares are normalised per material at use, so
// each list only needs to be right relative to itself. Formulas are written in
// plain ASCII (`formula.ts` sets subscripts, charges and coefficients):
// `(C6H10O5)n` polymer repeat unit, `CaSO4·2H2O` hydrate, `Ca^2+` ion,
// `Y3Al5O12:Ce` dopant. Polymers and minerals use their repeat unit or ideal
// end-member; mixtures without one formula (bitumen, lignin, protein, humus)
// are represented by named, typical constituent molecules.

export type Constituent = readonly [formula: string, share: number];

export type Material = {
  name: string;
  constituents: readonly Constituent[];
};

// Repeated fragments of larger mixtures.
const CELLULOSE = "(C6H10O5)n";
const HEMICELLULOSE = "(C5H8O4)n"; // xylan
const LIGNIN_G = "C10H12O3"; // coniferyl alcohol unit
const LIGNIN_S = "C11H14O4"; // sinapyl alcohol unit
const LIGNIN_H = "C9H10O2"; // p-coumaryl alcohol unit
const STARCH = "(C6H10O5)n";
const TRIOLEIN = "C57H104O6";
const TRIPALMITIN = "C51H98O6";
const HYDROXYAPATITE = "Ca10(PO4)6(OH)2";
const GLYCINE = "C2H5NO2";
const PROLINE = "C5H9NO2";
const HYDROXYPROLINE = "C5H9NO3";
const CYSTEINE = "C3H7NO2S";
const GLUTAMATE = "C5H9NO4";
const SERINE = "C3H7NO3";
const ALANINE = "C3H7NO2";
const LEUCINE = "C6H13NO2";
const ARGININE = "C6H14N4O2";
const CHLOROPHYLL_A = "C55H72O5N4Mg";
const CHLOROPHYLL_B = "C55H70O6N4Mg";
const CAROTENE = "C40H56";
const GLUCOSE = "C6H12O6";
const FRUCTOSE = "C6H12O6";
const SUCROSE = "C12H22O11";
const SODA_LIME = [["SiO2", 72], ["Na2O", 14], ["CaO", 9], ["MgO", 4], ["Al2O3", 1]] as const;
const ALUMINOSILICATE_GLASS = [["SiO2", 61], ["Al2O3", 18], ["Na2O", 13], ["MgO", 4], ["K2O", 3], ["B2O3", 1]] as const;
const PCB = [["Cu", 30], ["C21H24O4", 25], ["SiO2", 30], ["Sn", 4], ["Ag", 0.2], ["Au", 0.03], ["Pb", 0.1], ["Si", 1]] as const;
const LI_ION = [["LiCoO2", 30], ["C", 18], ["Cu", 10], ["Al", 8], ["C3H4O3", 9], ["C4H8O3", 6], ["LiPF6", 2], ["(C3H6)n", 4]] as const;
const ABS = [["(C8H8)n", 60], ["(C3H3N)n", 25], ["(C4H6)n", 15]] as const;
const PAINT = [["TiO2", 22], ["CaCO3", 16], ["(C5H8O2)n", 14], ["(C7H12O2)n", 10], ["Al2Si2O5(OH)4", 6], ["H2O", 2]] as const;

function mix(...parts: ReadonlyArray<readonly [readonly Constituent[], number]>): Constituent[] {
  const total = new Map<string, number>();
  for (const [constituents, weight] of parts) {
    const sum = constituents.reduce((value, [, share]) => value + share, 0);
    for (const [formula, share] of constituents) {
      total.set(formula, (total.get(formula) ?? 0) + (share / sum) * weight);
    }
  }
  return [...total.entries()];
}

const air: Constituent[] = [
  ["N2", 75.5], ["O2", 23.1], ["Ar", 1.29], ["H2O", 0.5], ["CO2", 0.062],
  ["Ne", 0.0013], ["Kr", 0.0003], ["CH4", 0.0001], ["He", 0.00007],
];
const freshwater: Constituent[] = [
  ["H2O", 99.96], ["HCO3^-", 0.012], ["Ca^2+", 0.004], ["SiO2", 0.0013], ["SO4^2-", 0.001],
  ["Mg^2+", 0.0012], ["Cl^-", 0.0008], ["Na^+", 0.0006], ["O2", 0.0009], ["NO3^-", 0.0002],
];
const leaf: Constituent[] = [
  ["H2O", 75], [CELLULOSE, 7], [HEMICELLULOSE, 4], [LIGNIN_G, 1.4], [LIGNIN_S, 0.6],
  [GLUTAMATE, 1.2], [ALANINE, 0.9], [GLYCINE, 0.8], [LEUCINE, 0.8], [ARGININE, 0.6],
  [SUCROSE, 1.5], [GLUCOSE, 0.8], [STARCH, 1.2], [TRIOLEIN, 0.5], ["C18H30O2", 0.6],
  [CHLOROPHYLL_A, 0.22], [CHLOROPHYLL_B, 0.08], [CAROTENE, 0.02], ["C40H56O2", 0.03],
  ["K^+", 0.6], ["Ca^2+", 0.4], ["Mg^2+", 0.08], ["NO3^-", 0.2], ["H2PO4^-", 0.1],
];
const wood: Constituent[] = [
  [CELLULOSE, 42], [HEMICELLULOSE, 22], [LIGNIN_G, 14], [LIGNIN_S, 8], [LIGNIN_H, 1.5],
  ["H2O", 10], ["C20H30O2", 1], ["C15H14O6", 0.6], ["Ca^2+", 0.2], ["K^+", 0.1],
];
const human: Constituent[] = [
  ["H2O", 61], [GLYCINE, 3.5], [PROLINE, 2], [HYDROXYPROLINE, 1.6], [GLUTAMATE, 2.2],
  [LEUCINE, 1.6], [ALANINE, 1.6], ["C6H14N2O2", 1.2], [ARGININE, 1], [SERINE, 0.8],
  [TRIOLEIN, 8], [TRIPALMITIN, 5], ["C27H46O", 0.3], ["C42H82NO8P", 1],
  [HYDROXYAPATITE, 5.5], ["(C6H10O5)n", 0.6], [GLUCOSE, 0.1],
  ["K^+", 0.25], ["Na^+", 0.15], ["Cl^-", 0.15], ["Mg^2+", 0.05], ["Fe", 0.006],
  ["C34H32FeN4O4", 0.2], ["(C18H10N2O4)n", 0.01], ["C10H14N5O7P", 0.2],
];
const cotton: Constituent[] = [[CELLULOSE, 90], ["H2O", 7], ["C30H62", 0.6], [HEMICELLULOSE, 1], ["K^+", 0.4], ["(C6H8O6)n", 1]];
const polyester: Constituent[] = [["(C10H8O4)n", 98.5], ["Sb2O3", 0.03], ["TiO2", 0.3], ["H2O", 0.4]];
const nylon: Constituent[] = [["(C12H22N2O2)n", 96], ["H2O", 3.5], ["TiO2", 0.3]];
const wool: Constituent[] = [
  [CYSTEINE, 11], [GLUTAMATE, 14], [SERINE, 9], [ARGININE, 9], [LEUCINE, 8], [GLYCINE, 6],
  [PROLINE, 6], ["C4H9NO3", 6], ["C4H7NO4", 6], ["H2O", 15], ["C27H46O", 1],
];
const silk: Constituent[] = [[GLYCINE, 40], [ALANINE, 27], [SERINE, 11], ["C9H11NO3", 5], ["C4H7NO4", 2], ["H2O", 10], [GLUTAMATE, 2]];
const leather: Constituent[] = [
  [GLYCINE, 18], [PROLINE, 11], [HYDROXYPROLINE, 10], [ALANINE, 7], [GLUTAMATE, 7], [ARGININE, 6],
  ["H2O", 14], ["Cr2O3", 4], ["C18H34O2", 6], ["SO4^2-", 2],
];
const paper: Constituent[] = [[CELLULOSE, 72], [HEMICELLULOSE, 10], ["CaCO3", 9], ["Al2Si2O5(OH)4", 4], [STARCH, 1.5], ["H2O", 5], [LIGNIN_G, 0.5]];
const cardboard: Constituent[] = [[CELLULOSE, 60], [HEMICELLULOSE, 14], [LIGNIN_G, 11], [STARCH, 5], ["H2O", 8], ["CaCO3", 2]];
const plaster: Constituent[] = mix([[["CaSO4·2H2O", 88], [CELLULOSE, 8], ["SiO2", 2], ["H2O", 2]], 82], [PAINT, 18]);
const concrete: Constituent[] = [
  ["SiO2", 42], ["CaCO3", 24], ["3CaO·2SiO2·3H2O", 13], ["Ca(OH)2", 5], ["KAlSi3O8", 5],
  ["H2O", 4], ["Ca2SiO4", 2], ["Ca3Al2O6", 1], ["Ca6Al2(SO4)3(OH)12·26H2O", 1.5], ["Fe2O3", 1.2], ["NaAlSi3O8", 2],
];
const asphalt: Constituent[] = [
  ["SiO2", 44], ["CaCO3", 26], ["KAlSi3O8", 10], ["NaAlSi3O8", 8], ["Fe2O3", 1.5], ["CaMg(CO3)2", 4],
  ["C25H52", 2], ["C30H62", 1.4], ["C16H10", 0.8], ["C14H10", 0.6], ["C20H12", 0.3], ["C12H8S", 1.2],
];
const brick: Constituent[] = [["SiO2", 52], ["Al6Si2O13", 24], ["Fe2O3", 6], ["CaO", 4], ["KAlSi3O8", 8], ["MgO", 2], ["TiO2", 1], ["Na2O", 1]];
const glass: Constituent[] = [...SODA_LIME];
const steel: Constituent[] = [["Fe", 98.4], ["Mn", 0.8], ["C", 0.2], ["Si", 0.25], ["Cu", 0.2], ["Fe2O3", 0.1], ["P", 0.02], ["S", 0.02]];
const stainless: Constituent[] = [["Fe", 70.5], ["Cr", 18.2], ["Ni", 8.2], ["Mn", 1.6], ["Si", 0.6], ["Cr2O3", 0.002], ["C", 0.05], ["N", 0.06]];
const galvanised: Constituent[] = [["Fe", 93], ["Zn", 5.5], ["ZnO", 0.3], ["Zn5(CO3)2(OH)6", 0.3], ["Mn", 0.7], ["C", 0.15]];
const aluminium: Constituent[] = [["Al", 97.6], ["Mg", 1], ["Si", 0.6], ["Fe", 0.4], ["Cu", 0.25], ["Cr", 0.15], ["Al2O3", 0.02]];
const castIron: Constituent[] = [["Fe", 93.5], ["C", 3.4], ["Si", 2.2], ["Mn", 0.6], ["Fe3C", 0.6], ["P", 0.1], ["Fe2O3", 0.05]];
const brass: Constituent[] = [["Cu", 63], ["Zn", 36.5], ["Pb", 0.3], ["Cu2O", 0.05]];
const chrome: Constituent[] = mix([brass, 92], [[["Ni", 7], ["Cr", 1]], 8]);
const bronze: Constituent[] = [["Cu", 88], ["Sn", 10], ["Zn", 1], ["Cu2(OH)2CO3", 0.6], ["Cu2O", 0.3], ["Pb", 0.2]];
const ceramic: Constituent[] = [["SiO2", 48], ["Al6Si2O13", 28], ["KAlSi3O8", 12], ["ZrSiO4", 5], ["CaO", 3], ["Fe2O3", 0.5], ["MgO", 1], ["ZnO", 1]];
const granite: Constituent[] = [
  ["SiO2", 28], ["KAlSi3O8", 30], ["NaAlSi3O8", 24], ["CaAl2Si2O8", 6],
  ["K(Mg,Fe)3AlSi3O10(OH)2", 7], ["KAl2(AlSi3O10)(OH)2", 4], ["Fe3O4", 0.8],
];
const marble: Constituent[] = [["CaCO3", 96], ["CaMg(CO3)2", 2.5], ["SiO2", 1], ["Fe2O3", 0.2], ["Al2O3", 0.3]];
const limestone: Constituent[] = [["CaCO3", 90], ["CaMg(CO3)2", 4], ["SiO2", 4], ["Al2Si2O5(OH)4", 1.5], ["Fe2O3", 0.5]];
const sandstone: Constituent[] = [["SiO2", 82], ["KAlSi3O8", 7], ["Al2Si2O5(OH)4", 5], ["CaCO3", 3], ["Fe2O3", 2]];
const soil: Constituent[] = [
  ["SiO2", 40], ["Al2Si2O5(OH)4", 14], ["KAlSi3O8", 10], ["NaAlSi3O8", 5], ["H2O", 20],
  ["C187H186O89N9S", 4], ["FeO(OH)", 2], ["Fe2O3", 1.5], ["CaCO3", 2], ["NO3^-", 0.01], ["NH4^+", 0.005],
];
const sand: Constituent[] = [["SiO2", 88], ["KAlSi3O8", 5], ["CaCO3", 4], ["NaAlSi3O8", 2], ["Fe2O3", 0.6], ["FeTiO3", 0.2], ["ZrSiO4", 0.05]];
const ice: Constituent[] = [["H2O", 99.99], ["NaCl", 0.002], ["CaCO3", 0.001], ["N2", 0.002], ["O2", 0.001]];
const polyethylene: Constituent[] = [["(C2H4)n", 99], ["CaCO3", 0.5], ["TiO2", 0.3]];
const polypropylene: Constituent[] = [["(C3H6)n", 97.5], ["CaCO3", 1.5], ["TiO2", 0.5], ["C42H63O3P", 0.1]];
const pet: Constituent[] = [["(C10H8O4)n", 99.7], ["Sb2O3", 0.03], ["C2H4O", 0.0005]];
const pvc: Constituent[] = [["(C2H3Cl)n", 60], ["C24H38O4", 22], ["CaCO3", 14], ["TiO2", 2], ["Ca(C18H35O2)2", 1]];
const acrylic: Constituent[] = [["(C5H8O2)n", 99.5], ["C5H8O2", 0.3]];
const polycarbonate: Constituent[] = [["(C16H14O3)n", 99.6], ["C15H16O2", 0.01]];
const silicone: Constituent[] = [["(C2H6OSi)n", 70], ["SiO2", 28], ["C2H6O", 0.5]];
const rubber: Constituent[] = [["(C5H8)n", 62], ["C", 25], ["ZnO", 3], ["S", 2], ["C18H36O2", 2], ["SiO2", 4], ["C18H24N2", 1]];
const tyre: Constituent[] = [["(C8H8)n", 12], ["(C4H6)n", 30], ["(C5H8)n", 12], ["C", 24], ["SiO2", 10], ["Fe", 8], ["ZnO", 1.5], ["S", 1.5], ["C18H36O2", 1]];
const polyurethaneFoam: Constituent[] = [["(C3H6O)n", 62], ["C9H6N2O2", 30], ["C15H10N2O2", 3], ["H2O", 2], ["C9H18Cl3O4P", 2]];
const linoleum: Constituent[] = [["C57H92O6", 35], ["C20H30O2", 8], [CELLULOSE, 30], ["CaCO3", 18], ["TiO2", 4], [LIGNIN_G, 5]];
const humanHair: Constituent[] = [
  [CYSTEINE, 17], [GLUTAMATE, 13], [SERINE, 10], [ARGININE, 8], [LEUCINE, 7], ["C4H9NO3", 7],
  [GLYCINE, 5], [PROLINE, 7], ["H2O", 12], ["(C18H10N2O4)n", 2], ["C18H34O2", 2],
];
const mammal: Constituent[] = mix([human, 88], [wool, 12]);
const bird: Constituent[] = mix([human, 82], [[[CYSTEINE, 9], [SERINE, 14], [GLYCINE, 12], [PROLINE, 10], [GLUTAMATE, 8]], 18]);
const bread: Constituent[] = [[STARCH, 45], ["H2O", 36], ["C5H10N2O3", 4], [PROLINE, 2.5], [GLUTAMATE, 1.5], [SUCROSE, 3], [TRIOLEIN, 3], ["NaCl", 1.2], [CELLULOSE, 2.5], ["C2H6O", 0.2]];
const apple: Constituent[] = [["H2O", 86], [FRUCTOSE, 6], [SUCROSE, 2.1], [GLUCOSE, 2.4], [CELLULOSE, 1.2], ["(C6H8O6)n", 0.8], ["C4H6O5", 0.5], ["K^+", 0.1], ["C15H14O6", 0.1], ["C6H8O6", 0.005]];
const banana: Constituent[] = [["H2O", 75], [STARCH, 5], [SUCROSE, 2.4], [GLUCOSE, 5], [FRUCTOSE, 4.9], [CELLULOSE, 2.6], ["K^+", 0.36], ["C10H12N2O", 0.001], ["C4H6O5", 0.4]];
const orange: Constituent[] = [["H2O", 87], [SUCROSE, 4.2], [GLUCOSE, 2.2], [FRUCTOSE, 2.4], ["C6H8O7", 1], [CELLULOSE, 2.4], ["C6H8O6", 0.05], ["C10H16", 0.1], ["K^+", 0.18], ["C40H56O2", 0.001]];
const vegetable: Constituent[] = [["H2O", 89], [GLUCOSE, 2], [SUCROSE, 2], [CELLULOSE, 2.6], [GLUTAMATE, 1], [ALANINE, 0.6], [CAROTENE, 0.008], [CHLOROPHYLL_A, 0.05], ["K^+", 0.3], ["C6H8O6", 0.09]];
const carrot: Constituent[] = [["H2O", 88], [SUCROSE, 3.6], [GLUCOSE, 0.6], [CELLULOSE, 2.8], [CAROTENE, 0.008], ["K^+", 0.32], [GLUTAMATE, 0.5], ["C40H56", 0.002]];
const meat: Constituent[] = [["H2O", 60], [GLUTAMATE, 3.2], [LEUCINE, 1.7], ["C6H14N2O2", 1.8], [ALANINE, 1.2], [GLYCINE, 1], [TRIOLEIN, 12], [TRIPALMITIN, 9], ["C34H32FeN4O4", 0.5], ["NaCl", 1.6], ["NaNO2", 0.01], ["C27H46O", 0.07]];
const pastry: Constituent[] = [[STARCH, 32], [SUCROSE, 28], [TRIOLEIN, 10], [TRIPALMITIN, 8], ["H2O", 18], [GLUTAMATE, 1.5], ["C5H10N2O3", 1.5], ["NaHCO3", 0.5], ["C8H8O3", 0.05]];
const pizza: Constituent[] = mix([bread, 55], [[["H2O", 50], [GLUTAMATE, 5], [PROLINE, 3], [TRIPALMITIN, 12], [TRIOLEIN, 10], ["Ca3(PO4)2", 1.5], ["NaCl", 1.6], ["C3H6O3", 0.3]], 30], [[["H2O", 91], [GLUCOSE, 2.5], [FRUCTOSE, 2.5], ["C40H56", 0.01], ["C6H8O7", 0.4]], 15]);
const flower: Constituent[] = [["H2O", 85], [CELLULOSE, 5], [HEMICELLULOSE, 2], [SUCROSE, 3], [GLUCOSE, 1.5], ["C15H11O6^+", 0.3], ["C40H56O2", 0.05], ["C10H18O", 0.02], [CHLOROPHYLL_A, 0.05], ["K^+", 0.3]];
const grass: Constituent[] = mix([leaf, 90], [[["H2O", 80], [CELLULOSE, 12], [HEMICELLULOSE, 6], ["SiO2", 2]], 10]);
const pine: Constituent[] = mix([leaf, 70], [[["C20H30O2", 60], ["C10H16", 40]], 3], [wood, 27]);
const seawater: Constituent[] = [
  ["H2O", 96.5], ["Cl^-", 1.94], ["Na^+", 1.08], ["SO4^2-", 0.27], ["Mg^2+", 0.13],
  ["Ca^2+", 0.041], ["K^+", 0.04], ["HCO3^-", 0.014], ["Br^-", 0.0067], ["Sr^2+", 0.0008], ["B(OH)3", 0.0026], ["F^-", 0.00013],
];
const poolWater: Constituent[] = [["H2O", 99.93], ["HOCl", 0.0002], ["OCl^-", 0.0001], ["Ca^2+", 0.02], ["Cl^-", 0.03], ["Na^+", 0.015], ["C3N3O3H3", 0.004]];
const mdf: Constituent[] = mix([wood, 88], [[["CH4N2O", 50], ["CH2O", 30], ["C30H62", 20]], 9], [[["H2O", 1]], 3]);
const laminate: Constituent[] = mix([mdf, 80], [[["C3H6N6", 50], ["CH2O", 30], ["Al2O3", 20]], 8], [paper, 12]);
const quartzStone: Constituent[] = [["SiO2", 90], ["(C8H8)n", 3], ["C4H2O3", 3], ["TiO2", 1], ["C3H8O2", 3]];
const carpet: Constituent[] = mix([nylon, 55], [[["CaCO3", 70], ["(C8H8)n", 12], ["(C4H6)n", 18]], 35], [polypropylene, 10]);
const cork: Constituent[] = [["C18H34O3", 25], ["C22H42O4", 12], ["C3H8O3", 5], [LIGNIN_G, 20], [CELLULOSE, 9], [HEMICELLULOSE, 9], ["C30H50O", 6], ["H2O", 6], ["C27H46O", 2]];
const fibreglass: Constituent[] = [["SiO2", 32], ["CaO", 13], ["Al2O3", 9], ["B2O3", 4], ["MgO", 2], ["C8H4O3", 13], ["C3H8O2", 12], ["(C8H8)n", 12], ["C3H8O2", 3]];
const cfrp: Constituent[] = [["C", 62], ["C21H24O4", 28], ["C13H14N2", 8], ["SiO2", 2]];
const copper: Constituent[] = [["Cu", 99.9], ["Cu2O", 0.05], ["Cu2(OH)2CO3", 0.02], ["O", 0.02]];
const paintedSteel: Constituent[] = mix([steel, 90], [[["(C21H24O4)n", 30], ["(C3H6N6)n", 18], ["TiO2", 20], ["Zn3(PO4)2", 12], ["(C5H8O2)n", 20]], 10]);
const polystyrene: Constituent[] = [["(C8H8)n", 98], ["C8H8", 0.05], ["TiO2", 1]];
const solarGlass: Constituent[] = mix([glass, 70], [aluminium, 15], [[["Si", 70], ["(C4H6O2)n", 20], ["Ag", 1.5], ["Cu", 6], ["Sn", 2.5]], 15]);

export const materials = {
  air: { name: "air", constituents: air },
  cloud: { name: "cloud", constituents: [["N2", 75.2], ["O2", 23], ["Ar", 1.28], ["H2O", 0.95], ["CO2", 0.062]] },
  smog: { name: "hazy air", constituents: [...air, ["SO4^2-", 0.00001], ["NO2", 0.000004], ["O3", 0.000006], ["C", 0.000003], ["NH4NO3", 0.00001]] },
  freshwater: { name: "fresh water", constituents: freshwater },
  seawater: { name: "sea water", constituents: seawater },
  poolWater: { name: "chlorinated water", constituents: poolWater },
  ice: { name: "ice", constituents: ice },
  snow: { name: "snow", constituents: [["H2O", 99.98], ["NaCl", 0.001], ["SO4^2-", 0.0005], ["C", 0.0002], ["NO3^-", 0.0003]] },
  leaf: { name: "leaves", constituents: leaf },
  grass: { name: "grass", constituents: grass },
  pine: { name: "conifer", constituents: pine },
  wood: { name: "wood", constituents: wood },
  bark: { name: "bark", constituents: [[CELLULOSE, 22], [HEMICELLULOSE, 14], [LIGNIN_G, 24], [LIGNIN_S, 8], ["C15H14O6", 12], ["C18H34O3", 6], ["H2O", 12], ["CaC2O4", 2]] },
  paintedWood: { name: "painted wood", constituents: mix([wood, 85], [PAINT, 15]) },
  mdf: { name: "fibreboard", constituents: mdf },
  laminate: { name: "laminate", constituents: laminate },
  bamboo: { name: "bamboo and rattan", constituents: [[CELLULOSE, 46], [HEMICELLULOSE, 20], [LIGNIN_G, 14], [LIGNIN_S, 9], ["SiO2", 2], ["H2O", 9]] },
  cork: { name: "cork", constituents: cork },
  flower: { name: "petals", constituents: flower },
  soil: { name: "soil", constituents: soil },
  sand: { name: "sand", constituents: sand },
  gravel: { name: "gravel", constituents: mix([granite, 50], [limestone, 50]) },
  granite: { name: "granite", constituents: granite },
  marble: { name: "marble", constituents: marble },
  limestone: { name: "limestone", constituents: limestone },
  sandstone: { name: "sandstone", constituents: sandstone },
  basalt: { name: "basalt", constituents: [["CaAl2Si2O8", 36], ["(Mg,Fe)2SiO4", 10], ["Ca(Mg,Fe)Si2O6", 30], ["NaAlSi3O8", 12], ["Fe3O4", 5], ["SiO2", 7]] },
  slate: { name: "slate", constituents: [["SiO2", 40], ["KAl2(AlSi3O10)(OH)2", 32], ["(Mg,Fe)5Al(AlSi3O10)(OH)8", 15], ["Fe2O3", 5], ["NaAlSi3O8", 6], ["C", 2]] },
  concrete: { name: "concrete", constituents: concrete },
  paintedConcrete: { name: "painted concrete", constituents: mix([concrete, 88], [PAINT, 12]) },
  asphalt: { name: "asphalt", constituents: asphalt },
  brick: { name: "brick", constituents: brick },
  stucco: { name: "stucco", constituents: mix([concrete, 70], [[["Ca(OH)2", 40], ["CaCO3", 60]], 15], [PAINT, 15]) },
  plaster: { name: "painted plasterboard", constituents: plaster },
  ceilingTile: { name: "mineral-fibre tile", constituents: [["SiO2", 40], ["CaO", 22], ["MgO", 8], ["Al2O3", 10], [STARCH, 6], [CELLULOSE, 5], ["CaCO3", 6], ["TiO2", 3]] },
  wallpaper: { name: "wallpaper", constituents: mix([paper, 55], [pvc, 35], [PAINT, 10]) },
  tile: { name: "ceramic tile", constituents: ceramic },
  porcelain: { name: "vitreous china", constituents: ceramic },
  terracotta: { name: "terracotta", constituents: brick },
  glass: { name: "soda-lime glass", constituents: glass },
  toughGlass: { name: "aluminosilicate glass", constituents: [...ALUMINOSILICATE_GLASS] },
  leadCrystal: { name: "crystal glass", constituents: [["SiO2", 58], ["K2O", 12], ["BaO", 10], ["ZnO", 6], ["Na2O", 6], ["CaO", 5], ["TiO2", 3]] },
  glassCeramic: { name: "glass-ceramic", constituents: [["SiO2", 65], ["Al2O3", 22], ["Li2O", 4], ["TiO2", 2.5], ["ZrO2", 2], ["MgO", 1], ["ZnO", 1.5], ["LiAlSi2O6", 2]] },
  mirror: { name: "mirror", constituents: mix([glass, 96], [[["Ag", 70], ["Cu", 15], ["(C21H24O4)n", 15]], 4]) },
  steel: { name: "steel", constituents: steel },
  paintedSteel: { name: "painted steel", constituents: paintedSteel },
  stainless: { name: "stainless steel", constituents: stainless },
  galvanised: { name: "galvanised steel", constituents: galvanised },
  rust: { name: "rusted iron", constituents: [["Fe", 70], ["FeO(OH)", 15], ["Fe2O3·H2O", 10], ["Fe3O4", 5]] },
  castIron: { name: "cast iron", constituents: castIron },
  aluminium: { name: "aluminium", constituents: aluminium },
  anodised: { name: "anodised aluminium", constituents: mix([aluminium, 96], [[["Al2O3", 85], ["C16H10N2O2", 5], ["NiF2", 5], ["H2O", 5]], 4]) },
  copper: { name: "copper", constituents: copper },
  brass: { name: "brass", constituents: brass },
  bronze: { name: "bronze", constituents: bronze },
  chrome: { name: "chrome-plated brass", constituents: chrome },
  gold: { name: "gold", constituents: [["Au", 75], ["Ag", 12.5], ["Cu", 12.5]] },
  polyethylene: { name: "polyethylene", constituents: polyethylene },
  polypropylene: { name: "polypropylene", constituents: polypropylene },
  pet: { name: "PET", constituents: pet },
  pvc: { name: "PVC", constituents: pvc },
  abs: { name: "ABS plastic", constituents: [...ABS, ["TiO2", 1.5], ["C", 0.5]] },
  polystyrene: { name: "polystyrene", constituents: polystyrene },
  acrylic: { name: "acrylic", constituents: acrylic },
  polycarbonate: { name: "polycarbonate", constituents: polycarbonate },
  nylonSolid: { name: "nylon", constituents: [["(C6H11NO)n", 97], ["H2O", 2.5], ["C", 0.3]] },
  melamine: { name: "melamine", constituents: [["(C3H6N6)n", 52], ["CH2O", 25], [CELLULOSE, 23]] },
  silicone: { name: "silicone", constituents: silicone },
  rubber: { name: "rubber", constituents: rubber },
  tyre: { name: "tyre rubber", constituents: tyre },
  foam: { name: "polyurethane foam", constituents: polyurethaneFoam },
  linoleum: { name: "linoleum", constituents: linoleum },
  vinylFloor: { name: "vinyl flooring", constituents: pvc },
  cotton: { name: "cotton", constituents: cotton },
  denim: { name: "denim", constituents: [...cotton, ["C16H10N2O2", 1.5]] },
  linen: { name: "linen", constituents: [[CELLULOSE, 72], [HEMICELLULOSE, 16], [LIGNIN_G, 2.5], ["(C6H8O6)n", 3], ["H2O", 8]] },
  polyester: { name: "polyester", constituents: polyester },
  nylon: { name: "nylon fabric", constituents: nylon },
  wool: { name: "wool", constituents: wool },
  silk: { name: "silk", constituents: silk },
  leather: { name: "leather", constituents: leather },
  syntheticLeather: { name: "synthetic leather", constituents: mix([[["(C3H6O)n", 70], ["C9H6N2O2", 30]], 45], [polyester, 55]) },
  plush: { name: "polyester plush", constituents: mix([polyester, 85], [[["(C2H4)n", 1]], 15]) },
  upholstery: { name: "upholstered foam", constituents: mix([polyester, 40], [polyurethaneFoam, 45], [wood, 15]) },
  carpet: { name: "carpet", constituents: carpet },
  woolRug: { name: "wool rug", constituents: mix([wool, 75], [cotton, 25]) },
  paper: { name: "paper", constituents: paper },
  printedPaper: { name: "printed paper", constituents: mix([paper, 96], [[["C", 30], ["C32H16CuN8", 15], ["C32H26Cl2N6O4", 15], ["C57H92O6", 40]], 4]) },
  cardboard: { name: "cardboard", constituents: cardboard },
  canvasPainting: { name: "oil on canvas", constituents: [["C57H92O6", 26], ["TiO2", 18], ["ZnO", 6], ["Fe2O3", 5], ["Na7Al6Si6O24S3", 3], ["C32H16CuN8", 2], ["CdS", 1], [CELLULOSE, 32], ["C10H16", 1]] },
  human: { name: "human body", constituents: human },
  hair: { name: "hair", constituents: humanHair },
  mammal: { name: "mammal", constituents: mammal },
  bird: { name: "bird", constituents: bird },
  bread: { name: "bread", constituents: bread },
  pastry: { name: "pastry", constituents: pastry },
  pizza: { name: "pizza", constituents: pizza },
  meat: { name: "meat", constituents: meat },
  apple: { name: "apple", constituents: apple },
  banana: { name: "banana", constituents: banana },
  orange: { name: "orange", constituents: orange },
  vegetable: { name: "green vegetable", constituents: vegetable },
  carrot: { name: "carrot", constituents: carrot },
  rice: { name: "cooked rice", constituents: [["H2O", 68], [STARCH, 28], [GLUTAMATE, 0.7], [ARGININE, 0.3], [TRIOLEIN, 0.3], [CELLULOSE, 0.4]] },
  coffee: { name: "coffee", constituents: [["H2O", 98.6], ["C8H10N4O2", 0.06], ["C16H18O9", 0.08], ["C7H7NO2", 0.03], [SUCROSE, 0.3], ["K^+", 0.1]] },
  milk: { name: "milk", constituents: [["H2O", 87.5], ["C12H22O11", 4.8], [TRIPALMITIN, 1.8], [TRIOLEIN, 1.6], [GLUTAMATE, 0.7], [PROLINE, 0.4], [LEUCINE, 0.3], ["Ca3(PO4)2", 0.3], ["K^+", 0.15]] },
  smartphone: {
    name: "smartphone",
    constituents: mix([[...ALUMINOSILICATE_GLASS], 30], [aluminium, 22], [[...LI_ION], 25], [[...PCB], 10], [stainless, 6],
      [[["Si", 50], ["In2O3", 2], ["SnO2", 0.3], ["Nd2Fe14B", 15], ["(C16H14O3)n", 30], ["Ta", 1], ["Ga", 0.5], ["Co", 1]], 7]),
  },
  laptop: {
    name: "laptop",
    constituents: mix([aluminium, 30], [[...ALUMINOSILICATE_GLASS], 10], [[...LI_ION], 22], [[...PCB], 16], [[...ABS], 12],
      [[["C18H19N", 20], ["In2O3", 2], ["(C2H4O)n", 40], ["I2", 3], ["Si", 15], ["Nd2Fe14B", 20]], 10]),
  },
  display: {
    name: "liquid-crystal display",
    constituents: mix([glass, 36], [steel, 18], [aluminium, 6], [[...ABS], 18], [[...PCB], 12],
      [[["C18H19N", 10], ["C20H23N", 6], ["(C2H4O)n", 30], ["I2", 3], ["(C10H8O4)n", 30], ["In2O3", 1], ["Y3Al5O12:Ce", 2], ["GaN", 1], ["C21H24O4", 17]], 10]),
  },
  crt: { name: "cathode-ray tube", constituents: [["SiO2", 52], ["PbO", 20], ["BaO", 8], ["SrO", 8], ["K2O", 6], ["Fe", 4], ["ZnS:Ag", 0.3], ["Y2O2S:Eu", 0.3], ["ZnS:Cu", 0.3], ["Cu", 1.1]] },
  computer: { name: "computer", constituents: mix([steel, 45], [aluminium, 10], [[...PCB], 22], [[...ABS], 15], [copper, 8]) },
  keyboard: { name: "keyboard", constituents: mix([[...ABS], 45], [[["(C12H12O4)n", 1]], 20], [steel, 15], [[...PCB], 10], [silicone, 10]) },
  smallElectronics: { name: "plastic electronics", constituents: mix([[...ABS], 60], [[...PCB], 18], [[["Zn", 20], ["MnO2", 40], ["KOH", 8], ["C", 8], ["Fe", 24]], 15], [copper, 7]) },
  appliance: { name: "white goods", constituents: mix([paintedSteel, 55], [polystyrene, 12], [polyurethaneFoam, 10], [copper, 6], [aluminium, 5], [glass, 6], [[["C4H10", 0.6], ["C2H2F4", 0.4]], 1], [[...PCB], 5]) },
  stainlessAppliance: { name: "stainless appliance", constituents: mix([stainless, 55], [steel, 15], [polystyrene, 8], [copper, 6], [glass, 8], [[...PCB], 6], [[["C4H10", 1]], 2]) },
  lamp: { name: "lamp", constituents: mix([glass, 30], [aluminium, 30], [copper, 10], [polycarbonate, 18], [[...PCB], 8], [[["GaN", 40], ["InGaN", 20], ["Y3Al5O12:Ce", 30], ["Al2O3", 10]], 4]) },
  ledSign: { name: "illuminated sign", constituents: mix([aluminium, 40], [acrylic, 30], [pvc, 15], [[...PCB], 10], [[["GaN", 40], ["InGaN", 20], ["Y3Al5O12:Ce", 40]], 5]) },
  car: {
    name: "car",
    constituents: mix([paintedSteel, 52], [aluminium, 10], [polypropylene, 7], [polyurethaneFoam, 4], [[...ABS], 3], [glass, 3], [tyre, 6],
      [copper, 1.6], [[["Pb", 50], ["PbO2", 25], ["H2SO4", 25]], 1.2], [[["C8H18", 60], ["C7H8", 20], ["C2H6O2", 20]], 4], [castIron, 5], [nylon, 1.2], [polyester, 1]),
  },
  bicycle: { name: "bicycle", constituents: mix([aluminium, 50], [steel, 25], [tyre, 15], [rubber, 3], [[["C18H38", 1]], 2], [polypropylene, 5]) },
  boat: { name: "fibreglass hull", constituents: mix([fibreglass, 75], [stainless, 8], [wood, 7], [PAINT, 6], [polyurethaneFoam, 4]) },
  ship: { name: "ship", constituents: mix([paintedSteel, 85], [[["Cu2O", 40], ["(C21H24O4)n", 60]], 3], [aluminium, 5], [[["C20H42", 1]], 7]) },
  airplane: { name: "airframe", constituents: mix([[["Al", 93], ["Cu", 4.4], ["Mg", 1.5], ["Mn", 0.6], ["Zn", 0.3]], 55], [cfrp, 25], [[["Ti", 90], ["Al", 6], ["V", 4]], 8], [steel, 7], [[["C12H26", 1]], 5]) },
  solarPanel: { name: "solar panel", constituents: solarGlass },
  sportsSurface: { name: "synthetic turf", constituents: mix([polyethylene, 50], [tyre, 25], [sand, 25]) },
  quartzStone: { name: "engineered quartz", constituents: quartzStone },
  fibreglass: { name: "fibreglass", constituents: fibreglass },
  cfrp: { name: "carbon fibre", constituents: cfrp },
  soot: { name: "soot and brick", constituents: mix([brick, 80], [[["C", 85], ["C16H10", 5], ["C20H12", 2], ["SO4^2-", 8]], 20]) },
  dirt: { name: "trodden earth", constituents: mix([soil, 70], [sand, 30]) },
  mud: { name: "mud", constituents: mix([soil, 55], [freshwater, 45]) },
  crop: { name: "crop field", constituents: mix([soil, 55], [grass, 45]) },
} satisfies Record<string, Material>;

export type MaterialId = keyof typeof materials;

/** Constituents with shares that sum to one, most abundant first. */
export function normalisedConstituents(material: Material) {
  const sum = material.constituents.reduce((value, [, share]) => value + share, 0);
  return material.constituents
    .map(([formula, share]) => [formula, share / sum] as const)
    .sort((a, b) => b[1] - a[1]);
}
