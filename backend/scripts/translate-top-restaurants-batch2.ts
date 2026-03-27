/**
 * Batch 2: Translate top restaurants to 7 languages.
 * Run: cd backend && npx ts-node scripts/translate-top-restaurants-batch2.ts
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pgDS = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
});

const T: Record<string, { name: Record<string, string>; description: Record<string, string> }> = {

  'cocos-lounge-bar-spb-5': {
    name: { en: 'Cocos Lounge Bar', de: 'Cocos Lounge Bar', es: 'Cocos Lounge Bar', fr: 'Cocos Lounge Bar', zh: '椰子休闲吧', ja: 'ココス ラウンジバー', ko: '코코스 라운지 바' },
    description: {
      en: 'A stylish hookah lounge on Sotsialisticheskaya Street. At Cocos Lounge Bar, tobacco-free steam cocktails are brewed in traditional bowls and exotic fruit variants.',
      de: 'Eine stilvolle Shisha-Lounge in der Sozialistitscheskaja-Straße. In der Cocos Lounge Bar werden tabakfreie Dampfcocktails in klassischen Schalen und exotischen Fruchtvarianten zubereitet.',
      es: 'Un elegante lounge de hookah en la calle Sotsialisticheskaya. En Cocos Lounge Bar preparan cócteles de vapor sin tabaco en cuencos clásicos y variantes de frutas exóticas.',
      fr: 'Un élégant salon à chicha dans la rue Sotsialistitcheskaïa. Au Cocos Lounge Bar, on prépare des cocktails vapeur sans tabac dans des bols classiques et des variantes à base de fruits exotiques.',
      zh: '位于社会主义大街的时尚水烟酒吧。椰子休闲吧提供无烟草蒸汽鸡尾酒，使用传统碗和异国水果款式。',
      ja: 'ソツィアリスティチェスカヤ通りにあるスタイリッシュなシーシャラウンジ。ココス ラウンジバーでは、伝統的なボウルやエキゾチックフルーツを使ったタバコフリーのスチームカクテルを提供。',
      ko: '소치알리스티체스카야 거리의 세련된 훅카 라운지. 코코스 라운지 바에서는 전통 볼과 이국적 과일을 사용한 무연초 스팀 칵테일을 제공합니다.',
    },
  },

  'samuray-nnov': {
    name: { en: 'Samurai', de: 'Samurai', es: 'Samurái', fr: 'Samouraï', zh: '武士', ja: 'サムライ', ko: '사무라이' },
    description: {
      en: '"Samurai" is a Japanese café with affordable prices. Inside — a cozy minimalist interior with Eastern-style paintings on the walls. The menu focuses on Japanese cuisine: classic and signature rolls, sushi, and gunkan. Group sets are also available. The bar menu offers everything from classic non-alcoholic cocktails to stronger drinks.',
      de: '„Samurai" ist ein japanisches Café zu günstigen Preisen. Drinnen — ein gemütliches minimalistisches Interieur mit Gemälden im orientalischen Stil. Die Speisekarte konzentriert sich auf japanische Küche: klassische und Signature-Rolls, Sushi und Gunkan. Gruppensets sind ebenfalls verfügbar. Die Barkarte reicht von alkoholfreien Cocktails bis zu stärkeren Getränken.',
      es: '«Samurái» es un café japonés con precios democráticos. Interior acogedor y minimalista con cuadros de estilo oriental. El menú se centra en la cocina japonesa: rolls clásicos y de autor, sushi y gunkan. Hay sets para grupos grandes. La carta de bar ofrece desde cócteles sin alcohol hasta bebidas más fuertes.',
      fr: '« Samouraï » est un café japonais à prix abordables. Intérieur cosy et minimaliste décoré de peintures de style oriental. La carte met l\'accent sur la cuisine japonaise : makis classiques et signatures, sushi et gunkan. Des plateaux pour groupes sont aussi proposés. La carte des boissons va des cocktails sans alcool aux spiritueux.',
      zh: '"武士"是一家价格亲民的日式咖啡馆。室内是舒适的极简风格，墙上挂着东方风格的画。菜单以日本料理为主：经典和创意卷物、寿司和军舰寿司。还有团体套餐。酒水单从经典无酒精鸡尾酒到烈酒应有尽有。',
      ja: '「サムライ」はリーズナブルな日本料理カフェ。店内はオリエンタルスタイルの絵が飾られた居心地の良いミニマルなインテリア。メニューは日本料理がメイン：クラシック＆シグネチャーロール、寿司、軍艦。グループセットも用意。バーメニューはノンアルコールカクテルからスピリッツまで。',
      ko: '"사무라이"는 합리적인 가격의 일본식 카페입니다. 동양풍 그림이 걸린 아늑한 미니멀 인테리어. 메뉴는 일본 요리 중심: 클래식 및 시그니처 롤, 스시, 군칸. 단체 세트도 있습니다. 바 메뉴는 무알코올 칵테일부터 도수 있는 음료까지 다양합니다.',
    },
  },

  'sitsiliya-rostov-4': {
    name: { en: 'Sicily', de: 'Sizilien', es: 'Sicilia', fr: 'Sicile', zh: '西西里', ja: 'シチリア', ko: '시칠리아' },
    description: {
      en: '"Sicily" is a café-pizzeria with a children\'s menu. Inside, a homey atmosphere for family relaxation: light furniture, floral-print curtains, charming lampshades over every table, and a large play area for little guests. Besides a wide pizza selection, the menu includes rolls, Asian noodles, and assorted fried appetizers. Mains feature turkey stew, veal cheeks with mashed potatoes, and meat roulade with roasted potatoes. Drinks include milkshakes, lemonades, berry tea, and coffee.',
      de: '„Sizilien" ist ein Café-Pizzeria mit Kindermenü. Drinnen herrscht eine familiäre Atmosphäre: helle Möbel, Vorhänge mit Blumenmuster, hübsche Lampenschirme über jedem Tisch und ein großer Spielbereich. Neben vielen Pizzasorten stehen Rolls, asiatische Nudeln und frittierte Snacks auf der Karte. Als Hauptgericht gibt es Truthahn-Eintopf, Kalbsbäckchen mit Kartoffelpüree und Fleischrolle mit Ofenkartoffeln. Getränke: Milchshakes, Limonaden, Beerentee und Kaffee.',
      es: '«Sicilia» es un café-pizzería con menú infantil. Interior hogareño para descanso en familia: muebles claros, cortinas con estampado floral, simpáticas pantallas sobre cada mesa y una gran zona de juegos. Además de gran variedad de pizzas, el menú incluye rolls, fideos asiáticos y aperitivos fritos. De principal: estofado de pavo, carrilleras de ternera con puré y rollo de carne con patatas asadas. Bebidas: batidos, limonadas, té de frutos del bosque y café.',
      fr: '« Sicile » est un café-pizzeria avec menu enfant. Ambiance familiale : mobilier clair, rideaux fleuris, jolis abat-jour au-dessus de chaque table et grande aire de jeux. En plus d\'un large choix de pizzas, la carte propose des rolls, des nouilles asiatiques et des amuse-bouches frits. En plat : ragoût de dinde, joues de veau purée et roulé de viande aux pommes de terre rôties. Boissons : milkshakes, limonades, thé aux baies et café.',
      zh: '"西西里"是一家有儿童菜单的咖啡披萨店。温馨的家庭氛围：浅色家具、花卉窗帘、每张桌上可爱的灯罩和大型儿童游乐区。除了丰富的披萨选择，菜单还有卷物、亚洲面条和各种油炸小食。主菜有火鸡炖肉、小牛颊肉配土豆泥和肉卷配烤土豆。饮品有奶昔、柠檬水、浆果茶和咖啡。',
      ja: '「シチリア」はキッズメニュー付きのカフェ＆ピッツェリア。明るい家具、花柄カーテン、各テーブルのかわいいランプシェード、大きなキッズスペースでアットホームな雰囲気。ピザの他にロール、アジアンヌードル、揚げ物スナックも。メインはターキーシチュー、子牛のほほ肉マッシュポテト添え、ミートロールのローストポテト添え。ドリンクはミルクシェイク、レモネード、ベリーティー、コーヒー。',
      ko: '"시칠리아"는 어린이 메뉴가 있는 카페 겸 피제리아입니다. 밝은 가구, 꽃무늬 커튼, 각 테이블 위의 귀여운 조명갓, 넓은 놀이 공간으로 가족 휴식에 적합한 가정적인 분위기. 다양한 피자 외에 롤, 아시안 누들, 튀김 스낵이 있습니다. 메인은 칠면조 스튜, 송아지 볼살과 으깬 감자, 미트 롤과 구운 감자. 음료는 밀크셰이크, 레모네이드, 베리차, 커피.',
    },
  },

  'only-wine-moscow-3': {
    name: { en: 'Only Wine', de: 'Only Wine', es: 'Only Wine', fr: 'Only Wine', zh: 'Only Wine', ja: 'オンリーワイン', ko: '온리 와인' },
    description: {
      en: 'A chain wine restaurant in the Mayakovsky residential complex on Golovinskoe Shosse. Only Wine pours over 60 wines and sparkling wines, with about 30 available by the glass. A third of the menu is devoted to starters: tartares, cheese and charcuterie platters, oysters, and sea urchins. Mains include Italian pizza and pasta. The interior features black walls with subtle gold accents, and illuminated wine cabinets throughout.',
      de: 'Ein Wein-Restaurant der Kette im Wohnkomplex „Majakowski" am Golowinski-Schossee. Only Wine schenkt über 60 Weine und Sekt aus, rund 30 glasweise. Ein Drittel der Karte widmet sich Vorspeisen: Tartares, Käse- und Wurstplatten, Austern und Seeigel. Hauptgerichte: italienische Pizza und Pasta. Der Innenraum besticht durch schwarze Wände mit dezenten Goldakzenten und beleuchteten Weinschränken.',
      es: 'Restaurante vinícola de cadena en el complejo residencial Mayakovsky en el Shosse Golovínskoye. Only Wine sirve más de 60 vinos y espumosos, con unos 30 disponibles por copa. Un tercio del menú está dedicado a entrantes: tartares, tablas de quesos y embutidos, ostras y erizos de mar. De principal: pizza y pasta italiana. Interior con paredes negras, sutiles detalles dorados y vitrinas de vinos iluminadas.',
      fr: 'Restaurant vinicole de chaîne dans la résidence Maïakovski sur le Chosse Golovinskoïe. Only Wine sert plus de 60 vins et mousseux, dont une trentaine au verre. Un tiers de la carte est consacré aux entrées : tartares, plateaux de fromages et charcuteries, huîtres et oursins. Plats : pizza et pâtes italiennes. Intérieur aux murs noirs rehaussés d\'or discret et vitrines à vin éclairées.',
      zh: '位于戈洛温斯科耶大道马雅可夫斯基住宅区的连锁葡萄酒餐厅。Only Wine供应60多种葡萄酒和起泡酒，约30种可按杯点。三分之一的菜单是开胃菜：鞑靼牛肉、奶酪和肉类拼盘、生蚝和海胆。主菜有意大利披萨和意面。黑色墙面配低调金色细节，灯光酒柜点缀空间。',
      ja: 'ゴロヴィンスコエ・ショッセのマヤコフスキー住宅内にあるチェーンのワインレストラン。Only Wineは60種以上のワイン＆スパークリングを揃え、約30種がグラスで楽しめます。メニューの3分の1は前菜：タルタル、チーズ＆シャルキュトリープレート、牡蠣、ウニ。メインはイタリアンピッツァ＆パスタ。黒壁にさりげないゴールドのアクセント、ライトアップされたワインキャビネットが印象的な空間。',
      ko: '골로빈스코예 대로 마야코프스키 주거단지 내 체인 와인 레스토랑. Only Wine은 60종 이상의 와인과 스파클링을 제공하며 약 30종을 잔으로 즐길 수 있습니다. 메뉴의 3분의 1이 전채: 타르타르, 치즈·샤퀴테리 플래터, 굴, 성게. 메인은 이탈리안 피자와 파스타. 블랙 월에 은은한 골드 디테일, 조명 와인 캐비닛이 돋보이는 인테리어.',
    },
  },

  'delikateska-moscow-8': {
    name: { en: 'Delikatesca', de: 'Delikatesca', es: 'Delikatesca', fr: 'Delikatesca', zh: '佳肴坊', ja: 'デリカテスカ', ko: '델리카테스카' },
    description: {
      en: '"Delikatesca" is a café and seafood shop in the ZIL district. Inside — an intimate, tidy hall with small tables and bar stools. The centerpiece is an aquarium with live seafood and counters of fish and meat delicacies. You can buy products to take home or enjoy refined dishes with a glass of wine. The menu includes oysters, live scallops, ham grissini, Burgundy-style escargot, tuna tartare, pink salmon sugudai, and more.',
      de: '„Delikatesca" ist ein Café und Meeresfrüchte-Laden im ZIL-Viertel. Drinnen — ein intimer, aufgeräumter Saal mit kleinen Tischen und Barhockern. Herzstück ist ein Aquarium mit lebenden Meeresfrüchten und Theken voller Fisch- und Fleischdelikatessen. Man kann Produkte mitnehmen oder raffinierte Gerichte bei einem Glas Wein genießen. Auf der Karte: Austern, lebende Jakobsmuscheln, Schinken-Grissini, Schnecken bourguignonne, Thunfisch-Tatar und Sugudai.',
      es: '«Delikatesca» es un café y tienda de mariscos en el barrio ZIL. Interior íntimo y cuidado con mesitas y taburetes altos. En el centro, un acuario con mariscos vivos y mostradores con delicias de pescado y carne. Puedes comprar productos para llevar o disfrutar platos refinados con una copa de vino. En el menú: ostras, vieira viva, grissini con jamón, caracoles a la borgoñona, tartar de atún, sugudai de salmón rosado y más.',
      fr: '« Delikatesca » est un café et échoppe de fruits de mer dans le quartier ZIL. Intérieur intime et soigné avec petites tables et tabourets hauts. Au centre — un aquarium de fruits de mer vivants et des comptoirs de poissons et charcuteries fines. On peut acheter à emporter ou déguster des plats raffinés avec un verre de vin. Au menu : huîtres, Saint-Jacques vivantes, grissini au jambon, escargots bourguignons, tartare de thon, sugudaï de saumon rose et plus.',
      zh: '"佳肴坊"是ZIL区的咖啡海鲜店。室内是小巧整洁的空间，小桌子和高脚凳。中心是活海鲜水族箱和鱼肉熟食柜台。可以买食材带走，也可以品尝精致菜肴配一杯葡萄酒。菜单有生蚝、活扇贝、火腿意式面包棒、勃艮第蜗牛、金枪鱼鞑靼、驼背鲑鱼苏古代等。',
      ja: '「デリカテスカ」はZIL地区のカフェ＆シーフードショップ。こぢんまりとした清潔な店内にはスモールテーブルとバースツール。中央にはライブシーフードの水槽と魚・肉のデリカウンター。テイクアウトも、ワイン片手に洗練された料理を楽しむことも。メニューは牡蠣、活ホタテ、ハムグリッシーニ、ブルゴーニュ風エスカルゴ、マグロタルタル、サーモンスグダイなど。',
      ko: '"델리카테스카"는 ZIL 지구의 카페 겸 해산물 가게입니다. 아담하고 깔끔한 홀에 작은 테이블과 바 스툴. 중앙에는 활 해산물 수족관과 생선·육류 델리 카운터. 식재료를 사 갈 수도, 와인 한 잔과 함께 정교한 요리를 즐길 수도 있습니다. 메뉴에는 굴, 활 가리비, 하몽 그리시니, 부르고뉴식 달팽이, 참치 타르타르, 연어 수구다이 등.',
    },
  },

  'ris-sochi': {
    name: { en: 'RIS', de: 'RIS', es: 'RIS', fr: 'RIS', zh: '稻', ja: 'リス', ko: 'РИС' },
    description: {
      en: '"RIS" is a chain restaurant with comfort food and breakfasts at the port. The European-style interiors feature natural materials — wood, stone, and potted plants everywhere. Panoramic windows overlook the Sochi seaport. The menu combines five world cuisines: Italian, Chinese, Thai, Russian, and Uzbek. They make pizza, poke, pho bo, rolls, and much more. Mains include sweet-and-sour chicken with pineapple, beef stroganoff, and noodles.',
      de: '„RIS" ist ein Kettenrestaurant mit Wohlfühlküche und Frühstück im Hafen. Das europäisch gestaltete Interieur setzt auf natürliche Materialien — Holz, Stein und überall Topfpflanzen. Panoramafenster blicken auf den Hafen von Sotschi. Die Speisekarte vereint fünf Küchen: italienisch, chinesisch, thailändisch, russisch und usbekisch. Es gibt Pizza, Poké, Pho Bo, Rolls und vieles mehr. Hauptgerichte: süß-saures Huhn mit Ananas, Beef Stroganoff und Nudeln.',
      es: '«RIS» es un restaurante de cadena con comida reconfortante y desayunos en el puerto. Interiores de estilo europeo con materiales naturales — madera, piedra y macetas por doquier. Ventanales panorámicos con vistas al puerto marítimo de Sochi. El menú combina cinco cocinas del mundo: italiana, china, tailandesa, rusa y uzbeka. Preparan pizza, poké, pho bo, rolls y mucho más. Principales: pollo agridulce con piña, stroganoff y fideos.',
      fr: '« RIS » est un restaurant de chaîne proposant une cuisine de confort et des petits-déjeuners au port. Intérieurs de style européen avec matériaux naturels — bois, pierre et plantes en pot partout. Les baies vitrées panoramiques donnent sur le port maritime de Sotchi. La carte réunit cinq cuisines : italienne, chinoise, thaïe, russe et ouzbek. Pizza, poké, pho bo, makis et bien plus. Plats : poulet aigre-doux à l\'ananas, bœuf Stroganoff et nouilles.',
      zh: '"稻"是港口区的连锁餐厅，提供舒适食物和早餐。欧式装修大量使用天然材料——木材、石材和随处可见的盆栽。全景窗俯瞰索契海港。菜单融合五国料理：意大利、中国、泰国、俄罗斯和乌兹别克。做披萨、夏威夷碗、越南粉、卷物等。主菜有菠萝咕咾鸡、俄式牛肉丝和面条。',
      ja: '「リス」は港にあるチェーンのコンフォートフードレストラン。ヨーロピアンスタイルの内装に天然素材——木、石、そこかしこの観葉植物。パノラマウィンドウからソチ海港を一望。メニューは5つの世界の料理を融合：イタリアン、中華、タイ、ロシアン、ウズベク。ピッツァ、ポケ、フォーボー、ロールなど。メインは酢豚風チキン、ビーフストロガノフ、ヌードル。',
      ko: '"РИС"는 항구에 위치한 컴포트 푸드 체인 레스토랑입니다. 유럽 스타일 인테리어에 천연 소재——나무, 돌, 곳곳의 화분. 파노라마 창으로 소치 항구를 조망합니다. 메뉴는 5개국 요리 융합: 이탈리안, 중식, 태국, 러시아, 우즈벡. 피자, 포케, 포보, 롤 등. 메인은 새콤달콤 파인애플 치킨, 비프 스트로가노프, 누들.',
    },
  },

  'ullu': {
    name: { en: 'Ullu', de: 'Ullu', es: 'Ullu', fr: 'Ullu', zh: '乌鲁', ja: 'ウル', ko: '울루' },
    description: {
      en: 'Ullu is a conceptual Caucasian restaurant near Ramenki metro. Every detail is carefully considered: warm light glides over stone walls, wood preserves the warmth of craftsmen\'s hands, soft fabrics muffle city noise. The interior presents ethnic motifs in a modern interpretation with pastel tones, natural materials, live trees, and an open kitchen with a real wood-fired oven. The cuisine draws on North Caucasus traditions — Dagestan, Kabardino-Balkaria, North Ossetia, Adygea. Star chef Mark Shah Akbari created a menu featuring lamb kebab with mint hummus, lahmacun with chopped meat, and chudu with fresh herbs and authentic cheeses.',
      de: 'Ullu ist ein konzeptuelles kaukasisches Restaurant nahe der Metro Ramenki. Jedes Detail ist durchdacht: warmes Licht gleitet über Steinwände, Holz bewahrt handwerkliche Wärme, weiche Stoffe dämpfen den Stadtlärm. Ethnische Motive in moderner Interpretation mit Pastelltönen, Naturmaterialien, lebenden Bäumen und offener Küche mit echtem Holzofen. Die Küche basiert auf nordkaukasischen Traditionen. Sternekoch Mark Schah Akbari serviert Lammkebab mit Minze-Hummus, Lahmacun und Tschudu.',
      es: 'Ullu es un restaurante caucásico conceptual cerca del metro Rámenki. Cada detalle está cuidadosamente pensado: luz cálida sobre muros de piedra, madera que conserva el calor artesanal, telas suaves que amortiguan el ruido. Motivos étnicos en interpretación moderna con tonos pastel, materiales naturales, árboles vivos y cocina abierta con horno de leña. La cocina se basa en tradiciones del norte del Cáucaso. El chef Mark Shah Akbari ofrece kebab de cordero con hummus de menta, lahmacun y chudu.',
      fr: 'Ullu est un restaurant caucasien conceptuel près du métro Ramenki. Chaque détail est pensé : lumière chaude sur les murs de pierre, bois artisanal, tissus doux qui étouffent le bruit. Motifs ethniques réinterprétés avec des tons pastel, matériaux naturels, arbres vivants et cuisine ouverte au four à bois. La cuisine puise dans les traditions du Caucase du Nord. Le chef étoilé Mark Shah Akbari propose kébab d\'agneau au houmous de menthe, lahmacun et tchoudu.',
      zh: '乌鲁是拉缅基地铁站附近的概念性高加索餐厅。每个细节都经过精心设计：温暖的灯光滑过石墙，木材保留工匠的温度，柔软的织物隔绝城市喧嚣。现代演绎的民族风格，粉彩色调，天然材料，活树，配有真正柴火炉的开放式厨房。菜肴源自北高加索传统——达吉斯坦、卡巴尔达-巴尔卡尔等。明星主厨马克·沙阿·阿克巴里打造的菜单有薄荷鹰嘴豆泥羊肉烤串、土耳其薄饼和格鲁吉亚馅饼。',
      ja: 'ウルはラメンキ駅近くのコンセプチュアルなコーカサス料理レストラン。温かな光が石壁を照らし、木の温もりと柔らかな布が都会の喧騒を和らげる。パステルトーン、天然素材、生きた木々、本格薪窯のオープンキッチン。北コーカサスの伝統をベースに、スターシェフのマーク・シャー・アクバリがメニューを構成。ミントフムスのラムケバブ、ラフマジュン、チュドゥなどを提供。',
      ko: '울루는 라멘키 지하철역 근처의 콘셉트 캅카스 레스토랑입니다. 돌벽 위의 따뜻한 빛, 장인의 온기를 간직한 나무, 도시 소음을 줄이는 부드러운 직물. 파스텔 톤, 천연 소재, 살아있는 나무, 진짜 장작 화덕의 오픈 키친. 북캅카스 전통에 기반한 요리. 스타 셰프 마크 샤 아크바리가 민트 후무스 램 케밥, 라흐마준, 추두 등의 메뉴를 선보입니다.',
    },
  },

  'high-bar': {
    name: { en: 'High Bar', de: 'High Bar', es: 'High Bar', fr: 'High Bar', zh: 'High Bar', ja: 'ハイバー', ko: '하이 바' },
    description: {
      en: 'High Bar is a cocktail bar on the 56th floor of the Empire Tower in Moscow City. Industrial design meets timeless European elegance: concrete walls softened by velvet armchairs and golden chandelier spheres. Floor-to-ceiling panoramic windows reveal the Moscow skyline. The cocktail menu is organized by era, from 18th-century origins to modern signature creations by brand bartender Alexey Neretin. Chef Dmitry Romanovsky crafted an elegant menu focused on premium ingredients and complex sauces. Live music every evening — jazz on Thursdays, top DJs on weekends. Open Thursday through Saturday from 6 PM until dawn. Dress code: smart elegant.',
      de: 'High Bar ist eine Cocktailbar im 56. Stock des Empire Tower in Moskau City. Industriedesign trifft auf europäische Klassik: Betonwände, Samtsessel und goldene Kronleuchterkugeln. Panoramafenster vom Boden bis zur Decke zeigen die Moskauer Skyline. Die Cocktailkarte ist nach Epochen geordnet — vom 18. Jahrhundert bis zu modernen Signature-Kreationen. Chef Dmitri Romanowski gestaltete ein elegantes Menü. Live-Musik jeden Abend — Jazz donnerstags, Top-DJs am Wochenende. Do–Sa ab 18 Uhr bis zum Morgengrauen. Dresscode: smart elegant.',
      es: 'High Bar es un bar de cócteles en el piso 56 de la Torre Imperio en Moscú City. Diseño industrial combinado con elegancia europea eterna: muros de hormigón suavizados por sillones de terciopelo y esferas de araña doradas. Ventanales panorámicos del suelo al techo con vistas al skyline de Moscú. La carta de cócteles está organizada por épocas. El chef Dmitri Romanovsky diseñó un menú elegante. Música en vivo cada noche — jazz los jueves, DJs los fines de semana. Jue–sáb desde las 18h hasta el amanecer.',
      fr: 'High Bar est un bar à cocktails au 56e étage de la tour Empire à Moscow City. Design industriel et élégance européenne : murs de béton adoucis par des fauteuils de velours et des lustres dorés. Baies vitrées panoramiques sur la skyline moscovite. La carte des cocktails est classée par époque. Le chef Dmitri Romanovski a conçu un menu élégant. Musique live chaque soir — jazz le jeudi, DJs le week-end. Jeu–sam dès 18 h jusqu\'à l\'aube. Dress code : élégant.',
      zh: 'High Bar是莫斯科城帝国大厦56层的鸡尾酒吧。工业设计邂逅欧洲经典：水泥墙配天鹅绒扶手椅和金色球形吊灯。落地全景窗尽收莫斯科天际线。鸡尾酒单按时代排列，从18世纪到当代创意。大厨设计精致菜单。每晚现场音乐——周四爵士，周末顶级DJ。周四至周六18:00至天明。着装要求：优雅。',
      ja: 'ハイバーはモスクワ・シティのエンパイアタワー56階にあるカクテルバー。インダストリアルデザインとヨーロッパの格式が融合：コンクリート壁にベルベットのアームチェアとゴールドのシャンデリア。床から天井までのパノラマウィンドウがモスクワのスカイラインを映します。カクテルメニューは時代別に構成。シェフがプレミアム食材のエレガントなメニューを考案。毎晩ライブ——木曜はジャズ、週末はトップDJ。木〜土18時〜夜明けまで。ドレスコード：スマートエレガント。',
      ko: '하이 바는 모스크바 시티 엠파이어 타워 56층의 칵테일 바입니다. 인더스트리얼 디자인과 유럽 클래식의 만남: 콘크리트 벽에 벨벳 암체어와 골드 샹들리에. 바닥부터 천장까지 파노라마 창으로 모스크바 스카이라인 조망. 칵테일 메뉴는 시대별로 구성. 셰프가 프리미엄 식재료의 우아한 메뉴를 설계. 매일 저녁 라이브 음악——목요일 재즈, 주말 톱 DJ. 목~토 18시부터 새벽까지. 드레스 코드: 스마트 엘레건트.',
    },
  },

  'af-msk-zea-518657': {
    name: { en: 'Zea', de: 'Zea', es: 'Zea', fr: 'Zea', zh: 'Zea', ja: 'ゼア', ko: '제아' },
    description: {
      en: 'Zea is an elegant Mediterranean restaurant on Kutuzovsky Prospekt, occupying two floors of the Radisson Collection Hotel. The serene Mediterranean atmosphere is created through light, air, pastel tones, flowing forms, and natural materials. The menu focuses on seafood: raw oysters, sea urchins, scallops, Kamchatka crab, and seafood platters. Mains include Marseille bouillabaisse, spaghetti vongole, Andalusian octopus, Faroese salmon steak, and Burgundy-style lamb. The cocktail bar features signature Mediterranean-inspired creations and a wine list from Old and New World producers.',
      de: 'Zea ist ein elegantes Mittelmeerrestaurant am Kutusowski-Prospekt, das zwei Etagen des Radisson Collection Hotels belegt. Die gelassene Mittelmeeratmosphäre entsteht durch Licht, Luft, Pastelltöne und natürliche Materialien. Die Karte setzt auf Meeresfrüchte: rohe Austern, Seeigel, Jakobsmuscheln, Kamtschatka-Krabbe und Meeresfrüchteplatten. Hauptgerichte: Marseiller Bouillabaisse, Spaghetti Vongole, andalusischer Oktopus, Färöer-Lachs und Lamm bourguignonne. An der Bar: mediterran inspirierte Signature-Cocktails und Weine.',
      es: 'Zea es un elegante restaurante mediterráneo en el Prospekt Kutúzovski, que ocupa dos plantas del Hotel Radisson Collection. Atmósfera serena mediterránea con luz, aire, tonos pastel y materiales naturales. El menú se centra en mariscos: ostras, erizos, vieiras, cangrejo de Kamchatka y platos de mariscos. Principales: bullabesa marsellesa, espaguetis vongole, pulpo a la andaluza, salmón de las Feroe y cordero a la borgoñona. Bar con cócteles de autor y carta de vinos.',
      fr: 'Zea est un élégant restaurant méditerranéen sur le Prospekt Koutouzovski, occupant deux niveaux de l\'hôtel Radisson Collection. Atmosphère méditerranéenne sereine : lumière, air, tons pastel et matériaux naturels. La carte est axée sur les fruits de mer : huîtres, oursins, Saint-Jacques, crabe du Kamtchatka et plateaux de fruits de mer. Plats : bouillabaisse marseillaise, spaghetti vongole, poulpe andalou, saumon des Féroé et agneau bourguignon. Bar : cocktails signatures inspirés de la Méditerranée et carte des vins.',
      zh: 'Zea是库图佐夫大街丽笙精选酒店内的优雅地中海餐厅，占据两层空间。明亮通透、粉彩色调和天然材料营造宁静的地中海氛围。菜单以海鲜为主：生蚝、海胆、扇贝、堪察加螃蟹和海鲜拼盘。主菜有马赛鱼汤、蛤蜊意面、安达卢西亚章鱼、法罗三文鱼牛排和勃艮第羊肉。酒吧提供地中海风创意鸡尾酒和新旧世界酒庄的葡萄酒。',
      ja: 'ゼアはクトゥーゾフスキー通りのラディソン・コレクションホテル内にあるエレガントな地中海レストラン。光、空気、パステルトーン、天然素材で地中海の穏やかな雰囲気を演出。メニューはシーフード中心：生牡蠣、ウニ、ホタテ、カムチャッカガニ、シーフードプラッター。メインはマルセイユ風ブイヤベース、ボンゴレ、アンダルシア風タコ、フェロー産サーモン、ブルゴーニュ風ラム。バーには地中海インスパイアのシグネチャーカクテルとワインリスト。',
      ko: '제아는 쿠투조프스키 대로 래디슨 컬렉션 호텔 내 2개 층을 차지하는 우아한 지중해 레스토랑입니다. 빛, 공기, 파스텔 톤, 천연 소재로 평온한 지중해 분위기를 연출합니다. 메뉴는 해산물 중심: 생굴, 성게, 가리비, 캄차카 게, 해산물 플래터. 메인은 마르세유 부야베스, 봉골레 스파게티, 안달루시아 문어, 페로 연어, 부르고뉴 양고기. 바에는 지중해 영감의 시그니처 칵테일과 와인 리스트.',
    },
  },

  'af-msk-ruki-vverh-507909': {
    name: { en: 'Ruki Vverh! Bar', de: 'Ruki Vverh! Bar', es: 'Ruki Vverh! Bar', fr: 'Ruki Vverh! Bar', zh: '举起手来！酒吧', ja: 'ルキ・ヴェルフ！バー', ko: '루키 브베르흐! 바' },
    description: {
      en: '"Ruki Vverh! Bar" is a nostalgia-fueled restaurant, bar, and club by singer Sergey Zhukov that recreates the wild atmosphere of the Russian \'90s and 2000s. Rugs on walls, raspberry-colored blazers, cassettes, and Soviet arcade machines — all era-authentic. Karaoke with 3,000 songs, private karaoke rooms, weekend concerts and DJ parties. The bar serves signature cocktails with cult-classic names. The menu is styled like a youth magazine and features pasta, kebabs, party platters, and retro dinner sets with Olivier salad, herring under a fur coat, and more.',
      de: '„Ruki Vverh! Bar" ist ein nostalgisches Restaurant, Bar und Club von Sänger Sergej Schukow. Die wilde Atmosphäre der russischen 90er und 2000er wird nachempfunden: Teppiche an der Wand, himbeerfarbene Blazer, Kassetten und sowjetische Spielautomaten. Karaoke mit 3.000 Songs, private Karaoke-Räume, Wochenendkonzerte und DJ-Partys. Signature-Cocktails mit Kultnamen. Die Speisekarte im Jugendmagazin-Stil bietet Pasta, Schaschlik, Partyplatten und Retro-Menüs.',
      es: '«Ruki Vverh! Bar» es un restaurante-bar-club nostálgico del cantante Sergey Zhukov que recrea la atmósfera de los locos 90 y 2000 rusos. Alfombras en las paredes, blazers carmesí, casetes y máquinas recreativas soviéticas. Karaoke con 3.000 canciones, salas privadas, conciertos los fines de semana. El bar sirve cócteles con nombres de culto. El menú estilo revista juvenil ofrece pasta, kebabs, platos para compartir y sets retro con ensalada Olivier.',
      fr: '« Ruki Vverh! Bar » est un restaurant-bar-club nostalgique du chanteur Sergueï Joukov, qui recrée l\'ambiance folle des années 90-2000 russes. Tapis muraux, blazers framboise, cassettes et bornes d\'arcade soviétiques. Karaoké de 3 000 titres, salons privés, concerts et soirées DJ le week-end. Le bar sert des cocktails aux noms cultes. Le menu, façon magazine jeunesse, propose pâtes, brochettes, plateaux à partager et menus rétro avec salade Olivier.',
      zh: '"举起手来！酒吧"是歌手谢尔盖·茹科夫开设的怀旧餐厅、酒吧和俱乐部，重现90年代和2000年代的疯狂氛围。墙上挂毯、覆盆子色西装、磁带和苏联游戏机。3000首卡拉OK、私人包间、周末音乐会和DJ派对。酒吧提供以经典名曲命名的鸡尾酒。菜单模仿青春杂志风格，有意面、烤串、派对拼盘和含奥利维耶沙拉的复古套餐。',
      ja: '「ルキ・ヴェルフ！バー」は歌手セルゲイ・ジューコフが手がけるノスタルジックなレストラン＆バー＆クラブ。ロシアの90年代〜2000年代の雰囲気を再現：壁の絨毯、ラズベリー色のブレザー、カセット、ソビエトのゲーム機。3000曲のカラオケ、個室カラオケ、週末のコンサート＆DJパーティー。カルト的な名前のシグネチャーカクテル。ユースマガジン風メニューにパスタ、シャシリク、パーティープレート、オリヴィエサラダ付きレトロセット。',
      ko: '"루키 브베르흐! 바"는 가수 세르게이 주코프가 만든 노스탤지어 레스토랑·바·클럽으로, 90년대와 2000년대 러시아의 열광적인 분위기를 재현합니다. 벽의 카펫, 라즈베리색 블레이저, 카세트, 소련 아케이드 게임기. 3000곡 노래방, 프라이빗 노래방, 주말 콘서트와 DJ 파티. 컬트 클래식 이름의 시그니처 칵테일. 청춘 매거진 스타일 메뉴에 파스타, 케밥, 파티 플래터, 올리비에 샐러드가 포함된 레트로 세트.',
    },
  },

  'nedal-niy-vostok': {
    name: { en: 'Nedalny Vostok', de: 'Nedalny Vostok', es: 'Nedalny Vostok', fr: 'Nedalny Vostok', zh: '不远东方', ja: 'ネダーリニィ・ヴォストーク', ko: '네달니 보스토크' },
    description: {
      en: 'Nedalny Vostok is Arkady Novikov\'s pan-Asian restaurant that celebrated its 10th anniversary in 2017. Led by a duo of chefs — Li Kui Zhang for Chinese and Japanese cuisine, and Andrey Rostov for seasonal specials and a personalized approach — the menu spans wok dishes, dim sum, and fresh fish from the open counter, cooked to your preference. The interior, designed by Japanese bureau Superpotato (Zuma, Roka), uses all natural materials. The open kitchen sits a step below the main hall, placing diners eye-level with the chefs. A banquet hall with stage and professional sound seats 90.',
      de: 'Nedalny Vostok ist Arkadij Nowikows panasiatisches Restaurant, das 2017 sein 10-jähriges Jubiläum feierte. Zwei Küchenchefs — Li Kui Zhang für chinesische und japanische Küche, Andrej Rostow für saisonale Menüs — bieten Wok-Gerichte, Dim Sum und frischen Fisch vom offenen Tresen. Das vom japanischen Büro Superpotato (Zuma, Roka) gestaltete Interieur aus Naturmaterialien. Die offene Küche liegt eine Stufe tiefer, sodass Gäste den Köchen auf Augenhöhe zusehen.',
      es: 'Nedalny Vostok es el restaurante panasiático de Arkady Novikov, que celebró su 10.º aniversario en 2017. Dirigido por un dúo de chefs — Li Kui Zhang (cocina china y japonesa) y Andrey Rostov (especialidades de temporada) — el menú abarca wok, dim sum y pescado fresco del mostrador abierto. Interior diseñado por el estudio japonés Superpotato (Zuma, Roka) con materiales naturales. La cocina abierta está un escalón más abajo, a la altura de los ojos de los comensales.',
      fr: 'Nedalny Vostok est le restaurant pan-asiatique d\'Arkady Novikov, qui a fêté ses 10 ans en 2017. Deux chefs — Li Kui Zhang pour la cuisine chinoise et japonaise, Andreï Rostov pour les plats saisonniers — signent une carte de wok, dim sum et poissons frais. L\'intérieur, conçu par le cabinet japonais Superpotato (Zuma, Roka), est entièrement en matériaux naturels. La cuisine ouverte est en contrebas, au niveau des yeux des convives. Salle de banquet de 90 places avec scène.',
      zh: '不远东方是阿尔卡季·诺维科夫的泛亚洲餐厅，2017年庆祝十周年。双主厨阵容——李奎章负责中日菜，安德烈·罗斯托夫负责季节特供。菜单涵盖炒锅菜、点心和开放柜台的鲜鱼。日本建筑事务所Superpotato（Zuma、Roka）设计的全天然材料内装。开放式厨房低于大厅一级，食客与厨师视线平齐。90人宴会厅配舞台和专业音响。',
      ja: 'ネダーリニィ・ヴォストークはアルカディ・ノヴィコフのパンアジアンレストラン、2017年に10周年。ダブルシェフ体制——李奎章が中華＆和食、アンドレイ・ロストフが季節メニュー担当。ウォック、点心、オープンカウンターの鮮魚をお好みで調理。日本のSuperpotato（Zuma、Roka）がデザインした天然素材の内装。オープンキッチンはホールより一段低く、ゲストとシェフが同じ目線に。90席のバンケットホールも。',
      ko: '네달니 보스토크는 아르카디 노비코프의 범아시아 레스토랑으로, 2017년 10주년을 맞았습니다. 듀오 셰프 체제——리쿠이장이 중일 요리, 안드레이 로스토프가 시즌 스페셜 담당. 메뉴는 웍, 딤섬, 오픈 카운터 생선 요리. 일본 건축사무소 수퍼포테이토(Zuma, Roka)가 천연 소재로 디자인한 인테리어. 오픈 키친은 홀보다 한 단 낮아 셰프와 눈높이가 같습니다. 90석 연회장에 무대와 전문 음향 장비.',
    },
  },

  'everest-siberia': {
    name: { en: 'Everest Siberia', de: 'Everest Siberia', es: 'Everest Siberia', fr: 'Everest Siberia', zh: '珠峰西伯利亚', ja: 'エベレスト シベリア', ko: '에베레스트 시베리아' },
    description: {
      en: 'Everest Siberia is a two-level lounge with tobacco-free steam cocktails and a full kitchen on Sadovaya-Triumfalnaya. The design blends futuristic forms with Siberian ethnic motifs: fantastical columns and chandeliers, carved wood, botanical ornaments. Masters mix steam cocktails on classic bowls, grapefruit, or pomegranate, including a special Siberian collection. The kitchen\'s specialty is local game: reindeer tartare, Altai maral dumplings, wild boar stew, frozen mukhsun fish. The bar features themed mixes like "Forester" with mandarin and fir, "Apiary" on honey liqueur, and "Taiga Spritz." The tea collection includes 15-year puerh and monastery blends.',
      de: 'Everest Siberia ist eine zweigeschossige Lounge mit tabakfreien Dampfcocktails und vollständiger Küche an der Sadowaja-Triumfalnaja. Das Design verbindet futuristische Formen mit sibirischen Ethno-Motiven. Dampfcocktails auf klassischer Schale, Grapefruit oder Granatapfel, darunter eine sibirische Sonderedition. Spezialität: Wildgerichte — Rentiertatar, Altai-Maral-Pelmeni, Wildschweineintopf, gefrorener Mukhsun. Themen-Drinks wie „Förster" und „Taiga Spritz". Teekollektion mit 15-Jahres-Puerh.',
      es: 'Everest Siberia es un lounge de dos niveles con cócteles de vapor sin tabaco y cocina completa en Sadovaya-Triumfalnaya. El diseño combina formas futuristas con motivos étnicos siberianos. Cócteles de vapor en cuenco, pomelo o granada, incluida una colección siberiana especial. Especialidad: caza local — tartar de reno, pelmeni de maral del Altái, estofado de jabalí, mukhsun crudo congelado. Cócteles temáticos como "Guardabosques" y "Spritz de taiga". Colección de tés con puerh de 15 años.',
      fr: 'Everest Siberia est un lounge sur deux niveaux avec cocktails vapeur sans tabac et cuisine complète sur Sadovaïa-Triumfalnaïa. Le design mêle formes futuristes et motifs ethniques sibériens. Cocktails vapeur sur bol, pamplemousse ou grenade, dont une collection sibérienne. Spécialité : gibier local — tartare de renne, pelmenis de maral de l\'Altaï, ragoût de sanglier, sugudaï de mouksoun. Cocktails thématiques comme « Forestier » et « Spritz de la taïga ». Collection de thés dont un puerh de 15 ans.',
      zh: '珠峰西伯利亚是凯旋花园街的双层休闲吧，提供无烟草蒸汽鸡尾酒和完整厨房。设计融合未来主义与西伯利亚民族元素。蒸汽鸡尾酒使用经典碗、柚子或石榴，含西伯利亚特别系列。厨房特色是当地野味：驯鹿鞑靼、阿尔泰马鹿饺子、野猪炖肉、冻白鲑生鱼片。主题鸡尾酒有"护林员"和"针叶林气泡酒"。茶系列有15年普洱和修道院草药茶。',
      ja: 'エベレスト シベリアはサドーヴァヤ＝トリウムファーリナヤにある2フロアのラウンジ。タバコフリーのスチームカクテルとフルキッチンを備え、シベリアの民族モチーフとフューチャリスティックなデザインが融合。スチームカクテルはクラシックボウル、グレープフルーツ、ザクロで、シベリアンコレクションも。キッチンのスペシャリティはジビエ：トナカイタルタル、アルタイマラル餃子、猪シチュー、ムクスン刺身。テーマカクテル「フォレスター」「タイガスプリッツ」。15年プーアル茶のコレクションも。',
      ko: '에베레스트 시베리아는 사도바야-트리움팔나야의 2층 라운지로, 무연초 스팀 칵테일과 풀 키친을 갖추고 있습니다. 미래적 형태와 시베리아 민족 모티프가 결합된 디자인. 클래식 볼, 자몽, 석류로 만드는 스팀 칵테일과 시베리아 스페셜 컬렉션. 키친 스페셜티는 현지 야생 요리: 순록 타르타르, 알타이 사슴 만두, 멧돼지 스튜, 무크순 생선회. 테마 칵테일 "포레스터"와 "타이가 스프리츠". 15년 숙성 보이차 컬렉션도.',
    },
  },

  'pritcha': {
    name: { en: 'Pritcha', de: 'Pritscha', es: 'Pritcha', fr: 'Pritcha', zh: '寓言', ja: 'プリチャ', ko: '프리차' },
    description: {
      en: '"Pritcha" is an elegant Russian cuisine restaurant on Smolenskaya Square. The interior weaves Russian tradition and modernity: light carved shutters, kokoshnik-shaped mirrors, and decorative carved elements. The menu presents Russian classics reimagined: oxtail aspic and roasted pumpkin salad with goat cheese for starters; reindeer ragout and lamb tongues in ginger sauce for mains. They cook tsarskaya fish soup, make blini with duck and smoked mackerel, shape pelmeni from bird-cherry flour, and bake pies. The bar features signature cocktails named after Russian fairy tales — "Firebird\'s Seed" on mushroom-infused rye distillate and "Ivan Tsarevich" on birch distillate with pine foam and lingonberry.',
      de: '„Pritscha" ist ein elegantes russisches Restaurant am Smolenskaja-Platz. Das Interieur verwebt russische Tradition und Moderne: geschnitzte Fensterläden, kokoshnik-förmige Spiegel, dekorative Schnitzereien. Die Speisekarte interpretiert russische Klassiker neu: Ochsenschwanz-Sülze, Kürbissalat mit Ziegenkäse, Rentier-Ragout, Lammzunge in Ingwersoße. Zaren-Fischsuppe, Blini mit Ente, Pelmeni aus Traubenkirschmehl. Cocktails nach russischen Märchen benannt.',
      es: '«Pritcha» es un elegante restaurante de cocina rusa en la plaza Smolénskaya. El interior entrelaza tradición rusa y modernidad: contraventanas talladas, espejos en forma de kokoshnik y elementos decorativos tallados. El menú reinterpreta clásicos rusos: aspic de rabo de buey, ensalada de calabaza asada con queso de cabra; ragú de reno y lenguas de cordero en salsa de jengibre. Preparan sopa de pescado imperial, blinis con pato, pelmeni de harina de cerezo y pasteles. Cócteles con nombres de cuentos rusos.',
      fr: '« Pritcha » est un élégant restaurant de cuisine russe sur la place Smolenskaïa. L\'intérieur mêle tradition russe et modernité : volets sculptés, miroirs en forme de kokochnik, éléments décoratifs ciselés. La carte réinterprète les classiques russes : aspic de queue de bœuf, salade de potiron au fromage de chèvre ; ragoût de renne, langues d\'agneau au gingembre. Soupe de poisson tsarienne, blinis au canard, pelmenis à la farine de merisier, pirojkis. Cocktails aux noms de contes russes.',
      zh: '"寓言"是斯摩棱斯克广场上优雅的俄式餐厅。室内将俄罗斯传统与现代交融：精雕百叶窗、科科什尼克形镜子和装饰雕花。菜单重新演绎俄式经典：前菜有牛尾肉冻和烤南瓜山羊奶酪沙拉；主菜有驯鹿炖肉和姜汁羊舌。还有沙皇鱼汤、鸭肉薄饼、鸟樱桃面粉饺子和各种馅饼。酒吧以俄罗斯童话命名的创意鸡尾酒。',
      ja: '「プリチャ」はスモレンスカヤ広場にあるエレガントなロシア料理レストラン。ロシアの伝統と現代が織りなすインテリア：彫刻の窓板、ココシュニク型ミラー、装飾彫刻。メニューはロシアンクラシックを再解釈：オックステールのアスピック、パンプキンサラダ、トナカイのラグー、ジンジャーソースのラムタン。皇帝風フィッシュスープ、ダック入りブリヌイ、バードチェリー粉のペリメニ。ロシア童話にちなんだシグネチャーカクテル。',
      ko: '"프리차"는 스몰렌스카야 광장의 우아한 러시아 요리 레스토랑입니다. 러시아 전통과 현대가 어우러진 인테리어: 조각 셔터, 코코시니크 모양 거울, 장식 조각. 메뉴는 러시아 클래식을 재해석: 소꼬리 젤리, 구운 호박과 염소 치즈 샐러드, 순록 라구, 생강 소스 양 혀. 황제식 생선 수프, 오리 블리니, 벚나무 가루 펠메니. 러시아 동화 이름의 시그니처 칵테일.',
    },
  },

  'af-msk-pepe-nero-455579': {
    name: { en: 'Pepe Nero', de: 'Pepe Nero', es: 'Pepe Nero', fr: 'Pepe Nero', zh: 'Pepe Nero', ja: 'ペペ ネロ', ko: '페페 네로' },
    description: {
      en: 'Pepe Nero, formerly "Roberto," is an authentic Italian restaurant on Kadashevskaya Embankment, run by Italians Maurizio Pizzuti and Francesco Voce. They have been in Moscow\'s restaurant business since the early 2000s. Maurizio comes from a family of hereditary restaurateurs near Rome. Francesco is a genuine Italian chef who trained at the Barilla Academy in Parma and prefers classic recipes without excessive experimentation. In Moscow, few restaurants have both a native Italian owner and chef, so the authenticity of recipes is guaranteed.',
      de: 'Pepe Nero, ehemals „Roberto", ist ein authentisches italienisches Restaurant an der Kadaschjowskaja-Uferstraße, geführt von den Italienern Maurizio Pizzuti und Francesco Voce. Seit Anfang der 2000er im Moskauer Gastronomiegeschäft. Maurizio stammt aus einer Restaurateursfamilie bei Rom. Francesco ist gebürtiger italienischer Koch, ausgebildet an der Barilla-Akademie in Parma und bevorzugt klassische Rezepte. In Moskau gibt es wenige Restaurants mit italienischem Besitzer und Koch — Authentizität garantiert.',
      es: 'Pepe Nero, antes «Roberto», es un restaurante italiano auténtico en el malecón Kadashévskaya, dirigido por los italianos Maurizio Pizzuti y Francesco Voce. Llevan en el negocio gastronómico de Moscú desde principios de los 2000. Maurizio proviene de una familia de restauradores cerca de Roma. Francesco es un chef italiano de formación clásica que estudió en la Academia Barilla de Parma. En Moscú, pocos restaurantes tienen dueño y chef italianos — la autenticidad está garantizada.',
      fr: 'Pepe Nero, ex-« Roberto », est un restaurant italien authentique sur le quai Kadachiovskaïa, tenu par les Italiens Maurizio Pizzuti et Francesco Voce. Dans la restauration moscovite depuis le début des années 2000. Maurizio est issu d\'une famille de restaurateurs près de Rome. Francesco est un vrai chef italien formé à l\'Académie Barilla de Parme, adepte des recettes classiques. À Moscou, rares sont les restaurants avec propriétaire et chef tous deux italiens — authenticité assurée.',
      zh: 'Pepe Nero（前身为"罗伯托"）是卡达舍夫斯卡亚河堤上由意大利人毛里齐奥·皮祖蒂和弗朗切斯科·沃切经营的正宗意大利餐厅。两人自2000年代初在莫斯科从事餐饮业。毛里齐奥来自罗马附近的餐饮世家。弗朗切斯科是正宗意大利主厨，曾在帕尔马百味来学院进修，偏好经典食谱。在莫斯科，老板和主厨都是意大利人的餐厅很少——食谱的正宗性有保障。',
      ja: 'ペペ ネロ（旧「ロベルト」）はカダシェフスカヤ河岸通りにある本格イタリアンレストラン。イタリア人のマウリツィオ・ピッツーティとフランチェスコ・ヴォチェが経営。2000年代初頭からモスクワのレストラン業界に。マウリツィオはローマ近郊のレストラン一家出身。フランチェスコはパルマのバリラ・アカデミーで学んだ正真正銘のイタリアンシェフで、クラシックレシピを信条に。モスクワでオーナーもシェフもイタリア人という店は希少——レシピの本場感は折り紙付き。',
      ko: '페페 네로(구 "로베르토")는 카다셰프스카야 강변의 정통 이탈리안 레스토랑으로, 이탈리아인 마우리치오 피추티와 프란체스코 보체가 운영합니다. 2000년대 초부터 모스크바 레스토랑 업계에서 활동. 마우리치오는 로마 근처 레스토랑 가문 출신. 프란체스코는 파르마 바릴라 아카데미에서 수학한 정통 이탈리안 셰프로 클래식 레시피를 고수합니다. 모스크바에서 오너와 셰프 모두 이탈리아인인 레스토랑은 드물어 정통성이 보장됩니다.',
    },
  },

  'af-msk-lele-kitchen-wine-496376': {
    name: { en: 'Lele Kitchen & Wine', de: 'Lele Kitchen & Wine', es: 'Lele Kitchen & Wine', fr: 'Lele Kitchen & Wine', zh: 'Lele 厨房&酒', ja: 'Lele Kitchen & Wine', ko: 'Lele Kitchen & Wine' },
    description: {
      en: 'Lele Kitchen & Wine is an elegant gastro-bar with European cuisine on Sadovaya-Karetnaya. Chef Konstantin Atmadjan crafted a menu of Italian and French dishes in masterful interpretations: beef tartare, salade Niçoise, orange teriyaki salmon with Kenyan beans, and oxtail pie. The wine list was personally curated by owners Leonid and Valeria — a warm father-daughter story filled with love of travel and wine. The bar features signature cocktails in original presentations. A designer wine cabinet takes pride of place in the main hall.',
      de: 'Lele Kitchen & Wine ist eine elegante Gastrobar mit europäischer Küche an der Sadowaja-Karetnaja. Küchenchef Konstantin Atmadschan schuf eine Karte mit italienischen und französischen Gerichten: Rindertatar, Nizza-Salat, Orangen-Teriyaki-Lachs und Ochsenschwanz-Pastete. Die Weinkarte wurde persönlich von den Besitzern Leonid und Waleria kuratiert. An der Bar: Signature-Cocktails. Ein Designer-Weinschrank ziert den Hauptsaal.',
      es: 'Lele Kitchen & Wine es un elegante gastrobar de cocina europea en Sadovaya-Karétnaya. El chef Konstantin Atmadjan diseñó un menú de platos italianos y franceses: tartar de ternera, ensalada niçoise, salmón teriyaki con naranja y pastel de rabo de buey. La carta de vinos fue seleccionada personalmente por los propietarios Leonid y Valeria. El bar ofrece cócteles de autor. Un vinoteca de diseño preside la sala principal.',
      fr: 'Lele Kitchen & Wine est un élégant gastrobar de cuisine européenne sur Sadovaïa-Karetnaïa. Le chef Konstantin Atmadjan a créé une carte franco-italienne : tartare de bœuf, salade niçoise, saumon teriyaki orange et tourte de queue de bœuf. La carte des vins est sélectionnée par les propriétaires Léonid et Valéria. Le bar propose des cocktails signatures. Une vitrine à vin design trône dans la salle principale.',
      zh: 'Lele Kitchen & Wine是花园-卡列特纳亚街的优雅欧式美食酒吧。主厨设计了意法菜单：牛肉鞑靼、尼斯沙拉、橙香照烧三文鱼和牛尾派。酒单由老板父女亲自挑选。酒吧提供创意鸡尾酒。大厅中央有设计师酒柜。',
      ja: 'Lele Kitchen & Wineはサドーヴァヤ・カレトナヤにあるエレガントなヨーロピアンガストロバー。シェフがイタリアン＆フレンチメニューを考案：ビーフタルタル、ニース風サラダ、オレンジ照り焼きサーモン、オックステールパイ。ワインリストはオーナー親子が厳選。シグネチャーカクテルも。メインホールにはデザイナーワインキャビネット。',
      ko: 'Lele Kitchen & Wine은 사도바야-카레트나야의 우아한 유럽 가스트로바입니다. 셰프가 이탈리안·프렌치 메뉴를 설계: 비프 타르타르, 니수아즈 샐러드, 오렌지 데리야키 연어, 소꼬리 파이. 와인 리스트는 오너 부녀가 직접 큐레이팅. 시그니처 칵테일도 제공. 메인 홀에 디자이너 와인 캐비닛.',
    },
  },

  'af-msk-original-519134': {
    name: { en: 'Original', de: 'Original', es: 'Original', fr: 'Original', zh: '原创', ja: 'オリジナル', ko: '오리지널' },
    description: {
      en: '"Original" is an Italian restaurant and bar with weekend parties near Kurskaya. Restaurateur Alexey Olkhovy\'s project occupies a historic railway depot building. Scandinavian-style interiors are enhanced by greenery, contemporary paintings, and views of the railway tracks. Chef Andrey Lapin presents Italian classics and signature dishes: handmade pasta, beef tartare with artichoke cream, chicken tagliata with chanterelles. Desserts include truffle tiramisu, grapefruit sabayon with brioche, and gelato. The bar opens with aperitif mixes and pours wines by the glass.',
      de: '„Original" ist ein italienisches Restaurant und Bar mit Wochenendpartys nahe Kurskaja. Das Projekt des Restaurateurs Alexej Olchowoi befindet sich in einem historischen Eisenbahndepot. Skandinavisches Interieur mit Grün, zeitgenössischer Kunst und Blick auf die Gleise. Küchenchef Andrej Lapin serviert italienische Klassiker und Autorgerichte: handgemachte Pasta, Rindertatar mit Artischockencreme, Hähnchen-Tagliata mit Pfifferlingen. Desserts: Trüffel-Tiramisu, Grapefruit-Sabayon. Bar mit Aperitif-Mixen und Wein glasweise.',
      es: '«Original» es un restaurante italiano y bar con fiestas los fines de semana cerca de Kurskaya. El proyecto del restaurador Alexey Olkhovy ocupa un histórico depósito ferroviario. Interiores escandinavos con vegetación, arte contemporáneo y vistas a las vías del tren. El chef Andrey Lapin presenta clásicos italianos y platos de autor: pasta hecha a mano, tartar de ternera con crema de alcachofa, tagliata de pollo con rebozuelos. Postres: tiramisú de trufa, sabayón de pomelo. Bar con aperitivos y vinos por copa.',
      fr: '« Original » est un restaurant italien et bar avec soirées le week-end près de Kourskaïa. Le projet du restaurateur Alexeï Olkhovy occupe un ancien dépôt ferroviaire. Intérieurs scandinaves, verdure, art contemporain et vue sur les voies. Le chef Andreï Lapine propose classiques italiens et créations : pâtes faites main, tartare au cœur d\'artichaut, tagliata de poulet aux girolles. Desserts : tiramisu à la truffe, sabayon pamplemousse. Bar : aperitifs et vins au verre.',
      zh: '"原创"是库尔斯卡亚附近的意大利餐厅和酒吧，周末有派对。餐厅位于历史铁路仓库建筑中。斯堪的纳维亚风格内装配以绿植、当代画作和铁路景观。主厨呈现意式经典和创意菜：手工意面、洋蓟奶油牛肉鞑靼、鸡油菌鸡肉塔利亚塔。甜品有松露提拉米苏、西柚萨巴雍。酒吧提供餐前酒和杯装葡萄酒。',
      ja: '「オリジナル」はクルスカヤ近くの週末パーティー付きイタリアンレストラン＆バー。歴史的な鉄道機関庫を改装。スカンジナビアンインテリアにグリーン、コンテンポラリーアート、線路のビュー。シェフがイタリアンクラシック＆シグネチャーを提供：手打ちパスタ、アーティチョーククリームのビーフタルタル、シャントレル添えチキンタリアータ。デザートはトリュフティラミス、グレープフルーツサバイヨン。バーにはアペリティフミックスとグラスワイン。',
      ko: '"오리지널"은 쿠르스카야 근처의 주말 파티가 있는 이탈리안 레스토랑 겸 바입니다. 역사적인 철도 차고 건물을 리모델링. 스칸디나비안 인테리어에 녹색 식물, 현대 미술, 철로 뷰. 셰프가 이탈리안 클래식과 시그니처 요리 제공: 수제 파스타, 아티초크 크림 비프 타르타르, 살구버섯 치킨 탈리아타. 디저트는 트러플 티라미수, 자몽 사바욘. 바에는 아페리티프 믹스와 잔 와인.',
    },
  },

};

async function run() {
  await pgDS.initialize();
  console.log('Connected');
  let ok = 0, nf = 0;
  for (const [slug, tr] of Object.entries(T)) {
    const r = await pgDS.query('UPDATE restaurants SET translations = $1 WHERE slug = $2 RETURNING id', [JSON.stringify(tr), slug]);
    if (r.length) { console.log(`  ✓ ${slug}`); ok++; } else { console.log(`  ✗ ${slug}`); nf++; }
  }
  console.log(`\nDone! Updated: ${ok}, Not found: ${nf}`);
  await pgDS.destroy();
}
run().catch(e => { console.error(e); process.exit(1); });
