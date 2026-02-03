// World Flags Data for Flag Champs Game
// 195 UN member states with ISO alpha-2 codes, flag URLs, and fun facts

export interface Country {
  id: string;          // ISO 3166-1 alpha-2 code
  name: string;        // Country name (English)
  flagUrl: string;     // Flag image URL (flagcdn.com)
  fact: string;        // Hint fact about the country
}

// XP Constants
export const FC_XP_CORRECT = 5;    // Full XP for correct without hint
export const FC_XP_HINT = 3;       // Reduced XP when hint was used
export const FC_XP_WRONG = 1;      // Participation XP for wrong answer

export const TOTAL_COUNTRIES = 195;

// Flag CDN base URL (free, CC licensed)
const FLAG_CDN = 'https://flagcdn.com/w320';

export const COUNTRIES: Country[] = [
  // A
  { id: 'AF', name: 'Afghanistan', flagUrl: `${FLAG_CDN}/af.png`, fact: 'Known for the Hindu Kush mountains' },
  { id: 'AL', name: 'Albania', flagUrl: `${FLAG_CDN}/al.png`, fact: 'Has a double-headed eagle on its flag' },
  { id: 'DZ', name: 'Algeria', flagUrl: `${FLAG_CDN}/dz.png`, fact: 'Largest country in Africa' },
  { id: 'AD', name: 'Andorra', flagUrl: `${FLAG_CDN}/ad.png`, fact: 'Tiny nation between France and Spain' },
  { id: 'AO', name: 'Angola', flagUrl: `${FLAG_CDN}/ao.png`, fact: 'Major oil producer in Africa' },
  { id: 'AG', name: 'Antigua and Barbuda', flagUrl: `${FLAG_CDN}/ag.png`, fact: 'Caribbean twin-island nation' },
  { id: 'AR', name: 'Argentina', flagUrl: `${FLAG_CDN}/ar.png`, fact: 'Home of tango and football legends' },
  { id: 'AM', name: 'Armenia', flagUrl: `${FLAG_CDN}/am.png`, fact: 'First country to adopt Christianity officially' },
  { id: 'AU', name: 'Australia', flagUrl: `${FLAG_CDN}/au.png`, fact: 'Home to kangaroos and the Great Barrier Reef' },
  { id: 'AT', name: 'Austria', flagUrl: `${FLAG_CDN}/at.png`, fact: 'Birthplace of Mozart' },
  { id: 'AZ', name: 'Azerbaijan', flagUrl: `${FLAG_CDN}/az.png`, fact: 'Known as the Land of Fire' },
  
  // B
  { id: 'BS', name: 'Bahamas', flagUrl: `${FLAG_CDN}/bs.png`, fact: 'Famous for crystal-clear waters' },
  { id: 'BH', name: 'Bahrain', flagUrl: `${FLAG_CDN}/bh.png`, fact: 'Island nation in the Persian Gulf' },
  { id: 'BD', name: 'Bangladesh', flagUrl: `${FLAG_CDN}/bd.png`, fact: 'Known for the Sundarbans mangrove forest' },
  { id: 'BB', name: 'Barbados', flagUrl: `${FLAG_CDN}/bb.png`, fact: 'Birthplace of Rihanna' },
  { id: 'BY', name: 'Belarus', flagUrl: `${FLAG_CDN}/by.png`, fact: 'Last dictatorship in Europe' },
  { id: 'BE', name: 'Belgium', flagUrl: `${FLAG_CDN}/be.png`, fact: 'Famous for chocolate and waffles' },
  { id: 'BZ', name: 'Belize', flagUrl: `${FLAG_CDN}/bz.png`, fact: 'Has the only jaguar preserve in the world' },
  { id: 'BJ', name: 'Benin', flagUrl: `${FLAG_CDN}/bj.png`, fact: 'Birthplace of Voodoo religion' },
  { id: 'BT', name: 'Bhutan', flagUrl: `${FLAG_CDN}/bt.png`, fact: 'Measures Gross National Happiness' },
  { id: 'BO', name: 'Bolivia', flagUrl: `${FLAG_CDN}/bo.png`, fact: 'Has the highest capital city in the world' },
  { id: 'BA', name: 'Bosnia and Herzegovina', flagUrl: `${FLAG_CDN}/ba.png`, fact: 'Famous for medieval bridges' },
  { id: 'BW', name: 'Botswana', flagUrl: `${FLAG_CDN}/bw.png`, fact: 'Home to the Okavango Delta' },
  { id: 'BR', name: 'Brazil', flagUrl: `${FLAG_CDN}/br.png`, fact: 'Known for the Amazon rainforest and Carnival' },
  { id: 'BN', name: 'Brunei', flagUrl: `${FLAG_CDN}/bn.png`, fact: 'One of the richest countries per capita' },
  { id: 'BG', name: 'Bulgaria', flagUrl: `${FLAG_CDN}/bg.png`, fact: 'Invented the Cyrillic alphabet' },
  { id: 'BF', name: 'Burkina Faso', flagUrl: `${FLAG_CDN}/bf.png`, fact: 'Name means Land of Honest People' },
  { id: 'BI', name: 'Burundi', flagUrl: `${FLAG_CDN}/bi.png`, fact: 'One of the smallest African countries' },
  
  // C
  { id: 'CV', name: 'Cabo Verde', flagUrl: `${FLAG_CDN}/cv.png`, fact: 'Atlantic island nation near Africa' },
  { id: 'KH', name: 'Cambodia', flagUrl: `${FLAG_CDN}/kh.png`, fact: 'Home to Angkor Wat temples' },
  { id: 'CM', name: 'Cameroon', flagUrl: `${FLAG_CDN}/cm.png`, fact: 'Known as Africa in miniature' },
  { id: 'CA', name: 'Canada', flagUrl: `${FLAG_CDN}/ca.png`, fact: 'Second largest country by area' },
  { id: 'CF', name: 'Central African Republic', flagUrl: `${FLAG_CDN}/cf.png`, fact: 'Covered by tropical rainforests' },
  { id: 'TD', name: 'Chad', flagUrl: `${FLAG_CDN}/td.png`, fact: 'Named after Lake Chad' },
  { id: 'CL', name: 'Chile', flagUrl: `${FLAG_CDN}/cl.png`, fact: 'Longest country from north to south' },
  { id: 'CN', name: 'China', flagUrl: `${FLAG_CDN}/cn.png`, fact: 'Most populous country with the Great Wall' },
  { id: 'CO', name: 'Colombia', flagUrl: `${FLAG_CDN}/co.png`, fact: 'Top producer of emeralds' },
  { id: 'KM', name: 'Comoros', flagUrl: `${FLAG_CDN}/km.png`, fact: 'Island nation between Africa and Madagascar' },
  { id: 'CG', name: 'Congo', flagUrl: `${FLAG_CDN}/cg.png`, fact: 'Known for its rainforests' },
  { id: 'CD', name: 'Democratic Republic of the Congo', flagUrl: `${FLAG_CDN}/cd.png`, fact: 'Has the Congo River' },
  { id: 'CR', name: 'Costa Rica', flagUrl: `${FLAG_CDN}/cr.png`, fact: 'No military since 1948' },
  { id: 'CI', name: 'Ivory Coast', flagUrl: `${FLAG_CDN}/ci.png`, fact: 'World largest cocoa producer' },
  { id: 'HR', name: 'Croatia', flagUrl: `${FLAG_CDN}/hr.png`, fact: 'Invented the necktie' },
  { id: 'CU', name: 'Cuba', flagUrl: `${FLAG_CDN}/cu.png`, fact: 'Famous for classic cars and cigars' },
  { id: 'CY', name: 'Cyprus', flagUrl: `${FLAG_CDN}/cy.png`, fact: 'Birthplace of Aphrodite' },
  { id: 'CZ', name: 'Czechia', flagUrl: `${FLAG_CDN}/cz.png`, fact: 'Known for beer and castles' },
  
  // D
  { id: 'DK', name: 'Denmark', flagUrl: `${FLAG_CDN}/dk.png`, fact: 'Has the oldest flag in continuous use' },
  { id: 'DJ', name: 'Djibouti', flagUrl: `${FLAG_CDN}/dj.png`, fact: 'Strategic location at the Red Sea' },
  { id: 'DM', name: 'Dominica', flagUrl: `${FLAG_CDN}/dm.png`, fact: 'Nature island of the Caribbean' },
  { id: 'DO', name: 'Dominican Republic', flagUrl: `${FLAG_CDN}/do.png`, fact: 'Shares island with Haiti' },
  
  // E
  { id: 'EC', name: 'Ecuador', flagUrl: `${FLAG_CDN}/ec.png`, fact: 'Named after the equator' },
  { id: 'EG', name: 'Egypt', flagUrl: `${FLAG_CDN}/eg.png`, fact: 'Home of the pyramids and pharaohs' },
  { id: 'SV', name: 'El Salvador', flagUrl: `${FLAG_CDN}/sv.png`, fact: 'Smallest Central American country' },
  { id: 'GQ', name: 'Equatorial Guinea', flagUrl: `${FLAG_CDN}/gq.png`, fact: 'Only African country with Spanish as official language' },
  { id: 'ER', name: 'Eritrea', flagUrl: `${FLAG_CDN}/er.png`, fact: 'On the Red Sea coast' },
  { id: 'EE', name: 'Estonia', flagUrl: `${FLAG_CDN}/ee.png`, fact: 'Pioneer in digital governance' },
  { id: 'SZ', name: 'Eswatini', flagUrl: `${FLAG_CDN}/sz.png`, fact: 'Last absolute monarchy in Africa' },
  { id: 'ET', name: 'Ethiopia', flagUrl: `${FLAG_CDN}/et.png`, fact: 'Never colonized by Europeans' },
  
  // F
  { id: 'FJ', name: 'Fiji', flagUrl: `${FLAG_CDN}/fj.png`, fact: 'Most developed Pacific island nation' },
  { id: 'FI', name: 'Finland', flagUrl: `${FLAG_CDN}/fi.png`, fact: 'Home of Santa Claus' },
  { id: 'FR', name: 'France', flagUrl: `${FLAG_CDN}/fr.png`, fact: 'Most visited country in the world' },
  
  // G
  { id: 'GA', name: 'Gabon', flagUrl: `${FLAG_CDN}/ga.png`, fact: '80% covered by rainforest' },
  { id: 'GM', name: 'Gambia', flagUrl: `${FLAG_CDN}/gm.png`, fact: 'Smallest country in mainland Africa' },
  { id: 'GE', name: 'Georgia', flagUrl: `${FLAG_CDN}/ge.png`, fact: 'Birthplace of wine' },
  { id: 'DE', name: 'Germany', flagUrl: `${FLAG_CDN}/de.png`, fact: 'Home of the Autobahn' },
  { id: 'GH', name: 'Ghana', flagUrl: `${FLAG_CDN}/gh.png`, fact: 'First African country to gain independence' },
  { id: 'GR', name: 'Greece', flagUrl: `${FLAG_CDN}/gr.png`, fact: 'Birthplace of democracy' },
  { id: 'GD', name: 'Grenada', flagUrl: `${FLAG_CDN}/gd.png`, fact: 'Spice island of the Caribbean' },
  { id: 'GT', name: 'Guatemala', flagUrl: `${FLAG_CDN}/gt.png`, fact: 'Heart of the Mayan world' },
  { id: 'GN', name: 'Guinea', flagUrl: `${FLAG_CDN}/gn.png`, fact: 'Major bauxite producer' },
  { id: 'GW', name: 'Guinea-Bissau', flagUrl: `${FLAG_CDN}/gw.png`, fact: 'Known for cashew nuts' },
  { id: 'GY', name: 'Guyana', flagUrl: `${FLAG_CDN}/gy.png`, fact: 'Only English-speaking South American country' },
  
  // H
  { id: 'HT', name: 'Haiti', flagUrl: `${FLAG_CDN}/ht.png`, fact: 'First Black republic in the world' },
  { id: 'HN', name: 'Honduras', flagUrl: `${FLAG_CDN}/hn.png`, fact: 'Rich in Mayan ruins' },
  { id: 'HU', name: 'Hungary', flagUrl: `${FLAG_CDN}/hu.png`, fact: 'Famous for thermal baths' },
  
  // I
  { id: 'IS', name: 'Iceland', flagUrl: `${FLAG_CDN}/is.png`, fact: 'Land of fire and ice' },
  { id: 'IN', name: 'India', flagUrl: `${FLAG_CDN}/in.png`, fact: 'Home of the Taj Mahal' },
  { id: 'ID', name: 'Indonesia', flagUrl: `${FLAG_CDN}/id.png`, fact: 'Largest archipelago in the world' },
  { id: 'IR', name: 'Iran', flagUrl: `${FLAG_CDN}/ir.png`, fact: 'Ancient Persian Empire' },
  { id: 'IQ', name: 'Iraq', flagUrl: `${FLAG_CDN}/iq.png`, fact: 'Cradle of civilization' },
  { id: 'IE', name: 'Ireland', flagUrl: `${FLAG_CDN}/ie.png`, fact: 'Known for shamrocks and St. Patrick' },
  { id: 'IL', name: 'Israel', flagUrl: `${FLAG_CDN}/il.png`, fact: 'Home of the Dead Sea' },
  { id: 'IT', name: 'Italy', flagUrl: `${FLAG_CDN}/it.png`, fact: 'Home of pizza and the Colosseum' },
  
  // J
  { id: 'JM', name: 'Jamaica', flagUrl: `${FLAG_CDN}/jm.png`, fact: 'Birthplace of reggae music' },
  { id: 'JP', name: 'Japan', flagUrl: `${FLAG_CDN}/jp.png`, fact: 'Land of the rising sun' },
  { id: 'JO', name: 'Jordan', flagUrl: `${FLAG_CDN}/jo.png`, fact: 'Home of the ancient city of Petra' },
  
  // K
  { id: 'KZ', name: 'Kazakhstan', flagUrl: `${FLAG_CDN}/kz.png`, fact: 'Largest landlocked country' },
  { id: 'KE', name: 'Kenya', flagUrl: `${FLAG_CDN}/ke.png`, fact: 'Famous for wildlife safaris' },
  { id: 'KI', name: 'Kiribati', flagUrl: `${FLAG_CDN}/ki.png`, fact: 'Only country in all four hemispheres' },
  { id: 'KP', name: 'North Korea', flagUrl: `${FLAG_CDN}/kp.png`, fact: 'Most isolated country' },
  { id: 'KR', name: 'South Korea', flagUrl: `${FLAG_CDN}/kr.png`, fact: 'Known for K-pop and technology' },
  { id: 'KW', name: 'Kuwait', flagUrl: `${FLAG_CDN}/kw.png`, fact: 'One of the richest countries' },
  { id: 'KG', name: 'Kyrgyzstan', flagUrl: `${FLAG_CDN}/kg.png`, fact: 'Land of celestial mountains' },
  
  // L
  { id: 'LA', name: 'Laos', flagUrl: `${FLAG_CDN}/la.png`, fact: 'Only landlocked Southeast Asian country' },
  { id: 'LV', name: 'Latvia', flagUrl: `${FLAG_CDN}/lv.png`, fact: 'Known for Art Nouveau architecture' },
  { id: 'LB', name: 'Lebanon', flagUrl: `${FLAG_CDN}/lb.png`, fact: 'Known for cedar trees' },
  { id: 'LS', name: 'Lesotho', flagUrl: `${FLAG_CDN}/ls.png`, fact: 'Entirely surrounded by South Africa' },
  { id: 'LR', name: 'Liberia', flagUrl: `${FLAG_CDN}/lr.png`, fact: 'Founded by freed American slaves' },
  { id: 'LY', name: 'Libya', flagUrl: `${FLAG_CDN}/ly.png`, fact: 'Mostly Sahara Desert' },
  { id: 'LI', name: 'Liechtenstein', flagUrl: `${FLAG_CDN}/li.png`, fact: 'Doubly landlocked microstate' },
  { id: 'LT', name: 'Lithuania', flagUrl: `${FLAG_CDN}/lt.png`, fact: 'Has a basketball obsession' },
  { id: 'LU', name: 'Luxembourg', flagUrl: `${FLAG_CDN}/lu.png`, fact: 'Richest country per capita in EU' },
  
  // M
  { id: 'MG', name: 'Madagascar', flagUrl: `${FLAG_CDN}/mg.png`, fact: 'Home to unique lemurs' },
  { id: 'MW', name: 'Malawi', flagUrl: `${FLAG_CDN}/mw.png`, fact: 'Called the Warm Heart of Africa' },
  { id: 'MY', name: 'Malaysia', flagUrl: `${FLAG_CDN}/my.png`, fact: 'Has the Petronas Twin Towers' },
  { id: 'MV', name: 'Maldives', flagUrl: `${FLAG_CDN}/mv.png`, fact: 'Lowest country in the world' },
  { id: 'ML', name: 'Mali', flagUrl: `${FLAG_CDN}/ml.png`, fact: 'Home of Timbuktu' },
  { id: 'MT', name: 'Malta', flagUrl: `${FLAG_CDN}/mt.png`, fact: 'Smallest EU member country' },
  { id: 'MH', name: 'Marshall Islands', flagUrl: `${FLAG_CDN}/mh.png`, fact: 'Pacific island nation' },
  { id: 'MR', name: 'Mauritania', flagUrl: `${FLAG_CDN}/mr.png`, fact: 'Mostly Sahara Desert' },
  { id: 'MU', name: 'Mauritius', flagUrl: `${FLAG_CDN}/mu.png`, fact: 'Home of the extinct dodo bird' },
  { id: 'MX', name: 'Mexico', flagUrl: `${FLAG_CDN}/mx.png`, fact: 'Gave the world chocolate' },
  { id: 'FM', name: 'Micronesia', flagUrl: `${FLAG_CDN}/fm.png`, fact: 'Scattered Pacific islands' },
  { id: 'MD', name: 'Moldova', flagUrl: `${FLAG_CDN}/md.png`, fact: 'Famous for wine cellars' },
  { id: 'MC', name: 'Monaco', flagUrl: `${FLAG_CDN}/mc.png`, fact: 'Second smallest country' },
  { id: 'MN', name: 'Mongolia', flagUrl: `${FLAG_CDN}/mn.png`, fact: 'Land of Genghis Khan' },
  { id: 'ME', name: 'Montenegro', flagUrl: `${FLAG_CDN}/me.png`, fact: 'Name means Black Mountain' },
  { id: 'MA', name: 'Morocco', flagUrl: `${FLAG_CDN}/ma.png`, fact: 'Gateway to Africa' },
  { id: 'MZ', name: 'Mozambique', flagUrl: `${FLAG_CDN}/mz.png`, fact: 'Only country with an AK-47 on its flag' },
  { id: 'MM', name: 'Myanmar', flagUrl: `${FLAG_CDN}/mm.png`, fact: 'Has thousands of Buddhist temples' },
  
  // N
  { id: 'NA', name: 'Namibia', flagUrl: `${FLAG_CDN}/na.png`, fact: 'Has the oldest desert in the world' },
  { id: 'NR', name: 'Nauru', flagUrl: `${FLAG_CDN}/nr.png`, fact: 'Third smallest country' },
  { id: 'NP', name: 'Nepal', flagUrl: `${FLAG_CDN}/np.png`, fact: 'Has the only non-rectangular flag' },
  { id: 'NL', name: 'Netherlands', flagUrl: `${FLAG_CDN}/nl.png`, fact: 'Famous for tulips and windmills' },
  { id: 'NZ', name: 'New Zealand', flagUrl: `${FLAG_CDN}/nz.png`, fact: 'Known for kiwi birds and Lord of the Rings' },
  { id: 'NI', name: 'Nicaragua', flagUrl: `${FLAG_CDN}/ni.png`, fact: 'Land of lakes and volcanoes' },
  { id: 'NE', name: 'Niger', flagUrl: `${FLAG_CDN}/ne.png`, fact: 'Named after the Niger River' },
  { id: 'NG', name: 'Nigeria', flagUrl: `${FLAG_CDN}/ng.png`, fact: 'Most populous African country' },
  { id: 'MK', name: 'North Macedonia', flagUrl: `${FLAG_CDN}/mk.png`, fact: 'Land of Alexander the Great' },
  { id: 'NO', name: 'Norway', flagUrl: `${FLAG_CDN}/no.png`, fact: 'Land of the midnight sun' },
  
  // O
  { id: 'OM', name: 'Oman', flagUrl: `${FLAG_CDN}/om.png`, fact: 'Gateway to Arabia' },
  
  // P
  { id: 'PK', name: 'Pakistan', flagUrl: `${FLAG_CDN}/pk.png`, fact: 'Home to K2 mountain' },
  { id: 'PW', name: 'Palau', flagUrl: `${FLAG_CDN}/pw.png`, fact: 'Pacific island paradise' },
  { id: 'PS', name: 'Palestine', flagUrl: `${FLAG_CDN}/ps.png`, fact: 'Holy Land region' },
  { id: 'PA', name: 'Panama', flagUrl: `${FLAG_CDN}/pa.png`, fact: 'Famous for the Panama Canal' },
  { id: 'PG', name: 'Papua New Guinea', flagUrl: `${FLAG_CDN}/pg.png`, fact: 'Most linguistically diverse country' },
  { id: 'PY', name: 'Paraguay', flagUrl: `${FLAG_CDN}/py.png`, fact: 'Only country with different front and back flag' },
  { id: 'PE', name: 'Peru', flagUrl: `${FLAG_CDN}/pe.png`, fact: 'Home of Machu Picchu' },
  { id: 'PH', name: 'Philippines', flagUrl: `${FLAG_CDN}/ph.png`, fact: 'Over 7000 islands' },
  { id: 'PL', name: 'Poland', flagUrl: `${FLAG_CDN}/pl.png`, fact: 'Home of Copernicus' },
  { id: 'PT', name: 'Portugal', flagUrl: `${FLAG_CDN}/pt.png`, fact: 'Great Age of Exploration' },
  
  // Q
  { id: 'QA', name: 'Qatar', flagUrl: `${FLAG_CDN}/qa.png`, fact: 'Hosted FIFA World Cup 2022' },
  
  // R
  { id: 'RO', name: 'Romania', flagUrl: `${FLAG_CDN}/ro.png`, fact: 'Home of Dracula legend' },
  { id: 'RU', name: 'Russia', flagUrl: `${FLAG_CDN}/ru.png`, fact: 'Largest country in the world' },
  { id: 'RW', name: 'Rwanda', flagUrl: `${FLAG_CDN}/rw.png`, fact: 'Land of a thousand hills' },
  
  // S
  { id: 'KN', name: 'Saint Kitts and Nevis', flagUrl: `${FLAG_CDN}/kn.png`, fact: 'Smallest Caribbean nation' },
  { id: 'LC', name: 'Saint Lucia', flagUrl: `${FLAG_CDN}/lc.png`, fact: 'Famous for the Pitons' },
  { id: 'VC', name: 'Saint Vincent and the Grenadines', flagUrl: `${FLAG_CDN}/vc.png`, fact: 'Pirates of Caribbean filming location' },
  { id: 'WS', name: 'Samoa', flagUrl: `${FLAG_CDN}/ws.png`, fact: 'First country to see the sunrise' },
  { id: 'SM', name: 'San Marino', flagUrl: `${FLAG_CDN}/sm.png`, fact: 'Oldest republic in the world' },
  { id: 'ST', name: 'Sao Tome and Principe', flagUrl: `${FLAG_CDN}/st.png`, fact: 'Center of the world by coordinates' },
  { id: 'SA', name: 'Saudi Arabia', flagUrl: `${FLAG_CDN}/sa.png`, fact: 'Guardian of Islamic holy sites' },
  { id: 'SN', name: 'Senegal', flagUrl: `${FLAG_CDN}/sn.png`, fact: 'Westernmost point of Africa' },
  { id: 'RS', name: 'Serbia', flagUrl: `${FLAG_CDN}/rs.png`, fact: 'Known for Nikola Tesla' },
  { id: 'SC', name: 'Seychelles', flagUrl: `${FLAG_CDN}/sc.png`, fact: 'Dream vacation destination' },
  { id: 'SL', name: 'Sierra Leone', flagUrl: `${FLAG_CDN}/sl.png`, fact: 'Named Mountain of Lions' },
  { id: 'SG', name: 'Singapore', flagUrl: `${FLAG_CDN}/sg.png`, fact: 'City-state known for Marina Bay Sands' },
  { id: 'SK', name: 'Slovakia', flagUrl: `${FLAG_CDN}/sk.png`, fact: 'Known for castles' },
  { id: 'SI', name: 'Slovenia', flagUrl: `${FLAG_CDN}/si.png`, fact: 'Has Lake Bled' },
  { id: 'SB', name: 'Solomon Islands', flagUrl: `${FLAG_CDN}/sb.png`, fact: 'Pacific World War II site' },
  { id: 'SO', name: 'Somalia', flagUrl: `${FLAG_CDN}/so.png`, fact: 'Horn of Africa nation' },
  { id: 'ZA', name: 'South Africa', flagUrl: `${FLAG_CDN}/za.png`, fact: 'Rainbow nation with three capitals' },
  { id: 'SS', name: 'South Sudan', flagUrl: `${FLAG_CDN}/ss.png`, fact: 'Youngest country in the world' },
  { id: 'ES', name: 'Spain', flagUrl: `${FLAG_CDN}/es.png`, fact: 'Famous for flamenco and bullfighting' },
  { id: 'LK', name: 'Sri Lanka', flagUrl: `${FLAG_CDN}/lk.png`, fact: 'Pearl of the Indian Ocean' },
  { id: 'SD', name: 'Sudan', flagUrl: `${FLAG_CDN}/sd.png`, fact: 'More pyramids than Egypt' },
  { id: 'SR', name: 'Suriname', flagUrl: `${FLAG_CDN}/sr.png`, fact: 'Smallest South American country' },
  { id: 'SE', name: 'Sweden', flagUrl: `${FLAG_CDN}/se.png`, fact: 'Home of IKEA and ABBA' },
  { id: 'CH', name: 'Switzerland', flagUrl: `${FLAG_CDN}/ch.png`, fact: 'Land of chocolate and watches' },
  { id: 'SY', name: 'Syria', flagUrl: `${FLAG_CDN}/sy.png`, fact: 'One of oldest civilizations' },
  
  // T
  { id: 'TJ', name: 'Tajikistan', flagUrl: `${FLAG_CDN}/tj.png`, fact: 'Mountainous Central Asian nation' },
  { id: 'TZ', name: 'Tanzania', flagUrl: `${FLAG_CDN}/tz.png`, fact: 'Home of Mount Kilimanjaro' },
  { id: 'TH', name: 'Thailand', flagUrl: `${FLAG_CDN}/th.png`, fact: 'Land of smiles' },
  { id: 'TL', name: 'Timor-Leste', flagUrl: `${FLAG_CDN}/tl.png`, fact: 'Southeast Asian youngest nation' },
  { id: 'TG', name: 'Togo', flagUrl: `${FLAG_CDN}/tg.png`, fact: 'Narrow coastal African nation' },
  { id: 'TO', name: 'Tonga', flagUrl: `${FLAG_CDN}/to.png`, fact: 'Only Pacific monarchy' },
  { id: 'TT', name: 'Trinidad and Tobago', flagUrl: `${FLAG_CDN}/tt.png`, fact: 'Birthplace of steel drums' },
  { id: 'TN', name: 'Tunisia', flagUrl: `${FLAG_CDN}/tn.png`, fact: 'Northernmost African country' },
  { id: 'TR', name: 'Turkey', flagUrl: `${FLAG_CDN}/tr.png`, fact: 'Straddles Europe and Asia' },
  { id: 'TM', name: 'Turkmenistan', flagUrl: `${FLAG_CDN}/tm.png`, fact: 'Has the Gates of Hell crater' },
  { id: 'TV', name: 'Tuvalu', flagUrl: `${FLAG_CDN}/tv.png`, fact: 'Fourth smallest country' },
  
  // U
  { id: 'UG', name: 'Uganda', flagUrl: `${FLAG_CDN}/ug.png`, fact: 'Pearl of Africa' },
  { id: 'UA', name: 'Ukraine', flagUrl: `${FLAG_CDN}/ua.png`, fact: 'Breadbasket of Europe' },
  { id: 'AE', name: 'United Arab Emirates', flagUrl: `${FLAG_CDN}/ae.png`, fact: 'Home of the Burj Khalifa' },
  { id: 'GB', name: 'United Kingdom', flagUrl: `${FLAG_CDN}/gb.png`, fact: 'Home of the Royal Family' },
  { id: 'US', name: 'United States', flagUrl: `${FLAG_CDN}/us.png`, fact: 'Land of opportunity' },
  { id: 'UY', name: 'Uruguay', flagUrl: `${FLAG_CDN}/uy.png`, fact: 'First FIFA World Cup host' },
  { id: 'UZ', name: 'Uzbekistan', flagUrl: `${FLAG_CDN}/uz.png`, fact: 'Silk Road crossroads' },
  
  // V
  { id: 'VU', name: 'Vanuatu', flagUrl: `${FLAG_CDN}/vu.png`, fact: 'Home of bungee jumping origin' },
  { id: 'VA', name: 'Vatican City', flagUrl: `${FLAG_CDN}/va.png`, fact: 'Smallest country in the world' },
  { id: 'VE', name: 'Venezuela', flagUrl: `${FLAG_CDN}/ve.png`, fact: 'Has the highest waterfall' },
  { id: 'VN', name: 'Vietnam', flagUrl: `${FLAG_CDN}/vn.png`, fact: 'Famous for pho and beautiful bays' },
  
  // Y
  { id: 'YE', name: 'Yemen', flagUrl: `${FLAG_CDN}/ye.png`, fact: 'Land of the Queen of Sheba' },
  
  // Z
  { id: 'ZM', name: 'Zambia', flagUrl: `${FLAG_CDN}/zm.png`, fact: 'Home of Victoria Falls' },
  { id: 'ZW', name: 'Zimbabwe', flagUrl: `${FLAG_CDN}/zw.png`, fact: 'Ancient Great Zimbabwe ruins' },
];

// Helper to get random unguessed country
export function getRandomUnguessedCountry(guessedIds: string[]): Country | null {
  const unguessed = COUNTRIES.filter(c => !guessedIds.includes(c.id));
  if (unguessed.length === 0) return null;
  return unguessed[Math.floor(Math.random() * unguessed.length)];
}

// Shuffle array helper
export function shuffleCountries(countries: Country[]): Country[] {
  const shuffled = [...countries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
