// Pure, offline helpers used to pick a relevant photo for every catalog product.
// No network or database access here, so everything in this file is unit-testable.
//
// Each rule: [pattern tested against "<product name> <product line type>", search query, core words].
// "core words" are the words a candidate photo's description/tags must mention (at least one) before
// it is accepted. Rules are checked in order, so more specific rules come first.
const RULES = [
  // --------------------------------------------------------- Bags & Luggage
  [/trolley/, 'trolley suitcase luggage', ['suitcase', 'luggage', 'trolley', 'bag']],
  [/rucksack/, 'hiking backpack', ['backpack', 'rucksack']],
  [/duffle/, 'duffle bag', ['duffle', 'duffel', 'bag', 'gym']],
  [/backpack|school bag/, 'backpack', ['backpack', 'bag']],
  [/handbag|tote|satchel/, 'women handbag', ['handbag', 'bag', 'tote', 'purse']],
  [/sling bag/, 'sling bag', ['bag']],
  [/wallet/, 'leather wallet', ['wallet']],
  // ---------------------------------------------------------------- Footwear
  [/flip-?flops?|slide sandals?/, 'flip flops sandals', ['flip', 'sandal', 'slipper', 'slide']],
  [/clogs?/, 'clogs shoes', ['clog']],
  [/wedge/, 'wedge sandals', ['wedge', 'sandal']],
  [/sandals?/, 'sandals footwear', ['sandal']],
  [/\bheels?\b|\bpumps\b/, 'high heels shoes', ['heel', 'pump']],
  [/ballerina|flats/, 'ballet flats shoes', ['flat', 'ballet', 'shoe']],
  [/(trekking|hiking) shoes/, 'hiking shoes', ['hiking', 'trekking', 'boot', 'shoe']],
  [/boots?/, 'leather boots', ['boot']],
  [/school shoes/, 'school shoes', ['shoe']],
  [/kids .*(sneakers|shoes)/, 'kids sneakers', ['kid', 'child', 'sneaker', 'shoe']],
  [/formal.*shoes|oxford|derby/, 'leather formal shoes', ['shoe', 'oxford', 'leather', 'formal']],
  [/running|training shoes|walking shoes/, 'running shoes', ['running', 'shoe', 'sneaker']],
  [/sneakers?/, 'sneakers', ['sneaker', 'shoe']],
  // ---------------------------------------------------------------- Clothing
  [/hooded|sweatshirt/, 'hoodie', ['hoodie', 'sweatshirt', 'hood']],
  [/polo/, 'polo shirt', ['polo', 'shirt']],
  [/t-shirt/, 't-shirt', ['shirt', 'tee']],
  [/shirt/, 'men shirt', ['shirt']],
  [/jeans/, 'jeans denim', ['jean', 'denim']],
  [/trousers|chinos/, 'chinos trousers', ['trouser', 'chino', 'pant']],
  [/kurta|anarkali/, 'kurta indian ethnic wear', ['kurta', 'indian', 'ethnic', 'dress']],
  [/dress/, 'women dress', ['dress']],
  [/leggings/, 'leggings activewear', ['legging', 'yoga', 'pant']],
  [/joggers|track pants/, 'joggers track pants', ['jogger', 'pant', 'track', 'sweat']],
  [/track jacket/, 'track jacket', ['jacket']],
  [/puffer/, 'puffer jacket', ['jacket', 'puffer', 'coat']],
  [/women's .*top/, 'women top', ['top', 'shirt', 'blouse', 'woman']],
  // ------------------------------------------------------------- Electronics
  [/smartphone/, 'smartphone', ['phone', 'smartphone', 'android', 'iphone']],
  [/neckband|earphones/, 'wireless earphones', ['earphone', 'headphone', 'earbud']],
  [/earbuds/, 'wireless earbuds', ['earbud', 'earphone', 'headphone', 'airpod']],
  [/headphones/, 'headphones', ['headphone']],
  [/laptop/, 'laptop', ['laptop', 'computer', 'macbook', 'notebook']],
  [/keyboard and mouse|keyboard/, 'wireless keyboard mouse', ['keyboard', 'mouse']],
  [/mouse/, 'computer mouse', ['mouse']],
  [/soundbar/, 'soundbar speaker', ['soundbar', 'speaker']],
  [/speaker/, 'bluetooth speaker', ['speaker']],
  [/\btv\b/, 'smart tv television', ['tv', 'television']],
  [/smartwatch/, 'smartwatch', ['watch', 'smartwatch']],
  [/fit band|smart band/, 'fitness band tracker', ['band', 'tracker', 'watch', 'fitness']],
  [/power bank/, 'power bank', ['power bank', 'battery', 'charger']],
  [/microsd|memory card/, 'sd memory card', ['card', 'memory', 'sd']],
  [/charger/, 'phone charger', ['charger', 'charging', 'cable', 'adapter']],
  // ------------------------------------------------------------------ Beauty
  [/lipstick/, 'lipstick', ['lipstick', 'lip']],
  [/foundation/, 'foundation makeup', ['foundation', 'makeup', 'cosmetic']],
  [/kajal/, 'eyeliner makeup', ['eyeliner', 'eye', 'makeup']],
  [/compact/, 'face powder compact', ['powder', 'compact', 'makeup']],
  [/eyeshadow/, 'eyeshadow palette', ['eyeshadow', 'palette', 'makeup']],
  [/mascara/, 'mascara', ['mascara', 'lash', 'makeup']],
  [/sunscreen/, 'sunscreen', ['sunscreen', 'sun', 'lotion', 'cream']],
  [/serum/, 'face serum', ['serum', 'dropper', 'skincare']],
  [/face wash|cleanser/, 'face wash cleanser', ['face', 'cleanser', 'skincare', 'wash']],
  [/moisturi[sz]er|cream|body lotion/, 'moisturizer cream', ['cream', 'lotion', 'moisturizer', 'skincare']],
  [/conditioner/, 'hair conditioner', ['conditioner', 'hair']],
  [/shampoo/, 'shampoo bottle', ['shampoo', 'hair']],
  [/hair oil/, 'hair oil', ['oil', 'hair']],
  [/hair dryer/, 'hair dryer', ['dryer', 'hair']],
  [/trimmer/, 'beard trimmer', ['trimmer', 'beard', 'razor', 'shav']],
  [/deodorant|body spray/, 'deodorant spray', ['deodorant', 'spray', 'perfume']],
  [/eau de toilette/, 'perfume bottle', ['perfume', 'fragrance']],
  [/shower gel/, 'shower gel', ['shower', 'soap', 'bath', 'gel']],
  [/razor/, 'razor shaving', ['razor', 'shav']],
  // ---------------------------------------------------------- Home & Kitchen
  [/pressure cooker/, 'pressure cooker', ['cooker', 'pot']],
  [/gas stove|cooktop/, 'gas stove cooktop', ['stove', 'burner', 'cooktop', 'induction']],
  [/casserole/, 'casserole dish', ['casserole', 'dish', 'pot']],
  [/kadai|tawa|cookware/, 'frying pan cookware', ['pan', 'cookware', 'pot', 'skillet']],
  [/air fryer/, 'air fryer', ['fryer', 'air']],
  [/mixer grinder|juicer/, 'blender mixer', ['blender', 'mixer', 'juicer']],
  [/kettle/, 'electric kettle', ['kettle']],
  [/steam iron/, 'clothes iron', ['iron']],
  [/water purifier/, 'water purifier', ['purifier', 'filter', 'dispenser', 'water']],
  [/vacuum/, 'vacuum cleaner', ['vacuum']],
  [/\bfan\b/, 'fan', ['fan']],
  [/water bottle/, 'stainless steel water bottle', ['bottle']],
  [/container/, 'food storage containers', ['container', 'storage', 'jar']],
  [/lunch box/, 'lunch box', ['lunch', 'box', 'container']],
  [/tumbler/, 'glass tumbler', ['glass', 'tumbler']],
  [/dinner set/, 'dinner set plates', ['plate', 'dish', 'dinnerware', 'tableware']],
  [/bedsheet/, 'bedsheet bed linen', ['bed', 'sheet', 'linen', 'pillow']],
  [/towel/, 'bath towels', ['towel']],
  [/mattress/, 'mattress bedroom', ['mattress', 'bed']],
  [/led bulb/, 'led light bulb', ['bulb', 'light', 'lamp']],
  // -------------------------------------------------------- Sports & Fitness
  [/shuttlecock/, 'badminton shuttlecock', ['shuttlecock', 'badminton']],
  [/badminton/, 'badminton racket', ['badminton', 'racket', 'racquet']],
  [/football/, 'soccer ball', ['soccer', 'football', 'ball']],
  [/basketball/, 'basketball', ['basketball']],
  [/volleyball/, 'volleyball', ['volleyball']],
  [/cricket bat/, 'cricket bat', ['cricket', 'bat']],
  [/batting gloves/, 'cricket gloves', ['cricket', 'glove']],
  [/yoga mat/, 'yoga mat', ['yoga', 'mat']],
  [/dumbbell/, 'dumbbells', ['dumbbell', 'weight']],
  [/resistance bands/, 'resistance bands', ['band', 'resistance', 'exercise']],
  [/gym gloves/, 'gym gloves', ['glove', 'gym']],
  [/foam roller/, 'foam roller', ['roller', 'foam']],
  [/skipping rope/, 'jump rope', ['rope', 'skipping']],
  [/cycling helmet/, 'bicycle helmet', ['helmet', 'bike', 'bicycle', 'cycling']],
  [/camping tent/, 'camping tent', ['tent']],
  [/swimming goggles/, 'swimming goggles', ['goggle', 'swim']],
  [/treadmill/, 'treadmill', ['treadmill']],
  [/exercise cycle/, 'exercise bike', ['bike', 'cycle', 'exercise']],
  // ------------------------------------------------------ Stationery & Office
  [/notebook|long book/, 'notebook', ['notebook', 'book', 'notepad']],
  [/oil pastels/, 'oil pastels art', ['pastel', 'crayon', 'art']],
  [/geometry box/, 'geometry box compass ruler', ['compass', 'ruler', 'geometry', 'protractor']],
  [/gel pen/, 'gel pens', ['pen']],
  [/ball pen/, 'ballpoint pen', ['pen']],
  [/colou?r pencils/, 'colored pencils', ['pencil']],
  [/graphite pencils/, 'pencils', ['pencil']],
  [/calculator/, 'calculator', ['calculator']],
  [/stapler/, 'stapler', ['stapler', 'staple']],
  [/office chair/, 'office chair', ['chair']],
  [/desk lamp/, 'desk lamp', ['lamp']],
  // ------------------------------------------------------------ Toys & Games
  [/lego/, 'lego bricks', ['lego', 'brick', 'block']],
  [/monopoly|board game/, 'board game', ['board game', 'monopoly', 'game']],
  [/jigsaw/, 'jigsaw puzzle', ['puzzle', 'jigsaw']],
  [/hot wheels/, 'toy cars', ['car', 'toy']],
  [/barbie|doll/, 'fashion doll', ['doll']],
  [/nerf/, 'toy blaster', ['toy', 'blaster', 'nerf']],
  [/play-?doh/, 'play dough', ['dough', 'clay', 'play']],
  [/uno card/, 'uno cards', ['card', 'uno']],
  [/scrabble/, 'scrabble tiles', ['scrabble', 'tile', 'letter', 'word']],
  [/baby piano|rock-a-stack/, 'baby toys', ['baby', 'toy', 'infant']],
  [/activity mat/, 'kids activity', ['kid', 'child', 'activity', 'toy']],
  [/remote control/, 'remote control car toy', ['car', 'toy', 'remote']],
  [/doctor/, 'toy doctor kit', ['doctor', 'toy', 'stethoscope', 'kid']],
  // ----------------------------------------------------------------- Grocery
  [/\brice\b/, 'basmati rice', ['rice']],
  [/\bdal\b/, 'lentils dal', ['lentil', 'dal', 'pulse', 'bean']],
  [/\batta\b/, 'wheat flour', ['flour', 'wheat']],
  [/\boil\b/, 'cooking oil bottle', ['oil']],
  [/butter/, 'butter', ['butter']],
  [/cheese/, 'cheese slices', ['cheese']],
  [/ghee/, 'ghee clarified butter', ['ghee', 'butter', 'jar']],
  [/biscuits/, 'biscuits cookies', ['biscuit', 'cookie']],
  [/noodles/, 'instant noodles', ['noodle']],
  [/coffee/, 'instant coffee jar', ['coffee']],
  [/\btea\b/, 'tea leaves', ['tea']],
  [/bhujia/, 'indian snack namkeen', ['snack', 'namkeen', 'indian']],
  [/soan papdi/, 'indian sweets', ['sweet', 'indian', 'mithai']],
  [/corn flakes/, 'corn flakes cereal', ['cereal', 'flake', 'corn']],
  [/oats/, 'rolled oats', ['oat']],
  [/honey/, 'honey jar', ['honey']],
  [/masala|chilli powder/, 'indian spices', ['spice', 'masala', 'chili', 'chilli', 'powder']],
  [/salt/, 'salt', ['salt']],
  [/ketchup/, 'tomato ketchup', ['ketchup', 'tomato', 'sauce']],
  [/juice/, 'fruit juice', ['juice']],
  [/chocolate/, 'chocolate gift box', ['chocolate']],
];

/**
 * Derives the photo search query for one product.
 * level "type"     -> a product-type rule matched (photo shows that kind of product, not the exact model)
 * level "category" -> no rule matched; falls back to "<line type> <category>"
 */
export function deriveImageQuery(productName, line) {
  // Match on the product name first; the product line type (e.g. "Laptops & Computer Accessories")
  // is only a second pass, because it covers mixed lines and would otherwise hijack e.g. a mouse.
  for (const text of [productName, line.type]) {
    const haystack = text.toLowerCase();
    for (const [pattern, query, core] of RULES) {
      if (pattern.test(haystack)) return { query, core, level: 'type' };
    }
  }
  return { query: `${line.type} ${line.category}`, core: [], level: 'category' };
}

/** Scores an Unsplash search result against a derived query. Higher is better; -1 means reject. */
export function scorePhoto(photo, { query, core }) {
  if (!photo?.id || !photo?.urls?.raw) return -1;
  const text = [
    photo.alt_description,
    photo.description,
    ...(Array.isArray(photo.tags) ? photo.tags.map((tag) => tag?.title) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const coreHits = core.filter((word) => text.includes(word)).length;
  if (core.length > 0 && coreHits === 0) return -1;
  const queryHits = query.split(/\s+/).filter((word) => word.length > 2 && text.includes(word)).length;
  return coreHits * 3 + queryHits;
}

/**
 * Picks the best unused photo, deterministically: highest score first, ties broken by photo id.
 * `isUsable` lets the caller skip photos already assigned to another product or failing verification.
 */
export function rankPhotos(photos, derived, isUsable = () => true) {
  return photos
    .map((photo) => ({ photo, score: scorePhoto(photo, derived) }))
    .filter(({ photo, score }) => score >= 0 && isUsable(photo))
    .sort((a, b) => b.score - a.score || String(a.photo.id).localeCompare(String(b.photo.id)));
}

/** Builds the stored image URL from Unsplash's raw URL with sized, cropped, compressed variants. */
export function buildImageUrl(rawUrl, width = 800) {
  const url = new URL(rawUrl);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', '80');
  return url.toString();
}
