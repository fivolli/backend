import type { AppLang } from './i18n';

export type CategoryId =
  | 'heart-attack'
  | 'burns'
  | 'cuts'
  | 'electric-shock'
  | 'fever'
  | 'poisoning';

type Localized<T> = Record<AppLang, T>;

export type CategoryData = {
  id: CategoryId;
  title: Localized<string>;
  icon: string;
  color: string; 
  steps: Localized<string[]>;
};


export const CATEGORIES: CategoryData[] = [
  {
    id: 'heart-attack',
    title: {
      ru: 'Сердечный приступ',
      en: 'Heart attack',
      kg: 'Жүрөк пристубу',
    },
    icon: '❤️',
    color: '#FFCDD2',
    steps: {
      ru: [
        'Немедленно вызовите скорую помощь (103 или 112)',
        'Помогите человеку сесть в удобное положение',
        'Расстегните тесную одежду, обеспечьте доступ свежего воздуха',
        'Дайте аспирин (если нет аллергии) и нитроглицерин под язык',
        'Успокойте пострадавшего, не оставляйте его одного',
      ],
      en: [
        'Call an ambulance immediately (103 or 112)',
        'Help the person sit in a comfortable position',
        'Loosen tight clothing and provide fresh air',
        'Give aspirin (if no allergy) and nitroglycerin under the tongue',
        'Calm the person and do not leave them alone',
      ],
      kg: [
        'Дароо тез жардам чакырыңыз (103 же 112)',
        'Адамды ыңгайлуу абалда отургузууга жардам бериңиз',
        'Кысылган кийимди бошотуп, таза аба кирүүсүн камсыз кылыңыз',
        'Аспирин (аллергия жок болсо) жана нитроглицеринди тил астына бериңиз',
        'Жабырлануучуну тынчтандырып, жалгыз калтырбаңыз',
      ],
    },
  },
  {
    id: 'burns',
    title: {
      ru: 'Ожоги',
      en: 'Burns',
      kg: 'Күйүк',
    },
    icon: '🔥',
    color: '#FFE0B2',
    steps: {
      ru: [
        'Немедленно прекратите воздействие источника ожога',
        'Охладите пораженный участок прохладной водой 10-20 минут',
        'Не используйте лед, масло или мази!',
        'Аккуратно снимите украшения до появления отека',
        'Наложите стерильную повязку',
        'При сильных ожогах вызовите скорую помощь',
      ],
      en: [
        'Stop the burn source exposure immediately',
        'Cool the affected area with cool water for 10–20 minutes',
        'Do not use ice, oil, or ointments!',
        'Carefully remove jewelry before swelling starts',
        'Apply a sterile dressing',
        'Call an ambulance for severe burns',
      ],
      kg: [
        'Күйүккө алып келген булактын таасирин дароо токтотуңуз',
        'Жабыркаган жерди 10–20 мүнөт салкын суу менен муздатыңыз',
        'Муз, май же майларды колдонбоңуз!',
        'Шишик чыга электе зер буюмдарды этияттык менен чечиңиз',
        'Стерилдүү таңгыч коюңуз',
        'Оор күйүктө тез жардам чакырыңыз',
      ],
    },
  },
  {
    id: 'cuts',
    title: {
      ru: 'Порезы и раны',
      en: 'Cuts and wounds',
      kg: 'Кесиктер жана жаралар',
    },
    icon: '🩹',
    color: '#F8BBD0',
    steps: {
      ru: [
        'Вымойте руки перед оказанием помощи',
        'Остановите кровотечение, прижав чистую ткань к ране',
        'Промойте рану чистой водой',
        'Обработайте края раны антисептиком',
        'Наложите стерильную повязку',
        'При глубоких ранах обратитесь к врачу',
      ],
      en: [
        'Wash your hands before providing help',
        'Stop bleeding by pressing a clean cloth against the wound',
        'Rinse the wound with clean water',
        'Treat the wound edges with an antiseptic',
        'Apply a sterile dressing',
        'Seek medical help for deep wounds',
      ],
      kg: [
        'Жардам көрсөтүүдөн мурун колуңузду жууңуз',
        'Таза кездемени жарага басып, кан агууну токтотуңуз',
        'Жараны таза суу менен жууп коюңуз',
        'Жаранын четтерин антисептик менен иштетиңиз',
        'Стерилдүү таңгыч коюңуз',
        'Терең жараларда дарыгерге кайрылыңыз',
      ],
    },
  },
  {
    id: 'electric-shock',
    title: {
      ru: 'Электрический шок',
      en: 'Electric shock',
      kg: 'Электр тогу уруу',
    },
    icon: '⚡',
    color: '#FFF9C4',
    steps: {
      ru: [
        'НЕ ПРИКАСАЙТЕСЬ к пострадавшему, пока не отключен ток!',
        'Отключите источник электричества',
        'Вызовите скорую помощь (103 или 112)',
        'Проверьте дыхание и пульс',
        'При необходимости начните сердечно-легочную реанимацию',
        'Обработайте ожоги от электричества',
      ],
      en: [
        'DO NOT touch the victim until the power is turned off!',
        'Turn off the electricity source',
        'Call an ambulance (103 or 112)',
        'Check breathing and pulse',
        'Start CPR if needed',
        'Treat electrical burns',
      ],
      kg: [
        'ТОК ӨЧҮРҮЛМӨЙҮНЧӨ жабырлануучуга ТИЙБЕҢИЗ!',
        'Электр булагын өчүрүңүз',
        'Тез жардам чакырыңыз (103 же 112)',
        'Дем алуусун жана тамыр кагышын текшериңиз',
        'Керек болсо жүрөк-өпкө реанимациясын баштаңыз',
        'Электрден болгон күйүктөрдү иштетиңиз',
      ],
    },
  },
  {
    id: 'fever',
    title: {
      ru: 'Высокая температура',
      en: 'High fever',
      kg: 'Жогорку температура',
    },
    icon: '🌡️',
    color: '#BBDEFB',
    steps: {
      ru: [
        'Измерьте температуру тела',
        'Обеспечьте обильное питье',
        'Снимите лишнюю одежду',
        'Протрите тело теплой водой',
        'Дайте жаропонижающее (парацетамол или ибупрофен)',
        'При температуре выше 39°C или судорогах вызовите скорую',
      ],
      en: [
        'Measure body temperature',
        'Encourage plenty of fluids',
        'Remove excess clothing',
        'Wipe the body with warm water',
        'Give a fever reducer (paracetamol or ibuprofen)',
        'Call an ambulance if temperature is above 39°C or there are seizures',
      ],
      kg: [
        'Дене температурасын өлчөңүз',
        'Көп суюктук ичирүүнү камсыз кылыңыз',
        'Ашыкча кийимди чечиңиз',
        'Денени жылуу суу менен сүртүңүз',
        'Дене табын түшүрүүчү дары бериңиз (парацетамол же ибупрофен)',
        'Температура 39°Cтан жогору болсо же тырышуу болсо тез жардам чакырыңыз',
      ],
    },
  },
  {
    id: 'poisoning',
    title: {
      ru: 'Отравление',
      en: 'Poisoning',
      kg: 'Уулануу',
    },
    icon: '⚠️',
    color: '#E1BEE7',
    steps: {
      ru: [
        'Немедленно вызовите скорую помощь (103)',
        'Определите источник отравления',
        'НЕ вызывайте рвоту без указания врача!',
        'При отравлении через рот - дайте выпить воды',
        'Сохраните упаковку вещества для врачей',
        'Следите за дыханием и сознанием пострадавшего',
      ],
      en: [
        'Call an ambulance immediately (103)',
        'Identify the source of poisoning',
        'DO NOT induce vomiting without medical advice!',
        'If ingested, give water to drink',
        'Keep the substance packaging for doctors',
        'Monitor breathing and consciousness',
      ],
      kg: [
        'Дароо тез жардам чакырыңыз (103)',
        'Уулануунун булагын аныктаңыз',
        'Дарыгер айтмайынча КУСУУНУ КОЗГОБОҢУЗ!',
        'Ооз аркылуу ууланса — суу ичириңиз',
        'Заттын таңгактарын дарыгерлер үчүн сактап коюңуз',
        'Дем алуусун жана аң-сезимин көзөмөлдөңүз',
      ],
    },
  },
];

export function getCategoryById(id: string | undefined) {
  return CATEGORIES.find((c) => c.id === id);
}

export function withAlpha(hex: string, alphaHex: string) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}
