// ── Utilidades ────────────────────────────────────────────────
function showToast(msg = '✓ Copiado al portapapeles') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2000);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast()).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast();
  });
}

// Extrae texto plano de un bloque <pre><code>
function extractPlainCode(preEl) {
  return preEl.innerText || preEl.textContent;
}

// ── Mobile menu ────────────────────────────────────────────────
document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Cerrar mobile menu al hacer clic en un enlace
document.querySelectorAll('#mobile-menu a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.add('hidden');
  });
});

// ── Botones de copiar en bloques de código ─────────────────────
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('copy-btn')) return;
  const btn = e.target;

  // Opción A: tiene data-code (texto corto)
  if (btn.dataset.code) {
    copyText(btn.dataset.code);
    return;
  }

  // Opción B: copia el <pre> hermano o más cercano
  const codeBlock = btn.closest('.code-block');
  if (codeBlock) {
    const pre = codeBlock.querySelector('pre');
    if (pre) copyText(extractPlainCode(pre));
  }
});

// ── Acordeón (sección Anatomía) ────────────────────────────────
document.querySelectorAll('.accordion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.accordion-icon');
    const isOpen = !body.classList.contains('hidden');

    // Cerrar todos
    document.querySelectorAll('.accordion-body').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.accordion-btn').forEach(b => {
      b.classList.remove('open');
      b.querySelector('.accordion-icon')?.classList.remove('open');
    });

    // Abrir el clickeado (si estaba cerrado)
    if (!isOpen) {
      body.classList.remove('hidden');
      btn.classList.add('open');
      icon.classList.add('open');
    }
  });
});

// ── Trigger cards (sección 3) ──────────────────────────────────
document.querySelectorAll('.trigger-card').forEach(card => {
  card.addEventListener('click', () => {
    const key = card.dataset.trigger;

    // Activar card
    document.querySelectorAll('.trigger-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Mostrar panel correspondiente
    ['push', 'pr', 'manual', 'schedule'].forEach(k => {
      const el = document.getElementById(`trigger-${k}`);
      if (el) el.classList.toggle('hidden', k !== key);
    });
  });
});

// ── Tabs (sección Plantillas) ──────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('tab-node').classList.toggle('hidden', tab !== 'node');
    document.getElementById('tab-flutter').classList.toggle('hidden', tab !== 'flutter');
  });
});

// Copiar plantillas completas
document.getElementById('copy-node')?.addEventListener('click', () => {
  const pre = document.getElementById('template-node');
  if (pre) copyText(extractPlainCode(pre));
});
document.getElementById('copy-flutter')?.addEventListener('click', () => {
  const pre = document.getElementById('template-flutter');
  if (pre) copyText(extractPlainCode(pre));
});

// ── Progress tracker ───────────────────────────────────────────
const TOTAL_SECTIONS = 5;
const doneSections = new Set();

function updateProgress() {
  const count = doneSections.size;
  const pct = Math.round((count / TOTAL_SECTIONS) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${count} / ${TOTAL_SECTIONS} secciones`;
}

document.querySelectorAll('.mark-done-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.dataset.section;
    if (doneSections.has(sec)) return;
    doneSections.add(sec);
    btn.textContent = '✓ Visto';
    btn.classList.add('done');
    updateProgress();
  });
});

// ── Playground (sección 5) ─────────────────────────────────────
const templates = {
  node: (branch, includePR, includeArtifact) => {
    const prTrigger = includePR ? `  pull_request:\n    branches: [ ${branch}, development ]\n` : '';
    const artifactStep = includeArtifact
      ? `\n      - name: Guardar artefacto\n        uses: actions/upload-artifact@v4\n        with:\n          name: frontend-dist\n          path: ./frontend/dist\n          retention-days: 7`
      : '';

    return `name: CI - Mi Proyecto Node

# ── TRIGGER ──────────────────────────────────────
on:
  push:
    branches: [ ${branch}, development, feature/* ]
${prTrigger}
# ── VARIABLE GLOBAL ──────────────────────────────
env:
  NODE_VERSION: '18'

jobs:

  # JOB 1: Validar el backend
  validate-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Instalar dependencias
        run: npm install

      - name: Ejecutar pruebas
        run: npm test

  # JOB 2: Build del frontend
  build-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Instalar dependencias
        run: npm install

      - name: Build de producción
        run: npm run build${artifactStep}

  # JOB 3: Reporte final
  reporte:
    needs: [ validate-backend, build-frontend ]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Resultado del CI
        run: |
          echo "Backend:  \${{ needs.validate-backend.result }}"
          echo "Frontend: \${{ needs.build-frontend.result }}"`;
  },

  flutter: (branch, includePR, includeArtifact) => {
    const prTrigger = includePR ? `  pull_request:\n    branches: [ ${branch}, development ]\n` : '';
    const artifactStep = includeArtifact
      ? `\n      - name: Guardar APK\n        uses: actions/upload-artifact@v4\n        with:\n          name: app-debug.apk\n          path: build/app/outputs/flutter-apk/app-debug.apk\n          retention-days: 7`
      : '';

    return `name: CI - Mi App Flutter

# ── TRIGGER ──────────────────────────────────────
on:
  push:
    branches: [ ${branch}, development, feature/* ]
${prTrigger}
# ── VARIABLE GLOBAL ──────────────────────────────
env:
  FLUTTER_VERSION: '3.19.0'

jobs:

  # JOB 1: Análisis y pruebas
  analyze-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Instalar Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: \${{ env.FLUTTER_VERSION }}
          channel: 'stable'

      - name: Obtener dependencias
        run: flutter pub get

      - name: Análisis estático
        run: flutter analyze

      - name: Ejecutar pruebas
        run: flutter test

  # JOB 2: Build Android (APK debug)
  build-android:
    needs: [ analyze-and-test ]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Instalar Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Instalar Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: \${{ env.FLUTTER_VERSION }}
          channel: 'stable'

      - name: Obtener dependencias
        run: flutter pub get

      - name: Build APK debug
        run: flutter build apk --debug${artifactStep}

  # JOB 3: Reporte final
  reporte:
    needs: [ analyze-and-test, build-android ]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Resultado del CI
        run: |
          echo "Pruebas: \${{ needs.analyze-and-test.result }}"
          echo "Build:   \${{ needs.build-android.result }}"`;
  }
};

function renderPlayground(code) {
  // Colorea la salida del playground con los mismos tokens del CSS
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const colored = escaped
    // Comentarios
    .replace(/(#[^\n]*)/g, '<span class="cc">$1</span>')
    // Llaves tipo "key:" al inicio de línea o tras espacios (no dentro de comentarios)
    .replace(/^( {0,10})([\w-]+)(:)(?= |$)/gm, '$1<span class="ck">$2</span><span class="cp">$3</span>')
    // Items con guión "- name:" o "- cron:"
    .replace(/^( *)(- )([\w-]+)(:)/gm, '$1<span class="cd">$2$3</span><span class="cp">$4</span>')
    // Valores ${{ ... }}
    .replace(/(\$\{\{[^}]+\}\})/g, '<span class="cv">$1</span>');

  return colored;
}

document.getElementById('pg-generate')?.addEventListener('click', () => {
  const tech     = document.getElementById('pg-tech').value;
  const branch   = document.getElementById('pg-branch').value;
  const includePR = document.getElementById('pg-pr').value === 'yes';
  const includeArtifact = document.getElementById('pg-artifact').value === 'yes';

  const code = templates[tech](branch, includePR, includeArtifact);
  const output = document.getElementById('pg-output');
  output.innerHTML = `<code>${renderPlayground(code)}</code>`;

  // Guardar texto plano para copiar
  document.getElementById('pg-copy-btn').dataset.plainCode = code;
});

document.getElementById('pg-copy-btn')?.addEventListener('click', (e) => {
  const plain = e.target.dataset.plainCode;
  if (!plain) { showToast('⚠️ Primero genera el .yml'); return; }
  copyText(plain);
});

// ── Smooth scroll para los nav links ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});