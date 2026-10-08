(() => {
'use strict';

const SETTINGS='checkout-lab-settings-v3';
const exact={
"7 раундов":"7 rounds","3 жизни":"3 lives","15–20 и Bull":"15–20 and Bull",
"без бота":"no computer","Double Out":"Double Out",
"← свайп — отмена":"← swipe to undo",
"Реванш":"Rematch","Дротики":"Darts","Avg":"Avg",
"Справочник":"Reference","Калькулятор закрытий":"Checkout calculator","Правила игр":"Game rules","Термины дартса":"Darts terms","Для компании":"Party games","Закрой 15–20 и Bull, набирай очки":"Close 15–20 and Bull, score points","По порядку от 1 до 20 и Bull":"1 to 20 in order, then Bull","7 раундов, S + D + T — победа":"7 rounds, S + D + T wins","Номер, 3 жизни, на выбывание":"A number, 3 lives, last one standing","Bob's 27, 121 Checkout, удвоения, квиз закрытий":"Bob's 27, 121 Checkout, doubles, checkout quiz",
'Турнир':'Tournament','ТУРНИР':'TOURNAMENT','Формат':'Format','Проигравший выбывает':'Lose and you are out','Каждый играет с каждым':'Everyone plays everyone','Плей-офф':'Knockout','Круговой':'Round robin','Игра':'Game','Жеребьёвка':'Random draw','Участники':'Players','СОЗДАТЬ ТУРНИР':'CREATE TOURNAMENT','Сетка на 3–16 игроков: плей-офф или круговой турнир. Матчи запускаются прямо из сетки, победители проходят дальше сами.':'Brackets for 3–16 players: knockout or round robin. Start matches straight from the bracket; winners advance automatically.','ПЛЕЙ-ОФФ':'KNOCKOUT','КРУГОВОЙ ТУРНИР':'ROUND ROBIN','Новый турнир':'New tournament','ПОБЕДИТЕЛЬ ТУРНИРА':'TOURNAMENT WINNER','Финал':'Final','Полуфинал':'Semi-final','1/4 финала':'Quarter-final','1/8 финала':'Round of 16','Тур':'Round','ожидает':'TBD','Играть':'Play','Продолжить':'Continue','Переиграть матч':'Replay match','К турниру':'Back to tournament','И':'P','В':'W','П':'L','Начало':'Start','Свободное':'Straight in','7 раундов, цель — номер раунда':'7 rounds, target = round number','Свой номер, 3 жизни, последний побеждает':'Own number, 3 lives, last one standing wins','S × 1 · D × 2 · T × 3 · Shanghai = победа':'S × 1 · D × 2 · T × 3 · Shanghai = win','Только удвоения · от 2 игроков':'Doubles only · 2+ players','удвоения · жизни':'doubles · lives','РАУНД':'ROUND','Раунд 1 — бросаем в 1, раунд 2 — в 2 и так до 7. Очки: одиночный × 1, удвоение × 2, утроение × 3. Shanghai — одиночный, удвоение и утроение одного числа за подход — мгновенная победа.':'Round 1 targets 1, round 2 targets 2 and so on up to 7. Single × 1, double × 2, treble × 3. A Shanghai — single, double and treble of the number in one visit — wins instantly.','Вы Killer — бейте в удвоения соперников':'You are a Killer — hit your opponents’ doubles','Сначала попадите в своё':'First hit your own','ВЫБЫЛ':'OUT','номер':'number','жизней':'lives','У каждого свой номер и 3 жизни. Попадите в удвоение своего номера, чтобы стать Killer. После этого каждое попадание в удвоение соперника отнимает у него жизнь, а в своё — у вас. Побеждает последний оставшийся.':'Everyone gets a number and 3 lives. Hit your own double to become a Killer. Then every hit on an opponent’s double takes a life — and on your own double, one of yours. Last player standing wins.','Начните с удвоения — очки идут только после него':'Start on a double — scoring begins after it',
'Счётчик для дартса 301/501 и Cricket: точные закрытия, игра против компьютера, до 8 игроков. Работает без интернета.':'Darts scorer for 301/501 and Cricket: accurate checkouts, play against the computer, up to 8 players. Works offline.','Игроки и компьютер':'Players and computer','До 8 игроков, бот пяти уровней':'Up to 8 players, five computer levels','Закрой 15–20 и Bull':'Close 15–20 and Bull','По порядку от 1 до Bull':'In order from 1 to Bull','КРУГ':'CLOCK','Недавние:':'Recent:','Легов в сете':'Legs per set','Сеты':'Sets','Без сетов':'No sets','Компьютер':'Computer','Без бота':'No computer','15–20 · Bull · очки за закрытые':'15–20 · Bull · points on closed numbers','Сеты · леги':'Sets · legs','СЕТ':'SET','сетов':'sets','КОМПЬЮТЕР БРОСАЕТ':'COMPUTER THROWING','Отменить мой подход':'Undo my visit','Отменить последний дротик':'Undo last dart','Вернуть':'Redo','Конец хода':'End turn','ОЧКИ':'POINTS','ЦЕЛЬ':'TARGET','Закройте 15–20 и Bull тремя попаданиями. Лишние попадания по своему закрытому сектору дают очки, пока соперник его не закрыл.':'Close 15–20 and Bull with three marks each. Extra marks on a number you closed score points until your opponent closes it.','Попадите по очереди в каждый сектор от 1 до 20, затем в Bull. Подходит любое попадание в сектор: одиночное, удвоение или утроение.':'Hit every number from 1 to 20 in order, then the Bull. Any segment counts: single, double or treble.','отметок за раунд (MPR)':'marks per round (MPR)','попаданий':'hits','отметок':'marks','цель':'target','ТРИ ДРОТИКА В':'THREE DARTS AT','Сколько дротиков попало в удвоение? Каждое попадание прибавляет его стоимость, ни одного попадания — вычитает. Счёт 0 или меньше — игра окончена.':'How many darts hit the double? Each hit adds its value; no hits subtracts it. Score at 0 or below ends the game.','ИГРА ОКОНЧЕНА':'GAME OVER','Все удвоения пройдены':'All doubles completed','Дротиков':'Darts','ЗАКРЫТО!':'CHECKED OUT!','НЕ ЗАКРЫЛИ':'NOT FINISHED','Закройте остаток за 9 дротиков (три подхода) с Double Out. Получилось — цель +1, нет — цель −1, но не ниже 121.':'Check out within 9 darts (three visits), Double Out. Success moves the target up by 1, a miss moves it down by 1, never below 121.','Bob\'s 27 — классическая тренировка удвоений: старт с 27 очков, три дротика в каждое удвоение от D1 до Bull.':'Bob\'s 27 — the classic doubles routine: start on 27, three darts at every double from D1 to Bull.','121 Checkout: закройте остаток за 9 дротиков. Получилось — цель растёт.':'121 Checkout: finish the score within 9 darts. Succeed and the target goes up.','Экспорт':'Export','Импорт':'Import','Пропустить ход (3 промаха)?':'Skip this turn (3 misses)?',
'Новая игра':'New game','Матч':'Match','Закрытия':'Checkouts','Таблица 2–170':'Checkout table 2–170','Таблица закрытий 2–170':'Checkout table 2–170','Статистика':'Statistics',
'Настройки':'Settings','Меню':'Menu','Сменить тему':'Switch theme','Светлая тема':'Light theme','Тёмная тема':'Dark theme',
'Режим у мишени':'At-the-board mode','Звук':'Sound','Вибрация':'Vibration','Экран не гаснет':'Keep screen awake','вкл':'on','выкл':'off','да':'yes','нет':'no','ВКЛ':'ON','ВЫКЛ':'OFF',
'ДАРТС БЕЗ ЛИШНЕГО':'DARTS. NOTHING EXTRA.','Бросай.':'Throw.','Мы посчитаем.':'We’ll score it.','Счётчик для дартса 301/501: точные закрытия, Double Out, до 8 игроков. Работает без интернета.':'Darts scorer for 301/501: accurate checkouts, Double Out, up to 8 players. Works offline.',
'Продолжить текущий матч':'Continue current match','Выбери игру':'Choose game','Double Out включён':'Double Out enabled','СВОЯ':'CUSTOM','очков':'points','режим':'mode','Начальный счёт':'Starting score',
'Добавь игроков':'Add players','От одного до восьми':'One to eight players','Добавить игрока':'Add player','Легов для победы':'Legs to win','⚙ Double Out · Bull разрешён':'⚙ Double Out · Bull allowed','НАЧАТЬ МАТЧ':'START MATCH',
'Игрок':'Player','Соперник':'Opponent','ХОД:':'TURN:','Последний':'Last','ИГРОКИ':'PLAYERS','НАЖМИ ДЛЯ ВЫХОДА':'TAP FOR CHECKOUT','Текущий ход':'Current turn','Показать выход на закрытие':'Show checkout route','ХОД':'TURN','ПРОСМОТР':'PREVIEW','ОЧЕРЕДЬ':'UP NEXT','СЛЕДУЮЩИЙ':'NEXT',
'ВЫХОД ИГРОКА':'PLAYER CHECKOUT','ВЫХОД НА ЗАКРЫТИЕ':'CHECKOUT','ЗАКРЫТИЯ НЕТ':'NO CHECKOUT','ПОДГОТОВКА':'SETUP','Набирай максимум':'Score maximum','ПОСЛЕДНИЙ':'LAST','Матч только начался':'Match just started','История ›':'History ›',
'СУММА ПОДХОДА':'VISIT SCORE','Введите сумму подхода':'Enter visit score','ввод для':'input for','Записать подход':'Submit visit','введите сумму':'enter score','подтвердить':'confirm','отменить':'undo','вернуть':'redo','Сейчас бросает':'Now throwing',
'ВВОД ПОДХОДА':'VISIT INPUT','Введите сумму':'Enter score','ОСТАЛОСЬ':'REMAINING','СЧЁТ ИГРОКА':'PLAYER SCORE','СЕЙЧАС БРОСАЕТ':'NOW THROWING','3 ДРОТИКА':'3 DARTS','3 ДРОТИКА · ВЫХОД':'3 DARTS · CHECKOUT','3 ДРОТИКА · ПРОСМОТР':'3 DARTS · PREVIEW',
'BUST — счёт не изменится':'BUST — score stays unchanged','ЗАКРЫТИЕ · выберите последнее удвоение':'CHECKOUT · choose the finishing double','останется':'remaining',
'Последние подходы':'Recent visits','ИСТОРИЯ МАТЧА':'MATCH HISTORY','Подходов пока нет':'No visits yet','Изменить последний подход':'Edit last visit','Отменить последний подход':'Undo last visit','Вернуть подход':'Redo visit',
'ПОБЕДИТЕЛЬ МАТЧА':'MATCH WINNER','Сыграть ещё':'Play again','Вернуться':'Back','Новая игра':'New game','МАТЧ!':'MATCH!','ЛЕГ':'LEG',
'ТЕКУЩИЙ МАТЧ':'CURRENT MATCH','средний набор':'average score','лучший подход':'best visit','дротиков':'darts','легов':'legs',
'Матч ещё не начат':'Match has not started','Добавь игроков и выбери 301, 501 или свой режим.':'Add players and choose 301, 501 or a custom game.','Нет статистики':'No statistics','Сначала начни матч.':'Start a match first.',
'Таблица закрытий':'Checkout table','61—170':'61—170','Основной маршрут и запасные варианты. Утроения готовят, удвоения закрывают.':'Primary route and alternatives. Trebles set up, doubles finish.','Найти остаток':'Find score',
'ОСНОВНОЙ':'PRIMARY','ВАРИАНТ':'ALTERNATIVE','Нет закрытия':'No checkout','Подготовь следующий подход':'Set up the next visit','ОДИНОЧНЫЙ':'SINGLE','УДВОЕНИЕ':'DOUBLE','УТРОЕНИЕ':'TREBLE',
'DOUBLE OUT':'DOUBLE OUT','ПРОСМОТР ЗАКРЫТИЯ':'CHECKOUT PREVIEW','ДРОТИКОВ В ЗАКРЫТИИ':'DARTS IN CHECKOUT','РЕКОМЕНДУЕТСЯ':'RECOMMENDED','РЕК.':'REC.','Выберите последнее удвоение. Оно сохранится в истории и статистике матча.':'Choose the finishing double. It will be saved in match history and statistics.','Не закрыли — BUST':'Missed double — BUST','ЗАКРЫТО':'FINISHED',
'ПОСЛЕДНИЙ ПОДХОД':'LAST VISIT','Исправить результат':'Edit result','Новая сумма':'New score','Последнее удвоение':'Finishing double','Сохранить':'Save','Удалить подход':'Delete visit','Отмена':'Cancel',
'CHECKOUT LAB 1.0':'CHECKOUT LAB 1.1','Настройки матча':'Match settings','Звук интерфейса':'Interface sound','Нажатия, броски, 180, BUST, LEG':'Taps, darts, 180, BUST, LEG','Короткий отклик на телефоне':'Short haptic feedback on phone',
'Экран не гаснет':'Keep screen awake','Активно во время матча':'Active during match','Не поддерживается браузером':'Not supported by this browser','Полный экран, минимум браузерных элементов':'Fullscreen with minimal browser UI',
'Язык':'Language','Русский':'Russian','Английский':'English',
'Счётчик 301/501':'301/501 scorer','Закрытия 2–170':'Checkouts 2–170','Таблица закрытий в дартсе':'Darts checkout table','в дартсе':'for darts',
'— утроение сектора 20 (60 очков),':'— treble 20 (60 points),','— удвоение 16 (32 очка),':'— double 16 (32 points),','— одинарный сектор 20,':'— single 20,','— внутренний Bull (50 очков). Стрелка показывает порядок бросков.':'— inner Bull (50 points). The arrow shows the dart order.',
'В формате Double Out лег заканчивается только попаданием последнего дротика в удвоение. BULL считается удвоением 25 и тоже может закрыть лег. Максимальное закрытие за три дротика —':'In Double Out, a leg ends only when the final dart hits a double. BULL counts as double 25 and can also finish a leg. The highest three-dart checkout is —',
'Выбери остаток и получи основной маршрут и запасные варианты. Последний дротик в Double Out должен попасть в удвоение или BULL.':'Choose your remaining score to see the primary checkout route and alternatives. In Double Out, the final dart must hit a double or BULL.',
'Хочешь считать матч?':'Want to score a match?','Checkout Lab ведёт счёт 301/501, показывает выходы на закрытие и работает на телефоне и ПК.':'Checkout Lab scores 301/501, shows checkout routes, and works on phones and computers.','ОТКРЫТЬ СЧЁТЧИК →':'OPEN SCORER →',
'Введите остаток, например 121':'Enter remaining score, e.g. 121','Найти закрытие по остатку':'Find checkout by remaining score','Сбросить':'Clear','Закрытия от 2 до 170':'Checkouts from 2 to 170',
'T — утроение · D — удвоение · BULL — 50 очков':'T — treble · D — double · BULL — 50 points','169 остатков':'169 scores','утроение':'treble','удвоение':'double','Введите число от 2 до 170.':'Enter a number from 2 to 170.',
'Нельзя закрыть за 3 дротика':'Cannot finish in 3 darts','Как читать маршруты':'How to read routes',
'T20 — утроение сектора 20 (60 очков), D16 — удвоение 16 (32 очка), S20 — одинарный сектор 20, BULL — внутренний Bull (50 очков). Стрелка показывает порядок бросков.':'T20 is treble 20 (60 points), D16 is double 16 (32 points), S20 is single 20, and BULL is the inner bull (50 points). The arrow shows the dart order.',
'Что такое Double Out':'What is Double Out?',
'В формате Double Out лег заканчивается только попаданием последнего дротика в удвоение. BULL считается удвоением 25 и тоже может закрыть лег. Максимальное закрытие за три дротика — 170: T20 → T20 → BULL.':'In Double Out, a leg ends only when the final dart hits a double. BULL counts as double 25 and can also finish a leg. The highest three-dart checkout is 170: T20 → T20 → BULL.',
'Почему 169 нельзя закрыть?':'Why can’t 169 be checked out?','169 относится к «bogey numbers»: за три дротика с обязательным последним удвоением корректного маршрута нет.':'169 is a bogey number: there is no valid three-dart route that finishes on a double.',
'Как найти нужный остаток?':'How do I find a score?','Введи число в поле поиска сверху. Таблица сразу оставит только нужную карточку и варианты закрытия.':'Enter the number in the search field above. The table will immediately show that score and its checkout options.',
'Маршрут единственный?':'Is there only one route?','Нет. Для многих остатков существует несколько правильных вариантов. Checkout Lab показывает основной и несколько запасных маршрутов.':'No. Many scores have several valid routes. Checkout Lab shows a primary route and several alternatives.',
'бесплатный счётчик для дартса 301/501':'free 301/501 darts scorer',
'Подсказки закрытий':'Checkout hints','Маршруты Double Out от 2 до 170':'Double Out routes from 2 to 170','До 8 игроков':'Up to 8 players','Очередь, леги и статистика':'Turn order, legs and statistics','Работает офлайн':'Works offline','Установи на телефон как приложение':'Install it on your phone as an app',
'Double Out · Bull разрешён':'Double Out · Bull allowed','Поделиться':'Share','Диктор':'Caller','На устройстве нет русского голоса — диктор молчит. Добавьте голос в настройках речи системы.':'No Russian voice on this device — the caller stays silent. Add one in the system speech settings.','Нажмите, чтобы сменить и послушать':'Tap to switch and preview','Стандарт':'Standard','Низкий':'Deep','Тренировка':'Training','ТРЕНИРОВКА':'TRAINING','Удвоения':'Doubles','Очки':'Points','Серия':'Streak','Рекорд':'Best','ЗАКРОЙ':'CHECK OUT','Показать ответ':'Show answer','Дальше':'Next','Оптимально!':'Optimal!','Верно':'Correct','Ответ':'Answer','Не закрывает':'Not a checkout','Лучшие маршруты:':'Best routes:',
'Наберите маршрут дротиками. Последний — в удвоение.':'Tap your route dart by dart. The last dart must be a double.','Назовите маршрут закрытия для случайного остатка: +2 за оптимальный, +1 за верный.':'Name the checkout route for a random score: +2 for the optimal route, +1 for any valid one.',
'Круг по удвоениям у мишени: отмечайте каждый дротик и смотрите процент попаданий.':'Round the doubles at the board: mark every dart and track your hit rate.','Цель':'Target','Попаданий':'Hit rate','БРОСАЙТЕ В':'AIM AT','Мимо':'Miss','Попал':'Hit','Отменить':'Undo','Ещё раз':'Again','РЕЗУЛЬТАТ':'RESULT',
'Три дротика в каждое удвоение от D1 до D20 и в Bull. Отмечайте попадания.':'Three darts at every double from D1 to D20 and the bull. Mark your hits.',
'Сумма':'Total','По дротикам':'By dart','Ввод':'Input','Ввод очков':'Score input','Сумма подхода или каждый дротик':'Visit total or every dart','Голос диктора':'Caller voice','Объявляет очки и остаток для закрытия':'Announces scores and checkout requirements','Способ ввода':'Input method','Убрать последний дротик':'Remove last dart',
'Все матчи':'All matches','Очистить историю':'Clear history','Здесь появится статистика после первого завершённого матча.':'Statistics appear here after your first finished match.','Матчей':'Matches','Побед':'Wins','Средний':'Average','Лучший':'Best','Закрытие':'Checkout','Последние матчи':'Recent matches',
'начинал лег':'started leg','БРОСАЕТ':'THROWING','Леги':'Legs','Последний':'Last','Счёт':'Score','Лучшее закрытие':'Best checkout','лучшее закрытие':'best checkout','Дротиков в леге':'Darts this leg','Далее:':'Next:','История':'History',
'МАРШРУТ НА МИШЕНИ':'ROUTE ON THE BOARD','КУДА ЦЕЛИТЬСЯ':'WHERE TO AIM','МИШЕНЬ':'BOARD','ОСТАТОК':'REMAINING','Запасные:':'Alternatives:','Бросает':'Throwing','Просмотр:':'Preview:','История матча':'Match history','Закрыть историю':'Close history','Закрыть настройки':'Close settings','Введите число от 61 до 170.':'Enter a number from 61 to 170.','Удалить цифру':'Delete digit','Вернуть отменённый подход':'Redo visit',
'Основная навигация':'Main navigation'
};

function detect(){
 const fixed=document.documentElement?.dataset?.lang;
 if(fixed==='ru'||fixed==='en')return fixed;
 try{
  const saved=JSON.parse(localStorage.getItem(SETTINGS)||'null')?.language;
  if(saved==='ru'||saved==='en')return saved;
 }catch{}
 return (navigator.language||'ru').toLowerCase().startsWith('ru')?'ru':'en';
}
function saveLanguage(language){
 try{
  const current=JSON.parse(localStorage.getItem(SETTINGS)||'{}')||{};
  current.language=language;
  localStorage.setItem(SETTINGS,JSON.stringify(current));
 }catch{}
}
function dynamic(s){
 let m;
 if((m=s.match(/^(\d+) нельзя набрать за 3 дротика$/)))return `${m[1]} cannot be scored with 3 darts`;
 if((m=s.match(/^ЛЕГ (.+)$/)))return `LEG ${m[1]}`;
 if((m=s.match(/^ХОД: (.+)$/)))return `TURN: ${m[1]}`;
 if((m=s.match(/^для (.+) · цифры → Enter$/)))return `for ${m[1]} · digits → Enter`;
 if((m=s.match(/^Игрок (\d+)$/)))return `Player ${m[1]}`;
 if((m=s.match(/^Имя игрока (\d+)$/)))return `Player ${m[1]} name`;
 if((m=s.match(/^Удалить игрока (\d+)$/)))return `Remove player ${m[1]}`;
 if((m=s.match(/^Остаток (\d+)$/)))return `Score ${m[1]}`;
 if((m=s.match(/^(\d+) остатков$/)))return `${m[1]} scores`;
 if((m=s.match(/^было (\d+)$/)))return `was ${m[1]}`;
 if((m=s.match(/^(.+) · было (\d+)$/)))return `${m[1]} · was ${m[2]}`;
 if((m=s.match(/^Чем закрыли (\d+)\?$/)))return `How did you finish ${m[1]}?`;
 if((m=s.match(/^(.+) → оставить (\d+)$/)))return `${m[1]} → leave ${m[2]}`;
 if((m=s.match(/^ЗАКРЫТО · (.+)$/)))return `FINISHED · ${m[1]}`;
 if((m=s.match(/^ХОД · (.+)$/)))return `TURN · ${m[1]}`;
 if((m=s.match(/^ПРОСМОТР · (.+)$/)))return `PREVIEW · ${m[1]}`;
 if((m=s.match(/^Ничего не найдено$/)))return 'Nothing found';
 if((m=s.match(/^(\d+) из (\d+) дротиков в удвоение$/)))return `${m[1]} of ${m[2]} darts on a double`;
 if((m=s.match(/^Лучшие: (.+) · Слабые: (.+)$/)))return `Strongest: ${m[1]} · Weakest: ${m[2]}`;
 if((m=s.match(/^Подход (\d+) · 3 дротика$/)))return `Visit ${m[1]} · 3 darts`;
 if((m=s.match(/^Дротик (\d)$/)))return `Dart ${m[1]}`;
 if((m=s.match(/^бот: (.+)$/)))return `computer: ${{'Новичок':'Beginner','Любитель':'Amateur','Клубный':'Club','Сильный':'Strong','Профи':'Pro'}[m[1]]||m[1]}`;
 if((m=s.match(/^до (\d+) сет(а|ов), (\d+) в сете$/)))return `first to ${m[1]} sets, ${m[3]} legs per set`;
 if((m=s.match(/^(\d+) игроков$/)))return `${m[1]} players`;
 if((m=s.match(/^(\d+) из 16$/)))return `${m[1]} of 16`;
 if((m=s.match(/^Раунд (\d+)$/)))return `Round ${m[1]}`;
 if((m=s.match(/^до (\d+) сет(а|ов)$/)))return `first to ${m[1]} ${m[1]==='1'?'set':'sets'}`;
 if((m=s.match(/^(Новичок|Любитель|Клубный|Сильный|Профи) · ≈(\d+)$/)))return `${{'Новичок':'Beginner','Любитель':'Amateur','Клубный':'Club','Сильный':'Strong','Профи':'Pro'}[m[1]]} · ≈${m[2]}`;
 if((m=s.match(/^Счёт упал до нуля на (.+)$/)))return `Score dropped to zero on ${m[1]}`;
 if((m=s.match(/^Следующая цель — (\d+)$/)))return `Next target — ${m[1]}`;
 if((m=s.match(/^(\d+) · ЦЕЛЬ$/)))return `${m[1]} · TARGET`;
 if((m=s.match(/^до (\d+) лег(а|ов)$/)))return `first to ${m[1]} ${m[1]==='1'?'leg':'legs'}`;
 if((m=s.match(/^для (.+)$/)))return `for ${m[1]}`;
 if((m=s.match(/^(\d+) · Double Out · (\d+) подходов$/)))return `${m[1]} · Double Out · ${m[2]} visits`;
 if((m=s.match(/^Звук: (вкл|выкл)$/)))return `Sound: ${m[1]==='вкл'?'on':'off'}`;
 if((m=s.match(/^Вибрация: (вкл|выкл)$/)))return `Vibration: ${m[1]==='вкл'?'on':'off'}`;
 if((m=s.match(/^Экран не гаснет: (да|нет)$/)))return `Keep screen awake: ${m[1]==='да'?'yes':'no'}`;
 return s;
}
function tr(s){
 const clean=s.trim();
 if(exact[clean])return exact[clean];
 const direct=dynamic(clean);if(direct!==clean)return direct;
 const prefixed=clean.match(/^(\S+\s+)(.+)$/);
 if(prefixed){const translated=exact[prefixed[2]]||dynamic(prefixed[2]);if(translated!==prefixed[2])return prefixed[1]+translated;}
 return clean;
}
function apply(root=document,language=detect()){
 document.documentElement.lang=language==='en'?'en':'ru';
 if(language!=='en')return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  if(['SCRIPT','STYLE','NOSCRIPT'].includes(node.parentElement?.tagName))continue;
  const raw=node.nodeValue,clean=raw.trim();if(!clean)continue;
  const translated=tr(clean);if(translated!==clean)node.nodeValue=raw.replace(clean,translated);
 }
 root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
  for(const attr of ['placeholder','title','aria-label']){
   const v=el.getAttribute(attr);if(!v)continue;const translated=tr(v);if(translated!==v)el.setAttribute(attr,translated);
  }
 });
}
function applyMeta(language,page='app'){
 // Pages with a fixed language already ship their own SEO title and description.
 const fixed=document.documentElement?.dataset?.lang;if(fixed==='ru'||fixed==='en')return;
 if(language!=='en'){
  if(page==='table'){
   document.title='Таблица закрытий в дартсе 2–170 — Checkout Lab';
   document.querySelector('meta[name="description"]')?.setAttribute('content','Таблица закрытий в дартсе для Double Out: маршруты от 2 до 170 очков, основные и запасные варианты, поиск по остатку. Бесплатно от Checkout Lab.');
  }else{
   document.title='Checkout Lab — счётчик для дартса';
   document.querySelector('meta[name="description"]')?.setAttribute('content','Checkout Lab — профессиональный офлайн-счётчик для дартса 301/501 с Double Out, мультиплеером и подсказками закрытий.');
  }
  return;
 }
 if(page==='table'){
  document.title='Darts Checkout Table 2–170 — Checkout Lab';
  const desc='Double Out darts checkout table from 2 to 170 with primary and alternative routes and instant score search.';
  document.querySelector('meta[name="description"]')?.setAttribute('content',desc);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content','Darts Checkout Table 2–170 — Checkout Lab');
  document.querySelector('meta[property="og:description"]')?.setAttribute('content','Double Out checkout routes from 2 to 170 with instant score search.');
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content','en_US');
 }else{
  document.title='Checkout Lab — 301/501 Darts Scorer';
  document.querySelector('meta[name="description"]')?.setAttribute('content','Free 301/501 darts scorer with Double Out, checkout suggestions, multiplayer, statistics and offline mode.');
 }
}
window.CheckoutI18n={detect,saveLanguage,apply,applyMeta,tr};
})();
