const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }, body: "ok" };
  }

  try {
    const { to, cc, subject, html } = JSON.parse(event.body);

    if (!to || !subject || !html) {
      return { statusCode: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Campos obrigatórios: to, subject, html" }) };
    }

    const API_KEY = process.env.BREVO_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || "seu@gmail.com";
    const FROM_NAME = process.env.FROM_NAME || "Linea Alimentos - Devoluções";

    if (!API_KEY) {
      return { statusCode: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "BREVO_API_KEY não configurada" }) };
    }

    // Brevo expects array of {email, name} objects
    const toList = (Array.isArray(to) ? to : [to]).map(e => ({ email: e.trim() }));
    const ccList = cc ? (Array.isArray(cc) ? cc : [cc]).map(e => ({ email: e.trim() })) : undefined;

    const body = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: toList,
      subject: subject,
      htmlContent: html,
    };
    if (ccList && ccList.length > 0) body.cc = ccList;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: data.message || JSON.stringify(data) }) };
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true, id: data.messageId }) };
  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: e.message }) };
  }
};

module.exports = { handler };
