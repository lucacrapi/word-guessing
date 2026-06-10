// Words excluded from the noun vocabulary: country/city/state names, nationalities,
// personal names, and abbreviations that slipped through the WordNet noun filter.
export const COUNTRIES = [
  "afghanistan","albania","algeria","argentina","armenia","australia","austria","azerbaijan","bahamas","bahrain",
  "bangladesh","belarus","belgium","belize","benin","bhutan","bolivia","bosnia","botswana","brazil","brunei",
  "bulgaria","burundi","cambodia","cameroon","canada","chad","chile","china","colombia","comoros","croatia","cuba",
  "cyprus","denmark","djibouti","dominica","ecuador","egypt","eritrea","estonia","ethiopia","fiji","finland","france",
  "gabon","gambia","georgia","germany","ghana","greece","grenada","guatemala","guinea","guyana","haiti","honduras",
  "hungary","iceland","india","indonesia","iran","iraq","ireland","israel","italy","jamaica","japan","jordan",
  "kazakhstan","kenya","kiribati","korea","kuwait","laos","latvia","lebanon","lesotho","liberia","libya",
  "liechtenstein","lithuania","luxembourg","macedonia","madagascar","malawi","malaysia","maldives","mali","malta",
  "mauritania","mauritius","mexico","micronesia","moldova","monaco","mongolia","montenegro","morocco","mozambique",
  "myanmar","namibia","nauru","nepal","netherlands","nicaragua","niger","nigeria","norway","oman","pakistan","palau",
  "panama","paraguay","peru","philippines","poland","portugal","qatar","romania","russia","rwanda","samoa","senegal",
  "serbia","seychelles","singapore","slovakia","slovenia","somalia","spain","sudan","suriname","swaziland","sweden",
  "switzerland","syria","taiwan","tajikistan","tanzania","thailand","togo","tonga","tunisia","turkey","turkmenistan",
  "tuvalu","uganda","ukraine","uruguay","uzbekistan","vanuatu","venezuela","vietnam","yemen","zambia","zimbabwe",
];

export const US_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia",
  "hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
  "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","ohio","oklahoma","oregon",
  "pennsylvania","tennessee","texas","utah","vermont","virginia","washington","wisconsin","wyoming",
];

export const NATIONALITIES = [
  "afghan","albanian","algerian","american","argentine","armenian","australian","austrian","bangladeshi","belgian",
  "bolivian","brazilian","british","bulgarian","cambodian","canadian","chilean","chinese","colombian","croatian",
  "cuban","czech","danish","dutch","ecuadorian","egyptian","english","estonian","ethiopian","filipino","finnish",
  "french","german","ghanaian","greek","guatemalan","haitian","honduran","hungarian","icelandic","indian",
  "indonesian","iranian","iraqi","irish","israeli","italian","jamaican","japanese","jordanian","kazakh","kenyan",
  "korean","kuwaiti","lebanese","libyan","lithuanian","malaysian","mexican","moroccan","nepalese","nicaraguan",
  "nigerian","norwegian","pakistani","panamanian","peruvian","polish","portuguese","romanian","russian","saudi",
  "scottish","serbian","singaporean","slovak","somali","spanish","sudanese","swedish","swiss","syrian","taiwanese",
  "thai","tunisian","turkish","ukrainian","uruguayan","venezuelan","vietnamese","welsh","yemeni","zimbabwean",
];

export const CITIES = [
  "london","paris","berlin","madrid","rome","moscow","beijing","tokyo","sydney","melbourne","toronto","vancouver",
  "chicago","boston","seattle","denver","dallas","houston","phoenix","philadelphia","atlanta","miami","detroit",
  "minneapolis","portland","sacramento","brisbane","perth","auckland","dublin","edinburgh","glasgow","manchester",
  "liverpool","birmingham","bristol","leeds","brighton","oxford","cambridge","amsterdam","vienna","prague","warsaw",
  "budapest","athens","lisbon","zurich","geneva","oslo","stockholm","helsinki","copenhagen","barcelona","milan",
  "naples","venice","florence","munich","hamburg","frankfurt","cologne","lima","bogota","santiago","caracas",
  "montreal","ottawa","calgary","edmonton","winnipeg","brooklyn","manhattan","queens","bronx","harlem","hollywood",
  "vegas","orlando","tampa","worcester","petersburg","jakarta","manila","bangkok","hanoi","seoul","shanghai",
  "mumbai","delhi","karachi","lahore","dhaka","riyadh","dubai","doha","istanbul","ankara","cairo","lagos","nairobi",
  "accra","johannesburg","aberdeen",
];

export const GIVEN_NAMES = [
  "aaron","adam","alan","albert","alexander","andrew","anthony","arthur","austin","benjamin","bobby","bradley",
  "brandon","brian","bruce","bryan","carl","charles","christian","christopher","daniel","dennis","derek","donald",
  "douglas","dylan","edward","eric","eugene","ethan","frank","gabriel","gary","gerald","gregory","harold","henry",
  "jacob","jason","jeffrey","jeremy","jerry","jesse","joe","johnny","jonathan","jordan","jose","joshua","juan",
  "justin","keith","kenneth","kevin","kyle","larry","lawrence","leonard","louis","mark","matthew","melvin","nathan",
  "nicholas","patrick","paul","peter","philip","randy","raymond","richard","robert","roger","ronald","roy",
  "russell","ryan","samuel","scott","sean","stephen","steven","terry","timothy","tyler","vincent","walter","wayne",
  "willie","zachary",
  "amanda","amber","andrea","angela","ashley","barbara","betty","beverly","brenda","brittany","carol","carolyn",
  "catherine","cheryl","christina","christine","cynthia","danielle","deborah","debra","denise","diana","diane",
  "donna","dorothy","doris","elizabeth","emily","frances","gloria","hannah","heather","helen","jacqueline","janet",
  "janice","jean","jennifer","jessica","joan","joyce","judith","judy","julia","julie","karen","katherine",
  "kathleen","kathryn","kelly","kimberly","laura","lauren","linda","lisa","lori","maria","marie","marilyn","martha",
  "megan","melissa","michelle","nancy","natalie","nicole","pamela","patricia","rachel","rebecca","samantha",
  "sandra","sara","sarah","sharon","shirley","stephanie","susan","teresa","theresa","victoria","virginia",
];

export const ABBREVIATIONS = [
  "aaa","abc","acc","mba","phd","phi","inc","fed","feb","mar","jan","oct","nov","dec","medline","pic","dvd","faq",
  "gps","html","http","usb","atm","ceo","cfo","cpu","diy","fbi","gdp","hiv","ibm","nba","nfl","nhl","pdf","sms",
  "url","vip","cia","nasa","mhz","ghz","faqs",
];

export const BLOCKLIST = new Set([
  ...COUNTRIES,
  ...US_STATES,
  ...NATIONALITIES,
  ...CITIES,
  ...GIVEN_NAMES,
  ...ABBREVIATIONS,
]);
