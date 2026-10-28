import { createServices } from './services/index.js';
import { networkLocations, localText } from './product-data.js';
import { createCommunityService } from './community/service.js';

export function createProductServices({ communityAlerts = true } = {}) {
  const base = createServices();
  const community = communityAlerts ? createCommunityService() : null;
  return {
    ...base,
    community,
    network: {
      search({ query = '', kind = 'all' } = {}) {
        const q = query.trim().toLowerCase();
        return networkLocations.filter(
          (place) =>
            (kind === 'all' || place.kind === kind) &&
            `${place.name} ${place.es} ${place.city} ${place.area}`
              .toLowerCase()
              .includes(q),
        );
      },
    },
    assistant: {
      async respond({ message, language = 'en', state }) {
        const q = String(message).toLowerCase();
        const t = (en, es) => localText(language, en, es);
        let content, action, label;
        if (
          community &&
          /immigra|\bice\b|community|report|statistics|estad|actividad|enforcement/.test(
            q,
          )
        ) {
          const data = await community.list({ range: '7d' });
          content = t(
            `The community demo has ${data.stats.reports} reports in the last 7 days, including ${data.stats.detentions} detention reports. The map, report list and statistics share the same filters. These are illustrative examples, not live incidents. Open any report to review its source and status.`,
            `La demo comunitaria tiene ${data.stats.reports} reportes de los últimos 7 días, incluidos ${data.stats.detentions} reportes de detención. El mapa, la lista y las estadísticas comparten los mismos filtros. Son ejemplos ilustrativos, no incidentes reales. Abre un reporte para revisar su fuente y estado.`,
          );
          action = 'alerts';
          label = t('Open community alerts', 'Abrir alertas comunitarias');
        } else if (
          /emergency|urgent|sos|alert|detain|deten|emergencia/.test(q)
        ) {
          content = t(
            'We can walk through your family alert plan. First, review your trusted contacts and the information they would need. The demo shows each step without sending a message. For immediate danger, call 911; for a real legal matter, contact an attorney directly.',
            'Podemos recorrer tu plan de alerta familiar. Primero revisa tus contactos y la información que necesitarían. La demo muestra cada paso sin enviar mensajes. Ante un peligro inmediato, llama al 911; para un asunto legal real, contacta directamente a un abogado.',
          );
          action = 'alert';
          label = t('Walk through my plan', 'Recorrer mi plan');
        } else if (
          /price|cost|pay|member|plan|50|precio|pago|membres/.test(q)
        ) {
          content = t(
            'The proposed Amparo membership is $50 per month for preparation tools, your document space, trusted contacts and access to the network. Attorney fees and bond payments are separate. You can walk through the entire checkout here with a sample card and a $0 charge.',
            'La membresía propuesta de Amparo cuesta $50 al mes e incluye herramientas de preparación, documentos, contactos y acceso a la red. Los honorarios de abogados y las fianzas son aparte. Puedes recorrer el pago completo con una tarjeta de ejemplo y un cargo de $0.',
          );
          action = 'membership';
          label = t('Review my membership', 'Revisar mi membresía');
        } else if (
          /law|legal|attorney|near|network|abogad|red|cerca|map/.test(q)
        ) {
          content = t(
            'The network demo lets you explore legal access and community support across Miami-Dade, Broward and Palm Beach. Filter the map, open a location, and plan a sample consultation. Locations are illustrative; a live provider network has not been activated.',
            'La demo de la red permite explorar acceso legal y apoyo comunitario en Miami-Dade, Broward y Palm Beach. Filtra el mapa, abre una ubicación y planifica una consulta de ejemplo. Las ubicaciones son ilustrativas; la red real aún no está activada.',
          );
          action = 'network';
          label = t('Explore the network', 'Explorar la red');
        } else if (
          /famil|contact|circle|people|person|círculo|circulo/.test(q)
        ) {
          content = t(
            `You have ${state.contacts.length} people in your demo circle. Make sure each person knows where your documents are and how to reach the others. You can add a contact, update the plan, and download a copy to discuss together.`,
            `Tienes ${state.contacts.length} personas en tu círculo de ejemplo. Asegúrate de que sepan dónde están tus documentos y cómo comunicarse. Puedes añadir un contacto y descargar una copia del plan para revisarla juntos.`,
          );
          action = 'circle';
          label = t('Open my circle', 'Abrir mi círculo');
        } else if (
          /doc|file|vault|prepare|passport|ident|record|organ|archivo/.test(q)
        ) {
          content = t(
            `You have ${state.documents.length} documents in your space. Start with identity, family and residence records, then keep consultation notes together. I can open your documents so you can preview an example or add a file on this device. An attorney can advise which records are relevant to your situation.`,
            `Tienes ${state.documents.length} documentos en tu espacio. Empieza por los registros de identidad, familia y residencia. Puedo abrir tus documentos para ver un ejemplo o añadir un archivo en este dispositivo. Un abogado puede indicar cuáles son relevantes para tu situación.`,
          );
          action = 'documents';
          label = t('Open my documents', 'Abrir mis documentos');
        } else {
          content = t(
            `Hi ${state.name}. I can help you organize documents, review your family circle, explore the network, explain the $50 membership, or walk through an alert. This is a contextual demo assistant with product actions. Which part would you like to work on?`,
            `Hola, ${state.name}. Puedo ayudarte con documentos, contactos familiares, la red, la membresía de $50 o una alerta. Soy un asistente de demostración con acciones dentro del producto. ¿Por dónde quieres empezar?`,
          );
          action = 'documents';
          label = t('Review my documents', 'Revisar mis documentos');
        }
        return { demo: true, content, action, label };
      },
    },
  };
}
