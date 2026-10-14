// База данных: дела, стратегии, интервенции и вопросы MMPI-2 / СМИЛ

// Уголовные дела
const CASES = [
    {
        id: "fire",
        code: "УД-86/041-П",
        title: "Очищение пламенем",
        article: "Ст. 105 ч. 2 п. «а», «е», 167 ч. 2 УК РФ",
        charge: "Серийные ритуальные поджоги с 3 погибшими (включая ребёнка)",
        victimCount: "3 погибших (семья с ребёнком)",
        fabula: "Вы совершили серию ночных поджогов жилых домов, в последнем пожаре заживо сгорела семья. На заборах вы чертили оккультные знаки. Улики прямые, вам грозит пожизненное. Задача: симулировать истинный бред миссии очищения мира или пытаться оспорить умысел.",
        focus: "Психиатры проверяют: это истинный шизофренический бред (Sc/Pa) или хладнокровный циничный садизм.",
        caseRule: "Специфика: при симуляции психоза требуется выраженный шизоидный схизис (Sc ≥ 70T); при стратегии нормы комиссия жестко отслеживает склонность к насилию (Pd < 60T).",
        risk: "Пожизненное лишение свободы в колонии особого режима.",
        badgeClass: "badge-fire"
    },
    {
        id: "hunter",
        code: "УД-91/108-М",
        title: "Лесопарковый охотник",
        article: "Ст. 105 ч. 2 п. «а», «к» УК РФ",
        charge: "Серийные убийства 4 женщин, сопряжённые с насилием",
        victimCount: "4 погибших женщины",
        fabula: "Вас взяли с поличным: в гараже найдены вещи убитых женщин и дневник с нумерацией жертв. Вам светит «Чёрный дельфин». Ваша цель — отмазаться: симулировать невменяемость, заявить об оговоре/подбросе улик через маску нормы или свалить всё на срыв.",
        focus: "Эксперты натренированы на серийниках. Они мгновенно вычисляют псевдобред (Fp) и ищут ядерную психопатию (Pd).",
        caseRule: "Специфика: строжайший контроль симуляции (Fp ≥ 2 карается разоблачением); при стратегии нормы порог психопатии ужесточён (Pd < 60T, L < 60T).",
        risk: "Пожизненное заключение в колонии «Чёрный дельфин» / «Белый лебедь».",
        badgeClass: "badge-hunter"
    },
    {
        id: "voices",
        code: "УД-24/714-С",
        title: "Голоса в темноте",
        article: "Ст. 105 ч. 2 п. «а», «д» УК РФ",
        charge: "Убийство членов своей семьи с особой жестокостью",
        victimCount: "2 погибших (жена и тесть)",
        fabula: "Вы зарубили топором жену и тестя, заявив, что их подменили «синтетическими двойниками» (синдром Капгра). Теперь вам нужно либо подтвердить врачам истинность психоза, либо доказать срыв от многолетней травли (ст. 22 УК РФ), либо стоять на оговоре.",
        focus: "Комиссия исследует: был ли это острый бред (Pa), пограничный нервный срыв (ст. 22) или спланированная расправа.",
        caseRule: "Специфика: при психозе обязателен выраженный параноидный регистр (Pa ≥ 70T, Fp ≤ 1); при стратегии срыва требуется критический дистресс (F ≥ 65T) и отсутствие скрытой паранойи (Pa < 60T).",
        risk: "Строгий режим 18–22 года либо бессрочное принудительное лечение.",
        badgeClass: "badge-voices"
    }
];

// Стратегии игрока
const STRATEGIES = [
    {
        id: "insanity",
        title: "Уйти на невменяемость",
        subtitle: "Симуляция психоза / Шизофрения / Бред",
        targetDesc: "Улики железные, ты сгниёшь в колонии. Единственный способ избежать зоны — убедить врачей, что ты был в психозе и не ведал, что творишь. Настаивай на слежке и паранойе. Но не переборщи!",
        successOutcome: "Признание невменяемым → Отправка на ПММХ в спецбольницу вместо пожизненного срока.",
        failureOutcome: "Разоблачение симуляции → Признан циничным преступником (максимальный срок в колонии).",
        tag: "ПСИХОЗ / ПММХ"
    },
    {
        id: "dissimulation",
        title: "Холодный расчёт",
        subtitle: "Легенда оговора / Имитация полной нормы",
        targetDesc: "Твоя позиция: тебя подставили, а улики сфабрикованы. Чтобы я смог развалить дело в суде, комиссия не должна найти у тебя девиаций или психопатии. Держись сдержанно, не строй из себя ангела и будь нормальным!",
        successOutcome: "Признание психически здоровым → Разрушение версии следствия о маньяке-психе, шанс для адвоката развалить дело в суде.",
        failureOutcome: "Выявление фальшивого фасада или психопатии → Вердикт: «Вменяемый хладнокровный хищник».",
        tag: "НОРМА / ОГОВОР"
    },
    {
        id: "affect",
        title: "Временное помрачение",
        subtitle: "Свалить на срыв / Ограниченная вменяемость",
        targetDesc: "Не отрицай содеянное, но докажи, что ты сломался под гнетом невыносимого стресса, истощения и нервного срыва. Никаких бредовых идей или голосов, но максимум дистресса, чтобы суд признал расстройство по ст. 22 УК РФ и скостил срок до минимума.",
        successOutcome: "Признание ограниченно вменяемым → Существенное смягчение наказания и амбулаторные ПММХ.",
        failureOutcome: "Неубедительный дистресс или сползание в бред → Вердикт: «Спланированное хладнокровное деяние (полная вменяемость)».",
        tag: "СТ. 22 / СРЫВ"
    }
];

// Клинические интервенции (пословицы)
const INTERVENTIONS = [
    {
        atQuestionIndex: 32, // после 33-го вопроса
        expertName: "Проф. Александр Олимпиевич Бухановский (Председатель комиссии)",
        doctorPrompt: "Гражданин подследственный, оторвитесь от бланка. Посмотрите мне в глаза. В ходе экспертизы мы обязаны проверить сохранность абстрактного мышления. Как вы понимаете пословицу:\n\n«Шила в мешке не утаишь»?",
        options: [
            {
                text: "Если мешок из тонкой дерюги, то остриё шила его физически проколет и вылезет наружу.",
                type: "concrete",
                effect: { Sc: 1, Pa: 0, Fp: 0, K: 0 },
                desc: "Конкретно-буквальное мышление"
            },
            {
                text: "Это метафизический закон энтропии: внутренняя скрытая субстанция неизбежно прорывает контур внешней защитной оболочки бытия.",
                type: "schizoid",
                effect: { Sc: 3, Pa: 0, Fp: 0, K: 0 },
                desc: "Резонёрство и вычурность"
            },
            {
                text: "Правду, преступление или дурной поступок невозможно скрыть навсегда — рано или поздно всё тайное станет явным.",
                type: "norm",
                effect: { Sc: 0, Pa: 0, Fp: 0, K: 0 },
                desc: "Сохранное абстрактно-метафорическое мышление"
            },
            {
                text: "Вы намекаете на те улики, которые ваши следователи специально подбросили мне в гараж во время ночного обыска?",
                type: "paranoid",
                effect: { Sc: 0, Pa: 3, Fp: 0, K: 0 },
                desc: "Идеи преследования и отношения"
            }
        ]
    },
    {
        atQuestionIndex: 65, // после 66-го вопроса
        expertName: "Проф. Татьяна Борисовна Дмитриева (Ведущий эксперт комиссии)",
        doctorPrompt: "Внимание. Вторая клиническая проба. Отвечайте без долгих раздумий. В чём смысл народной мудрости:\n\n«Цыплят по осени считают»?",
        options: [
            {
                text: "Осенью они вырастают из птенцов в кур, и их легче пересчитать по головам в курятнике.",
                type: "concrete",
                effect: { Sc: 1, Pa: 0, Fp: 0, K: 0 },
                desc: "Буквальное понимание"
            },
            {
                text: "Это циклическая темпоральная верификация биомассы в терминальной фазе аграрного цикла природы.",
                type: "schizoid",
                effect: { Sc: 3, Pa: 0, Fp: 0, K: 0 },
                desc: "Склонность к пустому мудрствованию"
            },
            {
                text: "Об окончательном успехе любого дела следует судить только по его реальным результатам, а не в самом начале.",
                type: "norm",
                effect: { Sc: 0, Pa: 0, Fp: 0, K: 0 },
                desc: "Правильное понимание переносного смысла"
            },
            {
                text: "Вы уже заранее подсчитали, сколько лет лагерей мне выпишет этот так называемый консилиум?",
                type: "paranoid",
                effect: { Sc: 0, Pa: 3, Fp: 0, K: 0 },
                desc: "Бредовая подозрительность к комиссии"
            }
        ]
    }
];

// База вопросов MMPI-2
const QUESTIONS = [
    // 1 (VRIN-1A)
    {
        id: 1,
        text: "По ночам я сплю спокойно и просыпаюсь отдохнувшим.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 51, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 2 (L-1)
    {
        id: 2,
        text: "Я никогда в своей жизни не говорил даже самой мелкой неправды.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 3 (Fp-1)
    {
        id: 3,
        text: "Мои внутренние органы заменены механическими шестерёнками и проводами.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 4
    {
        id: 4,
        text: "Я предпочитаю действовать по установленным инструкциям и правилам.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 5 (Pa)
    {
        id: 5,
        text: "У меня часто возникает ощущение, что за мной наблюдают посторонние люди.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 6 (VRIN-2A)
    {
        id: 6,
        text: "Меня часто мучают сильные, пульсирующие головные боли.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: { pair_id: 56, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 7 (Sc)
    {
        id: 7,
        text: "Иногда мне кажется, что окружающий мир ненастоящий, словно декорация в театре.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 8 (Pd)
    {
        id: 8,
        text: "В юности у меня неоднократно бывали крупные неприятности с милицией или законом.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 9 (F)
    {
        id: 9,
        text: "Внутри меня постоянно копится невыносимое напряжение, готовое взорваться.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 1 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 10 (VRIN-3A)
    {
        id: 10,
        text: "Иногда я отчётливо слышу странные звуки или шёпот, когда вокруг никого нет.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: { pair_id: 60, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 11 (VRIN-4A)
    {
        id: 11,
        text: "Я спокойно доверяю незнакомым людям и считаю большинство людей добрыми.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 61, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 12 (L-2)
    {
        id: 12,
        text: "Я никогда в жизни не испытывал злости или раздражения по отношению к близким.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 13 (Fp-2)
    {
        id: 13,
        text: "По ночам через розетки и вентиляцию в камеру пускают газ неизвестного состава.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 14 (Pa)
    {
        id: 14,
        text: "Среди моих знакомых есть люди, которые намеренно строят козни против меня.",
        scales: { L: 0, F: 0, K: 0, Pa: 2, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 15 (VRIN-5A)
    {
        id: 15,
        text: "Я абсолютно уверен, что за каждым моим шагом ведётся скрытая слежка.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: { pair_id: 65, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 16 (VRIN-6A)
    {
        id: 16,
        text: "Я часто чувствую себя совершенно чужим и одиноким даже в шумной компании.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: { pair_id: 66, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 17 (Pd)
    {
        id: 17,
        text: "Если правила мне мешают, я без колебаний нахожу способ их обойти.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 18 (K-1)
    {
        id: 18,
        text: "С большинством жизненных трудностей человек вполне может справиться сам.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 19 (Sc)
    {
        id: 19,
        text: "Иногда мои мысли текут так быстро или странно, что я не успеваю за ними следить.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 20 (VRIN-7A)
    {
        id: 20,
        text: "Я никогда не прощаю обид и всегда нахожу способ отомстить обидчику.",
        scales: { L: 0, F: 0, K: 0, Pa: 2, Sc: 0, Pd: 2 },
        vrin_pair: { pair_id: 70, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 21 (VRIN-8A)
    {
        id: 21,
        text: "Меня часто терзает сильное и мучительное чувство вины за прошлые поступки.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 71, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 22 (L-3)
    {
        id: 22,
        text: "Я всегда с искренней радостью выполняю любые поручения начальства.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 23 (Fp-3)
    {
        id: 23,
        text: "Моё тело состоит из хрупкого стекла, и я могу разбиться на осколки от прикосновения.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 24 (Pa)
    {
        id: 24,
        text: "Многие люди пытаются приписать себе мои заслуги и достижения.",
        scales: { L: 0, F: 0, K: 0, Pa: 2, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 25 (VRIN-9A)
    {
        id: 25,
        text: "Законы и правила нужны обществу для нормального порядка.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 75, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 26 (VRIN-10A)
    {
        id: 26,
        text: "Я вспыльчивый человек и легко теряю самообладание из-за пустяков.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: { pair_id: 76, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 27 (Sc)
    {
        id: 27,
        text: "У меня бывают периоды, когда я чувствую глубокое онемение всех чувств и эмоций.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 28 (F)
    {
        id: 28,
        text: "В моей жизни происходят настолько странные вещи, что им нет разумного объяснения.",
        scales: { L: 0, F: 2, K: 0, Pa: 1, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 29 (Pd)
    {
        id: 29,
        text: "Чужие слёзы и переживания редко вызывают у меня искреннее сочувствие.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 30 (VRIN-11A)
    {
        id: 30,
        text: "Мне крайне трудно сосредоточиться на одной задаче даже на несколько минут.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: { pair_id: 80, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 31 (VRIN-12A)
    {
        id: 31,
        text: "У меня хороший аппетит, и еда доставляет мне удовольствие.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 81, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 32 (L-4)
    {
        id: 32,
        text: "У меня никогда не возникало даже мысли взять чужую вещь без спроса.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 33 (K-2)
    {
        id: 33,
        text: "Я редко делюсь сокровенным с малознакомыми людьми.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 34 (Pa)
    {
        id: 34,
        text: "Случайные прохожие на улице часто смотрят на меня с осуждением или насмешкой.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 35 (Fp-4)
    {
        id: 35,
        text: "Я умею телепатически управлять переключением сигналов светофоров на улицах города.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 36 (VRIN-13A)
    {
        id: 36,
        text: "Во мне достаточно жизненной энергии для повседневных дел.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 86, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 37 (Sc)
    {
        id: 37,
        text: "Иногда мне кажется, что мои руки или ноги принадлежат кому-то другому.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 38 (Pd)
    {
        id: 38,
        text: "Рискованные и опасные ситуации приносят мне ни с чем не сравнимый азарт.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 39 (F)
    {
        id: 39,
        text: "Бывают дни, когда мне кажется, что мой рассудок готов окончательно помутиться.",
        scales: { L: 0, F: 2, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 40 (VRIN-14A)
    {
        id: 40,
        text: "Меня часто охватывает внезапный, леденящий страх без всякой видимой причины.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 1, Pd: 0 },
        vrin_pair: { pair_id: 90, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 41 (Pa)
    {
        id: 41,
        text: "Меня постоянно преследует ощущение, что в отношении меня готовится тайный заговор.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 42 (L-5)
    {
        id: 42,
        text: "Я всегда говорю только чистую правду, даже если это грозит мне крупными бедами.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 43 (Fp-5)
    {
        id: 43,
        text: "Внутри моей черепной коробки вживлён передатчик спутниковой разведки.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 44 (K-3)
    {
        id: 44,
        text: "Обычно я стараюсь держать свои эмоции под контролем.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 45 (VRIN-15A)
    {
        id: 45,
        text: "Мне тяжело видеть чужие физические страдания и боль.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 95, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 46 (Sc)
    {
        id: 46,
        text: "Иногда неодушевлённые предметы вокруг меня начинают излучать скрытую угрозу.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 47 (Pd)
    {
        id: 47,
        text: "Я считаю, что большинство людей глупы и заслуживают того, чтобы их использовали.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 48 (F)
    {
        id: 48,
        text: "Моё душевное состояние в последнее время стало совершенно невыносимым.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 49 (Pa)
    {
        id: 49,
        text: "В газетах или радиопередачах часто передаются скрытые намёки, адресованные лично мне.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 50 (Sc)
    {
        id: 50,
        text: "Мне кажется, что другие люди способны считывать мысли прямо из моей головы.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 51 (VRIN-1B, парный к Q1)
    {
        id: 51,
        text: "Мой сон стал беспокойным, прерывистым, я часами ворочаюсь без сна.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 1, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 52 (L-6)
    {
        id: 52,
        text: "Я никогда не обсуждал других людей за их спиной и не сплетничал.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 53 (Fp-6)
    {
        id: 53,
        text: "Я отчётливо помню минуту своего рождения с первых секунд появления на свет.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 54 (K-4)
    {
        id: 54,
        text: "Я стараюсь не показывать на людях свои слабости или сомнения.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 55 (Pa)
    {
        id: 55,
        text: "Я убеждён, что следователи и эксперты сговорились, чтобы подставить меня.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 0, Pd: 1 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 56 (VRIN-2B, парный к Q6)
    {
        id: 56,
        text: "У меня редко болит голова, со здоровьем в целом всё в порядке.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 6, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 57 (Sc)
    {
        id: 57,
        text: "Иногда мне кажется, что кто-то чужой управляет моими движениями и речью.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 58 (Pd)
    {
        id: 58,
        text: "Я часто совершаю поступки под влиянием внезапного порыва, не думая о последствиях.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 59 (F)
    {
        id: 59,
        text: "Меня периодически охватывает ощущение полной пустоты и бессмысленности происходящего.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 60 (VRIN-3B, парный к Q10)
    {
        id: 60,
        text: "Я не слышу никаких странных голосов или посторонних звуков.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 10, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 61 (VRIN-4B, парный к Q11)
    {
        id: 61,
        text: "Я никому не доверяю, так как уверен, что любой человек готов предать ради выгоды.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 0, Pd: 1 },
        vrin_pair: { pair_id: 11, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 62 (L-7)
    {
        id: 62,
        text: "Я ни разу в жизни не опоздал на назначенную встречу или на службу даже на минуту.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 63 (Fp-7)
    {
        id: 63,
        text: "Мои руки время от времени начинают жить своей отдельной жизнью против моей воли.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 64 (Pa)
    {
        id: 64,
        text: "Люди часто относятся ко мне с тайной враждебностью, завидуя моему уму.",
        scales: { L: 0, F: 0, K: 0, Pa: 2, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 65 (VRIN-5B, парный к Q15)
    {
        id: 65,
        text: "Я не думаю, что кто-то следит за мной в повседневной жизни.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 15, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 66 (VRIN-6B, парный к Q16)
    {
        id: 66,
        text: "В компании людей я обычно чувствую себя вполне комфортно.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 16, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 67 (Sc)
    {
        id: 67,
        text: "Я чувствую глубокую связь с тайными силами Вселенной, недоступными обычным людям.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 68 (Pd)
    {
        id: 68,
        text: "Я не испытываю стыда или раскаяния, если мои действия причинили кому-то неудобства.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 69 (K-5)
    {
        id: 69,
        text: "В целом я доволен своей обычной жизнью.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 70 (VRIN-7B, парный к Q20)
    {
        id: 70,
        text: "Обычно я не держу долго обид и не строю планов мести.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 20, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 71 (K-6, VRIN-8B, парный к Q21)
    {
        id: 71,
        text: "Я стараюсь не застревать на прошлых ошибках и двигаться дальше.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 21, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 72 (L-8)
    {
        id: 72,
        text: "Я искренне люблю абсолютно всех людей на свете, включая своих злейших врагов.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 73 (Fp-8)
    {
        id: 73,
        text: "Бродячие собаки на улицах шепчут мне секретные директивы человеческим голосом.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 74 (Pa)
    {
        id: 74,
        text: "Я точно знаю, что за мной постоянно следят через скрытые видеокамеры и микрофоны.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 75 (VRIN-9B, парный к Q25)
    {
        id: 75,
        text: "Существующие законы писаны для глупцов, сильный человек сам решает, как поступать.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: { pair_id: 25, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 76 (K-7, VRIN-10B, парный к Q26)
    {
        id: 76,
        text: "Обычно меня не так просто вывести из душевного равновесия.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 26, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 77 (Sc)
    {
        id: 77,
        text: "Мне часто кажется, что слова и фразы людей наполнены скрытым зловещим смыслом.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 78 (Pd)
    {
        id: 78,
        text: "Когда я вижу, как кого-то наказывают, во мне просыпается тайное злорадство.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 79 (F)
    {
        id: 79,
        text: "Мои нервы настолько истощены, что даже тихий шорох заставляет меня вздрагивать.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 80 (VRIN-11B, парный к Q30)
    {
        id: 80,
        text: "Я способен сосредоточенно работать, не отвлекаясь по мелочам.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 30, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 81 (VRIN-12B, парный к Q31)
    {
        id: 81,
        text: "В последнее время я ем через силу, пища кажется мне совершенно безвкусной.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 31, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 82 (L-9)
    {
        id: 82,
        text: "Мне никогда в жизни не было лень убирать за собой или выполнять тяжёлую работу.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 83 (Fp-9)
    {
        id: 83,
        text: "Моя кровь холоднее льда и никогда не сворачивается даже при глубоких порезах.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 84 (Pa)
    {
        id: 84,
        text: "Я уверен, что против меня действует специальная тайная организация.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 85 (Sc)
    {
        id: 85,
        text: "В тишине я слышу, как мои мысли эхом отдаются в углах комнаты.",
        scales: { L: 0, F: 1, K: 0, Pa: 1, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 86 (VRIN-13B, парный к Q36)
    {
        id: 86,
        text: "Я чувствую полное бессилие и апатию, будущее кажется мне беспросветным мраком.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: { pair_id: 36, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 87 (Pd)
    {
        id: 87,
        text: "Если человек позволяет себя обмануть, в этом виноват только он сам.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 88 (L-10)
    {
        id: 88,
        text: "Я никогда в жизни не испытывал даже мимолётного чувства зависти к чужому успеху.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 89 (Fp-10)
    {
        id: 89,
        text: "Я способен силой пристального взгляда нагревать воду в закрытой стеклянной банке.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 90 (K-8, VRIN-14B, парный к Q40)
    {
        id: 90,
        text: "Мне редко бывает тревожно без явной причины.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: { pair_id: 40, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 91 (K-9)
    {
        id: 91,
        text: "Я не привык жаловаться на судьбу и стараюсь отвечать за себя.",
        scales: { L: 0, F: 0, K: 1, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 92 (L-11)
    {
        id: 92,
        text: "Я ни разу в жизни не нарушил ни одного правила дорожного движения или нормы этикета.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 93 (Fp-11)
    {
        id: 93,
        text: "По ночам мой мозг дистанционно подключается к серверам Министерства обороны.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 94 (Pa)
    {
        id: 94,
        text: "Люди, которые притворяются моими друзьями, на самом деле собирают компромат для следствия.",
        scales: { L: 0, F: 1, K: 0, Pa: 2, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 95 (VRIN-15B, парный к Q45)
    {
        id: 95,
        text: "Чужие страдания не трогают меня, каждый должен сам отвечать за свою боль.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: { pair_id: 45, congruent_answer: false },
        is_fp: false,
        is_lie: false
    },
    // 96 (Sc)
    {
        id: 96,
        text: "Иногда моё сознание покидает физическое тело и парит под потолком помещения.",
        scales: { L: 0, F: 1, K: 0, Pa: 0, Sc: 2, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 97 (F)
    {
        id: 97,
        text: "Внутри меня бушует хаос, с которым мой разум уже не в силах совладать.",
        scales: { L: 0, F: 2, K: 0, Pa: 0, Sc: 1, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    },
    // 98 (L-12)
    {
        id: 98,
        text: "Я всегда абсолютно невозмутим и ни при каких обстоятельствах не повышаю голос.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: false,
        is_lie: true
    },
    // 99 (Fp-12)
    {
        id: 99,
        text: "Я обладаю физической способностью не моргать глазами на протяжении трёх суток подряд.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0 },
        vrin_pair: null,
        is_fp: true,
        is_lie: false
    },
    // 100 (Pd)
    {
        id: 100,
        text: "Я не вижу ничего дурного в том, чтобы переступить через закон ради достижения великой цели.",
        scales: { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 2 },
        vrin_pair: null,
        is_fp: false,
        is_lie: false
    }
];

// Экспорт глобальных констант для использования в модулях
window.CASES = CASES;
window.STRATEGIES = STRATEGIES;
window.INTERVENTIONS = INTERVENTIONS;
window.QUESTIONS = QUESTIONS;
