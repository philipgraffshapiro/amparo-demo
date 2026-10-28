export const networkLocations = [
  {
    id: 'miami',
    city: 'Miami',
    name: 'Downtown legal access',
    es: 'Acceso legal Downtown',
    kind: 'legal',
    lat: 25.775,
    lng: -80.193,
    area: 'Miami-Dade',
    initials: 'ML',
    languages: 'English · Español',
    detail: 'Immigration consultation',
    detailEs: 'Consulta de inmigración',
  },
  {
    id: 'coral',
    city: 'Coral Gables',
    name: 'Family preparation studio',
    es: 'Centro de preparación familiar',
    kind: 'community',
    lat: 25.748,
    lng: -80.259,
    area: 'Miami-Dade',
    initials: 'CG',
    languages: 'English · Español',
    detail: 'Family planning & document preparation',
    detailEs: 'Plan familiar y preparación de documentos',
  },
  {
    id: 'broward',
    city: 'Fort Lauderdale',
    name: 'Broward legal access',
    es: 'Acceso legal Broward',
    kind: 'legal',
    lat: 26.122,
    lng: -80.144,
    area: 'Broward',
    initials: 'BL',
    languages: 'English · Español',
    detail: 'Independent attorney consultation',
    detailEs: 'Consulta con abogado independiente',
  },
  {
    id: 'hollywood',
    city: 'Hollywood',
    name: 'Community connection',
    es: 'Conexión comunitaria',
    kind: 'community',
    lat: 26.011,
    lng: -80.149,
    area: 'Broward',
    initials: 'HC',
    languages: 'English · Español',
    detail: 'Trusted contacts & family resources',
    detailEs: 'Contactos de confianza y recursos familiares',
  },
  {
    id: 'palm',
    city: 'West Palm Beach',
    name: 'Palm Beach legal access',
    es: 'Acceso legal Palm Beach',
    kind: 'legal',
    lat: 26.715,
    lng: -80.054,
    area: 'Palm Beach',
    initials: 'PB',
    languages: 'English · Español',
    detail: 'Immigration consultation',
    detailEs: 'Consulta de inmigración',
  },
];

export const documentCategories = [
  {
    id: 'identity',
    en: 'Identity',
    es: 'Identidad',
    sample: 'Identity record',
    sampleEs: 'Registro de identidad',
  },
  {
    id: 'family',
    en: 'Family',
    es: 'Familia',
    sample: 'Family contact sheet',
    sampleEs: 'Hoja de contactos familiares',
  },
  {
    id: 'residence',
    en: 'Residence',
    es: 'Residencia',
    sample: 'Residence record',
    sampleEs: 'Registro de residencia',
  },
  {
    id: 'legal',
    en: 'Legal',
    es: 'Legal',
    sample: 'Attorney consultation notes',
    sampleEs: 'Notas de consulta legal',
  },
  {
    id: 'other',
    en: 'Other',
    es: 'Otros',
    sample: 'Preparation checklist',
    sampleEs: 'Lista de preparación',
  },
];

export function initialProductState() {
  return {
    version: 2,
    language: 'en',
    theme: 'dark',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@example.com',
    city: 'Miami',
    membership: 'preview',
    documents: [
      {
        id: 'sample-family',
        name: 'Family contact sheet',
        nameEs: 'Hoja de contactos familiares',
        category: 'family',
        sample: true,
        size: 2400,
      },
      {
        id: 'sample-residence',
        name: 'Residence record',
        nameEs: 'Registro de residencia',
        category: 'residence',
        sample: true,
        size: 1800,
      },
    ],
    contacts: [
      {
        id: 'elena',
        name: 'Elena Rodriguez',
        relation: 'Sister',
        relationEs: 'Hermana',
        phone: '(305) 555-0148',
        initials: 'ER',
      },
      {
        id: 'carlos',
        name: 'Carlos Rodriguez',
        relation: 'Partner',
        relationEs: 'Pareja',
        phone: '(305) 555-0126',
        initials: 'CR',
      },
    ],
    activity: [
      {
        en: 'Your family space is set up.',
        es: 'Tu espacio familiar está preparado.',
      },
    ],
    appointments: [],
    notifications: true,
    reminders: true,
  };
}

export function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
}
export const localText = (language, en, es) => (language === 'es' ? es : en);
