/**
 * Batch 3: Translate restaurants to 7 languages.
 * Run: cd backend && npx ts-node scripts/translate-top-restaurants-batch3.ts
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

  'evgenich-spb': {
    name: { en: 'Evgenich', de: 'Ewgenitsch', es: 'Evguénich', fr: 'Evguénitch', zh: '叶甫根尼奇', ja: 'エヴゲニッチ', ko: '예브게니치' },
    description: {
      en: '"Evgenich" is a chain shot bar with karaoke on Rubinshtein Street. Inside — the atmosphere of friendly gatherings and house concerts with live music.',
      de: '„Ewgenitsch" ist eine Ketten-Schnapsbar mit Karaoke in der Rubinstein-Straße. Drinnen — Atmosphäre freundschaftlicher Treffen und Wohnzimmerkonzerte mit Live-Musik.',
      es: '«Evguénich» es una cadena de bares de chupitos con karaoke en la calle Rubinshtein. Dentro, ambiente de reuniones entre amigos y conciertos íntimos con música en vivo.',
      fr: '« Evguénitch » est un bar à shots de chaîne avec karaoké, rue Rubinstein. À l\'intérieur — ambiance de rencontres amicales et de concerts intimes avec musique live.',
      zh: '"叶甫根尼奇"是鲁宾施坦街上的连锁小酒馆，有卡拉OK。店内是友好聚会和现场音乐家庭音乐会的氛围。',
      ja: '「エヴゲニッチ」はルビンシュタイン通りにあるカラオケ付きチェーンのショットバー。フレンドリーな集まりとライブ音楽のアットホームコンサートの雰囲気。',
      ko: '"예브게니치"는 루빈시테인 거리의 노래방이 있는 체인 샷 바입니다. 친구 모임과 라이브 음악 하우스 콘서트 분위기.',
    },
  },

  'af-msk-evgenich-497273': {
    name: { en: 'Evgenich', de: 'Ewgenitsch', es: 'Evguénich', fr: 'Evguénitch', zh: '叶甫根尼奇', ja: 'エヴゲニッチ', ko: '예브게니치' },
    description: {
      en: '"Evgenich" is a vibrant modern project — a reimagined Soviet shot bar in a disco-house-party format. Russia\'s first karaoke shot bar with signature infusions, home-style cooking, and lively parties. Created by Sergey Zhukov, frontman of "Ruki Vverh!". By day — an affordable bistro with chebureki, Olivier salad, manti, and the owner\'s signature plov. By evening — a soulful music bar. On weekends — a disco bar with karaoke and dancing until dawn. A creative haven for musicians, actors, poets, and music lovers.',
      de: '„Ewgenitsch" ist ein lebhaftes modernes Projekt — eine neu interpretierte sowjetische Schnapsbar im Disco-Wohnungsparty-Format. Russlands erste Karaoke-Schnapsbar mit Autorenaufgesetzten und Hausmannskost. Konzept von Sergej Schukow (Ruki Wwerch!). Tagsüber ein günstiges Bistro mit Tschebureki, Oliviersalat, Manti und Plow nach Hausrezept. Abends eine stimmungsvolle Musikbar. Am Wochenende Discobar mit Karaoke bis zum Morgengrauen.',
      es: '«Evguénich» es un vibrante proyecto moderno: una reinterpretación de la taberna soviética en formato disco-fiesta casera. El primer karaoke-bar de chupitos de Rusia con licores de autor y cocina casera. Creado por Sergey Zhukov de «Ruki Vverh!». De día, un bistró económico con chebureki, ensalada Olivier, manti y plov de receta propia. De noche, un bar musical. Los fines de semana, disco-bar con karaoke hasta el amanecer.',
      fr: '« Evguénitch » est un projet moderne — un bar à shots soviétique réinventé en format disco-party. Premier karaoké-bar à shots de Russie avec liqueurs maison et cuisine familiale. Créé par Sergueï Joukov (Ruki Vverh!). Le jour — un bistrot abordable avec tchebureki, salade Olivier, mantis et plov maison. Le soir — bar musical. Le week-end — disco-bar avec karaoké jusqu\'à l\'aube.',
      zh: '"叶甫根尼奇"是一个充满活力的现代项目——以迪斯科家庭派对形式重新构想的苏联小酒馆。俄罗斯第一家有自酿利口酒和家常菜的卡拉OK小酒馆，由"举起手来！"乐队主唱谢尔盖·茹科夫创建。白天是平价小餐馆，有炸饺、奥利维耶沙拉、馒头和招牌手抓饭。晚上是温馨的音乐酒吧。周末是迪斯科酒吧，卡拉OK和跳舞到天亮。',
      ja: '「エヴゲニッチ」はソビエトのショットバーをディスコホームパーティー形式で再解釈したモダンプロジェクト。ロシア初のカラオケショットバーで、自家製リキュールと家庭料理を提供。「ルキ・ヴェルフ！」のセルゲイ・ジューコフが考案。昼はチェブレキ、オリヴィエサラダ、マンティ、自家製プロフの手頃なビストロ。夜はソウルフルな音楽バー。週末はカラオケ＆ダンスで朝まで。',
      ko: '"예브게니치"는 디스코 하우스 파티 형식으로 재해석한 소련 샷 바입니다. 러시아 최초의 자가제 리큐어와 가정식이 있는 노래방 샷 바. "루키 브베르흐!"의 세르게이 주코프가 창안. 낮에는 체부레키, 올리비에 샐러드, 만티, 시그니처 플로프의 합리적 비스트로. 저녁에는 감성 뮤직 바. 주말에는 새벽까지 노래방과 댄스.',
    },
  },

  'af-msk-chudo-yudo-496608': {
    name: { en: 'Chudo-Yudo', de: 'Tschudo-Judo', es: 'Chudo-Yudo', fr: 'Tchoudo-Ioudo', zh: '奇怪鱼', ja: 'チュド・ユド', ko: '추도유도' },
    description: {
      en: '"Chudo-Yudo" is a huge restaurant on the former Metelitsa casino site, opened by Timur Lansky, Alexander Oganezov, and Ilya Tyutenkov. The fairy-tale space resembles a Russian wooden house with antique carved window frames, mortars, rough-textured wooden furniture, and light installations. The open kitchen with two ovens is led by Italian chef Massimiliano Montiroli, who bakes bread and prepares raw appetizers, smelt, marble-beef tacos, Bombay chicken, chicken Kiev, and more. Terrace seats 250 guests.',
      de: '„Tschudo-Judo" ist ein riesiges Restaurant am ehemaligen Standort des Kasinos Meteliza. Der märchenhafte Raum erinnert an eine russische Holzhütte mit geschnitzten Fensterrahmen, Mörser, grob texturierten Holzmöbeln und Lichtinstallationen. Die offene Küche mit zwei Öfen wird vom italienischen Chef Massimiliano Montiroli geleitet: Brot, Raw-Vorspeisen, Stinte, Marmorfleisch-Tacos, Bombay-Hähnchen, Kiewer Kotelett. Terrasse für 250 Gäste.',
      es: '«Chudo-Yudo» es un enorme restaurante en el antiguo casino Metelitsa. El espacio de cuento recuerda a una izba rusa con marcos tallados, morteros, muebles de madera con texturas rústicas e instalaciones lumínicas. La cocina abierta con dos hornos está dirigida por el chef italiano Massimiliano Montiroli: pan artesanal, entrantes crudos, eperlano, tacos de carne marmolada, pollo Bombay, chuleta Kiev y más. Terraza para 250.',
      fr: '« Tchoudo-Ioudo » est un immense restaurant sur l\'ancien site du casino Metelitsa. L\'espace féerique rappelle une isba russe avec cadres sculptés, mortiers, mobilier en bois brut et installations lumineuses. La cuisine ouverte à deux fours est dirigée par le chef italien Massimiliano Montiroli : pain, amuse-bouches crus, éperlan, tacos de bœuf marbré, poulet Bombay, escalope Kiev et plus. Terrasse de 250 places.',
      zh: '"奇怪鱼"是在前"暴风雪"赌场旧址开设的巨型餐厅。童话般的空间像俄罗斯木屋，有古老雕花窗框、石臼、粗犷木质家具和灯光装置。意大利主厨马西米利亚诺·蒙蒂罗利掌管的双烤炉开放式厨房烘焙面包，制作生食前菜、胡瓜鱼、大理石花纹牛肉塔可、孟买鸡、基辅肉排等。露台可容纳250位客人。',
      ja: '「チュド・ユド」は旧メテリッツァ・カジノ跡地にオープンした巨大レストラン。おとぎ話のような空間はロシアの木造家屋を思わせる彫刻窓枠、臼、荒削りの木製家具、光のインスタレーション。イタリア人シェフ、マッシミリアーノ・モンティローリが率いる2基のオーブン付きオープンキッチンでパン焼き、ロー前菜、ワカサギ、霜降り牛タコス、ボンベイチキン、キエフカツレツなどを調理。テラスは250名収容。',
      ko: '"추도유도"는 구 메텔리차 카지노 자리에 오픈한 거대 레스토랑입니다. 동화 같은 공간은 조각 창틀, 절구, 거친 질감의 나무 가구, 빛 설치물이 있는 러시아 목조 가옥을 연상시킵니다. 이탈리아 셰프 마시밀리아노 몬티롤리가 이끄는 2개 오븐의 오픈 키친에서 빵, 로우 전채, 빙어, 마블링 소고기 타코, 봄베이 치킨, 키예프 커틀릿 등을 조리합니다. 테라스 250석.',
    },
  },

  'af-msk-ayna-507517': {
    name: { en: 'Ayna', de: 'Aina', es: 'Ayna', fr: 'Aïna', zh: '艾纳', ja: 'アイナ', ko: '아이나' },
    description: {
      en: '"Ayna" features a bright interior by Mmz Project with large windows, an open kitchen with wood-fired oven and grill, wheat and hazel portals between halls, solid wood furniture, and natural art objects. The dishes represent "cuisine of Russia\'s peoples" reimagined: borscht comes with a baked potato and smoked sour cream, spider crab rillettes arrive on nitrogen "smoke," tartare balances on a real bone, and sturgeon cabbage roll is theatrically extracted from blazing clay. Chef Dmitry Nechitailov hosts chef\'s table dinners. Below Ayna, bar "Inta" operates.',
      de: '„Aina" bietet ein helles Interieur von Mmz Project: große Fenster, offene Küche mit Holzofen und Grill, Portale aus Weizen und Haselnuss, massive Holzmöbel und Kunstobjekte aus Naturmaterialien. Die Gerichte sind „Küche der Völker Russlands" neu gedacht: Borschtsch mit Backkartoffel und Räuchersauerrahm, Rapanmoos-Rillettes auf Stickstoffrauch, Tatar auf echtem Knochen, Stör-Kohlroulade theatralisch aus glühender Tonware. Chef\'s-Table-Abendessen im Angebot.',
      es: '«Ayna» presenta un interior luminoso de Mmz Project con grandes ventanales, cocina abierta con horno de leña y parrilla, portales de trigo y avellano, muebles de madera maciza y objetos de arte naturales. Los platos son "cocina de los pueblos de Rusia" reinventada: borscht con patata asada y crema agria ahumada, rillete de rapana sobre "humo" de nitrógeno, tartar equilibrado sobre hueso real, y repollo relleno de esturión extraído teatralmente de arcilla ardiente.',
      fr: '« Aïna » dispose d\'un intérieur lumineux signé Mmz Project : grandes fenêtres, cuisine ouverte au four à bois et grill, portails de blé et noisetier, mobilier en bois massif et objets d\'art naturels. Les plats réinventent la « cuisine des peuples de Russie » : bortchtch avec pomme de terre au four et crème fumée, rillettes de rapana sur fumée d\'azote, tartare en équilibre sur un os, chou farci d\'esturgeon extrait théâtralement d\'une poterie brûlante.',
      zh: '"艾纳"由Mmz Project设计的明亮空间，有大窗户、柴火炉和烤架的开放式厨房、小麦和榛子门廊、实木家具和天然艺术品。菜品是重新构想的"俄罗斯各民族美食"：罗宋汤配烤土豆和烟熏酸奶油，拉帕纳肉酱在氮气"烟雾"上呈上，鞑靼牛肉平衡在真骨上，鲟鱼菜卷从燃烧的陶器中戏剧性地取出。提供主厨餐桌晚宴。',
      ja: '「アイナ」はMmzプロジェクトによる明るい空間。大きな窓、薪窯＆グリルのオープンキッチン、小麦とハシバミのポータル、無垢材家具、自然素材のアートオブジェ。「ロシア諸民族の料理」を再解釈：ボルシチにはベイクドポテトと燻製サワークリーム、ラパンのリエットは液体窒素の煙で、タルタルは本物の骨の上に、チョウザメのロールキャベツは燃える陶器から劇的に登場。シェフズテーブルディナーも。',
      ko: '"아이나"는 Mmz Project가 디자인한 밝은 공간으로, 큰 창, 장작 화덕과 그릴의 오픈 키친, 밀과 개암나무 포탈, 원목 가구, 자연 소재 아트 오브제가 특징입니다. "러시아 민족 요리"를 재해석: 보르시치에 구운 감자와 훈제 사워크림, 라파나 리예트는 질소 연기 위에, 타르타르는 진짜 뼈 위에, 철갑상어 양배추 롤은 타오르는 도자기에서 극적으로 꺼냅니다. 셰프 테이블 디너도 제공.',
    },
  },

  'af-msk-luwo-518614': {
    name: { en: 'Luwo', de: 'Luwo', es: 'Luwo', fr: 'Luwo', zh: 'Luwo', ja: 'ルーヴォ', ko: '루보' },
    description: {
      en: 'Luwo is a restaurant of unconventional Greek cuisine by Origin ("Zoyka," "Ayna") on Bolshaya Nikitskaya. The concept references Luwian culture — a mysterious ancient people, ancestors of Greek civilization. Three levels — a basement secret bar, the main fireplace hall, and a summer terrace — symbolize the underworld, earth, and sky. Brand chef Artyom Chudnenko\'s menu features beef tartare with sujuk sauce, Greek salad with umami, grilled octopus with pineapple, and desserts with surprising flavor pairings. Each floor has its own cocktail collection by the Barpoint team.',
      de: 'Luwo ist ein Restaurant für unkonventionelle griechische Küche von Origin auf der Bolschaja Nikitskaja. Das Konzept referenziert die Luwier — ein geheimnisvolles Volk, Vorfahren der griechischen Zivilisation. Drei Ebenen — eine geheime Kellerbar, der Kaminsaal und eine Sommerterrasse — symbolisieren Unterwelt, Erde und Himmel. Im Menü: Rindertatar mit Sudschuk-Soße, griechischer Salat mit Umami, gegrillter Oktopus mit Ananas. Jedes Stockwerk hat eigene Cocktails.',
      es: 'Luwo es un restaurante de cocina griega no convencional de Origin en la calle Bolshaya Nikítskaya. El concepto alude a los luvitas — un misterioso pueblo antiguo, ancestros de la civilización griega. Tres niveles — bar secreto en sótano, salón con chimenea y terraza de verano — simbolizan el inframundo, la tierra y el cielo. El menú del chef incluye tartar de ternera con salsa de sujuk, ensalada griega con umami y pulpo a la parrilla con piña. Cada planta tiene su propia colección de cócteles.',
      fr: 'Luwo est un restaurant de cuisine grecque atypique par Origin sur Bolchaïa Nikitskaïa. Le concept fait référence aux Louvites — un peuple antique mystérieux, ancêtre de la civilisation grecque. Trois niveaux — bar secret en sous-sol, salle avec cheminée et terrasse d\'été — symbolisent le monde souterrain, la terre et le ciel. Au menu : tartare de bœuf sauce sujuk, salade grecque umami, poulpe grillé à l\'ananas. Chaque étage a sa propre collection de cocktails.',
      zh: 'Luwo是Origin团队在大尼基茨卡亚街开设的非传统希腊菜餐厅。概念参考吕维亚人——希腊文明的神秘古老祖先。三层——地下秘密酒吧、壁炉主厅和夏季露台——象征冥界、人间和天空。主厨菜单有苏祝克酱牛肉鞑靼、鲜味希腊沙拉、菠萝烤章鱼。每层有独立鸡尾酒系列。',
      ja: 'ルーヴォはボリシャヤ・ニキーツカヤにあるOriginの非典型ギリシャ料理レストラン。コンセプトはルウィ人——ギリシャ文明の祖先の謎の古代民族。3フロア——地下シークレットバー、暖炉のメインホール、サマーテラス——が冥界・地上・天空を象徴。メニューにはスジュクソースのビーフタルタル、旨味のギリシャサラダ、パイナップルグリルタコ。各階に独自のカクテルコレクション。',
      ko: '루보는 볼샤야 니키츠카야의 Origin 팀이 만든 비전통 그리스 요리 레스토랑입니다. 콘셉트는 그리스 문명의 조상인 신비한 고대 민족 루비아인을 참조합니다. 3개 층——지하 시크릿 바, 벽난로 메인 홀, 여름 테라스——이 지하세계, 지상, 하늘을 상징합니다. 수주크 소스 비프 타르타르, 우마미 그리스 샐러드, 파인애플 그릴 문어. 각 층에 독자적인 칵테일 컬렉션.',
    },
  },

  'af-msk-relict-519006': {
    name: { en: 'Relict', de: 'Relikt', es: 'Relict', fr: 'Relict', zh: '遗迹', ja: 'レリクト', ko: '렐릭트' },
    description: {
      en: 'Relict is a restaurant and gastrobar with modern Russian cuisine on Smolenskaya. The concept draws on authentic culture presented in a new light: custom-made solid oak furniture, Mezen-painted light fixtures, and handmade pottery by Russian artisans. The kitchen offers signature interpretations of traditional recipes with local ingredients: guinea fowl bar, crab with chokeberry, cream soup "yushka," rabbit ragout with wild pear, royal sterlet with baked turnip, and oven-baked pirozhki. The bar features 10 signature Russian-accented cocktails: "Cloudberry & Citrus" on sparkling, "Walnut & Fir" on dark rum and cognac, and draft kvass, mead, and herbal tea blends.',
      de: 'Relikt ist ein Restaurant und Gastrobar mit moderner russischer Küche an der Smolenskaja. Das Konzept basiert auf authentischer Kultur in neuem Gewand: maßgefertigte massive Eichenmöbel, Lampen mit Mesener Malerei, handgefertigte Keramik. Die Küche bietet Autorenvarianten traditioneller Rezepte: Perlhuhn-Riegel, Krabbe mit Aronia, Sterlett nach Zarenart, Piroggen aus dem Ofen. 10 Autorencocktails mit russischem Akzent, Kwas, Met und Kräutertee.',
      es: 'Relict es un restaurante y gastrobar de cocina rusa moderna en Smolénskaya. El concepto se basa en la cultura auténtica presentada bajo nueva luz: muebles de roble macizo a medida, lámparas con pintura de Mezen, cerámica artesanal rusa. La cocina ofrece interpretaciones de recetas tradicionales con productos locales: pintada, cangrejo con aronia, sopa "yushka," ragú de conejo con pera silvestre, esturión real con nabo asado, pirojki del horno. 10 cócteles de autor con acento ruso.',
      fr: 'Relict est un restaurant et gastrobar de cuisine russe moderne sur Smolenskaïa. Le concept s\'appuie sur la culture authentique revisitée : mobilier en chêne massif sur mesure, luminaires peints style Mezen, poterie artisanale russe. La cuisine propose des interprétations de recettes traditionnelles : pintade, crabe à l\'aronia, soupe « iouchka », ragoût de lapin à la poire sauvage, sterlet impérial au navet rôti, pirojki du four. 10 cocktails signatures à l\'accent russe.',
      zh: '遗迹是斯摩棱斯卡亚的现代俄式餐厅和美食酒吧。概念基于以新面貌呈现的正宗文化：定制实心橡木家具、梅曾画风灯具和俄罗斯工匠手工陶器。厨房以本地食材诠释传统食谱：珍珠鸡、黑果腺肋花楸螃蟹、奶油"鱼汤"、野梨兔肉炖菜、沙皇鲟鱼配烤萝卜和烤炉馅饼。10款俄式风味创意鸡尾酒。',
      ja: 'レリクトはスモレンスカヤにあるモダンロシア料理のレストラン＆ガストロバー。本格文化を新しい視点で：特注ソリッドオーク家具、メゼン画の照明、ロシア職人のハンドメイド陶器。ローカル食材で伝統レシピを再解釈：ホロホロ鳥、アロニア添えカニ、クリームスープ「ユシカ」、野生梨のウサギラグー、ツァーリ風スターレット。ロシアンアクセントの10種シグネチャーカクテル。',
      ko: '렐릭트는 스몰렌스카야의 모던 러시아 요리 레스토랑 겸 가스트로바입니다. 정통 문화를 새롭게 조명: 주문 제작 참나무 가구, 메젠 회화 조명, 러시아 장인의 수제 도자기. 로컬 식재료로 전통 레시피 재해석: 기니새, 아로니아 게, 크림 수프 "유시카", 야생 배 토끼 라구, 차르식 철갑상어. 러시안 악센트의 10종 시그니처 칵테일.',
    },
  },

  'rizz': {
    name: { en: 'Rizz', de: 'Rizz', es: 'Rizz', fr: 'Rizz', zh: 'Rizz', ja: 'リズ', ko: '리즈' },
    description: {
      en: 'Rizz is an atmospheric restaurant and bar with gastronomic cuisine on Pyatnitskaya. The interiors are inspired by "Dune" aesthetics: sandy-terracotta palette, fantastical chandeliers, and bold décor, with cozy corners for dates and large groups. DJ sets on Fridays and Saturdays. The menu offers creative yet approachable European-based dishes: salmon tartare on ice, roti flatbread with pulled beef, crispy eggplant salad. The wood oven turns out 10 Neapolitan pizza varieties, while the grill produces steaks, lula kebabs, creative burgers, mussels in white wine, and Singapore-style prawns. The cocktail menu is divided into three sections: Sky, Earth, and People.',
      de: 'Rizz ist ein atmosphärisches Restaurant und Bar mit Gastronomie-Küche an der Pjatnizkaja. Interieur inspiriert von der „Dune"-Ästhetik: Sand-Terrakotta-Palette, fantasievolle Kronleuchter. DJ-Sets freitags und samstags. Kreative europäisch basierte Küche: Lachstatar auf Eis, Roti mit gezupftem Rindfleisch, Auberginen-Salat. 10 Varianten neapolitanischer Pizza, Steaks vom Grill, Lula-Kebab, Burger, Miesmuscheln in Weißwein. Cocktails in drei Kategorien: Sky, Earth, People.',
      es: 'Rizz es un restaurante-bar atmosférico con cocina gastronómica en Pyátnitskaya. Interiores inspirados en la estética de "Dune": paleta arena-terracota, lámparas fantásticas. DJ sets viernes y sábados. Cocina creativa de base europea: tartar de salmón sobre hielo, pan roti con carne deshilachada, ensalada de berenjena crujiente. 10 variedades de pizza napolitana, steaks a la parrilla, kebabs lula, mejillones al vino blanco. Cócteles en tres secciones: Sky, Earth, People.',
      fr: 'Rizz est un restaurant-bar atmosphérique avec cuisine gastronomique sur Piatnitska. Intérieurs inspirés de l\'esthétique de « Dune » : palette sable-terre cuite, lustres fantastiques. DJ sets les vendredis et samedis. Cuisine créative d\'inspiration européenne : tartare de saumon sur glace, roti au bœuf effiloché, salade d\'aubergines croustillantes. 10 variétés de pizza napolitaine, steaks au gril, brochettes lula, moules au vin blanc. Cocktails en trois chapitres : Sky, Earth, People.',
      zh: 'Rizz是皮亚特尼茨卡亚街的氛围餐厅和酒吧。内装灵感来自"沙丘"美学：沙色赤陶调色板、奇幻吊灯。周五六有DJ。创意欧式菜品：冰上三文鱼鞑靼、撕牛肉烤饼、脆茄子沙拉。10种那不勒斯披萨、炭烤牛排和肉串、创意汉堡、白葡萄酒贻贝、新加坡虾。鸡尾酒分三章：天空、大地、人。',
      ja: 'リズはピャートニツカヤにある雰囲気あふれるレストラン＆バー。インテリアは「デューン」の美学にインスパイア：サンドテラコッタパレット、ファンタジックなシャンデリア。金土はDJセット。クリエイティブなヨーロピアンベース料理：氷上のサーモンタルタル、プルドビーフのロティ、クリスピーナスのサラダ。10種のナポリピッツァ、グリルステーキ、ルラケバブ、バーガー、白ワインムール、シンガポールプラウン。カクテルはSky・Earth・Peopleの3セクション。',
      ko: '리즈는 피야트니츠카야의 분위기 있는 레스토랑 겸 바입니다. "듄" 미학에서 영감받은 인테리어: 모래-테라코타 팔레트, 환상적 샹들리에. 금·토 DJ 세트. 창의적이면서 친근한 유럽 기반 요리: 얼음 위 연어 타르타르, 풀드 비프 로티, 바삭한 가지 샐러드. 10종 나폴리 피자, 숯불 스테이크, 룰라 케밥, 크리에이티브 버거, 화이트 와인 홍합. 칵테일은 Sky, Earth, People 3개 섹션.',
    },
  },

  'meykhana': {
    name: { en: 'Meykhana', de: 'Meichana', es: 'Meijana', fr: 'Meïkhana', zh: '梅伊哈纳', ja: 'メイハナ', ko: '메이하나' },
    description: {
      en: 'Meykhana is an Eastern restaurant in Kuzminki by Levantine Family. The spacious hall features deep blue tones and colorful rugs, a large contact bar, and a stage for live performances. Private rooms with panoramic windows and a children\'s playroom are available. The cuisine blends Turkey, Azerbaijan, and Georgia: wood-fired oven, open mangal grill, Dagestani lamb, and Azerbaijani sumac. The menu includes meze, adana and urfa kebabs, tavush-shish, Azerbaijani piti and dushbara, Baku plov, Georgian khachapuri, khinkali, chkmeruli, and kharcho. The bar focuses on the East: Turkish raki, signature cocktails, Eastern coffee, Moroccan and Azerbaijani tea.',
      de: 'Meichana ist ein orientalisches Restaurant in Kusminki. Der geräumige Saal bietet tiefblaue Töne, bunte Teppiche, eine große Kontaktbar und eine Bühne. Privaträume und Kinderspielzimmer vorhanden. Küche an der Schnittstelle von Türkei, Aserbaidschan und Georgien: Holzofen, Mangalgrill, dagestanisches Lamm. Menü: Meze, Adana- und Urfa-Kebab, Piti, Duschbara, Bakuer Plow, Chatschapuri, Chinkali, Tschkmeruli. Bar: Raki, Autorencocktails, orientalischer Kaffee.',
      es: 'Meijana es un restaurante oriental en Kuzminki de Levantine Family. Salón amplio con tonos azul profundo, alfombras coloridas, gran barra y escenario para actuaciones en vivo. Salas privadas y zona infantil disponibles. Cocina que fusiona Turquía, Azerbaiyán y Georgia: horno de leña, mangal abierto, cordero dagestano. Menú: meze, kebabs adana y urfa, piti azerbaiyano, dushbara, plov de Bakú, jachapuri, jinkali, chkmeruli. Bar oriental: raki turco, cócteles de autor, café y tés orientales.',
      fr: 'Meïkhana est un restaurant oriental à Kouzminki par Levantine Family. Salle spacieuse aux tons bleu profond, tapis colorés, grand bar et scène. Salons privés et salle de jeux pour enfants. Cuisine mêlant Turquie, Azerbaïdjan et Géorgie : four à bois, mangal, agneau du Daghestan. Menu : mézé, kébabs adana et ourfa, piti et douchbara azerbaïdjanais, plov de Bakou, khatchapouri, khinkali, tchkmeruli. Bar oriental : raki, cocktails signatures, café et thé à l\'orientale.',
      zh: '梅伊哈纳是库兹明基的东方餐厅。宽敞大厅有深蓝色调和彩色地毯、大型吧台和表演舞台。有全景窗包间和儿童游乐室。菜品融合土耳其、阿塞拜疆和格鲁吉亚：柴火炉、明火烤架、达吉斯坦羊肉。菜单有梅泽、阿达纳和乌尔法烤肉串、阿塞拜疆皮提和杜什巴拉、巴库手抓饭、哈恰普里、灌汤包。酒吧以东方为主：土耳其拉克酒、创意鸡尾酒、东方咖啡和茶。',
      ja: 'メイハナはクズミンキにあるレバンティーン・ファミリーの東洋レストラン。ディープブルーとカラフルな絨毯の広々としたホール、大きなバーカウンター、ライブステージ。個室とキッズルームあり。トルコ・アゼルバイジャン・ジョージアが融合した料理：薪窯、オープンマンガル、ダゲスタンラム。メニューはメゼ、アダナ＆ウルファケバブ、ピティ、ドゥシュバラ、バクープロフ、ハチャプリ、ヒンカリ。バーはトルコのラク、シグネチャーカクテル、オリエンタルコーヒー＆ティー。',
      ko: '메이하나는 쿠즈민키의 레반틴 패밀리 동양 레스토랑입니다. 깊은 블루 톤과 화려한 카펫, 대형 바, 라이브 무대가 있는 넓은 홀. 파노라마 개인실과 키즈룸 보유. 터키·아제르바이잔·조지아 퓨전: 장작 화덕, 오픈 망갈, 다게스탄 양고기. 메제, 아다나·우르파 케밥, 피티, 두시바라, 바쿠 플로프, 하차푸리, 힌칼리. 바에는 터키 라크, 시그니처 칵테일, 동양 커피와 차.',
    },
  },

  'hedo': {
    name: { en: 'Hedo', de: 'Hedo', es: 'Hedo', fr: 'Hedo', zh: 'Hedo', ja: 'ヘド', ko: '헤도' },
    description: {
      en: 'Hedo is a restaurant-bar with Asian cuisine on Mozhayskoye Shosse. Calm Japandi-style interiors with muted lighting, natural materials, and cozy zones. A secluded lounge area offers tobacco-free steam cocktails. The menu features Asian classics and signature dishes: tataki, sashimi, open rolls, edamame with tuna flakes, noodles, and rice with seafood. A dedicated robata section grills steaks, wild sea bass, katsu-sando with black cod, and chicken. Desserts include mochi and chocolate berry tarts. The bar offers specialty coffee, tisanes, Chinese tea, draft beer, classic cocktails, and wines by the glass.',
      de: 'Hedo ist ein Restaurantbar mit asiatischer Küche am Moschajskoje Schossee. Ruhiges Japandi-Interieur mit gedämpftem Licht und Naturmaterialien. Abgelegene Lounge mit tabakfreien Dampfcocktails. Menü: asiatische Klassiker und Autorengerichte — Tataki, Sashimi, offene Rolls, Edamame mit Thunfischflocken, Nudeln. Robata-Bereich: Steaks, wilder Seebarsch, Katsu-Sando. Desserts: Mochi und Schokoladentörtchen. Bar: Kaffee, Tisane, chinesischer Tee, Bier, Cocktails, Wein.',
      es: 'Hedo es un restaurante-bar de cocina asiática en el Shosse Mozhayskoye. Interiores tranquilos estilo japandi con luz tenue y materiales naturales. Zona lounge apartada con cócteles de vapor sin tabaco. Menú: clásicos asiáticos y platos de autor — tataki, sashimi, rolls abiertos, edamame con copos de atún, fideos. Sección robata: steaks, lubina salvaje, katsu-sando con bacalao negro. Postres: mochi y tartas de chocolate. Bar: café, tisanas, té chino, cerveza, cócteles, vinos.',
      fr: 'Hedo est un restaurant-bar de cuisine asiatique sur le Chosse Mojaïskoïe. Intérieurs japandi apaisants avec éclairage tamisé et matériaux naturels. Lounge isolé avec cocktails vapeur sans tabac. Menu : classiques asiatiques et créations — tataki, sashimi, rolls ouverts, edamame aux copeaux de thon, nouilles. Section robata : steaks, bar sauvage, katsu-sando au cabillaud noir. Desserts : mochis et tartes chocolat-fruits. Bar : café, tisanes, thé chinois, bière, cocktails, vins au verre.',
      zh: 'Hedo是莫扎伊斯科耶大道的亚洲料理餐厅酒吧。日式侘寂风格的宁静空间，柔和灯光和天然材料。僻静休息区提供无烟草蒸汽鸡尾酒。菜单有亚洲经典和创意菜：炙烤、刺身、开放卷、金枪鱼片毛豆、面条和海鲜饭。�的炉烤区烤牛排、野生鲈鱼、黑鳕鱼炸猪排三明治。甜品有麻薯和巧克力浆果挞。酒吧有精品咖啡、花草茶、中国茶、啤酒、鸡尾酒和杯装葡萄酒。',
      ja: 'ヘドはモジャイスコエ・ショッセにあるアジアンレストラン＆バー。ジャパンディスタイルの落ち着いた空間。隠れ家ラウンジではタバコフリーのスチームカクテルも。メニューはアジアンクラシック＆シグネチャー：タタキ、刺身、オープンロール、鰹節エダマメ、ヌードル。ロバタセクションでステーキ、天然スズキ、カツサンド。デザートは餅とチョコベリータルト。バーにはスペシャリティコーヒー、中国茶、ドラフトビール、カクテル。',
      ko: '헤도는 모자이스코예 대로의 아시안 레스토랑 바입니다. 차분한 자판디 스타일에 은은한 조명과 천연 소재. 은밀한 라운지에서 무연초 스팀 칵테일 제공. 메뉴는 아시안 클래식과 시그니처: 타타키, 사시미, 오픈 롤, 가다랑어 에다마메, 누들. 로바타 섹션에서 스테이크, 야생 농어, 카츠산도. 디저트는 모찌와 초콜릿 베리 타르트. 바에는 스페셜티 커피, 중국 차, 생맥주, 칵테일, 잔 와인.',
    },
  },

  'af-msk-the-312-495151': {
    name: { en: 'The 312', de: 'The 312', es: 'The 312', fr: 'The 312', zh: 'The 312', ja: 'ザ312', ko: '더 312' },
    description: {
      en: 'The 312 is a Chicago-style gastrobar with live music: calm lunches by day, king-size cocktails and jazz by night. The heat of street orchestras, speakeasy aromas, and Chicago\'s daring spirit — right on Sushchyovskaya. Live jazz, acoustic sets, and Chicago-blues vocal evenings. The flagship dish is deep-dish pizza with molten mozzarella, chicken, mushrooms, and sweet mustard. Pair it with a Chicago-style hot dog or the chef\'s marble-beef burger. For dessert — the "Cadillac": cream with nut paste and chocolate.',
      de: 'The 312 ist ein Chicago-Gastrobar mit Live-Musik: tagsüber ruhige Mittagessen, abends King-Size-Cocktails und Jazz. Deep-Dish-Pizza mit Mozzarella, Hähnchen, Pilzen und Senfsoße. Dazu ein Chicago-Style Hot Dog oder Chef-Burger aus Marmorrindfleisch. Dessert „Cadillac": Sahne mit Nusspaste und Schokolade.',
      es: 'The 312 es un gastrobar estilo Chicago con música en vivo: almuerzos tranquilos de día, cócteles king-size y jazz de noche. El plato estrella es la deep-dish pizza con mozzarella fundida, pollo, champiñones y mostaza dulce. Acompáñala con un hot dog estilo Chicago o la hamburguesa del chef. Postre «Cadillac»: crema con pasta de nueces y chocolate.',
      fr: 'The 312 est un gastrobar à la chicagoane avec musique live : déjeuners tranquilles le jour, cocktails king-size et jazz le soir. Plat phare : deep-dish pizza à la mozzarella fondue, poulet, champignons et moutarde douce. Accompagnez d\'un hot-dog à la chicagoane ou du burger du chef. Dessert « Cadillac » : crème avec pâte de noix et chocolat.',
      zh: 'The 312是芝加哥风格的美食酒吧，有现场音乐：白天安静午餐，晚上超大鸡尾酒和爵士。招牌菜是深盘披萨配融化的马苏里拉、鸡肉、蘑菇和甜芥末。搭配芝加哥热狗或主厨大理石花纹牛肉汉堡。甜品"凯迪拉克"：奶油配坚果酱和巧克力。',
      ja: 'ザ312はライブミュージック付きシカゴスタイルのガストロバー。昼は落ち着いたランチ、夜はキングサイズカクテル＆ジャズ。看板はディープディッシュピッツァ（とろけるモッツァレラ、チキン、マッシュルーム、スイートマスタード）。シカゴスタイルホットドッグやシェフバーガーと合わせて。デザート「キャデラック」：ナッツペースト＆チョコレートのクリーム。',
      ko: '더 312는 라이브 음악이 있는 시카고 스타일 가스트로바입니다. 낮에는 차분한 런치, 밤에는 킹사이즈 칵테일과 재즈. 플래그십은 모차렐라, 치킨, 버섯, 스위트 머스타드의 딥디시 피자. 시카고 핫도그나 셰프 마블링 버거와 함께. 디저트 "캐딜락": 너트 페이스트와 초콜릿 크림.',
    },
  },

  'avero-mio': {
    name: { en: 'Avero Mio', de: 'Avero Mio', es: 'Avero Mio', fr: 'Avero Mio', zh: 'Avero Mio', ja: 'アヴェロ ミオ', ko: '아베로 미오' },
    description: {
      en: 'Avero Mio is a charming Italian restaurant on Petrovka by Vera Sadovnikova. The name translates from Italian as "truly mine," emphasizing the venue\'s living authenticity. Inside — warm, cheerful elegance without pretension: light wood, soft furniture, whimsical chandeliers, mirrors, and abundant greenery and flowers. A duo of renowned chefs — Rodion Sadovsky and Anatoly Malyshev — prepares dishes from various Italian regions. Hedonistic breakfasts with sparkling wine are served daily 9–12. A celebration of life — birthday parties, beautiful weddings, and lively corporate events.',
      de: 'Avero Mio ist ein charmantes italienisches Restaurant auf der Petrowka. Der Name bedeutet auf Italienisch „wahrhaft mein". Drinnen: warme, fröhliche Eleganz, helles Holz, verspielte Kronleuchter, viel Grün und Blumen. Zwei renommierte Köche bereiten Gerichte aus verschiedenen italienischen Regionen zu. Täglich 9–12 Uhr hedonistische Frühstücke mit Sekt. Ideal für Geburtstage, Hochzeiten und Firmenevents.',
      es: 'Avero Mio es un encantador restaurante italiano en Petrovka. El nombre significa "verdaderamente mío" en italiano. Interior: elegancia cálida y alegre sin pretensiones, madera clara, lámparas caprichosas, espejos, mucha vegetación y flores. Un dúo de chefs reconocidos prepara platos de diferentes regiones italianas. Desayunos hedonistas con espumoso diarios de 9 a 12. Ideal para cumpleaños, bodas y eventos corporativos.',
      fr: 'Avero Mio est un charmant restaurant italien sur Petrovka. Le nom signifie « vraiment mien » en italien. Intérieur chaleureux et festif sans ostentation : bois clair, lustres fantaisie, miroirs, verdure et fleurs. Un duo de chefs réputés prépare des plats de différentes régions d\'Italie. Petits-déjeuners hédonistes au mousseux tous les jours de 9 h à 12 h. Idéal pour anniversaires, mariages et événements.',
      zh: 'Avero Mio是彼得罗夫卡街上迷人的意大利餐厅。名字在意大利语中意为"真正属于我"。温暖愉快的优雅空间：浅色木材、奇特吊灯、镜子和大量绿植鲜花。两位知名主厨烹制意大利各地菜肴。每天9-12点享乐主义早餐配起泡酒。适合生日、婚礼和公司活动。',
      ja: 'アヴェロ ミオはペトロフカにある魅力的なイタリアンレストラン。名前はイタリア語で「本当に私の」。温かく陽気でありながら気取らないエレガンス：ライトウッド、ユニークなシャンデリア、ミラー、豊富なグリーンと花。2人の著名シェフがイタリア各地の料理を。毎日9〜12時にスパークリングワイン付き贅沢朝食。パーティーやウェディングにも最適。',
      ko: '아베로 미오는 페트로프카의 매력적인 이탈리안 레스토랑입니다. 이름은 이탈리아어로 "진정한 나의 것". 따뜻하고 유쾌한 우아함: 밝은 나무, 기발한 샹들리에, 거울, 풍성한 녹색 식물과 꽃. 두 명의 유명 셰프가 이탈리아 각지의 요리를 선보입니다. 매일 9~12시 스파클링 와인과 함께 럭셔리 조식. 생일, 웨딩, 기업 행사에 적합.',
    },
  },

  'mendeleev-bar-music': {
    name: { en: 'Mendeleev Bar & Music', de: 'Mendeleev Bar & Music', es: 'Mendeleev Bar & Music', fr: 'Mendeleev Bar & Music', zh: '门捷列夫酒吧', ja: 'メンデレーエフ バー＆ミュージック', ko: '멘델레예프 바 앤 뮤직' },
    description: {
      en: 'Mendeleev Bar & Music is a bar with dancing and signature cocktails on Petrovka. The legendary project was revived by the Oshi Izakaya team. A mysterious vintage atmosphere: cracked molding on the walls, massive crystal chandeliers, and wrought-iron stair railings. Regular music events from jazz concerts to techno dance nights. The bar by Alexander Glazunov and Konstantin Plesovskikh features signature cocktails blending Asian and European motifs. The eclectic kitchen serves sushi, hand-rolls with crab, brioche with caviar, wagyu, and more.',
      de: 'Mendeleev Bar & Music ist eine Bar mit Tanz und Autorencocktails auf der Petrowka. Legendäres Projekt, wiederbelebt vom Oshi-Izakaya-Team. Geheimnisvolle Vintage-Atmosphäre: gesprungener Stuck, massive Kristallleuchter, schmiedeeiserne Treppengeländer. Regelmäßige Events von Jazz bis Techno. Autorencocktails mit asiatischen und europäischen Motiven. Eklektische Küche: Sushi, Hand-Rolls, Brioche mit Kaviar, Wagyu.',
      es: 'Mendeleev Bar & Music es un bar con baile y cócteles de autor en Petrovka. Proyecto legendario revivido por el equipo de Oshi Izakaya. Atmósfera vintage misteriosa: molduras agrietadas, enormes arañas de cristal, barandas de hierro forjado. Eventos musicales regulares desde jazz hasta techno. Cócteles de autor que mezclan motivos asiáticos y europeos. Cocina ecléctica: sushi, hand-rolls con cangrejo, brioche con caviar, wagyu.',
      fr: 'Mendeleev Bar & Music est un bar dansant avec cocktails signatures sur Petrovka. Projet légendaire ressuscité par l\'équipe Oshi Izakaya. Atmosphère vintage mystérieuse : moulures craquelées, lustres en cristal massifs, rampes en fer forgé. Événements réguliers du jazz au techno. Cocktails signatures mêlant motifs asiatiques et européens. Cuisine éclectique : sushi, hand-rolls au crabe, brioche au caviar, wagyu.',
      zh: '门捷列夫酒吧是彼得罗夫卡街的舞蹈和创意鸡尾酒酒吧。传奇项目由Oshi Izakaya团队重新振兴。神秘复古氛围：墙上龟裂的灰泥、巨大水晶吊灯和锻铁楼梯扶手。定期音乐活动从爵士到电子。融合亚欧元素的创意鸡尾酒。折衷厨房：寿司、蟹肉手卷、鱼子酱布里欧修、和牛等。',
      ja: 'メンデレーエフ バー＆ミュージックはペトロフカにあるダンス＆シグネチャーカクテルのバー。伝説のプロジェクトをOshi Izakayaチームが復活。ミステリアスなヴィンテージ雰囲気：ひび割れたモールディング、巨大クリスタルシャンデリア、アイアンの手すり。ジャズからテクノまで定期ミュージックイベント。アジアン＆ヨーロピアンモチーフのシグネチャーカクテル。エクレクティックな料理：寿司、カニのハンドロール、キャビアブリオッシュ、和牛。',
      ko: '멘델레예프 바 앤 뮤직은 페트로프카의 댄스와 시그니처 칵테일 바입니다. Oshi Izakaya 팀이 전설적 프로젝트를 부활. 신비로운 빈티지 분위기: 금이 간 몰딩, 거대 크리스탈 샹들리에, 단조 철 난간. 재즈부터 테크노까지 정기 음악 이벤트. 아시아·유럽 모티프를 융합한 시그니처 칵테일. 에클레틱 키친: 스시, 크랩 핸드롤, 캐비어 브리오슈, 와규.',
    },
  },

  'af-msk-il-matto-507917': {
    name: { en: 'Il Matto', de: 'Il Matto', es: 'Il Matto', fr: 'Il Matto', zh: 'Il Matto', ja: 'イル・マット', ko: '일 마토' },
    description: {
      en: 'Il Matto is a spectacular Italian restaurant with a wine collection and cocktails on Bolshaya Dmitrovka. The interior is designed as intimate luxury: spacious windows, marble, mirrors, antique-style panels, theatrical burgundy curtains, and greenery. Chef Gianmaria Salia\'s menu features regional Italian and family recipes: Calabrian tuna, Florentine steak, octopus with apple demiglace, ricotta-spinach ravioli, and pizza with truffle burrata or salami with hot honey. The wine collection holds 150 bottles, with about 20 by the glass. Bar: Melon Bellini, Il Matto Negroni on mandarin gin.',
      de: 'Il Matto ist ein spektakuläres italienisches Restaurant mit Weinkollektion auf der Bolschaja Dmitrowka. Interieur: intime Luxusatmosphäre mit Marmor, Spiegeln, theatralischen Burgundervorhängen und Grün. Küchenchef Gianmaria Salia kocht regionale italienische und Familienrezepte: Kalabrier-Thunfisch, Florentiner Steak, Oktopus mit Apfel-Demiglace, Ricotta-Spinat-Ravioli, Pizza mit Trüffelburrata. 150 Flaschen Wein, 20 glasweise. Bar: Melon Bellini, Il Matto Negroni.',
      es: 'Il Matto es un espectacular restaurante italiano con colección de vinos en Bolshaya Dmítrovka. Interior de lujo íntimo: mármol, espejos, paneles de estilo antiguo, cortinas burdeos teatrales y vegetación. El chef Gianmaria Salia cocina recetas regionales italianas: atún calabrés, bistec florentino, pulpo con demiglace de manzana, ravioli de ricota y espinacas, pizza con burrata trufada. 150 botellas, 20 por copa. Bar: Melon Bellini, Il Matto Negroni.',
      fr: 'Il Matto est un spectaculaire restaurant italien avec collection de vins sur Bolchaïa Dmitrovka. Intérieur de luxe intime : marbre, miroirs, panneaux antiques, rideaux bordeaux théâtraux et verdure. Le chef Gianmaria Salia cuisine des recettes régionales : thon calabrais, steak florentin, poulpe au demiglace de pomme, ravioli ricotta-épinards, pizza à la burrata truffée. 150 bouteilles, 20 au verre. Bar : Melon Bellini, Il Matto Negroni au gin mandarine.',
      zh: 'Il Matto是大德米特罗夫卡街上壮观的意大利餐厅，拥有葡萄酒收藏。奢华私密内装：大理石、镜子、古典风格壁板、酒红色戏剧窗帘和绿植。主厨烹制意大利各地和家传食谱：卡拉布里亚金枪鱼、佛罗伦萨牛排、苹果酱章鱼、里科塔菠菜饺子、松露布拉塔披萨。150瓶葡萄酒，约20款杯装。酒吧有甜瓜贝利尼和橘子金酒尼格罗尼。',
      ja: 'イル・マットはボリシャヤ・ドミトロフカにあるワインコレクション付きの壮大なイタリアンレストラン。マーブル、ミラー、アンティーク調パネル、バーガンディカーテン、グリーンの親密なラグジュアリー空間。シェフがイタリア各地の地方・家族レシピを調理：カラブリア風マグロ、フィレンツェ風ステーキ、アップルデミグラスのタコ、リコッタ＆ほうれん草ラヴィオリ、トリュフブッラータピッツァ。150本のワイン、約20種グラスで。バー：メロンベリーニ、マンダリンジンのイル・マット・ネグローニ。',
      ko: '일 마토는 볼샤야 드미트로프카의 와인 컬렉션이 있는 화려한 이탈리안 레스토랑입니다. 마블, 거울, 앤틱 패널, 버건디 커튼, 녹색 식물의 친밀한 럭셔리 공간. 셰프가 이탈리아 지방과 가전 레시피를 조리: 칼라브리아 참치, 피렌체 스테이크, 사과 데미글라스 문어, 리코타 시금치 라비올리, 트러플 부라타 피자. 150병 와인, 약 20종 잔 와인. 바: 멜론 벨리니, 만다린 진의 일 마토 네그로니.',
    },
  },

  'af-msk-musson-494258': {
    name: { en: 'Musson', de: 'Musson', es: 'Musson', fr: 'Mousson', zh: '季风', ja: 'ムッソン', ko: '무쏜' },
    description: {
      en: '"Musson" is a seafood restaurant near Gorky Park, launched by restaurateur Pavel Maksakov (partner of Arkady Novikov and William Lamberti). All hot dishes are cooked in a josper, including artisan bread. The restaurant has its own smokehouse — even the classic Caesar becomes exceptionally aromatic. The design blends ethnic textures — African wood tabletops and textiles — with New York minimalism: spacious layout, high ceilings, panoramic windows, graphite gray and warm beige tones. Straw and wet-oak accents tie the composition together.',
      de: '„Musson" ist ein Fischrestaurant am Gorki-Park von Restaurateur Pawel Maksakov. Alle heißen Gerichte werden im Josper zubereitet, einschließlich Brot. Eigene Räucherei — selbst der Caesar-Salat wird besonders aromatisch. Ethnische Texturen — afrikanische Holztischplatten und Textilien — treffen auf New Yorker Minimalismus: hohe Decken, Panoramafenster, Graphitgrau und warmes Beige. Stroh- und Eichenakzente verbinden das Interieur.',
      es: '«Musson» es un restaurante de mariscos cerca del parque Gorki, del restaurador Pável Maksakov. Todos los platos calientes se cocinan en josper, incluido el pan artesanal. Tiene su propia ahumadora — incluso el César clásico resulta excepcionalmente aromático. El diseño mezcla texturas étnicas — madera africana y textiles — con minimalismo neoyorquino: techos altos, ventanales panorámicos, tonos grafito y beige cálido.',
      fr: '« Mousson » est un restaurant de fruits de mer près du parc Gorki, lancé par le restaurateur Pavel Maksakov. Tous les plats chauds sont cuits au josper, y compris le pain artisanal. Le restaurant possède son propre fumoir. Le design mêle textures ethniques — bois africain et textiles — et minimalisme new-yorkais : hauts plafonds, baies vitrées, tons graphite et beige chaud.',
      zh: '"季风"是高尔基公园附近的海鲜餐厅。所有热菜在炭烤炉中烹制，包括手工面包。自有烟熏室——连经典凯撒沙拉都格外芳香。设计融合民族质感——非洲木桌面和纺织品——与纽约极简主义：高天花板、全景窗、石墨灰和暖米色调。',
      ja: '「ムッソン」はゴーリキー公園近くのシーフードレストラン。全てのホットディッシュをジョスパーで調理（パン含む）。自家燻製室でシーザーサラダも格別の香りに。デザインはアフリカンウッドのテーブルトップとテキスタイルのエスニック×NYミニマリズム：高天井、パノラマウィンドウ、グラファイトグレー＆ウォームベージュ。',
      ko: '"무쏜"은 고리키 공원 근처의 해산물 레스토랑입니다. 모든 핫 디시를 조스퍼에서 조리하며 수제 빵도 포함. 자체 훈연실로 시저 샐러드도 특별한 향. 디자인은 아프리칸 우드 테이블탑과 텍스타일의 에스닉 질감에 뉴욕 미니멀리즘을 결합: 높은 천장, 파노라마 창, 그래파이트 그레이와 웜 베이지 톤.',
    },
  },

  'af-msk-ryba-mechty-495818': {
    name: { en: 'Fish of Dreams Bistro', de: 'Traumfisch Bistro', es: 'Pez de los Sueños Bistro', fr: 'Poisson de Rêve Bistro', zh: '梦想之鱼小酒馆', ja: '夢の魚ビストロ', ko: '꿈의 물고기 비스트로' },
    description: {
      en: '"Fish of Dreams" is a seafood bistro on Smolenskaya Square. Inside — a minimalist loft with fusion décor: the floor is painted with schools of fish, and walls feature themed artwork. Brand chef Alexander Seleznev\'s menu offers dozens of creative fish and seafood dishes with elements of various world cuisines: tuna pâté sandwich, salmon tartare with chuka, scallops with gruyère mashed potatoes, Murmansk cod with mornay sauce and Borodinsky crumbs, crab cake with zucchini and avocado sauce. Live sea urchins and three oyster varieties from the aquarium. The bar offers a dozen signature cocktails, mulled wine, beer, and wines by the glass.',
      de: '„Traumfisch" ist ein Fischbistro am Smolenskaja-Platz. Minimalistischer Loft mit Fusions-Dekor: auf dem Boden schwimmen gemalte Fischschwärme. Küchenchef Alexander Selesnew bietet Dutzende kreative Fischgerichte: Thunfisch-Paté-Sandwich, Lachstatar mit Chuka, Jakobsmuscheln mit Gruyère-Püree, Murmansker Kabeljau mit Mornay-Soße, Crabcake mit Avocado-Soße. Lebende Seeigel und drei Austernarten. Bar: Autorencocktails, Glühwein, Wein glasweise.',
      es: '«Pez de los Sueños» es un bistró de mariscos en la plaza Smolénskaya. Interior loft minimalista con decoración fusión: suelo pintado con bancos de peces. El chef Alexander Seleznev ofrece decenas de platos creativos de pescado y marisco: sándwich de paté de atún, tartar de salmón con chuka, vieiras con puré gruyère, bacalao de Múrmansk con salsa mornay. Erizos de mar vivos y tres variedades de ostras. Bar: cócteles de autor, vino caliente, vinos por copa.',
      fr: '« Poisson de Rêve » est un bistrot de fruits de mer sur la place Smolenskaïa. Loft minimaliste au décor fusion : au sol, des bancs de poissons peints. Le chef Alexandre Seleznev propose des dizaines de plats créatifs : sandwich au pâté de thon, tartare de saumon chuka, Saint-Jacques purée gruyère, cabillaud de Mourmansk sauce mornay. Oursins vivants et trois variétés d\'huîtres. Bar : cocktails signatures, vin chaud, vins au verre.',
      zh: '"梦想之鱼"是斯摩棱斯克广场的海鲜小酒馆。极简阁楼配融合装饰：地面绘有鱼群，墙上有主题画作。主厨菜单有数十道创意鱼类和海鲜菜肴：金枪鱼酱三明治、裙带菜三文鱼鞑靼、格鲁耶尔土豆泥扇贝、莫尔曼斯克鳕鱼配莫尔奈酱、蟹饼配西葫芦和牛油果酱。水族箱中的活海胆和三种生蚝。酒吧有十多款创意鸡尾酒、热红酒和杯装葡萄酒。',
      ja: '「夢の魚ビストロ」はスモレンスカヤ広場のシーフードビストロ。ミニマルロフトにフュージョンデコ：床に魚群が描かれ、壁にはテーマアート。ブランドシェフが数十の創作シーフード料理を提供：ツナパテサンド、チュカ添えサーモンタルタル、グリュイエールマッシュのホタテ、ムルマンスクタラのモルネーソース、ズッキーニ＆アボカドソースのクラブケーキ。水槽から活ウニと3種のオイスター。バーにはシグネチャーカクテル、ホットワイン、グラスワイン。',
      ko: '"꿈의 물고기 비스트로"는 스몰렌스카야 광장의 해산물 비스트로입니다. 미니멀 로프트에 퓨전 데코: 바닥에 물고기 떼가 그려져 있습니다. 브랜드 셰프가 수십 가지 창작 생선·해산물 요리를 선보입니다: 참치 파테 샌드위치, 추카 연어 타르타르, 그뤼에르 매시드 가리비, 무르만스크 대구 모르네 소스, 아보카도 소스 크랩케이크. 수족관에서 활 성게와 3종 굴. 바에는 시그니처 칵테일, 뱅쇼, 잔 와인.',
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
