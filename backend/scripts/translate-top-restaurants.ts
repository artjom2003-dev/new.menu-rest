/**
 * Translate top restaurants (name + description) to 7 languages (ru is original).
 * Languages: en, de, es, fr, zh, ja, ko
 * Run: cd backend && npx ts-node scripts/translate-top-restaurants.ts
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

// ─── Translations: { slug: { name: {lang: str}, description: {lang: str} } }
const TRANSLATIONS: Record<string, { name: Record<string, string>; description: Record<string, string> }> = {

  // ══════════════════════════════════════════════════════════════
  // PINNED RESTAURANTS (always show on homepage)
  // ══════════════════════════════════════════════════════════════

  'khmeli-suneli-sochi': {
    name: {
      en: 'Khmeli & Suneli',
      de: 'Chmeli & Suneli',
      es: 'Jmeli & Suneli',
      fr: 'Khmeli & Suneli',
      zh: '赫梅利&苏内利',
      ja: 'フメリ＆スネリ',
      ko: '흐멜리 & 수넬리',
    },
    description: {
      en: '"Khmeli & Suneli" is a colorful Caucasian restaurant near the Sea Port in Sochi. Chef Arkadiy Arutyunyan\'s diverse menu features all the popular hits: from Georgian khachapuri and khinkali to an array of kebabs, shawarma, and chebureki. Another highlight is the house-made sausages. The bar offers a wide selection of homemade infusions and four cocktail sections: signature, classic, aperitif, and brand collaborations. Every day from 10 AM, "Khmeli & Suneli" serves sparkling breakfasts. The ambiance is set by woven chandeliers, lush greenery, jugs with national motifs, and a photogenic terrace with seasonal fruits. Entertainment includes live concerts and a children\'s room. In warm season, a terrace is open.',
      de: '«Chmeli & Suneli» ist ein farbenfrohes kaukasisches Restaurant in der Nähe des Seehafens in Sotschi. Küchenchef Arkadij Arutjunjan hat alle beliebten Hits in seiner abwechslungsreichen Speisekarte versammelt: von georgischen Chatschapuri und Chinkali bis hin zu diversen Schaschlik-Spießen, Schawarma, Kebabs und Tschebureki. Eine weitere Besonderheit sind die hausgemachten Würste. Die Barkarte bietet eine große Auswahl an selbstgemachten Aufgesetzten und vier Cocktailkategorien: Signature, Klassiker, Aperitif und Markenkooperationen. Jeden Morgen ab 10 Uhr gibt es prickelnde Frühstücke. Das Ambiente wird durch geflochtene Kronleuchter, üppiges Grün, Krüge mit folkloristischen Motiven und eine fotogene Terrasse mit saisonalem Obst und Gemüse geschaffen. Unterhaltung bieten Konzerte und ein Kinderzimmer. In der warmen Jahreszeit ist die Terrasse geöffnet.',
      es: '«Jmeli & Suneli» es un pintoresco restaurante de cocina caucásica cerca del Puerto Marítimo de Sochi. El chef Arkadiy Arutyunyan ha reunido en su variado menú todos los éxitos populares: desde jachapuri y jinkali georgianos hasta todo tipo de kebabs, shawarma y chebureki. Otra atracción son los embutidos de elaboración propia. La carta de bar ofrece una amplia selección de licores caseros y cuatro secciones de cócteles: de autor, clásicos, aperitivos y en colaboración con marcas reconocidas. Cada día desde las 10 de la mañana sirven desayunos con espumoso. El ambiente lo crean los detalles: lámparas de mimbre, vegetación natural, jarras con motivos nacionales y una fotogénica terraza con frutas y verduras de temporada. En el programa de entretenimiento hay conciertos y una sala infantil. En temporada cálida funciona la terraza.',
      fr: '« Khmeli & Suneli » est un restaurant caucasien haut en couleur, situé non loin du Port Maritime de Sotchi. Le chef Arkadiy Arutyunyan a réuni tous les grands classiques dans son menu varié : des khatchapouri et khinkali géorgiens aux brochettes, chawarmas, kébabs et tchebourekis. Autre curiosité : les saucisses maison. Au bar, un large choix de liqueurs artisanales et quatre rubriques de cocktails : signatures, classiques, apéritifs et créations en collaboration avec des marques réputées. Tous les jours dès 10 h, « Khmeli & Suneli » propose des petits-déjeuners pétillants. Le décor est façonné par des lustres tressés, une verdure luxuriante, des cruches aux motifs traditionnels et une terrasse photogénique garnie de fruits et légumes de saison. Au programme : concerts et espace enfants. Aux beaux jours, la terrasse est ouverte.',
      zh: '"赫梅利&苏内利"是索契海港附近一家色彩缤纷的高加索餐厅。主厨阿尔卡季·阿鲁秋尼扬在丰富的菜单中汇集了所有热门菜品：从格鲁吉亚哈恰普里和灌汤包到各种烤肉串、沙瓦尔玛、烤肉饼和炸饺。另一特色是自制香肠。酒水单提供大量自酿果酒和四类鸡尾酒：招牌、经典、开胃和品牌联名。每天早上10点起供应起泡早餐。编织吊灯、翠绿植物、民族风格水壶和铺满时令水果蔬菜的阳台共同营造出迷人氛围。娱乐节目包括音乐会和儿童游乐室。暖季开放露台。',
      ja: '「フメリ＆スネリ」はソチの海港近くにある色彩豊かなコーカサス料理レストラン。シェフのアルカディ・アルチュニャンが多彩なメニューに人気料理を集めました。ジョージアのハチャプリやヒンカリから、さまざまなシャシリク、シャワルマ、ケバブ、チェブレキまで。もう一つの名物は自家製ソーセージ。バーには自家製リキュールの豊富なセレクションと、シグネチャー、クラシック、アペリティフ、ブランドコラボの4セクションのカクテルがあります。毎朝10時からスパークリング朝食を提供。編み込みのシャンデリア、生き生きとした緑、民族モチーフの水差し、季節の果物で彩られたフォトジェニックなテラスが雰囲気を演出。コンサートやキッズルームも。暖かい季節にはテラスがオープン。',
      ko: '"흐멜리 & 수넬리"는 소치 해항 근처의 화려한 캅카스 레스토랑입니다. 셰프 아르카디 아루튜냔이 다채로운 메뉴에 인기 요리를 모두 모았습니다. 조지아 하차푸리와 힌칼리부터 다양한 샤슬릭, 샤와르마, 케밥, 체부레키까지. 또 하나의 자랑은 자가제 소시지입니다. 바에는 자가제 리큐어와 시그니처, 클래식, 아페리티프, 브랜드 콜라보 4개 섹션의 칵테일이 있습니다. 매일 오전 10시부터 스파클링 아침 식사를 제공합니다. 편직 샹들리에, 싱싱한 녹색 식물, 민속 모티프 항아리, 제철 과일과 채소로 장식된 포토제닉한 테라스가 분위기를 연출합니다. 콘서트와 키즈룸도 마련되어 있으며, 따뜻한 계절에는 테라스가 운영됩니다.',
    },
  },

  'mango-moscow': {
    name: {
      en: 'Mango',
      de: 'Mango',
      es: 'Mango',
      fr: 'Mango',
      zh: '芒果',
      ja: 'マンゴー',
      ko: '망고',
    },
    description: {
      en: 'Restaurant "Mango" is located near the Preobrazhenskaya Ploshchad metro station. Wonderful cuisine and a cozy atmosphere await you. Every day our restaurant serves business lunches and more. "Mango" is the perfect venue for celebrations, banquets, and receptions. We are open every weekday from 12:00 to 20:00. We look forward to your visit!',
      de: 'Das Restaurant „Mango" befindet sich unweit der Metrostation Preobraschenskaja Ploschtschad. Es erwarten Sie eine wunderbare Küche und eine angenehme Atmosphäre. Jeden Tag servieren wir Business-Lunch und vieles mehr. „Mango" ist der ideale Ort für Feiern, Bankette und Empfänge. Wir haben werktags von 12:00 bis 20:00 Uhr geöffnet. Wir freuen uns auf Ihren Besuch!',
      es: 'El restaurante «Mango» está situado cerca de la estación de metro Preobrazhánskaya Plóshchad. Les esperan una cocina exquisita y un ambiente agradable. Cada día nuestro restaurante ofrece almuerzos ejecutivos y mucho más. «Mango» es el lugar ideal para celebraciones, banquetes y recepciones. Abrimos de lunes a viernes de 12:00 a 20:00. ¡Los esperamos!',
      fr: 'Le restaurant « Mango » est situé près de la station de métro Preobrazhenskaïa Plochtchad. Une cuisine merveilleuse et une ambiance chaleureuse vous y attendent. Chaque jour, notre restaurant propose des déjeuners d\'affaires et bien plus encore. « Mango » est l\'endroit idéal pour les célébrations, banquets et réceptions. Nous sommes ouverts en semaine de 12 h à 20 h. Au plaisir de vous accueillir !',
      zh: '"芒果"餐厅位于普列奥布拉任斯卡娅广场地铁站附近。美味佳肴和温馨氛围恭候您的到来。我们的餐厅每天提供商务午餐等多种选择。"芒果"是举办庆典、宴会和招待会的理想场所。工作日营业时间为12:00至20:00。欢迎光临！',
      ja: 'レストラン「マンゴー」はプレオブラジェンスカヤ広場駅のすぐそばにあります。素晴らしい料理と心地よい雰囲気がお待ちしています。毎日ビジネスランチをはじめ多彩なメニューをご用意。「マンゴー」はお祝い事、宴会、レセプションに最適な場所です。平日12:00～20:00営業。皆さまのお越しをお待ちしております！',
      ko: '"망고" 레스토랑은 프레오브라젠스카야 광장 지하철역 근처에 위치해 있습니다. 훌륭한 요리와 쾌적한 분위기가 여러분을 기다립니다. 매일 비즈니스 런치를 비롯한 다양한 메뉴를 제공합니다. "망고"는 축하 행사, 연회, 리셉션을 위한 완벽한 장소입니다. 평일 12:00~20:00 영업합니다. 여러분의 방문을 기다립니다!',
    },
  },

  'black-market': {
    name: {
      en: 'Black Market',
      de: 'Black Market',
      es: 'Black Market',
      fr: 'Black Market',
      zh: '黑市场',
      ja: 'ブラックマーケット',
      ko: '블랙 마켓',
    },
    description: {
      en: 'High ceilings, a glass wall overlooking the park, industrial shelving lined with tin cans, and diner-style booths. The burgers are as top-notch as Corner\'s, and the desserts rival those at UDC Café.',
      de: 'Hohe Decken, eine Glaswand mit Blick auf den Park, industrielle Regale mit Blechdosen und Sitzbänke im Diner-Stil. Die Burger sind ebenso hochwertig wie bei Corner, die Desserts ebenso gut wie im UDC Café.',
      es: 'Techos altos, un muro de cristal con vistas al parque, estanterías industriales con hileras de latas y sofás al estilo de un diner americano. Las hamburguesas son tan buenas como las de Corner, y los postres están a la altura de los de UDC Café.',
      fr: 'Hauts plafonds, baie vitrée donnant sur le parc, étagères industrielles garnies de conserves et banquettes façon diner américain. Les burgers sont aussi bons que chez Corner et les desserts rivalisent avec ceux de l\'UDC Café.',
      zh: '高耸的天花板、面向公园的玻璃幕墙、摆满铁罐的工业货架和美式餐厅风格的卡座。汉堡品质堪比Corner，甜点不输UDC咖啡馆。',
      ja: '高い天井、公園を望むガラスウォール、缶詰が並ぶインダストリアルな棚、ダイナースタイルのブース席。バーガーはCornerに負けないクオリティ、デザートはUDCカフェに引けを取りません。',
      ko: '높은 천장, 공원이 보이는 유리벽, 깡통이 줄지어 선 산업용 선반, 다이너 스타일의 부스 좌석. 버거는 Corner 못지않은 퀄리티, 디저트는 UDC 카페에 뒤지지 않습니다.',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // TOP RESTAURANTS WITH RICH DESCRIPTIONS & PHOTOS
  // ══════════════════════════════════════════════════════════════

  'rc-krd-gogol-3': {
    name: {
      en: 'Gogol',
      de: 'Gogol',
      es: 'Gógol',
      fr: 'Gogol',
      zh: '果戈理',
      ja: 'ゴーゴリ',
      ko: '고골',
    },
    description: {
      en: '"Gogol" is a new restaurant of classic Russian cuisine on the street of the same name in Krasnodar. Welcome to the writer\'s mysterious cabinet! The concept revolves around classic Russian cuisine with a modern twist, inspired by the works of Nikolai Gogol. The interior resembles a literary club with vibrant walls, cozy furniture in teal, cream, and terracotta tones, live plants, books, and photographs reflecting the great writer\'s legacy. The restaurant regularly hosts cultural events — musical balls, fairs, and literary evenings with live music. The kitchen offers classic and refined Russian and European dishes: crab pancakes with black garlic, Olivier salad, crab and shrimp manti, pike coulibiac with homemade sour cream. Desserts include bird-cherry cheesecake with smoked cherry sauce and honey cake with salted caramel ice cream. The bar features classic drinks, signature cocktails, Gogol shots, sea-buckthorn tea, beet horseradish vodka, and quince chacha.',
      de: '„Gogol" ist ein neues Restaurant der klassischen russischen Küche in der gleichnamigen Straße in Krasnodar. Willkommen im geheimnisvollen Kabinett des Schriftstellers! Das Konzept dreht sich um russische Klassiker in modernem Gewand, inspiriert von Nikolai Gogols Werk. Der Innenraum erinnert an einen literarischen Club mit lebhaften Wänden, gemütlichen Möbeln in Petrol-, Creme- und Terrakottatönen, Pflanzen, Büchern und Fotografien. Regelmäßig finden kulturelle Events statt — Bälle, Jahrmärkte und Literaturabende mit Live-Musik. Die Küche bietet klassische und raffinierte russische und europäische Gerichte: Krabben-Blini mit schwarzem Knoblauch, Oliviersalat, Krabben-Manti, Hecht-Coulibiac. Desserts: Traubenkirsch-Cheesecake und Honigkuchen mit Salzkaramell-Eis. Die Barkarte umfasst Signature-Cocktails, Gogol-Shots, Sanddorn-Tee und Quitten-Tscha-Tscha.',
      es: '«Gógol» es un nuevo restaurante de cocina rusa clásica en la calle homónima de Krasnodar. ¡Bienvenidos al misterioso gabinete del escritor! El concepto se basa en la cocina rusa clásica con toques modernos, inspirada en la obra de Nikolái Gógol. El interior recuerda a un club literario con paredes vibrantes, muebles acogedores en tonos turquesa, crema y terracota, plantas, libros y fotografías. El restaurante acoge regularmente eventos culturales: bailes musicales, ferias y veladas literarias con música en vivo. La cocina ofrece platos clásicos y refinados de la gastronomía rusa y europea: blinis de cangrejo con ajo negro, ensalada Olivier, manti de cangrejo con gambas, kulebiaka de lucio. De postre: tarta de cerezo con salsa de cereza ahumada y medovik con helado de caramelo salado. La carta de bar incluye cócteles de autor, shots Gógol y tés de espino amarillo.',
      fr: '« Gogol » est un nouveau restaurant de cuisine russe classique dans la rue éponyme de Krasnodar. Bienvenue dans le cabinet mystérieux de l\'écrivain ! Le concept s\'articule autour de la cuisine russe classique revisitée, inspirée par l\'œuvre de Nicolas Gogol. L\'intérieur évoque un club littéraire aux murs colorés, mobilier douillet dans des tons sarcelle, crème et terre cuite, plantes vivantes, livres et photographies. Des événements culturels y sont régulièrement organisés : bals, foires et soirées littéraires avec musique live. La cuisine propose des plats classiques et raffinés russes et européens : blinis de crabe à l\'ail noir, salade Olivier, manti de crabe aux crevettes, koulibiac de brochet. Au dessert : cheesecake au cerisier à grappes et médovik à la glace caramel salé. Le bar propose cocktails signatures, shots Gogol, thé à l\'argousier et tchatcha au coing.',
      zh: '"果戈理"是克拉斯诺达尔同名街道上一家全新的经典俄式餐厅。欢迎来到作家的神秘书房！餐厅理念围绕现代演绎的经典俄罗斯菜肴，灵感来自果戈理的作品。室内装潢犹如文学俱乐部，色彩鲜明的墙壁，青绿色、奶油色和赤陶色的舒适家具，鲜活绿植、书籍和照片。餐厅定期举办文化活动——音乐舞会、集市和伴有现场音乐的文学之夜。厨房提供精致的俄式和欧式菜肴：黑蒜蟹肉薄饼、奥利维耶沙拉、蟹虾馒头、狗鱼馅饼。甜品有稠李芝士蛋糕配烟熏樱桃酱、蜂蜜蛋糕配咸焦糖冰淇淋。酒水单有招牌鸡尾酒、果戈理特调和沙棘茶。',
      ja: '「ゴーゴリ」はクラスノダールの同名通りにある新しいクラシックロシア料理レストラン。作家の神秘的な書斎へようこそ！ゴーゴリの作品にインスピレーションを得た、モダンにアレンジしたクラシックロシア料理がコンセプト。インテリアはティール、クリーム、テラコッタの家具、植物、本、写真が飾られた文学クラブのよう。音楽舞踏会やフェア、ライブ音楽付き文学の夕べなど文化イベントも定期開催。黒にんにくのカニブリヌイ、オリヴィエサラダ、カニと海老のマンティ、カワカマスのクーリビヤック。デザートにはチェリーチーズケーキや塩キャラメルアイスのメドヴィク。バーにはシグネチャーカクテル、ゴーゴリショット、サジー茶も。',
      ko: '"고골"은 크라스노다르의 같은 이름의 거리에 위치한 클래식 러시아 요리 레스토랑입니다. 작가의 신비로운 서재에 오신 것을 환영합니다! 고골의 작품에서 영감을 받아 현대적으로 재해석한 클래식 러시아 요리가 콘셉트입니다. 인테리어는 선명한 벽면, 틸·크림·테라코타 톤의 아늑한 가구, 식물, 책, 사진이 어우러진 문학 클럽 분위기입니다. 음악 무도회, 박람회, 라이브 음악 문학의 밤 등 문화 행사를 정기적으로 개최합니다. 블랙 갈릭 크랩 블리니, 올리비에 샐러드, 크랩 새우 만티, 강꼬치 쿨레비야크 등 정통 및 세련된 러시아·유럽 요리를 제공합니다. 디저트로는 체리 치즈케이크와 소금 카라멜 아이스크림 메도빅을. 바에는 시그니처 칵테일과 고골 샷, 비타민나무 차가 있습니다.',
    },
  },

  'malabar': {
    name: {
      en: 'Malabar',
      de: 'Malabar',
      es: 'Malabar',
      fr: 'Malabar',
      zh: '马拉巴尔',
      ja: 'マラバール',
      ko: '말라바르',
    },
    description: {
      en: '"Malabar" is an authentic Indian restaurant. Inside — a distinctive ethnic-style interior with bright colors and sacred elephant figurines everywhere. The menu features traditional Indian cuisine: paneer cheese, aloo palak potato balls, and various salads to start; fiery fish, chicken biryani, and lamb curry among the mains. Desserts include carrot halwa and Indian fritters. Guests can also order a tasting set. The bar offers wine, classic cocktails, and spirits.',
      de: '„Malabar" ist ein authentisches indisches Restaurant. Drinnen erwartet Sie ein einzigartiges Interieur im ethnischen Stil mit leuchtenden Farben und allgegenwärtigen Elefantenfiguren. Auf der Speisekarte steht traditionelle indische Küche: Paneer-Käse, Aloo-Palak-Kartoffelbällchen und diverse Salate als Vorspeisen; feuriger Fisch, Chicken Biryani und Lamm-Curry als Hauptgerichte. Zum Nachtisch gibt es Karotten-Halwa und indisches Schmalzgebäck. Gäste können auch ein Degustationsmenü bestellen. Die Barkarte umfasst Wein, klassische Cocktails und Spirituosen.',
      es: '«Malabar» es un restaurante indio auténtico. En su interior, un singular interiorismo étnico con colores vivos y figuras de elefantes sagrados por doquier. El menú ofrece cocina india tradicional: queso paneer, bolitas de patata aloo palak y diversas ensaladas como entrantes; pescado flambeado, biryani de pollo y curry de cordero entre los principales. De postre: halwa de zanahoria y buñuelos indios. También se puede pedir un menú degustación. La carta de bar incluye vinos, cócteles clásicos y licores.',
      fr: '« Malabar » est un restaurant indien authentique. À l\'intérieur, un décor ethnique singulier aux couleurs vives, parsemé de figurines d\'éléphants sacrés. La carte propose une cuisine indienne traditionnelle : fromage paneer, boulettes de pomme de terre aloo palak et salades variées en entrée ; poisson flambé, biryani au poulet et curry d\'agneau en plat principal. En dessert : halwa de carottes et beignets indiens. Il est aussi possible de commander un menu dégustation. Le bar sert vins, cocktails classiques et spiritueux.',
      zh: '"马拉巴尔"是一家正宗印度餐厅。室内充满民族风情，色彩鲜艳，到处摆放着神圣的大象雕像。菜单提供传统印度菜：前菜有印度奶酪、土豆球和各种沙拉，主菜有火焰鱼、鸡肉手抓饭和羊肉咖喱。甜品有胡萝卜哈尔瓦和印度油炸小吃。客人还可以点品鉴套餐。酒水单有葡萄酒、经典鸡尾酒和烈酒。',
      ja: '「マラバール」は本格インドレストラン。店内はエスニックスタイルの個性的なインテリアで、鮮やかな色彩と聖なる象の置物があちこちに。メニューは伝統的なインド料理：前菜にパニール、アルーパラクのポテトボール、各種サラダ。メインには炎の魚、チキンビリヤニ、ラムカレー。デザートはキャロットハルワとインド風揚げ菓子。テイスティングセットもご注文いただけます。バーにはワイン、クラシックカクテル、スピリッツ。',
      ko: '"말라바르"는 정통 인도 레스토랑입니다. 내부는 밝은 색감의 에스닉 인테리어와 곳곳에 놓인 신성한 코끼리 장식이 특징입니다. 메뉴는 전통 인도 요리: 전채로 파니르 치즈, 알루 팔락 감자볼, 다양한 샐러드, 메인으로 불꽃 생선, 치킨 비리야니, 양고기 커리. 디저트는 당근 할바와 인도식 튀김 과자. 테이스팅 세트도 주문 가능합니다. 바에는 와인, 클래식 칵테일, 증류주가 있습니다.',
    },
  },

  'rc-msk-fudholl-rynok-na-marosejke': {
    name: {
      en: 'Food Hall Rynok on Maroseyka',
      de: 'Food Hall Rynok an der Marosejka',
      es: 'Food Hall Rynok en Maroseika',
      fr: 'Food Hall Rynok sur Marosseïka',
      zh: '马罗塞卡市场美食广场',
      ja: 'マロセイカのフードホール・ルイノク',
      ko: '마로세이카 푸드홀 리노크',
    },
    description: {
      en: '"Food Hall Rynok on Maroseyka" is a three-story gastro-space with restaurants, bars, and a lounge. Inside there are about 300 seats and cuisines from around the world — from Asian and Georgian to American, Hawaiian, Indian, and European, plus street food, burgers, pizza, sushi, seafood, and desserts. The food hall hosts quizzes and DJ sets, and a private loft "Secret" is available for intimate gatherings.',
      de: '„Food Hall Rynok an der Marosejka" ist ein drei-stöckiger Gastro-Raum mit Restaurants, Bars und Lounge. Drinnen finden sich rund 300 Sitzplätze und Küchen aus aller Welt — von asiatisch und georgisch bis amerikanisch, hawaiianisch, indisch und europäisch, dazu Street Food, Burger, Pizza, Sushi, Meeresfrüchte und Desserts. Der Food Hall veranstaltet Quizabende und DJ-Sets, und für private Treffen steht das Loft „Geheimnis" zur Verfügung.',
      es: '«Food Hall Rynok en Maroseika» es un espacio gastronómico de tres plantas con restaurantes, bares y lounge. Dispone de unas 300 plazas y cocinas de todo el mundo: desde asiática y georgiana hasta americana, hawaiana, india y europea, además de comida callejera, hamburguesas, pizza, sushi, mariscos y postres. El food hall organiza quizzes y sesiones de DJ, y cuenta con un loft privado «Secreto» para reuniones íntimas.',
      fr: '« Food Hall Rynok sur Marosseïka » est un espace gastronomique sur trois étages avec restaurants, bars et lounge. On y trouve environ 300 places et des cuisines du monde entier : d\'asiatique et géorgienne à américaine, hawaïenne, indienne et européenne, plus street food, burgers, pizza, sushi, fruits de mer et desserts. Le food hall organise des quiz et des DJ sets, et un loft privé « Secret » est disponible pour les réunions intimes.',
      zh: '"马罗塞卡市场美食广场"是一个三层楼的美食空间，拥有餐厅、酒吧和休息室。约300个座位，汇集世界各国美食——从亚洲、格鲁吉亚到美式、夏威夷、印度和欧式，还有街头小吃、汉堡、披萨、寿司、海鲜和甜品。美食广场举办问答比赛和DJ派对，还有私密阁楼"秘密"可供小型聚会。',
      ja: '「マロセイカのフードホール・ルイノク」は3階建てのガストロ空間で、レストラン、バー、ラウンジを備えています。約300席、世界各国の料理が楽しめます——アジア、ジョージア、アメリカン、ハワイアン、インド、ヨーロッパ料理に加え、ストリートフード、バーガー、ピザ、寿司、シーフード、デザートまで。クイズやDJセットも開催。プライベートなロフト「シークレット」もご利用いただけます。',
      ko: '"마로세이카 푸드홀 리노크"는 레스토랑, 바, 라운지를 갖춘 3층 규모의 미식 공간입니다. 약 300석 규모로 아시아, 조지아, 미국, 하와이, 인도, 유럽 등 세계 각국 요리는 물론 스트리트 푸드, 버거, 피자, 스시, 해산물, 디저트까지 즐길 수 있습니다. 퀴즈와 DJ 세트도 열리며, 소규모 모임을 위한 프라이빗 로프트 "시크릿"도 마련되어 있습니다.',
    },
  },

  'rc-spb-pejzazh-1': {
    name: {
      en: 'Paysage',
      de: 'Pejsasch',
      es: 'Paisaje',
      fr: 'Paysage',
      zh: '风景',
      ja: 'ペイザージュ',
      ko: '페이자주',
    },
    description: {
      en: '"Paysage" is a mixed-cuisine restaurant near Komendantsky Prospekt in St. Petersburg. The interior features floor-to-ceiling panoramic windows, light wood, and abundant greenery — plants are literally everywhere: a built-in shelf filled with live plants, pots around the hall, and artificial ones on the ceiling. The menu is primarily Georgian: khinkali with various fillings, beef kharcho, grilled shashlik, steaks, kebabs, and freshly baked khachapuri. Pasta and risotto are also available. Select dishes come with show-style presentations and family-size portions.',
      de: '„Pejsasch" ist ein Restaurant mit gemischter Küche nahe dem Komendantski-Prospekt in St. Petersburg. Der Innenraum besticht durch raumhohe Panoramafenster, helles Holz und üppiges Grün — Pflanzen sind buchstäblich überall. Die Speisekarte ist vorwiegend georgisch: Chinkali mit verschiedenen Füllungen, Chartscho, Schaschlik vom Grill, Steaks, Kebabs und frische Chatschapuri. Auch Pasta und Risotto stehen auf der Karte. Ausgewählte Gerichte werden mit Show-Präsentation und in Familiengröße serviert.',
      es: '«Paisaje» es un restaurante de cocina mixta cerca del Prospekt Komendantski en San Petersburgo. El interior destaca por ventanales panorámicos de suelo a techo, madera clara y abundante vegetación — las plantas están literalmente por todas partes. El menú es principalmente georgiano: jinkali con varios rellenos, jarcho de ternera, shashlik a la parrilla, steaks, kebabs y jachapuri recién horneados. También hay pasta y risotto. Algunos platos se sirven con presentación-espectáculo y en porciones familiares.',
      fr: '« Paysage » est un restaurant de cuisine mixte près du Prospekt Komendantski à Saint-Pétersbourg. L\'intérieur se distingue par ses baies vitrées du sol au plafond, son bois clair et sa verdure abondante — les plantes sont littéralement partout. La carte est principalement géorgienne : khinkali aux garnitures variées, khartcho de bœuf, chachliks grillés, steaks, kébabs et khatchapouri tout juste sortis du four. Pasta et risotto sont aussi proposés. Certains plats bénéficient d\'une présentation spectaculaire et de portions familiales.',
      zh: '"风景"是圣彼得堡科门丹茨基大街附近的混合菜系餐厅。室内有落地全景窗、浅色木质装饰和丰富的绿植——植物随处可见。菜单以格鲁吉亚菜为主：各种馅料的灌汤包、牛肉哈尔乔汤、炭烤肉串、牛排、烤肉饼和新鲜出炉的哈恰普里。还有意面和烩饭。部分菜品提供秀式上菜和家庭分享装。',
      ja: '「ペイザージュ」はサンクトペテルブルクのコメンダンツキー通り近くにあるミックスキュイジーヌレストラン。床から天井までのパノラマウィンドウ、明るい木目、豊富な緑が特徴——植物が文字通りあちこちに。メニューは主にジョージア料理：様々な具のヒンカリ、牛肉のハルチョ、炭火シャシリク、ステーキ、ケバブ、焼きたてハチャプリ。パスタやリゾットも。一部の料理はショースタイルの盛り付けやファミリーサイズで提供。',
      ko: '"페이자주"는 상트페테르부르크 코멘단츠키 대로 근처의 퓨전 레스토랑입니다. 바닥부터 천장까지 이어지는 파노라마 창, 밝은 나무 인테리어, 풍성한 녹색 식물이 특징입니다. 메뉴는 주로 조지아 요리: 다양한 속재료의 힌칼리, 소고기 하르초, 숯불 샤슬릭, 스테이크, 케밥, 갓 구운 하차푸리. 파스타와 리조또도 있습니다. 일부 요리는 쇼 스타일 프레젠테이션과 가족 사이즈로 제공됩니다.',
    },
  },

  'rc-spb-cacio-e-pepe-1': {
    name: {
      en: 'Cacio e Pepe',
      de: 'Cacio e Pepe',
      es: 'Cacio e Pepe',
      fr: 'Cacio e Pepe',
      zh: 'Cacio e Pepe',
      ja: 'カチョ・エ・ペペ',
      ko: '카초 에 페페',
    },
    description: {
      en: 'Cacio e Pepe is an Italian restaurant and pizzeria with a gourmet deli at Admiralteyskaya in St. Petersburg. The interior is classic in neutral tones. Starters include six types of bruschetta, tartares, and Italian charcuterie — salami, mortadella, prosciutto. Mains feature Italian pasta, risotto, and wood-fired pizza: try it with prosciutto cotto and mushrooms or with mortadella, truffle sauce, and pistachios. The bar offers wines, classic cocktails, and spirits.',
      de: 'Cacio e Pepe ist ein italienisches Restaurant und Pizzeria mit Feinkostladen an der Admiraltejskaja in St. Petersburg. Das Interieur ist klassisch in neutralen Tönen gehalten. Als Vorspeise gibt es sechs Bruschetta-Varianten, Tartares und italienische Spezialitäten — Salami, Mortadella, Prosciutto. Hauptgerichte umfassen italienische Pasta, Risotto und Pizza aus dem Holzofen. Die Barkarte bietet Weine, klassische Cocktails und Spirituosen.',
      es: 'Cacio e Pepe es un restaurante italiano y pizzería con tienda gourmet en Admiraltéiskaya, San Petersburgo. Interior clásico en tonos neutros. Para empezar: seis tipos de bruschetta, tartares y embutidos italianos — salami, mortadela, prosciutto. Los platos principales incluyen pasta italiana, risotto y pizza al horno de leña. La carta de bar ofrece vinos, cócteles clásicos y licores.',
      fr: 'Cacio e Pepe est un restaurant-pizzeria italien avec épicerie fine à Admiralteïskaïa, Saint-Pétersbourg. Intérieur classique aux tons neutres. En entrée : six variétés de bruschetta, tartares et charcuterie italienne — salami, mortadelle, prosciutto. Plats principaux : pâtes, risotto et pizza au feu de bois. Le bar propose vins, cocktails classiques et spiritueux.',
      zh: 'Cacio e Pepe是圣彼得堡海军部站附近的意大利餐厅和披萨店，设有美食熟食柜台。中性色调的经典装修。前菜有六种意式烤面包片、鞑靼牛肉和意大利熟食——萨拉米、莫塔代拉、火腿。主菜有意面、烩饭和柴火披萨。酒水单有葡萄酒、经典鸡尾酒和烈酒。',
      ja: 'カチョ・エ・ペペはサンクトペテルブルクのアドミラルテイスカヤにあるイタリアンレストラン＆ピッツェリア。グルメデリも併設。ニュートラルトーンのクラシカルな内装。前菜に6種のブルスケッタ、タルタル、イタリアンシャルキュトリー（サラミ、モルタデッラ、プロシュート）。メインはイタリアンパスタ、リゾット、薪窯ピッツァ。バーにはワイン、クラシックカクテル、スピリッツ。',
      ko: '카초 에 페페는 상트페테르부르크 아드미랄테이스카야에 위치한 이탈리안 레스토랑 겸 피제리아로, 미식 델리도 갖추고 있습니다. 뉴트럴 톤의 클래식 인테리어. 전채로 6종 브루스케타, 타르타르, 이탈리안 샤퀴테리(살라미, 모르타델라, 프로슈토). 메인은 이탈리안 파스타, 리조또, 장작 화덕 피자. 바에는 와인, 클래식 칵테일, 증류주가 있습니다.',
    },
  },

  'rc-msk-everest-chalet': {
    name: {
      en: 'Everest Chalet',
      de: 'Everest Chalet',
      es: 'Everest Chalet',
      fr: 'Everest Chalet',
      zh: '珠峰小屋',
      ja: 'エベレスト・シャレー',
      ko: '에베레스트 샬레',
    },
    description: {
      en: 'Everest Chalet is a chain lounge bar on Yubileyny Prospekt in Khimki. The two-level space is designed to feel like a cozy alpine chalet with a modern twist: warm honey tones, a fireplace, and ambient lighting, while wood and stone blend with art objects and futuristic furniture.',
      de: 'Everest Chalet ist eine Lounge-Bar-Kette am Jubilejnyj-Prospekt in Chimki. Das zweigeschossige Interieur erinnert an ein gemütliches Alpen-Chalet in modernem Gewand: warme Honigtöne, ein Kamin und stimmungsvolle Beleuchtung, während Holz und Stein auf Kunstobjekte und futuristische Möbel treffen.',
      es: 'Everest Chalet es un lounge bar en cadena en el Prospekt Yubileiny de Jimki. El espacio de dos niveles recrea un acogedor chalet alpino con toques modernos: tonos miel cálidos, chimenea e iluminación ambiental, donde la madera y la piedra se combinan con objetos de arte y mobiliario futurista.',
      fr: 'Everest Chalet est un lounge bar de chaîne sur le Prospekt Ioubileïny à Khimki. L\'espace sur deux niveaux évoque un chalet alpin douillet version contemporaine : tons miel chaleureux, cheminée et éclairage d\'ambiance, bois et pierre s\'alliant à des œuvres d\'art et du mobilier futuriste.',
      zh: '珠峰小屋是希姆基尤比莱尼大街上的连锁休息酒吧。双层空间设计如同现代版舒适阿尔卑斯小屋：温暖的蜂蜜色调、壁炉和氛围照明，木材和石材与艺术品和未来感家具相融合。',
      ja: 'エベレスト・シャレーはヒムキのユビレイニー通りにあるチェーンのラウンジバー。2フロアの空間はモダンなアルパインシャレーをイメージ：温かなハニートーン、暖炉、アンビエントライティング、ウッドとストーンにアートオブジェと未来的な家具が調和。',
      ko: '에베레스트 샬레는 힘키 유빌레이니 대로에 위치한 체인 라운지 바입니다. 2층 공간은 현대적인 알파인 샬레를 연상시킵니다. 따뜻한 꿀색 톤, 벽난로, 앰비언트 조명이 특징이며, 나무와 돌이 아트 오브제와 미래적 가구와 조화를 이룹니다.',
    },
  },

  'rc-msk-vasilchuki-chaihona-1-28': {
    name: {
      en: 'Vasilchuki Chaihona No. 1',
      de: 'Wasilchuki Tschaikhona Nr. 1',
      es: 'Vasilchuki Chaijona N.º 1',
      fr: 'Vasilchuki Tchaïkhona N° 1',
      zh: '瓦西尔丘基茶馆1号',
      ja: 'ヴァシリチュキ・チャイハナNo.1',
      ko: '바실추키 차이호나 No.1',
    },
    description: {
      en: 'Vasilchuki Chaihona No. 1 is a family restaurant with mixed cuisine at Komsomolskaya, inside the "Depo. Tri Vokzala" food market. The menu blends Eastern, Caucasian, Asian, and European cuisines. Hot dishes are prepared in an authentic tandoor, over a live grill, and in an oven. Highlights include traditional Uzbek dishes like kazy, hearty shurpa, and signature Chaihona plov. An extensive bar features spirits, a fine wine collection, classic cocktails, and signature twists. Breakfast and children\'s menus are also available.',
      de: 'Wasilchuki Tschaikhona Nr. 1 ist ein Familienrestaurant mit internationaler Küche an der Komsomolskaja, im Gastromarkt „Depo. Tri Woksala". Die Speisekarte vereint orientalische, kaukasische, asiatische und europäische Küche. Warme Gerichte werden im authentischen Tandur, auf dem Mangal-Grill und im Ofen zubereitet. Highlights: traditionelle usbekische Gerichte wie Kazy, deftige Schurpa und der Tschaikhona-Plow. Die Barkarte umfasst Spirituosen, eine Weinkollektion, klassische und Signature-Cocktails. Frühstück und Kindermenü sind ebenfalls verfügbar.',
      es: 'Vasilchuki Chaijona N.º 1 es un restaurante familiar de cocina mixta en Komsomólskaya, dentro del gastromercado «Depó. Tri Vokzala». El menú combina cocinas oriental, caucásica, asiática y europea. Los platos calientes se preparan en un tandoor auténtico, a la parrilla y al horno. Destacan los platos uzbekos tradicionales como el kazy, la sustanciosa shurpa y el plov especial de Chaijona. Una extensa carta de bar incluye licores, vinos, cócteles clásicos y de autor. También hay desayunos y menú infantil.',
      fr: 'Vasilchuki Tchaïkhona N° 1 est un restaurant familial de cuisine mixte à Komsomolskaïa, au sein du gastromarché « Depo. Tri Vokzala ». La carte mêle cuisines orientale, caucasienne, asiatique et européenne. Les plats chauds sont préparés au tandour authentique, au gril et au four. Parmi les incontournables : plats ouzbeks traditionnels comme le kazy, la robuste chourpa et le plov maison. Un bar étoffé propose spiritueux, sélection de vins, cocktails classiques et signatures. Petit-déjeuner et menu enfants disponibles.',
      zh: '瓦西尔丘基茶馆1号是共青团站"三车站仓库"美食市场内的家庭餐厅，供应混合菜系。菜单融合了东方、高加索、亚洲和欧洲菜。热菜使用正宗土窑、炭火烤架和烤炉烹制。特色有传统乌兹别克菜如卡孜马肠、浓郁肉汤和招牌茶馆手抓饭。酒水单丰富，有烈酒、葡萄酒、经典和创意鸡尾酒。还提供早餐和儿童菜单。',
      ja: 'ヴァシリチュキ・チャイハナNo.1はコムソモリスカヤの「デポ・トリ・ヴォクザーラ」ガストロマーケット内にあるファミリーレストラン。東洋、コーカサス、アジア、ヨーロッパ料理をミックス。本格タンドール、炭火グリル、オーブンで調理。伝統的なウズベキ料理——カズィ、濃厚シュルパ、チャイハナ特製プロフが名物。充実のバーにはスピリッツ、ワイン、クラシック＆シグネチャーカクテル。朝食とキッズメニューもあり。',
      ko: '바실추키 차이호나 No.1은 콤소몰스카야의 "데포. 트리 복잘라" 미식 시장 내 가족 레스토랑입니다. 동양, 캅카스, 아시아, 유럽 요리를 혼합한 메뉴를 제공합니다. 정통 탄두르, 숯불 그릴, 오븐으로 조리합니다. 카지, 진한 슈르파, 시그니처 차이호나 플로프 등 전통 우즈벡 요리가 특색입니다. 풍성한 바에는 증류주, 와인 컬렉션, 클래식 및 시그니처 칵테일이 있습니다. 조식과 아동 메뉴도 제공됩니다.',
    },
  },

  'rc-msk-ppg-pizza-pasta-gala': {
    name: {
      en: 'PPG Pizza Pasta Gala',
      de: 'PPG Pizza Pasta Gala',
      es: 'PPG Pizza Pasta Gala',
      fr: 'PPG Pizza Pasta Gala',
      zh: 'PPG 披萨意面盛宴',
      ja: 'PPG ピッツァ パスタ ガラ',
      ko: 'PPG 피자 파스타 갈라',
    },
    description: {
      en: 'PPG Pizza Pasta Gala is an Italian café by the DSGN coffee chain team in the Talisman residential complex. Conceived as a standalone concept within the DSGN ecosystem, it revolves around a modern, approachable Italy — warm, simple, and comfortable. The industrial-chic interior mixes brick, concrete, wood, sleek furniture, and live greenery. The kitchen focuses on classic combinations and familiar flavors, complemented by DSGN\'s signature coffee. The menu features bruschetta, salads, pasta, pizza, breakfast, and children\'s dishes.',
      de: 'PPG Pizza Pasta Gala ist ein italienisches Café des DSGN-Coffeeshop-Teams im Wohnkomplex „Talisman". Als eigenständiges Konzept innerhalb des DSGN-Ökosystems dreht sich alles um ein modernes, zugängliches Italien — warm, schlicht und gemütlich. Das Industrial-Chic-Interieur kombiniert Ziegel, Beton, Holz, schnörkelloses Mobiliar und lebendiges Grün. Die Küche setzt auf klassische Kombinationen, ergänzt durch den hauseigenen DSGN-Kaffee. Auf der Karte: Bruschetta, Salate, Pasta, Pizza, Frühstück und Kindergerichte.',
      es: 'PPG Pizza Pasta Gala es un café italiano del equipo de la cadena de cafeterías DSGN, en el complejo residencial «Talismán». Concebido como un concepto independiente dentro del ecosistema DSGN, gira en torno a una Italia moderna y accesible — cálida, sencilla y cómoda. El interior industrial-chic combina ladrillo, hormigón, madera, mobiliario minimalista y plantas. La cocina apuesta por combinaciones clásicas y sabores familiares, acompañados del café DSGN. En el menú: bruschetta, ensaladas, pasta, pizza, desayunos y platos infantiles.',
      fr: 'PPG Pizza Pasta Gala est un café italien conçu par l\'équipe de la chaîne de cafés DSGN, dans la résidence « Talisman ». Pensé comme un concept autonome au sein de l\'écosystème DSGN, il propose une Italie moderne et accessible — chaleureuse, simple et confortable. L\'intérieur industrial chic mêle brique, béton, bois, mobilier épuré et verdure. La cuisine mise sur des accords classiques et des saveurs familières, sublimés par le café maison DSGN. Au menu : bruschetta, salades, pâtes, pizza, petit-déjeuner et plats enfants.',
      zh: 'PPG 披萨意面盛宴是DSGN咖啡连锁团队在"护身符"住宅区内开设的意大利咖啡馆。作为DSGN生态系统中的独立概念，主打现代、亲民的意大利风格——温暖、简约、舒适。工业风装修融合砖墙、混凝土、木材、简约家具和绿植。厨房注重经典搭配和熟悉的味道，搭配DSGN招牌咖啡。菜单有意式烤面包片、沙拉、意面、披萨、早餐和儿童餐。',
      ja: 'PPG ピッツァ パスタ ガラはDSGNコーヒーチェーンのチームによるイタリアンカフェ（タリスマン住宅内）。DSGNエコシステム内の独立コンセプトとして、モダンで親しみやすいイタリアを表現——温かく、シンプルで快適。インダストリアルシックなインテリアにレンガ、コンクリート、木材、すっきりした家具、グリーンが調和。クラシックな組み合わせと馴染みの味にDSGN自慢のコーヒーを添えて。メニューはブルスケッタ、サラダ、パスタ、ピッツァ、朝食、キッズメニュー。',
      ko: 'PPG 피자 파스타 갈라는 DSGN 커피 체인 팀이 만든 "탈리스만" 주거단지 내 이탈리안 카페입니다. DSGN 생태계 내 독립 콘셉트로, 현대적이고 친근한 이탈리아를 지향합니다. 인더스트리얼 시크 인테리어에 벽돌, 콘크리트, 나무, 심플한 가구, 녹색 식물이 어우러집니다. 클래식한 조합과 친숙한 맛에 DSGN 시그니처 커피를 곁들입니다. 메뉴에는 브루스케타, 샐러드, 파스타, 피자, 조식, 키즈 메뉴가 있습니다.',
    },
  },

  'rc-msk-arrurru': {
    name: {
      en: 'Arrurru',
      de: 'Arrurru',
      es: 'Arrurru',
      fr: 'Arrurru',
      zh: '阿鲁鲁',
      ja: 'アルルル',
      ko: '아루루',
    },
    description: {
      en: 'Arrurru is a Mexican gastrobar on Ostozhenka in Moscow. The designer interior brims with authentic touches: textured patterned walls, chairs with colorful upholstery, and vintage furniture. Traditional dishes include guacamole with nachos, tacos, and quesadillas to start; sea bass in a coriander crust, chorizo with beans, and ribs among the mains; churros and lime tart for dessert. The extensive bar list features wines by the glass, tequila, and classic cocktails.',
      de: 'Arrurru ist eine mexikanische Gastrobar an der Ostoschenkа in Moskau. Das Designer-Interieur ist voller authentischer Details: strukturierte Wände mit Mustern, Stühle mit bunten Bezügen und Vintage-Möbel. Auf der Karte: Guacamole mit Nachos, Tacos und Quesadillas als Starter; Seebarsch in Korianderkruste, Chorizo mit Bohnen und Ribs; Churros und Limettenquiche zum Nachtisch. Die Barkarte bietet Weine glasweise, Tequila und klassische Cocktails.',
      es: 'Arrurru es un gastrobar mexicano en Ostozhenka, Moscú. El interior de diseño está lleno de detalles auténticos: paredes con texturas, sillas de tapizado colorido y mobiliario vintage. Los platos tradicionales incluyen guacamole con nachos, tacos y quesadillas de entrada; lubina en costra de cilantro, chorizo con alubias y costillas como principales; churros y tarta de lima de postre. La carta de bar ofrece vinos por copa, tequila y cócteles clásicos.',
      fr: 'Arrurru est un gastrobar mexicain sur l\'Ostojenkа à Moscou. L\'intérieur design regorge de touches authentiques : murs texturés à motifs, chaises à l\'assise colorée et mobilier vintage. Au menu : guacamole-nachos, tacos et quesadillas en entrée ; bar en croûte de coriandre, chorizo aux haricots et travers en plat ; churros et tarte au citron vert au dessert. La carte des boissons propose vins au verre, tequila et cocktails classiques.',
      zh: '阿鲁鲁是莫斯科奥斯托任卡街上的墨西哥美食酒吧。设计师打造的内部充满正宗元素：纹理图案墙面、彩色软垫椅和复古家具。传统菜品包括前菜鳄梨酱配玉米片、塔可和奶酪饼；主菜有香菜脆皮鲈鱼、西班牙香肠配豆子和排骨；甜品有吉拿棒和青柠挞。酒水单有杯装葡萄酒、龙舌兰和经典鸡尾酒。',
      ja: 'アルルルはモスクワのオストジェンカにあるメキシカンガストロバー。デザイナーインテリアはオーセンティックな要素満載：テクスチャーのある壁、カラフルな張り地のチェア、ヴィンテージ家具。伝統料理として前菜にワカモレ＆ナチョス、タコス、ケサディーヤ。メインにコリアンダークラストのスズキ、チョリソ＆ビーンズ、リブ。デザートにチュロスとライムタルト。バーにはグラスワイン、テキーラ、クラシックカクテル。',
      ko: '아루루는 모스크바 오스토젠카의 멕시칸 가스트로바입니다. 디자이너 인테리어에 정통 요소가 가득합니다. 질감 있는 패턴 벽면, 화려한 직물의 의자, 빈티지 가구. 전통 요리로 전채에 과카몰리와 나초, 타코, 케사디야, 메인에 고수 크러스트 농어, 초리소와 콩, 갈비, 디저트에 추로스와 라임 타르트를 제공합니다. 바에는 잔 와인, 데킬라, 클래식 칵테일이 있습니다.',
    },
  },

  'rc-spb-gorod-812-4': {
    name: {
      en: 'Gorod 812',
      de: 'Gorod 812',
      es: 'Górod 812',
      fr: 'Gorod 812',
      zh: '812城',
      ja: 'ゴロド812',
      ko: '고로드 812',
    },
    description: {
      en: '"Gorod 812" is a fixed-price restaurant on Pulkovskoe Shosse in the "Leto" shopping mall in St. Petersburg. The menu features dishes from cuisines around the world: tartares, khachapuri, khinkali, chebureki, Italian pasta, pizza, tuna and trout steaks, and pork roast. To drink — wines, classic and signature cocktails, spirits, beer, and cider.',
      de: '„Gorod 812" ist ein Festpreis-Restaurant am Pulkowskoje Schossee im Einkaufszentrum „Leto" in St. Petersburg. Die Speisekarte umfasst Gerichte aus aller Welt: Tartares, Chatschapuri, Chinkali, Tschebureki, italienische Pasta, Pizza, Thunfisch- und Forellensteaks, Schweinebraten. Zum Trinken: Weine, klassische und Signature-Cocktails, Spirituosen, Bier und Cidre.',
      es: '«Górod 812» es un restaurante de precio fijo en la autopista Púlkovo, en el centro comercial «Leto» de San Petersburgo. El menú incluye platos de cocinas de todo el mundo: tartares, jachapuri, jinkali, chebureki, pasta italiana, pizza, steaks de atún y trucha, y asado de cerdo. Para beber: vinos, cócteles clásicos y de autor, licores, cerveza y sidra.',
      fr: '« Gorod 812 » est un restaurant à prix fixe sur Poulkovskoïe Chossé, au centre commercial « Leto » à Saint-Pétersbourg. La carte propose des plats de cuisines du monde : tartares, khatchapouri, khinkali, tcheboureki, pâtes italiennes, pizza, steaks de thon et truite, rôti de porc. Boissons : vins, cocktails classiques et signatures, spiritueux, bière et cidre.',
      zh: '"812城"是圣彼得堡"夏天"购物中心普尔科夫公路上的固定价格餐厅。菜单有世界各国菜品：鞑靼牛肉、哈恰普里、灌汤包、炸饺、意面、披萨、金枪鱼和鳟鱼牛排、烤猪肉。饮品有葡萄酒、经典和创意鸡尾酒、烈酒、啤酒和苹果酒。',
      ja: '「ゴロド812」はサンクトペテルブルクの「レト」ショッピングモール内、プルコフスコエ・ショッセにある定額レストラン。メニューは世界各国の料理：タルタル、ハチャプリ、ヒンカリ、チェブレキ、イタリアンパスタ、ピッツァ、マグロとトラウトのステーキ、ポークロースト。ドリンクはワイン、クラシック＆シグネチャーカクテル、スピリッツ、ビール、サイダー。',
      ko: '"고로드 812"는 상트페테르부르크 "레토" 쇼핑몰 풀코프스코예 대로에 위치한 정액제 레스토랑입니다. 메뉴에는 세계 각국 요리가 있습니다: 타르타르, 하차푸리, 힌칼리, 체부레키, 이탈리안 파스타, 피자, 참치와 송어 스테이크, 돼지고기 구이. 음료로는 와인, 클래식 및 시그니처 칵테일, 증류주, 맥주, 사이더가 있습니다.',
    },
  },
};

async function run() {
  await pgDS.initialize();
  console.log('Connected to PostgreSQL');

  let updated = 0;
  let notFound = 0;

  for (const [slug, tr] of Object.entries(TRANSLATIONS)) {
    const result = await pgDS.query(
      'UPDATE restaurants SET translations = $1 WHERE slug = $2 RETURNING id, name',
      [JSON.stringify(tr), slug],
    );
    if (result.length > 0) {
      console.log(`  ✓ ${slug} (${result[0].name})`);
      updated++;
    } else {
      console.log(`  ✗ ${slug} — not found`);
      notFound++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Not found: ${notFound}`);
  await pgDS.destroy();
}

run().catch(e => { console.error(e); process.exit(1); });
