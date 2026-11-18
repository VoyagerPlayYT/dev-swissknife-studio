// DEV SWISSKNIFE // Production Developer Studio Engine
(function() {
  // Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const toolPanes = document.querySelectorAll('.tool-pane');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      toolPanes.forEach(p => p.classList.add('hidden'));

      tab.classList.add('active');
      const pane = document.getElementById('pane' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1));
      if (pane) pane.classList.remove('hidden');
    });
  });

  // ===================== PANE 1: REGEX LAB =====================
  const regexPattern = document.getElementById('regexPattern');
  const flagI = document.getElementById('flagI');
  const flagM = document.getElementById('flagM');
  const flagS = document.getElementById('flagS');
  const btnTestRegex = document.getElementById('btnTestRegex');
  const regexTestText = document.getElementById('regexTestText');
  const regexMatchesBody = document.getElementById('regexMatchesBody');
  const regexMatchCount = document.getElementById('regexMatchCount');

  async function evaluateRegex() {
    const pattern = regexPattern.value;
    let flags = "";
    if (flagI.checked) flags += "i";
    if (flagM.checked) flags += "m";
    if (flagS.checked) flags += "s";

    try {
      const res = await fetch('/api/regex/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, flags, text: regexTestText.value })
      });
      const data = await res.json();

      if (data.error) {
        regexMatchCount.textContent = "Regex Error: " + data.error;
        regexMatchCount.style.color = "#EF4444";
        regexMatchesBody.innerHTML = '';
        return;
      }

      regexMatchCount.style.color = "#06B6D4";
      regexMatchCount.textContent = `${data.match_count} matches identified`;
      regexMatchesBody.innerHTML = '';

      data.matches.forEach((m, idx) => {
        const tr = document.createElement('tr');
        const groupsStr = m.groups.length ? m.groups.map((g, i) => `$${i + 1}: ${g}`).join(', ') : 'none';
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td class="text-cyan font-mono">${escapeHtml(m.full_match)}</td>
          <td class="text-muted font-mono">[${m.start}:${m.end}]</td>
          <td class="font-mono text-xs">${escapeHtml(groupsStr)}</td>
        `;
        regexMatchesBody.appendChild(tr);
      });
    } catch (e) {
      console.error(e);
    }
  }

  btnTestRegex.addEventListener('click', evaluateRegex);
  regexPattern.addEventListener('input', debounce(evaluateRegex, 300));
  regexTestText.addEventListener('input', debounce(evaluateRegex, 300));

  // ===================== PANE 2: JSON & YAML =====================
  const convertInput = document.getElementById('convertInput');
  const convertOutput = document.getElementById('convertOutput');
  const btnJsonToYaml = document.getElementById('btnJsonToYaml');
  const btnYamlToJson = document.getElementById('btnYamlToJson');
  const btnPrettifyJson = document.getElementById('btnPrettifyJson');
  const btnMinifyJson = document.getElementById('btnMinifyJson');

  async function runConvert(direction) {
    try {
      const res = await fetch('/api/convert/json-yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: convertInput.value, direction })
      });
      const data = await res.json();
      if (data.error) {
        convertOutput.value = "Conversion Error: " + data.error;
      } else {
        convertOutput.value = data.result;
      }
    } catch (e) {
      convertOutput.value = "Error: " + e.message;
    }
  }

  btnJsonToYaml.addEventListener('click', () => runConvert('json-to-yaml'));
  btnYamlToJson.addEventListener('click', () => runConvert('yaml-to-json'));

  btnPrettifyJson.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(convertInput.value);
      convertOutput.value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      convertOutput.value = "JSON Syntax Error: " + e.message;
    }
  });

  btnMinifyJson.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(convertInput.value);
      convertOutput.value = JSON.stringify(parsed);
    } catch (e) {
      convertOutput.value = "JSON Syntax Error: " + e.message;
    }
  });

  // ===================== PANE 3: CRYPTO & JWT =====================
  const hashInputText = document.getElementById('hashInputText');
  const valMd5 = document.getElementById('valMd5');
  const valSha1 = document.getElementById('valSha1');
  const valSha256 = document.getElementById('valSha256');
  const valBase64 = document.getElementById('valBase64');
  const jwtInput = document.getElementById('jwtInput');
  const jwtOutputView = document.getElementById('jwtOutputView');
  const generatedPassword = document.getElementById('generatedPassword');
  const btnGenPassword = document.getElementById('btnGenPassword');
  const entropyVal = document.getElementById('entropyVal');

  async function updateHashes() {
    try {
      const res = await fetch('/api/crypto/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hashInputText.value })
      });
      const data = await res.json();
      valMd5.textContent = data.md5;
      valSha1.textContent = data.sha1;
      valSha256.textContent = data.sha256;
      valBase64.textContent = data.base64_encoded;
    } catch (e) {
      console.error(e);
    }
  }

  hashInputText.addEventListener('input', debounce(updateHashes, 250));

  async function updateJwt() {
    const token = jwtInput.value.trim();
    if (!token) {
      jwtOutputView.textContent = "Paste token to inspect header and payload.";
      return;
    }

    try {
      const res = await fetch('/api/crypto/jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!data.valid) {
        jwtOutputView.textContent = "JWT Error: " + data.error;
      } else {
        jwtOutputView.textContent = `// HEADER (ALGORITHM & TOKEN TYPE)\n` +
          JSON.stringify(data.header, null, 2) + `\n\n// PAYLOAD (DATA CLAIMS)\n` +
          JSON.stringify(data.payload, null, 2) + `\n\n// SIGNATURE CHECKSUM\n` + data.signature;
      }
    } catch (e) {
      jwtOutputView.textContent = "Error: " + e.message;
    }
  }

  jwtInput.addEventListener('input', debounce(updateJwt, 300));

  function generateSecurePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}";
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    let pass = "";
    for (let i = 0; i < array.length; i++) {
      pass += chars[array[i] % chars.length];
    }
    generatedPassword.value = pass;
    entropyVal.textContent = "151 bits (Cryptographically Strong)";
  }

  btnGenPassword.addEventListener('click', generateSecurePassword);

  // ===================== PANE 4: SQL SANDBOX =====================
  const sqlQueryInput = document.getElementById('sqlQueryInput');
  const btnRunSql = document.getElementById('btnRunSql');
  const sqlMetaStatus = document.getElementById('sqlMetaStatus');
  const sqlRowCount = document.getElementById('sqlRowCount');
  const sqlExecTime = document.getElementById('sqlExecTime');
  const sqlTableHead = document.getElementById('sqlTableHead');
  const sqlTableBody = document.getElementById('sqlTableBody');
  const chipBtns = document.querySelectorAll('.chip-btn');

  async function runSqlQuery() {
    const query = sqlQueryInput.value.trim();
    if (!query) return;

    btnRunSql.textContent = "EXECUTING...";
    btnRunSql.disabled = true;

    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      sqlExecTime.textContent = `${data.execution_ms} ms`;

      if (data.error) {
        sqlMetaStatus.textContent = "Query Failed";
        sqlMetaStatus.style.color = "#EF4444";
        sqlRowCount.textContent = "0";
        sqlTableHead.innerHTML = '<tr><th>ERROR</th></tr>';
        sqlTableBody.innerHTML = `<tr><td style="color:#EF4444;">${escapeHtml(data.error)}</td></tr>`;
        return;
      }

      sqlMetaStatus.textContent = "Success";
      sqlMetaStatus.style.color = "#06B6D4";
      sqlRowCount.textContent = data.row_count.toString();

      // Table Head
      sqlTableHead.innerHTML = '<tr>' + data.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';

      // Table Body
      sqlTableBody.innerHTML = '';
      data.rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = row.map(val => `<td>${escapeHtml(String(val !== null ? val : 'NULL'))}</td>`).join('');
        sqlTableBody.appendChild(tr);
      });

    } catch (e) {
      sqlMetaStatus.textContent = "Error: " + e.message;
    } finally {
      btnRunSql.textContent = "EXECUTE QUERY [CTRL+ENTER]";
      btnRunSql.disabled = false;
    }
  }

  btnRunSql.addEventListener('click', runSqlQuery);
  sqlQueryInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') runSqlQuery();
  });

  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      sqlQueryInput.value = chip.dataset.sql;
      runSqlQuery();
    });
  });

  // Utilities
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // Boot
  evaluateRegex();
  updateHashes();
  updateJwt();
  generateSecurePassword();
  runSqlQuery();

})();
