const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /https?:\/\/|www\.|\.com\/|\.it\/|\.net\/|\.org\//i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { nome, telefono, email, profilo, esposizione, descrizione } = req.body || {};

  if (!nome || !email || !telefono) {
    return res.status(400).json({ error: 'I campi nome, email e telefono sono obbligatori.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Indirizzo email non valido.' });
  }

  if (descrizione && URL_REGEX.test(descrizione)) {
    return res.status(400).json({ error: 'Il campo descrizione non può contenere link.' });
  }

  try {
    await resend.emails.send({
      from: 'Sito Martinelli <noreply@crisidimpresa-martinelli.com>',
      to: 'martinelli.crisi@gmail.com',
      replyTo: email,
      subject: `Nuova richiesta consulenza - ${nome}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #0A1628; border-bottom: 2px solid #0A1628; padding-bottom: 12px;">
            Nuova richiesta dal sito
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; width: 140px; border-bottom: 1px solid #e0e0e0;">Nome</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">${esc(nome)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #e0e0e0;">Telefono</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">${esc(telefono)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #e0e0e0;">Email</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">
                <a href="mailto:${esc(email)}">${esc(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #e0e0e0;">Profilo</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">${esc(profilo || '—')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #e0e0e0;">Esposizione</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">${esc(esposizione || '—')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #e0e0e0;">Descrizione</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; white-space: pre-line;">${esc(descrizione || '—')}</td>
            </tr>
          </table>
          <p style="margin-top: 24px; font-size: 13px; color: #888;">
            Puoi rispondere direttamente a questa email per contattare il cliente.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Errore invio email:', err);
    return res.status(500).json({ error: 'Errore nell\'invio dell\'email. Riprova più tardi.' });
  }
};

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
