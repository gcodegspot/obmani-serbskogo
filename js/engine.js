// Расчёт шкал СМИЛ/MMPI-2, замеры времени ответов и алгоритм вердиктов

// Телеметрия времени реакции
class Telemetry {
    constructor() {
        this.responseTimes = [];
        this.questionTimestamps = {};
        this.sessionStartTime = performance.now();
    }

    startTimer(questionId) {
        this.questionTimestamps[questionId] = performance.now();
    }

    recordResponse(questionId, question) {
        const startTime = this.questionTimestamps[questionId];
        if (!startTime) return;

        const responseTime = performance.now() - startTime;
        this.responseTimes.push({
            questionId,
            responseTime,
            isLie: question.is_lie || false,
            isFp: question.is_fp || false
        });
    }

    // Детекция когнитивных задержек на контрольных вопросах (L/Fp)
    detectCognitiveHesitation() {
        if (this.responseTimes.length < 15) return false;

        const avgTime = this.getAverageTime();
        const lieFpTimes = this.responseTimes
            .filter(r => r.isLie || r.isFp)
            .map(r => r.responseTime);

        if (lieFpTimes.length === 0) return false;

        // Если больше 2 проверочных вопросов вызвали паузу >4с при быстром среднем темпе (<2.2с)
        const suspiciousPauses = lieFpTimes.filter(t => t > 4000).length;
        return suspiciousPauses >= 2 && avgTime < 2200;
    }

    // Детекция случайного кликинга (быстрые клики подряд)
    detectRandomClicking() {
        if (this.responseTimes.length < 6) return false;

        for (let i = 0; i <= this.responseTimes.length - 6; i++) {
            const window = this.responseTimes.slice(i, i + 6);
            if (window.every(r => r.responseTime < 350)) {
                return true;
            }
        }
        return false;
    }

    getAverageTime() {
        if (this.responseTimes.length === 0) return 0;
        const total = this.responseTimes.reduce((sum, r) => sum + r.responseTime, 0);
        return total / this.responseTimes.length;
    }

    getAverageTimeSeconds() {
        return (this.getAverageTime() / 1000).toFixed(2);
    }

    getTotalTimeSeconds() {
        const elapsed = performance.now() - this.sessionStartTime;
        return (elapsed / 1000).toFixed(1);
    }
}

// Расчёт шкал СМИЛ / MMPI-2 (100 вопросов)
class ScaleCalculator {
    constructor(answers, questions, interventionAnswers = []) {
        this.answers = answers;
        this.questions = questions;
        this.interventionAnswers = interventionAnswers;
    }

    calculateRawScores() {
        const scores = { L: 0, F: 0, K: 0, Pa: 0, Sc: 0, Pd: 0, Fp: 0 };

        this.answers.forEach((answer, qId) => {
            const question = this.questions.find(q => q.id === qId);
            if (!question) return;

            if (answer === 'yes') {
                Object.entries(question.scales).forEach(([scale, value]) => {
                    if (scores[scale] !== undefined) {
                        scores[scale] += value;
                    }
                });

                if (question.is_fp) scores.Fp += 1;
                if (question.is_lie) scores.L += 1;
            }
        });

        // Эффект от клинических интервенций комиссии
        this.interventionAnswers.forEach(opt => {
            if (opt && opt.effect) {
                Object.entries(opt.effect).forEach(([scale, val]) => {
                    if (scores[scale] !== undefined) {
                        scores[scale] += val;
                    }
                });
            }
        });

        // Нижний порог — 0
        Object.keys(scores).forEach(k => {
            scores[k] = Math.max(0, scores[k]);
        });

        return scores;
    }

    // Расчёт индекса VRIN (противоречивость ответов в 15 парах)
    calculateVRIN() {
        let vrinScore = 0;
        const processedPairs = new Set();

        this.questions.forEach(question => {
            if (!question.vrin_pair) return;

            const pairId = question.vrin_pair.pair_id;
            const currentAnswer = this.answers.get(question.id);
            const pairAnswer = this.answers.get(pairId);

            const pairKey = [Math.min(question.id, pairId), Math.max(question.id, pairId)].join('-');
            if (processedPairs.has(pairKey)) return;
            if (!currentAnswer || !pairAnswer) return;

            processedPairs.add(pairKey);

            // Противоречие при congruent_answer === false: ответы одинаковы (ДА+ДА или НЕТ+НЕТ)
            const isContradictory = question.vrin_pair.congruent_answer
                ? currentAnswer !== pairAnswer
                : currentAnswer === pairAnswer;

            if (isContradictory) {
                vrinScore += 1;
            }
        });

        return vrinScore;
    }

    // Расчёт индекса TRIN
    calculateTRIN() {
        const yesCount = Array.from(this.answers.values()).filter(a => a === 'yes').length;
        const totalCount = this.answers.size;
        if (totalCount === 0) return 0;

        const yesRatio = yesCount / totalCount;
        const deviation = Math.abs(yesRatio - 0.5) * 2;
        return Math.round(deviation * 10);
    }

    // Перевод сырых баллов в Т-баллы
    convertToTScores(rawScores) {
        const norms = {
            L: { mean: 4.0, sd: 2.5 },
            F: { mean: 10.0, sd: 5.0 },
            K: { mean: 3.0, sd: 2.0 },
            Pa: { mean: 8.0, sd: 5.0 },
            Sc: { mean: 10.0, sd: 5.5 },
            Pd: { mean: 7.0, sd: 4.5 }
        };

        const tScores = {};
        Object.entries(rawScores).forEach(([scale, raw]) => {
            if (norms[scale]) {
                const t = 50 + 10 * (raw - norms[scale].mean) / norms[scale].sd;
                tScores[scale] = Math.round(Math.max(30, Math.min(120, t)));
            }
        });

        return tScores;
    }

    calculateGoughIndex(rawScores) {
        return rawScores.F - rawScores.K;
    }

    calculateAll() {
        const rawScores = this.calculateRawScores();
        const tScores = this.convertToTScores(rawScores);
        const vrinScore = this.calculateVRIN();
        const trinScore = this.calculateTRIN();
        const goughIndex = this.calculateGoughIndex(rawScores);

        return {
            rawScores,
            tScores,
            vrinScore,
            trinScore,
            goughIndex,
            fpScore: rawScores.Fp
        };
    }
}

// Движок вердиктов и исходов
class VerdictEngine {
    static determineVerdict(results, telemetry, selectedCase, selectedStrategy) {
        const { vrinScore, fpScore, goughIndex, tScores, rawScores } = results;
        const hesitation = telemetry.detectCognitiveHesitation();
        const randomClick = telemetry.detectRandomClicking();

        // 1. Технический брак / Случайный ввод
        if (vrinScore >= 4 || randomClick) {
            let failReason = '';
            let verdictText = '';

            if (vrinScore >= 4 && randomClick) {
                failReason = `Комплексный брак: критический уровень противоречий (VRIN = ${vrinScore}/15) и аномальный темп (< 350 мс).`;
                verdictText = `Протокол психологического обследования признан статистически недостоверным ввиду высокой внутренней противоречивости ответов (VRIN = ${vrinScore}) и аномального темпа прохождения. Испытуемый грубо нарушал инструкцию.`;
            } else if (vrinScore >= 4) {
                failReason = `Критический уровень противоречий в ответах (VRIN = ${vrinScore}/15 при норме < 3).`;
                verdictText = `Протокол психологического обследования признан статистически недостоверным ввиду высокой внутренней противоречивости ответов (VRIN = ${vrinScore}/15 при допустимой норме < 3). Зафиксированы взаимоисключающие ответы на контрольные пары вопросов-ловушек.`;
            } else {
                failReason = 'Зафиксировано аномально быстрое прокликивание вопросов (< 350 мс), исключающее осмысление.';
                verdictText = `Протокол психологического обследования аннулирован ввиду аномального темпа прохождения (< 350 мс на вопрос). Скорость ответов исключает реальное прочтение и понимание утверждений теста.`;
            }

            return {
                type: 'INVALID',
                isVictory: false,
                victoryBanner: 'ВЫ ПРОИГРАЛИ',
                victorySubtitle: 'Экспертиза аннулирована: дезорганизация тестирования и технический брак',
                verdictGoal: selectedStrategy.successOutcome,
                keyFactor: failReason,
                caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) суд расценил срыв освидетельствования как попытку саботажа следствия и продлил арест в СИЗО.`,
                title: 'ПРОТОКОЛ НЕДОСТОВЕРЕН',
                stamp: 'ЭКСПЕРТИЗА НЕ СОСТОЯЛАСЬ',
                stampClass: 'stamp-red',
                text: verdictText,
                details: 'Экспертная комиссия констатирует намеренную дезорганизацию тестирования или установочное случайное заполнение бланка.',
                epilogue: `В связи с признанием экспертизы несостоявшейся, суд продлил срок содержания под стражей по делу ${selectedCase.code} (${selectedCase.title}). Назначена повторная стационарная СПЭ в усиленном надзорном отделении Института им. Сербского.`,
                finalStatus: 'ПОВТОРНАЯ СТАЦИОНАРНАЯ ЭКСПЕРТИЗА'
            };
        }

        // ----------------------------------------------------
        // УРОВЕНЬ 2: ГРОТЕСКНАЯ СИМУЛЯЦИЯ (Fp / Аномальный зашкал)
        // В делах «Лесопарковый охотник» и «Голоса в темноте» комиссия экспертов строже: Fp >= 2 уже признается симуляцией
        // ----------------------------------------------------
        const isStrictFpCase = selectedCase.id === 'hunter' || selectedCase.id === 'voices';
        const fpThreshold = isStrictFpCase ? 2 : 3;

        if (fpScore >= fpThreshold || goughIndex > 35) {
            const strictNote = isStrictFpCase && fpScore === 2
                ? (selectedCase.id === 'hunter'
                    ? ' По делу серийного убийцы эксперты Сербского проявили предельную бдительность и не простили даже минимального псевдобреда.'
                    : ' В деле о резне из-за бреда Капгра эксперты знают, что синдром отрицательного двойника спаян и логичен, а карикатурный псевдобред мгновенно выдает симулянта.')
                : '';

            return {
                type: 'SIMULATION',
                isVictory: false,
                victoryBanner: 'ВЫ ПРОИГРАЛИ',
                victorySubtitle: 'Гротескная симуляция сумасшествия полностью изобличена',
                verdictGoal: selectedStrategy.successOutcome,
                keyFactor: `Выявлен гротескный псевдобред (Fp = ${fpScore}/12) и аномальный перекос индекса Гоуфа (F-K = ${goughIndex > 0 ? '+' : ''}${goughIndex}).${strictNote}`,
                caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) циничная попытка обмануть комиссию признана судом отягчающим обстоятельством.`,
                title: 'РАЗОБЛАЧЕНИЕ ГРОТЕСКНОЙ СИМУЛЯЦИИ',
                stamp: 'ВМЕНЯЕМ / СИМУЛЯЦИЯ',
                stampClass: 'stamp-red',
                text: `Выявлена грубая демонстративная симуляция тяжелого психопатологического синдрома. Набрано ${fpScore} баллов по шкале Fp (гротескный псевдобред), индекс Гоуфа F-K составляет ${goughIndex > 0 ? '+' : ''}${goughIndex}. Демонстрируемые жалобы являются карикатурными и не встречаются в клинической практике.`,
                details: 'Установочное поведение с целью уклонения от уголовной ответственности за содеянное полностью изобличено.',
                epilogue: `Суд расценил циничную попытку симуляции сумасшествия как отягчающее обстоятельство. По делу ${selectedCase.code} подсудимый признан полностью вменяемым и приговорён к максимальному наказанию: ${selectedCase.risk}`,
                finalStatus: 'ВМЕНЯЕМ • МАКСИМАЛЬНЫЙ СРОК'
            };
        }

        // ----------------------------------------------------
        // УРОВЕНЬ 3: ОЦЕНКА ПО ВЫБРАННОЙ СТРАТЕГИИ И ДЕЛУ
        // ----------------------------------------------------

        // СТРАТЕГИЯ 1: «УЙТИ НА НЕВМЕНЯЕМОСТЬ» (Эндогенный психоз)
        if (selectedStrategy.id === 'insanity') {
            let hasClinicalPeak = false;

            // Специфика дел:
            // Для дела "fire" (Очищение пламенем) важен шизоидный схизис Sc >= 70T
            if (selectedCase.id === 'fire') {
                hasClinicalPeak = tScores.Sc >= 70;
            }
            // Для дела "voices" (Голоса в темноте) строго требуется паранойя/бред двойников Pa >= 70T
            else if (selectedCase.id === 'voices') {
                hasClinicalPeak = tScores.Pa >= 70;
            }
            // Для дела "hunter" (Лесопарковый охотник) допустим психотический пик Sc или Pa
            else {
                hasClinicalPeak = tScores.Sc >= 70 || tScores.Pa >= 70;
            }

            const minGough = selectedCase.id === 'voices' ? 4 : 2;
            const validValidity = vrinScore < 4 && fpScore <= (isStrictFpCase ? 1 : 2) && goughIndex >= minGough;
            const noHesitationFail = !hesitation;

            if (hasClinicalPeak && validValidity && noHesitationFail) {
                // ПОБЕДА СИМУЛЯЦИИ ПСИХОЗА
                return {
                    type: 'INSANITY_SUCCESS',
                    isVictory: true,
                    victoryBanner: 'ВЫ ПОБЕДИЛИ',
                    victorySubtitle: 'Стратегия «Уйти на невменяемость» успешно реализована!',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: `Гармоничный психотический профиль (Sc = ${tScores.Sc}T, Pa = ${tScores.Pa}T) без псевдобреда (Fp = ${fpScore}) и без признаков лжи (VRIN = ${vrinScore}).`,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) комиссия пришла к выводу о невозможности осознания действий в момент содеянного из-за тяжелого психоза.`,
                    title: 'НЕВМЕНЯЕМОСТЬ ПОДТВЕРЖДЕНА (ПММХ)',
                    stamp: 'НЕВМЕНЯЕМ / ПММХ',
                    stampClass: 'stamp-green',
                    text: `Клиническая картина гармонична, психометрический профиль подтверждает наличие хронического психического расстройства (хронический бредовой психоз / шизофренический схизис). Шкала Pa: ${tScores.Pa}T, Sc: ${tScores.Sc}T. Признаков аггравации или симуляции не выявлено.`,
                    details: 'В момент совершения инкриминируемого деяния субъект не мог осознавать фактический характер и общественную опасность своих действий и руководить ими.',
                    epilogue: `Уголовное преследование по делу ${selectedCase.code} (${selectedCase.title}) прекращено. Суд освободил гражданина от отбывания наказания в колонии и назначил принудительные меры медицинского характера (ПММХ) в психиатрическом стационаре специализированного типа с интенсивным наблюдением. Пожизненное заключение предотвращено.`,
                    finalStatus: 'ПОБЕДА • НАПРАВЛЕН НА ПРИНУДИТЕЛЬНОЕ ЛЕЧЕНИЕ (ПММХ)'
                };
            } else {
                // ПРОВАЛ СИМУЛЯЦИИ ПСИХОЗА
                let failReason = '';
                if (!hasClinicalPeak) {
                    if (selectedCase.id === 'fire' && tScores.Sc < 70) {
                        failReason = `Для дела о серийных поджогах комиссия требовала подтверждения шизоидного схизиса (Sc ≥ 70T), однако шкала Sc составила лишь ${tScores.Sc}T.`;
                    } else if (selectedCase.id === 'voices' && tScores.Pa < 70) {
                        failReason = `В деле о бреде Капгра (двойники) комиссия требовала массивного параноидного регистра (Pa ≥ 70T), однако шкала Pa составила лишь ${tScores.Pa}T. Замкнутость без бреда отношения не объясняет жестокое нападение на близких.`;
                    } else {
                        failReason = `Уровень психопатологических шкал (Pa=${tScores.Pa}T, Sc=${tScores.Sc}T) оказался недостаточным для подтверждения психоза (порог 70T).`;
                    }
                } else if (goughIndex < minGough) {
                    failReason = `Индекс Гоуфа F-K (${goughIndex} при норме ≥ ${minGough}) слишком низок — недостаточный уровень эмоционального напряжения и аффективного срыва.`;
                } else if (hesitation) {
                    failReason = 'Зафиксированы подозрительные задержки ответа (когнитивные паузы) на проверочных вопросах, изобличающие расчётливую подгонку ответов.';
                } else {
                    failReason = 'Профиль валидности не уложился в допустимый клинический коридор.';
                }

                return {
                    type: 'INSANITY_FAILED',
                    isVictory: false,
                    victoryBanner: 'ВЫ ПРОИГРАЛИ',
                    victorySubtitle: 'Стратегия защиты провалена: симуляция психоза оказалась неубедительной',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: failReason,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) эксперты сочли симптомы надуманными, подсудимый признан вменяемым.`,
                    title: 'СИМУЛЯЦИЯ НЕУБЕДИТЕЛЬНА',
                    stamp: 'ВМЕНЯЕМ',
                    stampClass: 'stamp-red',
                    text: `По результатам обследования оснований для признания субъекта невменяемым не найдено. ${failReason}`,
                    details: 'Психических расстройств, исключающих вменяемость, не выявлено. Субъект полностью отдавал себе отчёт в совершаемых действиях.',
                    epilogue: `Экспертиза вынесла вердикт о полной вменяемости. По делу ${selectedCase.code} подсудимый отправлен по этапу в колонию строгого режима на полный срок.`,
                    finalStatus: 'ВМЕНЯЕМ • ЭТАПИРОВАН В КОЛОНИЮ'
                };
            }
        }

        // СТРАТЕГИЯ 2: «ХОЛОДНЫЙ РАСЧЁТ» (Норма / Скрытый психопат)
        if (selectedStrategy.id === 'dissimulation') {
            const maxPd = (selectedCase.id === 'hunter' || selectedCase.id === 'fire') ? 60 : 65;
            const maxL = isStrictFpCase ? 60 : 65;

            const isNormalProfile = tScores.Pd < maxPd && tScores.Sc < 65 && tScores.Pa < 65;
            const isNotOvercontrolled = tScores.L < maxL && tScores.K < 70;
            const isConsistent = vrinScore < 3;

            if (isNormalProfile && isNotOvercontrolled && isConsistent) {
                // ПОБЕДА ДИССИМУЛЯЦИИ (ДОКАЗАНА НОРМА)
                return {
                    type: 'DISSIMULATION_SUCCESS',
                    isVictory: true,
                    victoryBanner: 'ВЫ ПОБЕДИЛИ',
                    victorySubtitle: 'Стратегия «Холодный расчёт» (Норма) успешно подтверждена!',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: `Гармоничный профиль психической нормы (все шкалы 45–60T) без фальшивой святости (L = ${tScores.L}T) и гиперконтроля (K = ${tScores.K}T).`,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) подтверждение адекватности и бесконфликтности позволило защите разрушить версию обвинения об умышленном садизме.`,
                    title: 'ПСИХИЧЕСКИ ЗДОРОВ (НОРМА)',
                    stamp: 'ПСИХИЧЕСКИ ЗДОРОВ',
                    stampClass: 'stamp-green',
                    text: `Профиль СМИЛ гармоничен и полностью укладывается в коридор нормы (все шкалы 45–60T). Шкалы лжи (L=${tScores.L}T) и защиты (K=${tScores.K}T) не превышены. Признаков расстройства личности или психопатии не обнаружено.`,
                    details: 'Испытуемый демонстрирует адекватную эмоционально-волевую устойчивость, критику к ситуации и развитый самоконтроль.',
                    epilogue: `Адвокату удалось использовать заключение о полной психической уравновешенности подзащитного для пересмотра квалификации по делу ${selectedCase.code}. Обвинение в хладнокровном умысле снято, приговор пересмотрен в пользу защиты.`,
                    finalStatus: 'ПОБЕДА • ПОДТВЕРЖДЕНА ПСИХОЛОГИЧЕСКАЯ НОРМА'
                };
            } else {
                // ПРОВАЛ НОРМЫ
                let failReason = '';
                if (!isNotOvercontrolled) {
                    failReason = `Выявлена явная установочная гипернормативность и фасад «святости» (L=${tScores.L}T, K=${tScores.K}T). Попытка казаться идеальным человеком разоблачена.`;
                } else if (tScores.Pd >= maxPd) {
                    failReason = isStrictFpCase
                        ? `В деле об убийстве эксперты зафиксировали повышенную психопатию (Pd=${tScores.Pd}T при лимите < ${maxPd}T), изобличив хладнокровного хищника.`
                        : `Проявились выраженные черты диссоциального расстройства личности (психопатия Pd=${tScores.Pd}T) — импульсивность и пренебрежение социальными нормами.`;
                } else if (!isConsistent) {
                    failReason = `В ответах допущены логические противоречия (VRIN = ${vrinScore}), вызвавшие подозрения комиссии.`;
                } else {
                    failReason = `Профиль содержит нежелательные отклонения по клиническим шкалам (Pa=${tScores.Pa}T, Sc=${tScores.Sc}T).`;
                }

                return {
                    type: 'DISSIMULATION_FAILED',
                    isVictory: false,
                    victoryBanner: 'ВЫ ПРОИГРАЛИ',
                    victorySubtitle: 'Стратегия «Холодный расчёт» провалена: диссимуляция раскрыта',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: failReason,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) попытка скрыть патологический характер отвергнута судом.`,
                    title: 'ДИССИМУЛЯЦИЯ РАСКРЫТА',
                    stamp: 'ВМЕНЯЕМ / ДЕВИАНТ',
                    stampClass: 'stamp-red',
                    text: `Попытка продемонстрировать идеальную социальную нормативность провалилась. ${failReason}`,
                    details: 'Заключение: признан вменяемым с выраженной акцентуацией психопатического регистра личности.',
                    epilogue: `Суд отклонил доводы защиты. С учётом личностных особенностей по делу ${selectedCase.code} подсудимый признан вменяемым и осуждён на максимальный срок.`,
                    finalStatus: 'ВМЕНЯЕМ • ДИССИМУЛЯЦИЯ РАЗОБЛАЧЕНА'
                };
            }
        }

        // СТРАТЕГИЯ 3: «ВРЕМЕННОЕ ПОМРАЧЕНИЕ» (Ограниченная вменяемость / Ст. 22)
        if (selectedStrategy.id === 'affect') {
            const minF = (selectedCase.id === 'hunter' || selectedCase.id === 'fire' || selectedCase.id === 'voices') ? 65 : 60;
            const maxPa = selectedCase.id === 'voices' ? 60 : 65;
            const maxPd = selectedCase.id === 'voices' ? 60 : 65;

            const hasDistress = tScores.F >= minF;
            const noPsychosis = tScores.Sc < 65 && tScores.Pa < maxPa && fpScore === 0;
            const noPsychopathy = tScores.Pd < maxPd;
            const notRigid = tScores.K < 65 && vrinScore < 3;

            if (hasDistress && noPsychosis && noPsychopathy && notRigid) {
                // ПОБЕДА ОГРАНИЧЕННОЙ ВМЕНЯЕМОСТИ
                return {
                    type: 'AFFECT_SUCCESS',
                    isVictory: true,
                    victoryBanner: 'ВЫ ПОБЕДИЛИ',
                    victorySubtitle: 'Стратегия «Временное помрачение» (Ограниченная вменяемость / Ст. 22) успешно доказана!',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: `Выраженный эмоциональный дистресс (F = ${tScores.F}T) при отсутствии бреда (Sc = ${tScores.Sc}T, Pa = ${tScores.Pa}T, Fp = 0) и сохранном волевом контроле.`,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) комиссия установила выраженное эмоционально-психическое истощение, существенно ограничивающее способность в полной мере руководить действиями.`,
                    title: 'ОГРАНИЧЕННАЯ ВМЕНЯЕМОСТЬ (СТ. 22 УК РФ)',
                    stamp: 'ОГРАНИЧЕННО ВМЕНЯЕМ',
                    stampClass: 'stamp-green',
                    text: `Выявлен высокий уровень реактивного дистресса и психоэмоционального истощения (F=${tScores.F}T) при отсутствии эндогенного бредового процесса (Sc=${tScores.Sc}T, Pa=${tScores.Pa}T, Fp=0).`,
                    details: 'В момент инкриминируемого деяния субъект находился в состоянии выраженного психического расстройства, не исключающего вменяемости, но существенно снижающего критико-прогностические способности (ст. 22 УК РФ).',
                    epilogue: `На основании выводов комиссии суд по делу ${selectedCase.code} (${selectedCase.title}) применил положения ст. 22 УК РФ. Наказание существенно смягчено с назначением амбулаторных мер медицинского характера (ПММХ).`,
                    finalStatus: 'ПОБЕДА • СМЯГЧЕНИЕ НАКАЗАНИЯ (СТ. 22 УК РФ)'
                };
            } else {
                // ПРОВАЛ ОГРАНИЧЕННОЙ ВМЕНЯЕМОСТИ
                let failReason = '';
                if (!hasDistress) {
                    failReason = `Уровень эмоционального дистресса (F=${tScores.F}T при пороге ${minF}T) оказался недостаточным для признания пограничного срыва.`;
                } else if (selectedCase.id === 'voices' && tScores.Pa >= maxPa) {
                    failReason = `В деле о семейной резне повышенная подозрительность (Pa=${tScores.Pa}T при лимите < ${maxPa}T) расценена комиссией как скрытый бредовой умысел, а не спонтанный срыв.`;
                } else if (selectedCase.id === 'voices' && tScores.Pd >= maxPd) {
                    failReason = `Повышенная психопатия (Pd=${tScores.Pd}T при лимите < ${maxPd}T) изобличила бытовой садизм и эмоциональную черствость, исключающие реактивный аффект.`;
                } else if (tScores.Sc >= 65 || fpScore > 0) {
                    failReason = `Испытуемый допустил ответы с признаками бреда (Sc=${tScores.Sc}T, Fp=${fpScore}), что разрушило картину изолированного срыва.`;
                } else if (vrinScore >= 3) {
                    failReason = `Логические противоречия в ответах (VRIN = ${vrinScore}) указали на недостоверность жалоб.`;
                } else {
                    failReason = `Высокий самоконтроль (K=${tScores.K}T) исключает неконтролируемую эмоциональную вспышку.`;
                }

                return {
                    type: 'AFFECT_FAILED',
                    isVictory: false,
                    victoryBanner: 'ВЫ ПРОИГРАЛИ',
                    victorySubtitle: 'Стратегия «Временное помрачение» провалена: ст. 22 УК РФ не подтверждена',
                    verdictGoal: selectedStrategy.successOutcome,
                    keyFactor: failReason,
                    caseSpecificAnalysis: `По делу ${selectedCase.code} (${selectedCase.title}) комиссия сочла действия полностью хладнокровными и спланированными.`,
                    title: 'ОГРАНИЧЕННАЯ ВМЕНЯЕМОСТЬ ОТКЛОНЕНА',
                    stamp: 'ВМЕНЯЕМ',
                    stampClass: 'stamp-red',
                    text: `Оснований для применения ст. 22 УК РФ (психическое расстройство, не исключающее вменяемости) экспертной комиссией не выявлено. ${failReason}`,
                    details: 'Преступление носило спланированный и хладнокровный характер. Вменяем в полном объёме.',
                    epilogue: `Суд не усмотрел оснований для применения смягчающих статей УК РФ по делу ${selectedCase.code}. Подсудимый осуждён на полный срок.`,
                    finalStatus: 'ВМЕНЯЕМ • СТ. 22 УК РФ ОТКЛОНЕНА'
                };
            }
        }

        // ДЕФОЛТНЫЙ ИСХОД
        return {
            type: 'DEFAULT',
            isVictory: false,
            victoryBanner: 'ВЫ ПРОИГРАЛИ',
            victorySubtitle: 'Вменяемость установлена в полном объёме',
            verdictGoal: selectedStrategy.successOutcome,
            keyFactor: 'Профиль не соответствует условиям выбранной стратегии защиты.',
            caseSpecificAnalysis: `По делу ${selectedCase.code} вынесен обвинительный приговор.`,
            title: 'ВМЕНЯЕМОСТЬ УСТАНОВЛЕНА',
            stamp: 'ВМЕНЯЕМ',
            stampClass: 'stamp-red',
            text: 'По результатам полного клинико-психологического обследования психических расстройств, исключающих вменяемость, не выявлено.',
            details: 'Субъект признан полностью вменяемым и способным нести ответственность на общих основаниях.',
            epilogue: `По делу ${selectedCase.code} вынесен стандартный обвинительный приговор.`,
            finalStatus: 'ВМЕНЯЕМ'
        };
    }
}

// Данные для экрана разбора экспертизы
class DebriefEngine {
    static getDebriefData(results, telemetry, selectedCase, selectedStrategy, verdict) {
        const { tScores, rawScores, vrinScore, fpScore, goughIndex } = results;
        const hesitation = telemetry.detectCognitiveHesitation();
        const randomClick = telemetry.detectRandomClicking();
        const isVictory = verdict.isVictory;

        // Анализ действий (ошибки / верные решения)
        const analysisPoints = [];

        if (isVictory) {
            analysisPoints.push({
                type: 'success',
                tag: '[ ИДЕАЛЬНЫЙ БАЛАНС ШКАЛ ]',
                text: `Вам удалось точно попасть в целевой клинический коридор для стратегии «${selectedStrategy.title}», не превысив контрольные пороги детекции.`
            });
            analysisPoints.push({
                type: 'success',
                tag: '[ ЧИСТЫЙ ПРОТОКОЛ VRIN ]',
                text: `Индекс противоречивости ответов составил ${vrinScore}/15 (норма < 3). Вы сохранили логическую последовательность на всех 100 вопросах.`
            });
            analysisPoints.push({
                type: 'success',
                tag: '[ ОТСУТСТВИЕ ПСЕВДОБРЕДА ]',
                text: `Шкала гротескных симптомов (Fp = ${fpScore}) осталась чистой. Вы не повелись на уловки с кинематографическими «мультяшными» симптомами.`
            });
            if (!hesitation) {
                analysisPoints.push({
                    type: 'success',
                    tag: '[ РОВНЫЙ ТЕМП РЕАКЦИИ ]',
                    text: 'Телеметрия не зафиксировала расчетливых зависаний на проверочных вопросах. Поведение выглядело естественным.'
                });
            }
        } else {
            // ОШИБКИ
            if (vrinScore >= 4) {
                analysisPoints.push({
                    type: 'fail',
                    tag: `[ ПРОВАЛ VRIN: ${vrinScore}/15 ПРОТИВОРЕЧИЙ ]`,
                    text: 'В тесте зашиты 15 пар зеркальных вопросов. Вы дали взаимоисключающие ответы на 4+ пары. В судебной экспертизе это 100% признак хаотичного тыканья или лжи без опоры на реальный опыт.'
                });
            }

            if (randomClick) {
                analysisPoints.push({
                    type: 'fail',
                    tag: '[ АНОМАЛЬНАЯ СКОРОСТЬ КЛИКОВ ]',
                    text: 'Вы отвечали на серию вопросов быстрее 350 мс. Прочесть и осмыслить утверждение за это время невозможно — комиссия аннулирует такой протокол как саботаж.'
                });
            }

            const isStrictFpCase = selectedCase.id === 'hunter' || selectedCase.id === 'voices';
            if (fpScore >= (isStrictFpCase ? 2 : 3) || goughIndex > 35) {
                analysisPoints.push({
                    type: 'fail',
                    tag: `[ ГРОТЕСКНАЯ СИМУЛЯЦИЯ: Fp = ${fpScore} ]`,
                    text: 'Вы нажали «ДА» на вопросы шкалы Fp (невозможные бредовые конструкции вроде "роботов в голове" или "шестерёнок"). Реальные психически больные такой бред не продуцируют — это маркер симуляции из фильмов.'
                });
            }

            if (hesitation) {
                analysisPoints.push({
                    type: 'fail',
                    tag: '[ КОГНИТИВНЫЕ ПАУЗЫ НА ЛЖИ ]',
                    text: 'На вопросах шкал L и Fp вы делали паузы свыше 4 секунд при быстром общем темпе. Эксперты видят, как мозг судорожно калибрует выгоду ответа.'
                });
            }

            // Стратегические ошибки
            if (selectedStrategy.id === 'insanity') {
                if (tScores.Sc < 70 && selectedCase.id === 'fire') {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ НЕДОБОР СХИЗИСА: Sc = ${tScores.Sc}T ]`,
                        text: 'Для доказательства пиромании на почве эндогенного процесса требовалось поднять шкалу Sc >= 70T. Экспертиза сочла поджоги умышленным криминальным хулиганством.'
                    });
                }
                if (tScores.Pa < 70 && selectedCase.id === 'voices') {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ НЕДОБОР ПАРАНОЙИ: Pa = ${tScores.Pa}T ]`,
                        text: 'В деле о бреде Капгра (двойники) эксперты искали массивный параноидный регистр (Pa >= 70T). Вы не набрали нужного профиля бредовых идей отношения и подозрительности.'
                    });
                }
                if (selectedCase.id === 'hunter' && tScores.Pd >= 60) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ ЯДЕРНАЯ ПСИХОПАТИЯ: Pd = ${tScores.Pd}T ]`,
                        text: 'В серийных делах эксперты ищут антисоциальную психопатию. Высокий балл Pd на фоне попытки изобразить психоз выдал хладнокровного серийника.'
                    });
                }
            } else if (selectedStrategy.id === 'dissimulation') {
                if (tScores.L >= 60) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ ЗАВАЛ ШКАЛЫ ЛЖИ: L = ${tScores.L}T ]`,
                        text: 'Вы пытались выглядеть святым («никогда не опаздывал», «никогда не злюсь»). Для экспертов Сербского это мгновенный маркер наивной диссимуляции и сокрытия расстройств.'
                    });
                }
                if (tScores.Pd >= 60) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ НЕ СКРЫТА АСОЦИАЛЬНОСТЬ: Pd = ${tScores.Pd}T ]`,
                        text: 'Вы согласились с утверждениями о бунтарстве и нарушении правил, что сломало маску законопослушного гражданина.'
                    });
                }
            } else if (selectedStrategy.id === 'affect') {
                const minF = (selectedCase.id === 'hunter' || selectedCase.id === 'fire' || selectedCase.id === 'voices') ? 65 : 60;
                if (tScores.F < minF) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ НЕДОСТАТОК ДИСТРЕССА: F = ${tScores.F}T ]`,
                        text: `Для признания ст. 22 УК РФ требовалось показать сильное эмоциональное выгорание и дистресс (F >= ${minF}T). Вы выглядели слишком спокойным.`
                    });
                }
                if (selectedCase.id === 'voices' && tScores.Pa >= 60) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ СКРЫТЫЙ БРЕДОВЫЙ МОТИВ: Pa = ${tScores.Pa}T ]`,
                        text: 'В деле о семейной резне повышенная подозрительность (Pa >= 60T) расценена как скрытый бредовой умысел, исключающий изолированный реактивный срыв.'
                    });
                }
                if (selectedCase.id === 'voices' && tScores.Pd >= 60) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ БЫТОВОЙ САДИЗМ / ПСИХОПАТИЯ: Pd = ${tScores.Pd}T ]`,
                        text: 'Шкала психопатии (Pd >= 60T) указала на бессердечие и антисоциальность, а не спонтанный аффект.'
                    });
                }
                if (tScores.Sc >= 65 || fpScore > 0) {
                    analysisPoints.push({
                        type: 'fail',
                        tag: `[ ЛИШНИЕ ПРИЗНАКИ БРЕДА: Sc = ${tScores.Sc}T ]`,
                        text: 'При аффективном срыве сознание не должно распадаться в бред. Наличие шизоидных симптомов разрушило картину изолированного истощения.'
                    });
                }
            }
        }

        // 2. ПОБЕДНЫЙ ГАЙД ПО ДАННОМУ СЦЕНАРИЮ
        const winningSteps = [];

        if (selectedStrategy.id === 'insanity') {
            const caseFocus = selectedCase.id === 'voices'
                ? ' (для дела «Голоса в темноте» критически важна шкала Pa ≥ 70T — бред отношения и преследования)'
                : (selectedCase.id === 'fire' ? ' (для дела «Очищение пламенем» критически важна шкала Sc ≥ 70T — шизоидный схизис)' : '');

            winningSteps.push({
                title: '1. Формируйте эндогенный бред, но избегайте гротеска',
                desc: `Отвечайте «ДА» на вопросы об отчуждении мыслей, глубокой аутизации, замкнутости и ощущении слежки (шкалы Sc и Pa)${caseFocus}, но строго «НЕТ» на все 12 вопросов шкалы Fp (шестерёнки в теле, пришельцы, радиоволны в зубах).`
            });
            winningSteps.push({
                title: '2. Держите железную память на парные вопросы',
                desc: 'Если в вопросе №15 вы признали странные телесные ощущения, не отрицайте их в вопросе №65. Держите VRIN строго < 3.'
            });
            winningSteps.push({
                title: '3. Не делайте пауз на проверочных вопросах',
                desc: 'Истинный психотик не высчитывает выгоду ответа. Отвечайте в темпе 1.2–2.0 секунды без зависаний на 4+ секунды.'
            });
            winningSteps.push({
                title: '4. Интервенции комиссии (пословицы)',
                desc: 'При вопросе о пословицах выбирайте вычурное резонёрское толкование («метафизическая энтропия») или подозрительное/бредовое.'
            });
        } else if (selectedStrategy.id === 'dissimulation') {
            winningSteps.push({
                title: '1. Признавайте мелкие житейские грехи (контроль шкалы L)',
                desc: 'Ответьте честно на 3–4 вопроса про мелкие слабости («иногда злюсь», «бывает лень делать уроки/работу»). Это удержит шкалу L в естественном коридоре 45–55T.'
            });
            winningSteps.push({
                title: '2. Полностью глушите антисоциальные наклонности (Pd < 55T)',
                desc: 'Строго отрицайте любую тягу к риску, дракам, мести, пренебрежению законом и конфликтам с начальством.'
            });
            winningSteps.push({
                title: '3. Интервенции комиссии (пословицы)',
                desc: 'Толкуйте пословицы исключительно в абстрактно-нормативном ключе («дела оценивают по итогу», «тайное становится явным»).'
            });
        } else if (selectedStrategy.id === 'affect') {
            winningSteps.push({
                title: '1. Максимизируйте психосоматику и дистресс (F >= 65T)',
                desc: 'Отвечайте «ДА» на вопросы о бессоннице, переутомлении, панических волнах, вегетативных кризах и чувстве тупика.'
            });
            winningSteps.push({
                title: '2. Полный ноль по психотическим симптомам (Fp = 0, Sc < 60T, Pa < 60T)',
                desc: 'Категорически отрицайте голоса, паранойю, заговоры и бред. Статья 22 УК РФ — это сохранный человек на грани нервного срыва, а не шизофреник.'
            });
            winningSteps.push({
                title: '3. Умеренная открытость (K в коридоре 45–60T)',
                desc: 'Не пытайтесь казаться полностью невозмутимым или чрезмерно закрытым.'
            });
        }

        // 3. УНИВЕРСАЛЬНЫЙ БЛОК: РЕАЛЬНАЯ ЭКСПЕРТИЗА В СЕРБСКОГО
        const realityDeepDive = [
            {
                topic: '1. 30 суток стационара и 720 часов непрерывного надзора',
                text: 'В фильмах симулянт кривляется 15 минут перед доктором и уезжает в психбольницу. В реальности стационарная СПЭ длится от 30 до 90 суток в закрытом спецотделении. Подследственный находится под круглосуточным видеонаблюдением и контролем санитаров. Фиксируется всё: глубина сна, аппетит, общение с сокамерниками, личная гигиена, реакции на бытовые звуки. Симулировать бред или психомоторные нарушения 24 часа в сутки физиологически невозможно: человек засыпает или расслабляется в столовой, где его поведение мгновенно становится нормативным.'
            },
            {
                topic: '2. Полипрофессиональная бригада и 5 томов уголовного дела',
                text: 'Решение выносит комиссия: психиатры, клинические психологи, неврологи, сексологи. Эксперты досконально изучают все материалы уголовного дела: протоколы допросов, переписки в смартфонах, поисковые запросы за годы до преступления, показания коллег и видеозаписи с камер. Если на видео убийца расчетливо прячет орудие и смывает следы, а на экспертизе рассказывает про "приказ демонов" — комиссия констатирует симуляцию с целью уклонения от уголовной ответственности.'
            },
            {
                topic: '3. Ловушка психопатии: злодей и маньяк — почти всегда вменяемы',
                text: 'Главное заблуждение обывателя — считать, что жестокость или серийные преступления являются признаком безумия. В судебной психиатрии это классифицируется как диссоциальное расстройство личности (психопатия). Психопаты абсолютно вменяемы: они осознают общественную опасность деяний и руководят ими. Статья 21 УК РФ (невменяемость) применяется только при распаде сознания, слабоумии или глубоком эндогенном психозе.'
            },
            {
                topic: '4. Миф о "спасительной психушке" (ПММХ бессрочны)',
                text: 'Многие преступники наивно полагают, что психбольница лучше тюрьмы. В реальности принудительное лечение в спецстационарах с интенсивным наблюдением (ССТИН) — бессрочно. В колонии заключенный точно знает срок освобождения. В спецпсихбольнице сроков нет: каждые 6 месяцев комиссия решает вопрос о продлении. Под действием тяжелой нейролептической терапии пациенты по тяжким статьям проводят там по 15–25 лет, а многие остаются до конца жизни.'
            }
        ];

        return {
            isVictory,
            selectedCase,
            selectedStrategy,
            verdict,
            analysisPoints,
            winningSteps,
            realityDeepDive
        };
    }
}

// Экспорт классов
window.Telemetry = Telemetry;
window.ScaleCalculator = ScaleCalculator;
window.VerdictEngine = VerdictEngine;
window.DebriefEngine = DebriefEngine;

