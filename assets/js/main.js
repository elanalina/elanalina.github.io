/*
 * Site interactions: theme, navigation, scroll reveals, counters,
 * the SQL console and the command palette. Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EMAIL = 'elanalinae@gmail.com';
  var LINKEDIN = 'https://www.linkedin.com/in/ela-naliina-lakshmi/';
  var GITHUB = 'https://github.com/elanalina';
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  var isMac = /mac|iphone|ipad|ipod/i.test(platform);

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function scrollToHash(hash) {
    var target = hash === '#top' ? document.body : $(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    if (window.history && history.replaceState) history.replaceState(null, '', hash);
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */
  var themeBtn = $('#theme-toggle');
  var themeMeta = $('meta[name="theme-color"]');

  function isDark() { return root.getAttribute('data-theme') === 'dark'; }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) { try { localStorage.setItem('theme', theme); } catch (e) { /* private mode */ } }
    if (themeBtn) themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#16110E' : '#F7F0E6');
  }

  function toggleTheme(originEl) {
    var next = isDark() ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion.matches) { applyTheme(next, true); return; }
    // A circular reveal of the new theme, growing out of the toggle.
    var rect = (originEl || themeBtn).getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var transition = document.startViewTransition(function () { applyTheme(next, true); });
    transition.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () { /* transition skipped */ });
  }

  applyTheme(isDark() ? 'dark' : 'light', false);
  if (themeBtn) themeBtn.addEventListener('click', function () { toggleTheme(themeBtn); });

  // Follow OS changes unless the visitor explicitly picked a theme.
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var onSchemeChange = function (e) {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
    if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
  };
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSchemeChange);

  /* ------------------------------------------------------------------ */
  /* Header + mobile menu + active section                               */
  /* ------------------------------------------------------------------ */
  var header = $('.site-header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var menuBtn = $('#menu-toggle');
  var nav = $('#site-nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('.ms', menuBtn).textContent = open ? 'close' : 'menu';
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
  }

  var navLinks = $$('.site-nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'about', 'experience', 'projects', 'contact'].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll + number counters                                  */
  /* ------------------------------------------------------------------ */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (node) { revealer.observe(node); });
  } else {
    revealEls.forEach(function (node) { node.classList.add('is-visible'); });
  }

  function animateCount(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    var decimals = (node.getAttribute('data-count').split('.')[1] || '').length;
    var duration = 1500;
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); counterObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) {
      var decimals = (c.getAttribute('data-count').split('.')[1] || '').length;
      c.textContent = (0).toFixed(decimals);
      counterObserver.observe(c);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Clipboard + toast                                                   */
  /* ------------------------------------------------------------------ */
  var toast = $('#toast');
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    // Force a reflow so the transition runs even when re-triggered quickly.
    void toast.offsetWidth;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // Fall back if the Clipboard API rejects or never settles (some embedded browsers).
      var timeout = new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, 1200); });
      return Promise.race([navigator.clipboard.writeText(text), timeout])
        .then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = el('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  function copyEmail(button) {
    copyText(EMAIL).then(function (ok) {
      showToast(ok ? 'Email copied to clipboard' : EMAIL);
      if (!button) return;
      var label = $('.copy-btn__label', button);
      var icon = $('.ms', button);
      if (label) label.textContent = ok ? 'Copied' : 'Copy';
      if (icon) icon.textContent = ok ? 'check' : 'content_copy';
      setTimeout(function () {
        if (label) label.textContent = 'Copy';
        if (icon) icon.textContent = 'content_copy';
      }, 2000);
    });
  }
  $$('[data-copy-email]').forEach(function (btn) { btn.addEventListener('click', function () { copyEmail(btn); }); });

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------ */
  /* SQL console                                                         */
  /* ------------------------------------------------------------------ */
  var consoleApi = null;
  if ($('#console') && window.ResumeSQL && window.RESUME_DB) consoleApi = initConsole();

  function initConsole() {
    var SQL = window.ResumeSQL;
    var DB = window.RESUME_DB;
    var ALIASES = window.RESUME_DB_ALIASES || {};
    var screen = $('#console-screen');
    var form = $('#console-form');
    var input = $('#console-input');
    var status = $('#console-status');
    var past = [];
    var pastIndex = 0;
    var expanded = 'auto';
    var introDone = false;
    var finishIntro = null;
    var typingTimer = null;
    var INTRO = "SELECT name, role, superpower\n  FROM engineers\n WHERE handle = 'elanalina';";

    function highlightInto(node, text) {
      SQL.highlight(text).forEach(function (tok) {
        if (tok.cls) node.appendChild(el('span', tok.cls, tok.text));
        else node.appendChild(document.createTextNode(tok.text));
      });
      return node;
    }

    function scrollDown() { screen.scrollTop = screen.scrollHeight; }
    function trim() { while (screen.children.length > 60) screen.removeChild(screen.firstChild); }
    function announce(text) { if (status) status.textContent = text; }

    function echoLines(block, text, withCaret) {
      block.textContent = '';
      var lines = text.split('\n');
      lines.forEach(function (line, i) {
        var row = el('div', 'cline');
        row.appendChild(el('span', 'cps', i === 0 ? 'resume=>' : 'resume->'));
        var code = highlightInto(el('code', 'ccode'), line);
        if (withCaret && i === lines.length - 1) {
          var caret = el('span', 'caret');
          caret.setAttribute('aria-hidden', 'true');
          code.appendChild(caret);
        }
        row.appendChild(code);
        block.appendChild(row);
      });
    }

    function echo(text) {
      var block = el('div', 'cecho');
      echoLines(block, text, false);
      screen.appendChild(block);
    }

    function fillCell(td, value) {
      var s = value === null || value === undefined ? '' : String(value);
      if (/^(https?:\/\/|mailto:)/.test(s)) {
        var a = el('a', null, s.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
        a.href = s;
        if (/^https?:/.test(s)) { a.target = '_blank'; a.rel = 'noopener'; }
        td.appendChild(a);
      } else {
        td.textContent = s;
      }
      if (typeof value === 'number') td.className = 'is-num';
    }

    function renderResult(out) {
      var wrap = el('div', 'cresult');
      if (out.title) wrap.appendChild(el('div', 'ctitle', out.title));
      var scroller = el('div', 'cresult__scroll');
      var n = out.rows.length;
      var useExpanded = expanded === 'on' || (expanded === 'auto' && n === 1 && out.columns.length > 2);
      if (useExpanded) {
        out.rows.forEach(function (row, r) {
          var table = el('table', 'ctable ctable--x');
          table.appendChild(el('caption', null, '-[ RECORD ' + (r + 1) + ' ]-'));
          var body = el('tbody');
          out.columns.forEach(function (col, i) {
            var tr = el('tr');
            var th = el('th', null, col);
            th.scope = 'row';
            var td = el('td');
            fillCell(td, row[i]);
            tr.appendChild(th);
            tr.appendChild(td);
            body.appendChild(tr);
          });
          table.appendChild(body);
          scroller.appendChild(table);
        });
      } else {
        var table = el('table', 'ctable');
        var head = el('thead');
        var hr = el('tr');
        out.columns.forEach(function (col) { var th = el('th', null, col); th.scope = 'col'; hr.appendChild(th); });
        head.appendChild(hr);
        var body = el('tbody');
        out.rows.forEach(function (row) {
          var tr = el('tr');
          row.forEach(function (v) { var td = el('td'); fillCell(td, v); tr.appendChild(td); });
          body.appendChild(tr);
        });
        table.appendChild(head);
        table.appendChild(body);
        scroller.appendChild(table);
      }
      wrap.appendChild(scroller);
      var foot = '(' + n + ' row' + (n === 1 ? '' : 's') + ')';
      if (typeof out.ms === 'number') foot += '  ·  ' + Math.max(out.ms, 0.01).toFixed(2) + ' ms';
      wrap.appendChild(el('div', 'cfoot', foot));
      screen.appendChild(wrap);
      announce(n + ' row' + (n === 1 ? '' : 's') + ' returned.');
    }

    function renderError(err) {
      var box = el('div', 'cmsg');
      var line = el('div', 'cerr');
      line.appendChild(el('span', 'cerr__label', 'ERROR:'));
      line.appendChild(document.createTextNode('  ' + (err && err.message ? err.message : String(err))));
      box.appendChild(line);
      if (err && err.hint) box.appendChild(el('div', 'chint', 'HINT:  ' + err.hint));
      screen.appendChild(box);
      announce('Error: ' + (err && err.message ? err.message : String(err)));
    }

    function renderNotice(text) {
      screen.appendChild(el('div', 'cnotice', text));
      announce(text);
    }

    function renderHelp() {
      var box = el('div', 'chelp');
      box.appendChild(el('div', 'ctitle', 'Things to try (click one):'));
      var list = el('ul', 'chelp__list');
      [
        ['\\dt', 'list tables'],
        ['\\d experience', 'describe a table'],
        ["SELECT * FROM skills WHERE category = 'Databases';", 'filter'],
        ['SELECT title, start_date FROM experience ORDER BY start_date;', 'sort'],
        ['SELECT metric, value FROM impact WHERE value > 50;', 'compare numbers'],
        ['SELECT COUNT(*) FROM skills;', 'aggregate'],
        ['SELECT feature, what_it_does FROM ai_features;', 'the GenAI bits'],
        ['SELECT * FROM contact;', 'say hello'],
        ['\\x', 'toggle expanded display'],
        ['clear', 'clear the screen'],
      ].forEach(function (item) {
        var li = el('li');
        var btn = highlightInto(el('button', 'chelp__q'), item[0]);
        btn.type = 'button';
        btn.addEventListener('click', function () { typeAndRun(item[0]); });
        li.appendChild(btn);
        li.appendChild(el('span', 'chelp__d', '-- ' + item[1]));
        list.appendChild(li);
      });
      box.appendChild(list);
      screen.appendChild(box);
      announce('Help: example queries listed.');
    }

    function banner() {
      var b = el('div', 'cbanner');
      b.appendChild(document.createTextNode('Connected to resume.db (read-only). Type '));
      var help = el('button', null, 'help');
      help.type = 'button';
      help.addEventListener('click', function () { typeAndRun('help'); });
      b.appendChild(help);
      b.appendChild(document.createTextNode(' or '));
      var dt = el('button', null, '\\dt');
      dt.type = 'button';
      dt.addEventListener('click', function () { typeAndRun('\\dt'); });
      b.appendChild(dt);
      b.appendChild(document.createTextNode(' to explore.'));
      screen.appendChild(b);
    }

    function execute(query) {
      var out;
      try {
        out = SQL.run(query, DB, { aliases: ALIASES, expanded: expanded });
      } catch (err) {
        renderError(err);
        scrollDown();
        return;
      }
      switch (out.kind) {
        case 'clear': screen.textContent = ''; announce('Screen cleared.'); break;
        case 'result': renderResult(out); break;
        case 'help': renderHelp(); break;
        case 'notice': renderNotice(out.text); break;
        case 'expanded': expanded = out.value; renderNotice('Expanded display is ' + out.value + '.'); break;
        default: break;
      }
      trim();
      scrollDown();
    }

    function remember(query) {
      var flat = query.replace(/\s+/g, ' ').trim();
      if (flat && past[past.length - 1] !== flat) past.push(flat);
      pastIndex = past.length;
    }

    function submit(query) {
      var q = String(query || '').trim();
      if (!q) return;
      remember(q);
      echo(q);
      execute(q);
    }

    function cancelIntro() { if (!introDone && finishIntro) finishIntro(); }

    function typeAndRun(query) {
      cancelIntro();
      clearInterval(typingTimer);
      if (reduceMotion.matches) { input.value = ''; submit(query); return; }
      var i = 0;
      var step = Math.max(8, Math.min(24, 900 / query.length));
      input.value = '';
      typingTimer = setInterval(function () {
        i++;
        input.value = query.slice(0, i);
        input.scrollLeft = input.scrollWidth;
        if (i >= query.length) {
          clearInterval(typingTimer);
          setTimeout(function () { input.value = ''; submit(query); }, 140);
        }
      }, step);
    }

    function intro() {
      screen.textContent = '';
      banner();
      if (reduceMotion.matches) {
        introDone = true;
        remember(INTRO);
        echo(INTRO);
        execute(INTRO);
        return;
      }
      var block = el('div', 'cecho');
      block.setAttribute('aria-hidden', 'true');
      screen.appendChild(block);
      var i = 0;
      var timer = null;
      echoLines(block, '', true);
      finishIntro = function () {
        if (introDone) return;
        introDone = true;
        clearTimeout(timer);
        echoLines(block, INTRO, false);
        block.removeAttribute('aria-hidden');
        remember(INTRO);
        execute(INTRO);
      };
      function tick() {
        i++;
        echoLines(block, INTRO.slice(0, i), true);
        if (i >= INTRO.length) { timer = setTimeout(finishIntro, 380); return; }
        var ch = INTRO.charAt(i - 1);
        timer = setTimeout(tick, ch === '\n' ? 260 : 26 + Math.random() * 42);
      }
      timer = setTimeout(tick, 650);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      cancelIntro();
      clearInterval(typingTimer);
      var q = input.value;
      input.value = '';
      submit(q);
    });
    input.addEventListener('focus', cancelIntro);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        if (!past.length) return;
        e.preventDefault();
        pastIndex = Math.max(0, pastIndex - 1);
        input.value = past[pastIndex] || '';
        setTimeout(function () { input.setSelectionRange(input.value.length, input.value.length); }, 0);
      } else if (e.key === 'ArrowDown') {
        if (!past.length) return;
        e.preventDefault();
        pastIndex = Math.min(past.length, pastIndex + 1);
        input.value = past[pastIndex] || '';
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        screen.textContent = '';
      } else if (e.key === 'Escape') {
        input.blur();
      }
    });
    $$('.chip[data-query]').forEach(function (chip) {
      chip.addEventListener('click', function () { typeAndRun(chip.getAttribute('data-query')); });
    });

    // Start the typing intro once the console is on screen.
    if ('IntersectionObserver' in window) {
      var started = false;
      var watcher = new IntersectionObserver(function (entries) {
        if (!started && entries.some(function (e) { return e.isIntersecting; })) {
          started = true;
          watcher.disconnect();
          intro();
        }
      }, { threshold: 0.3 });
      watcher.observe(screen);
    } else {
      intro();
    }

    return {
      focus: function () { cancelIntro(); input.focus(); },
      run: typeAndRun,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Command palette (⌘K / Ctrl+K or "/")                                */
  /* ------------------------------------------------------------------ */
  var palette = $('#palette');
  var paletteBtn = $('#palette-open');
  if (palette && typeof palette.showModal === 'function') {
    initPalette();
  } else if (paletteBtn) {
    paletteBtn.hidden = true;
  }

  function initPalette() {
    var input = $('#palette-input');
    var list = $('#palette-list');
    var hint = $('.kbd-hint');
    if (hint) hint.textContent = isMac ? '⌘K' : 'Ctrl K';
    if (paletteBtn) paletteBtn.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');

    var commands = [
      { id: 'about', label: 'Go to About', group: 'section', icon: 'arrow_downward', keys: 'bio me', run: function () { scrollToHash('#about'); } },
      { id: 'experience', label: 'Go to Experience', group: 'section', icon: 'arrow_downward', keys: 'work jobs career', run: function () { scrollToHash('#experience'); } },
      { id: 'projects', label: 'Go to Projects', group: 'section', icon: 'arrow_downward', keys: 'portfolio case studies', run: function () { scrollToHash('#projects'); } },
      { id: 'contact', label: 'Go to Contact', group: 'section', icon: 'arrow_downward', keys: 'hire email reach', run: function () { scrollToHash('#contact'); } },
      {
        id: 'query', label: 'Run a SQL query on my résumé', group: 'console', icon: 'database', keys: 'sql select console terminal',
        run: function () {
          scrollToHash('#top');
          if (consoleApi) setTimeout(consoleApi.focus, reduceMotion.matches ? 0 : 450);
        },
      },
      {
        id: 'theme', label: function () { return isDark() ? 'Switch to light theme' : 'Switch to dark theme'; },
        group: 'theme', icon: function () { return isDark() ? 'light_mode' : 'dark_mode'; }, keys: 'dark light mode appearance',
        run: function () { toggleTheme(themeBtn); },
      },
      { id: 'copy', label: 'Copy my email address', group: 'contact', icon: 'content_copy', keys: 'clipboard mail', run: function () { copyEmail(null); } },
      { id: 'mail', label: 'Write me an email', group: 'contact', icon: 'mail', keys: 'send message', run: function () { window.location.href = 'mailto:' + EMAIL; } },
      { id: 'linkedin', label: 'Open LinkedIn', group: 'link', icon: 'arrow_outward', keys: 'profile social', run: function () { window.open(LINKEDIN, '_blank', 'noopener'); } },
      { id: 'github', label: 'Open GitHub', group: 'link', icon: 'arrow_outward', keys: 'code repos source', run: function () { window.open(GITHUB, '_blank', 'noopener'); } },
    ];
    var valueOf = function (v) { return typeof v === 'function' ? v() : v; };
    var items = [];
    var active = 0;

    function fuzzy(query, text) {
      text = text.toLowerCase();
      if (text.indexOf(query) !== -1) return true;
      var j = 0;
      for (var i = 0; i < text.length && j < query.length; i++) if (text.charAt(i) === query.charAt(j)) j++;
      return j === query.length;
    }

    function setActive(i) {
      active = i;
      $$('.palette__item', list).forEach(function (li, idx) { li.setAttribute('aria-selected', String(idx === i)); });
      var current = list.children[i];
      if (current && current.id) {
        input.setAttribute('aria-activedescendant', current.id);
        current.scrollIntoView({ block: 'nearest' });
      }
    }

    function render() {
      var q = input.value.trim().toLowerCase();
      items = commands.filter(function (c) { return !q || fuzzy(q, valueOf(c.label) + ' ' + c.keys + ' ' + c.group); });
      list.textContent = '';
      if (!items.length) {
        list.appendChild(el('li', 'palette__empty', 'Nothing matches. Try "theme", "email" or "sql".'));
        input.removeAttribute('aria-activedescendant');
        return;
      }
      items.forEach(function (c, i) {
        var li = el('li', 'palette__item');
        li.id = 'cmd-' + c.id;
        li.setAttribute('role', 'option');
        var icon = el('span', 'ms', valueOf(c.icon));
        icon.setAttribute('aria-hidden', 'true');
        li.appendChild(icon);
        li.appendChild(el('span', 'palette__label', valueOf(c.label)));
        li.appendChild(el('small', null, c.group));
        li.addEventListener('click', function () { runCommand(c); });
        li.addEventListener('mousemove', function () { if (active !== i) setActive(i); });
        list.appendChild(li);
      });
      setActive(Math.min(active, items.length - 1));
    }

    function open() {
      active = 0;
      input.value = '';
      render();
      palette.showModal();
      input.focus();
    }
    function close() { if (palette.open) palette.close(); }
    function runCommand(c) {
      close();
      setTimeout(c.run, 40);
    }

    input.addEventListener('input', function () { active = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) setActive((active + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) setActive((active - 1 + items.length) % items.length); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) runCommand(items[active]); }
    });
    palette.addEventListener('click', function (e) { if (e.target === palette) close(); });
    if (paletteBtn) paletteBtn.addEventListener('click', open);

    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.open) close(); else open();
      } else if (e.key === '/' && !typing && !palette.open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    });
  }

  /* A little hello for anyone who opens DevTools. */
  if (window.console && console.log) {
    console.log('%cHi there, fellow developer!', 'font: 600 14px/1.6 system-ui, sans-serif; color: #A9411C');
    console.log('%cThis site is plain HTML, CSS & JS. Try SELECT * FROM skills; in the console up top.', 'color: #76655A');
  }
})();
