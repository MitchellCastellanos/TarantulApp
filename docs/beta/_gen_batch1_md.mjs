import fs from 'node:fs'

const { buildSpanishBetaWelcomeEmail } = await import(
  new URL('../../frontend/src/utils/welcomeBetaEmail.js', import.meta.url).href
)

const rows = [
  ['rubiiog.01@gmail.com', 'Bernardo Rubén González Juarez', 'TaBetajTfcR3CWnK!1'],
  ['aranalopez89@gmail.com', 'Alejandro López Hernández', 'TaBetaWKjvDWRgxk!1'],
  ['espinozafelixnehemiasrussell@gmail.com', 'Nehemías', 'TaBetac3AMvZ4D3J!1'],
  ['danyross980314@gmail.com', 'Alan Daniel Cruz Rosales', 'TaBetabASzkmsRTa!1'],
  ['bravociber784@gmail.com', 'Edgar Ulises Bravo', 'TaBetaTKNpEBmj9r!1'],
  ['edgarhgr4782@outlook.com', 'Edgar G', 'TaBetar3ypbGZDb6!1'],
  ['leslyvcruz@gmail.com', 'Lesly', 'TaBetaV2qSKu6Kfq!1'],
  ['oswaldo.argote03@gmail.com', 'Oswaldo Argote', 'TaBetaVcEyk3KnSV!1'],
  ['yamilzuniga923@gmail.com', 'Yamil', 'TaBetajEP7tzPcWY!1'],
  ['dairacortes862@gmail.com', 'Daira Cortes', 'TaBetaZkbFNchkyC!1'],
  ['perrometalpunk@gmail.com', 'Gandy Dioshymar Solorzano Fraga', 'TaBetacyDts5cqPq!1'],
  ['mvzroboamr@gmail.com', 'Cesar roboam', 'TaBetawA7c3MFKm8!1'],
  ['hodgsonabader@gmail.com', 'Mayos', 'TaBeta7ntnFpCsDy!1'],
  ['cesarratab@gmail.com', 'César Aguilera Santiago', 'TaBetaQHBVrFAJbF!1'],
  ['abelcastilloperez@gmail.com', 'Abel Castillo', 'TaBetaWXr8EvREan!1'],
  ['engardi.84@gmail.com', 'Enrique Garcia Dier', 'TaBetatbfZg72yyG!1'],
  ['mocosito246@gmail.com', 'Jordy', 'TaBetaHMsZfraTfR!1'],
  ['betanzo@gmail.com', 'carlos alberto hernandez', 'TaBeta4aFDX5jKuX!1'],
  ['edgarramirez1@yahoo.ca', 'Edgar Ramirez Villalobos', 'TaBetaHcns7v6GXg!1'],
  ['martinelias1208@gmail.com', 'Martín Díaz', 'TaBetaAJBkB7n9Fv!1'],
  ['vanreptifana@gmail.com', 'Christian Gutierrez', 'TaBetaEPJ7nMedzJ!1'],
  ['rtradegas@gmail.com', 'Ruben', 'TaBetaqhNkZYpVVX!1'],
  ['rodridj100@gmail.com', 'Rodrigo', 'TaBetaBWyfdwsYQQ!1'],
  ['urielroj28@gmail.com', 'Christian', 'TaBetaUjzjRJemHq!1'],
  ['urielroj28@gmail.com', 'Christian (entrada duplicada en tu tabla — un solo email)', 'TaBetaUjzjRJemHq!1'],
  ['hjmm9977@gmail.com', 'Hector murillo', 'TaBetaJX7YcPkyBD!1'],
  ['ricardokevindrake@gmail.com', 'Drake Mojarro', 'TaBetaMde5PXvXmM!1'],
  ['ang3114k@icloud.com', 'Angel Orozco', 'TaBetaYFBkyZNRYh!1'],
  ['cesar@fucesa.com', 'César Guadarrama Rico', 'TaBetath74dwsG7K!1'],
  ['armagi32@gmail.com', 'Ari', 'TaBetavnXMFD3Xu7!1'],
]

const sendDate = '1 de mayo de 2026'

let md = `# TarantulApp — Emails de bienvenida beta (español, lote 1)

Fecha de referencia del envío: **${sendDate}**.  
URL de la app: **https://tarantulapp.com**

**Nota de este lote:** la build Android en Play Store llega en unos días; mientras, la experiencia es **webapp** (y acceso directo / PWA en el móvil). Fin de semana para explorar; el **lunes** empiezan misiones por correo. Los usuarios Android recibirán acceso para probar desde Play Store en los próximos días.

**Entrada:** botón de acceso beta en la pantalla previa (gate) → inicio de sesión con el correo y la contraseña de cada bloque.

La plantilla base está también en código: \`frontend/src/utils/welcomeBetaEmail.js\` (\`buildSpanishBetaWelcomeEmail\`).

---

`

rows.forEach(([email, name, pass], idx) => {
  md += `## ${idx + 1}. ${name} <${email}>\n\n`
  md += `**Contraseña sugerida (configúrala igual en admin):** \`${pass}\`\n\n`
  md += '```text\n'
  md += buildSpanishBetaWelcomeEmail({
    name,
    email,
    password: pass,
    sendDate,
  })
  md += '\n```\n\n---\n\n'
})

const outFile = new URL('batch-1-welcome-emails-es-2026-05-01.md', import.meta.url)
fs.writeFileSync(outFile, md, 'utf8')
