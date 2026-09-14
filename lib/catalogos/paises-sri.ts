// lib/catalogos/paises-sri.ts
// Catálogo de países — Tabla 25 Ficha Técnica SRI v2.34
// Fuente: Catálogo Anexo Transaccional Simplificado (ATS)

export interface PaisSRI {
  codigo: string;
  nombre: string;
}

export const PAISES_SRI: PaisSRI[] = [
  // ── América ────────────────────────────────────────────────────────────────
  { codigo: "016", nombre: "AMERICAN SAMOA" },
  { codigo: "101", nombre: "ARGENTINA" },
  { codigo: "102", nombre: "BOLIVIA" },
  { codigo: "103", nombre: "BRASIL" },
  { codigo: "104", nombre: "CANADÁ" },
  { codigo: "105", nombre: "COLOMBIA" },
  { codigo: "106", nombre: "COSTA RICA" },
  { codigo: "107", nombre: "CUBA" },
  { codigo: "108", nombre: "CHILE" },
  { codigo: "109", nombre: "ANGUILA" },
  { codigo: "110", nombre: "ESTADOS UNIDOS" },
  { codigo: "111", nombre: "GUATEMALA" },
  { codigo: "112", nombre: "HAITÍ" },
  { codigo: "113", nombre: "HONDURAS" },
  { codigo: "114", nombre: "JAMAICA" },
  { codigo: "115", nombre: "MALVINAS ISLAS" },
  { codigo: "116", nombre: "MÉXICO" },
  { codigo: "117", nombre: "NICARAGUA" },
  { codigo: "118", nombre: "PANAMÁ" },
  { codigo: "119", nombre: "PARAGUAY" },
  { codigo: "120", nombre: "PERÚ" },
  { codigo: "121", nombre: "PUERTO RICO" },
  { codigo: "122", nombre: "REPÚBLICA DOMINICANA" },
  { codigo: "123", nombre: "EL SALVADOR" },
  { codigo: "124", nombre: "TRINIDAD Y TOBAGO" },
  { codigo: "125", nombre: "URUGUAY" },
  { codigo: "126", nombre: "VENEZUELA" },
  { codigo: "127", nombre: "CURAZAO" },
  { codigo: "129", nombre: "BAHAMAS" },
  { codigo: "130", nombre: "BARBADOS" },
  { codigo: "131", nombre: "GRANADA" },
  { codigo: "132", nombre: "GUYANA" },
  { codigo: "133", nombre: "SURINAM" },
  { codigo: "134", nombre: "ANTIGUA Y BARBUDA" },
  { codigo: "135", nombre: "BELICE" },
  { codigo: "136", nombre: "DOMINICA" },
  { codigo: "137", nombre: "SAN CRISTOBAL Y NEVIS" },
  { codigo: "138", nombre: "SANTA LUCÍA" },
  { codigo: "139", nombre: "SAN VICENTE Y LAS GRANAD." },
  { codigo: "140", nombre: "ANTILLAS HOLANDESAS" },
  { codigo: "141", nombre: "ARUBA" },
  { codigo: "142", nombre: "BERMUDA" },
  { codigo: "143", nombre: "GUADALUPE" },
  { codigo: "144", nombre: "GUYANA FRANCESA" },
  { codigo: "145", nombre: "ISLAS CAIMÁN" },
  { codigo: "146", nombre: "ISLAS VIRGENES (BRITANICAS)" },
  { codigo: "147", nombre: "JOHNSTON ISLA" },
  { codigo: "148", nombre: "MARTINICA" },
  { codigo: "149", nombre: "MONTSERRAT ISLA" },
  { codigo: "151", nombre: "TURCAS Y CAICOS ISLAS" },
  { codigo: "152", nombre: "VIRGENES, ISLAS (NORT.AMER.)" },
  { codigo: "593", nombre: "ECUADOR" },

  // ── Europa ─────────────────────────────────────────────────────────────────
  { codigo: "201", nombre: "ALBANIA" },
  { codigo: "202", nombre: "ALEMANIA" },
  { codigo: "203", nombre: "AUSTRIA" },
  { codigo: "204", nombre: "BÉLGICA" },
  { codigo: "205", nombre: "BULGARIA" },
  { codigo: "207", nombre: "ALBORAN Y PEREJIL" },
  { codigo: "208", nombre: "DINAMARCA" },
  { codigo: "209", nombre: "ESPAÑA" },
  { codigo: "211", nombre: "FRANCIA" },
  { codigo: "212", nombre: "FINLANDIA" },
  { codigo: "213", nombre: "REINO UNIDO" },
  { codigo: "214", nombre: "GRECIA" },
  { codigo: "215", nombre: "PAISES BAJOS (HOLANDA)" },
  { codigo: "216", nombre: "HUNGRÍA" },
  { codigo: "217", nombre: "IRLANDA" },
  { codigo: "218", nombre: "ISLANDIA" },
  { codigo: "219", nombre: "ITALIA" },
  { codigo: "220", nombre: "LUXEMBURGO" },
  { codigo: "221", nombre: "MALTA" },
  { codigo: "222", nombre: "NORUEGA" },
  { codigo: "223", nombre: "POLONIA" },
  { codigo: "224", nombre: "PORTUGAL" },
  { codigo: "225", nombre: "RUMANIA" },
  { codigo: "226", nombre: "SUECIA" },
  { codigo: "227", nombre: "SUIZA" },
  { codigo: "228", nombre: "CANARIAS ISLAS" },
  { codigo: "229", nombre: "UCRANIA" },
  { codigo: "230", nombre: "RUSIA" },
  { codigo: "231", nombre: "YUGOSLAVIA" },
  { codigo: "233", nombre: "ANDORRA" },
  { codigo: "234", nombre: "LIECHTENSTEIN" },
  { codigo: "235", nombre: "MÓNACO" },
  { codigo: "237", nombre: "SAN MARINO" },
  { codigo: "238", nombre: "VATICANO (SANTA SEDE)" },
  { codigo: "239", nombre: "GIBRALTAR" },
  { codigo: "241", nombre: "BELARUS" },
  { codigo: "242", nombre: "BOSNIA Y HERZEGOVINA" },
  { codigo: "243", nombre: "CROACIA" },
  { codigo: "244", nombre: "ESLOVENIA" },
  { codigo: "245", nombre: "ESTONIA" },
  { codigo: "246", nombre: "GEORGIA" },
  { codigo: "247", nombre: "GROENLANDIA" },
  { codigo: "248", nombre: "LETONIA" },
  { codigo: "249", nombre: "LITUANIA" },
  { codigo: "250", nombre: "MOLDOVA" },
  { codigo: "251", nombre: "MACEDONIA" },
  { codigo: "252", nombre: "ESLOVAQUIA" },
  { codigo: "253", nombre: "ISLAS FAROE" },
  { codigo: "260", nombre: "FRENCH SOUTHERN TERRITORIES" },
  { codigo: "382", nombre: "MONTENEGRO" },
  { codigo: "428", nombre: "ÅLAND ISLANDS" },
  { codigo: "499", nombre: "JERSEY" },
  { codigo: "599", nombre: "REPÚBLICA CHECA" },
  { codigo: "688", nombre: "SERBIA" },
  { codigo: "831", nombre: "GUERNSEY" },
  { codigo: "832", nombre: "JERSEY" },
  { codigo: "833", nombre: "ISLE OF MAN" },

  // ── Asia ───────────────────────────────────────────────────────────────────
  { codigo: "301", nombre: "AFGANISTAN" },
  { codigo: "302", nombre: "ARABIA SAUDITA" },
  { codigo: "303", nombre: "MYANMAR (BURMA)" },
  { codigo: "304", nombre: "CAMBOYA" },
  { codigo: "306", nombre: "COREA NORTE" },
  { codigo: "307", nombre: "TAIWAN (CHINA)" },
  { codigo: "308", nombre: "FILIPINAS" },
  { codigo: "309", nombre: "INDIA" },
  { codigo: "310", nombre: "INDONESIA" },
  { codigo: "311", nombre: "IRAK" },
  { codigo: "312", nombre: "IRÁN (REPÚBLICA ISLÁMICA)" },
  { codigo: "313", nombre: "ISRAEL" },
  { codigo: "314", nombre: "JAPÓN" },
  { codigo: "315", nombre: "JORDANIA" },
  { codigo: "316", nombre: "KUWAIT" },
  { codigo: "317", nombre: "LAOS, REP. POP. DEMOC." },
  { codigo: "318", nombre: "LIBANO" },
  { codigo: "319", nombre: "MALASIA" },
  { codigo: "321", nombre: "MONGOLIA (MANCHURIA)" },
  { codigo: "322", nombre: "PAKISTÁN" },
  { codigo: "323", nombre: "SIRIA" },
  { codigo: "325", nombre: "TAILANDIA" },
  { codigo: "327", nombre: "BAHREIN" },
  { codigo: "328", nombre: "BANGLADESH" },
  { codigo: "329", nombre: "BUTÁN" },
  { codigo: "330", nombre: "COREA DEL SUR" },
  { codigo: "331", nombre: "CHINA POPULAR" },
  { codigo: "332", nombre: "CHIPRE" },
  { codigo: "333", nombre: "EMIRATOS ARABES UNIDOS" },
  { codigo: "334", nombre: "QATAR" },
  { codigo: "335", nombre: "MALDIVAS" },
  { codigo: "336", nombre: "NEPAL" },
  { codigo: "337", nombre: "OMAN" },
  { codigo: "338", nombre: "SINGAPUR" },
  { codigo: "339", nombre: "SRI LANKA (CEILAN)" },
  { codigo: "341", nombre: "VIETNAM" },
  { codigo: "342", nombre: "YEMEN" },
  { codigo: "343", nombre: "ISLAS HEARD Y MCDONALD" },
  { codigo: "344", nombre: "BRUNEI DARUSSALAM" },
  { codigo: "346", nombre: "TURQUÍA" },
  { codigo: "347", nombre: "AZERBAIJÁN" },
  { codigo: "348", nombre: "KAZAJSTÁN" },
  { codigo: "349", nombre: "KIRGUIZISTÁN" },
  { codigo: "350", nombre: "TAJIKISTAN" },
  { codigo: "351", nombre: "TURKMENISTÁN" },
  { codigo: "352", nombre: "UZBEKISTÁN" },
  { codigo: "353", nombre: "PALESTINA" },
  { codigo: "354", nombre: "HONG KONG" },
  { codigo: "355", nombre: "MACAO" },
  { codigo: "356", nombre: "ARMENIA" },

  // ── África ─────────────────────────────────────────────────────────────────
  { codigo: "402", nombre: "BURKINA FASO" },
  { codigo: "403", nombre: "ARGELIA" },
  { codigo: "404", nombre: "BURUNDÍ" },
  { codigo: "405", nombre: "CAMERÚN" },
  { codigo: "406", nombre: "CONGO" },
  { codigo: "407", nombre: "ETIOPÍA" },
  { codigo: "408", nombre: "GAMBIA" },
  { codigo: "409", nombre: "GUINEA" },
  { codigo: "410", nombre: "LIBERIA" },
  { codigo: "412", nombre: "MADAGASCAR" },
  { codigo: "413", nombre: "MALAWI" },
  { codigo: "414", nombre: "MALÍ" },
  { codigo: "415", nombre: "MARRUECOS" },
  { codigo: "416", nombre: "MAURITANIA" },
  { codigo: "417", nombre: "NIGERIA" },
  { codigo: "419", nombre: "ZIMBABWE (RHODESIA)" },
  { codigo: "420", nombre: "SENEGAL" },
  { codigo: "421", nombre: "SUDÁN" },
  { codigo: "422", nombre: "SUDAFRICA (CISKEI)" },
  { codigo: "423", nombre: "SIERRA LEONA" },
  { codigo: "425", nombre: "TANZANIA" },
  { codigo: "426", nombre: "UGANDA" },
  { codigo: "427", nombre: "ZAMBIA" },
  { codigo: "429", nombre: "BENIN" },
  { codigo: "430", nombre: "BOTSWANA" },
  { codigo: "431", nombre: "REPUBLICA CENTROAFRICANA" },
  { codigo: "432", nombre: "COSTA DE MARFIL" },
  { codigo: "433", nombre: "CHAD" },
  { codigo: "434", nombre: "EGIPTO" },
  { codigo: "435", nombre: "GABON" },
  { codigo: "436", nombre: "GHANA" },
  { codigo: "437", nombre: "GUINEA-BISSAU" },
  { codigo: "438", nombre: "GUINEA ECUATORIAL" },
  { codigo: "439", nombre: "KENIA" },
  { codigo: "440", nombre: "LESOTHO" },
  { codigo: "441", nombre: "MAURICIO" },
  { codigo: "442", nombre: "MOZAMBIQUE" },
  { codigo: "443", nombre: "MAYOTTE" },
  { codigo: "444", nombre: "NIGER" },
  { codigo: "445", nombre: "RWANDA" },
  { codigo: "446", nombre: "SEYCHELLES" },
  { codigo: "447", nombre: "SAHARA OCCIDENTAL" },
  { codigo: "448", nombre: "SOMALIA" },
  { codigo: "449", nombre: "SANTO TOME Y PRINCIPE" },
  { codigo: "450", nombre: "SWAZILANDIA" },
  { codigo: "451", nombre: "TOGO" },
  { codigo: "452", nombre: "TUNEZ" },
  { codigo: "453", nombre: "ZAIRE" },
  { codigo: "454", nombre: "ANGOLA" },
  { codigo: "456", nombre: "CABO VERDE" },
  { codigo: "458", nombre: "COMORAS" },
  { codigo: "459", nombre: "DJIBOUTI" },
  { codigo: "460", nombre: "NAMIBIA" },
  { codigo: "463", nombre: "ERITREA" },
  { codigo: "464", nombre: "MOROCCO" },
  { codigo: "465", nombre: "REUNION" },
  { codigo: "466", nombre: "SANTA ELENA" },
  { codigo: "602", nombre: "LIBIA" },

  // ── Oceanía ────────────────────────────────────────────────────────────────
  { codigo: "501", nombre: "AUSTRALIA" },
  { codigo: "503", nombre: "NUEVA ZELANDA" },
  { codigo: "504", nombre: "SAMOA OCCIDENTAL" },
  { codigo: "506", nombre: "FIJI" },
  { codigo: "507", nombre: "PAPUA NUEVA GUINEA" },
  { codigo: "508", nombre: "TONGA" },
  { codigo: "509", nombre: "PALAO (BELAU) ISLAS" },
  { codigo: "510", nombre: "KIRIBATI" },
  { codigo: "511", nombre: "MARSHALL ISLAS" },
  { codigo: "512", nombre: "MICRONESIA" },
  { codigo: "513", nombre: "NAURU" },
  { codigo: "514", nombre: "SALOMON ISLAS" },
  { codigo: "515", nombre: "TUVALU" },
  { codigo: "516", nombre: "VANUATU" },
  { codigo: "517", nombre: "GUAM" },
  { codigo: "518", nombre: "ISLAS COCOS (KEELING)" },
  { codigo: "519", nombre: "ISLAS COOK" },
  { codigo: "520", nombre: "ISLAS NAVIDAD" },
  { codigo: "521", nombre: "MIDWAY ISLAS" },
  { codigo: "522", nombre: "NIUE ISLA" },
  { codigo: "523", nombre: "NORFOLK ISLA" },
  { codigo: "524", nombre: "NUEVA CALEDONIA" },
  { codigo: "525", nombre: "PITCAIRN, ISLA" },
  { codigo: "526", nombre: "POLINESIA FRANCESA" },
  { codigo: "529", nombre: "TIMOR DEL ESTE" },
  { codigo: "530", nombre: "TOKELAI" },
  { codigo: "531", nombre: "WAKE ISLA" },
  { codigo: "532", nombre: "WALLIS Y FUTUNA, ISLAS" },
  { codigo: "590", nombre: "SAINT BARTHELEMY" },
  { codigo: "603", nombre: "NORTHERN MARIANA ISL" },

  // ── Otros ──────────────────────────────────────────────────────────────────
  { codigo: "074", nombre: "BOUVET ISLAND" },
  { codigo: "594", nombre: "AGUAS INTERNACIONALES" },
  { codigo: "595", nombre: "ALTO VOLTA" },
  { codigo: "596", nombre: "BIELORRUSIA" },
  { codigo: "597", nombre: "COTE DÍVOIRE" },
  { codigo: "598", nombre: "CYPRUS" },
  { codigo: "600", nombre: "FALKLAND ISLANDS" },
  { codigo: "601", nombre: "LATVIA" },
  { codigo: "604", nombre: "ST. PIERRE AND MIQUE" },
  { codigo: "605", nombre: "SYRIAN ARAB REPUBLIC" },
  { codigo: "606", nombre: "TERRITORIO ANTÁRTICO BRITÁNICO" },
  { codigo: "607", nombre: "TERRITORIO BRITÁNICO OCÉANO IN" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Países más usados en pagos al exterior (para mostrar primero en selects) */
export const PAISES_FRECUENTES = [
  "217", // Irlanda (Meta, Google)
  "110", // Estados Unidos
  "209", // España
  "105", // Colombia
  "120", // Perú
  "108", // Chile
  "116", // México
  "103", // Brasil
  "101", // Argentina
  "104", // Canadá
  "213", // Reino Unido
  "202", // Alemania
  "211", // Francia
  "219", // Italia
  "331", // China
  "314", // Japón
  "330", // Corea del Sur
  "501", // Australia
];

/** Devuelve el país ordenado: frecuentes primero, luego alfabético */
export function getPaisesOrdenados(): PaisSRI[] {
  const frecSet = new Set(PAISES_FRECUENTES);
  const frecuentes = PAISES_FRECUENTES
    .map(cod => PAISES_SRI.find(p => p.codigo === cod))
    .filter(Boolean) as PaisSRI[];
  const resto = PAISES_SRI
    .filter(p => !frecSet.has(p.codigo))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return [...frecuentes, ...resto];
}

/** Busca un país por código */
export function getPaisPorCodigo(codigo: string): PaisSRI | undefined {
  return PAISES_SRI.find(p => p.codigo === codigo);
}

/** Busca países por nombre (búsqueda parcial, case-insensitive) */
export function buscarPaises(query: string): PaisSRI[] {
  const q = query.toUpperCase().trim();
  if (!q) return getPaisesOrdenados();
  return PAISES_SRI.filter(p =>
    p.nombre.includes(q) || p.codigo.includes(q)
  );
}