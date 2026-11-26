/*
 * Case-study page interactions: before/after slider, chatbot demo,
 * prompt-template cycler, QA screens grid and pivot-table linking.
 * Vanilla JS, no dependencies. Everything degrades to a static view.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Run cb once, the first time el scrolls into view. */
  function onVisible(el, cb, threshold) {
    if (!hasIO) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); cb(); }
    }, { threshold: threshold || 0.3 });
    io.observe(el);
  }

  /* Call start()/stop() as el enters and leaves the viewport. */
  function whileVisible(el, start, stop) {
    if (!hasIO) { start(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.25 }).observe(el);
  }

  /* ---------- Before / after slider ---------- */
  $$('.ba').forEach(function (ba) {
    var range = $('.ba__range', ba);
    if (!range) return;
    var touched = false;
    function set(v) {
      ba.style.setProperty('--pos', v + '%');
      range.setAttribute('aria-valuetext', Math.round(100 - v) + '% of the after view showing');
    }
    ['pointerdown', 'keydown', 'input'].forEach(function (type) {
      range.addEventListener(type, function () { touched = true; });
    });
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);

    // A one-time sweep hints that the divider can be dragged.
    if (!reduce) {
      onVisible(ba, function () {
        var keys = [50, 74, 28, 50];
        var start = null;
        var duration = 2600;
        function frame(now) {
          if (touched) return;
          if (start === null) start = now;
          var t = Math.min(1, (now - start) / duration);
          var seg = Math.min(keys.length - 2, Math.floor(t * (keys.length - 1)));
          var local = t * (keys.length - 1) - seg;
          var eased = local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2;
          var v = keys[seg] + (keys[seg + 1] - keys[seg]) * eased;
          range.value = String(Math.round(v));
          set(v);
          if (t < 1) requestAnimationFrame(frame);
        }
        setTimeout(function () { requestAnimationFrame(frame); }, 500);
      }, 0.5);
    }
  });

  /* ---------- Chatbot demo ---------- */
  $$('[data-chat]').forEach(function (chat) {
    var msgs = $$('.msg', chat);
    var typing = $('.typing', chat);
    if (reduce || !typing) {
      msgs.forEach(function (m) { m.classList.add('is-shown'); });
      return;
    }
    onVisible(chat, function () {
      var i = 0;
      (function next() {
        if (i >= msgs.length) return;
        var m = msgs[i];
        if (m.classList.contains('msg--bot')) {
          m.parentNode.insertBefore(typing, m);
          typing.classList.add('is-on');
          setTimeout(function () {
            typing.classList.remove('is-on');
            m.classList.add('is-shown');
            i++;
            setTimeout(next, 900);
          }, 1200);
        } else {
          m.classList.add('is-shown');
          i++;
          setTimeout(next, 650);
        }
      })();
    }, 0.45);
  });

  /* ---------- One prompt template, many charts ---------- */
  $$('[data-template]').forEach(function (tpl) {
    var minis = $$('.mini', tpl);
    var paths = $$('.tpl__fan path', tpl);
    var slots = $$('[data-slot]', tpl);
    var out = $('[data-out]', tpl);
    var idx = 0;
    var timer = null;
    var userPicked = false;

    function select(i, flash) {
      idx = i;
      minis.forEach(function (m, k) {
        m.classList.toggle('is-active', k === i);
        m.setAttribute('aria-pressed', String(k === i));
      });
      paths.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
      var data = minis[i].dataset;
      slots.forEach(function (s) {
        var v = data[s.getAttribute('data-slot')];
        if (!v || s.textContent === v) return;
        s.textContent = v;
        if (flash) {
          s.classList.remove('is-flash');
          void s.offsetWidth;
          s.classList.add('is-flash');
        }
      });
      if (out && data.insight) out.textContent = data.insight;
    }
    function start() {
      if (reduce || timer || userPicked) return;
      timer = setInterval(function () { select((idx + 1) % minis.length, true); }, 3200);
    }
    function stop() { clearInterval(timer); timer = null; }

    minis.forEach(function (m, k) {
      m.addEventListener('click', function () { userPicked = true; stop(); select(k, true); });
    });
    select(0, false);
    whileVisible(tpl, start, stop);
  });

  /* ---------- QA: screens flip from defect to verified ---------- */
  $$('[data-screens]').forEach(function (grid) {
    var tiles = $$('.screen', grid);
    var counter = $('[data-screens-count]');
    if (reduce) {
      tiles.forEach(function (t) { t.classList.add('is-fixed'); });
      if (counter) counter.textContent = String(tiles.length);
      return;
    }
    if (counter) counter.textContent = '0';
    onVisible(grid, function () {
      tiles.forEach(function (t, i) {
        setTimeout(function () {
          t.classList.add('is-fixed');
          if (counter) counter.textContent = String(i + 1);
        }, 300 + i * 150);
      });
    }, 0.35);
  });

  /* ---------- Pivot / unpivot: link matching cells ---------- */
  $$('.reshape').forEach(function (box) {
    var cells = $$('[data-k]', box);
    var keys = [];
    cells.forEach(function (c) { var k = c.getAttribute('data-k'); if (keys.indexOf(k) === -1) keys.push(k); });
    var demo = null;
    var demoIndex = 0;
    var userHovered = false;

    function link(k, on) {
      cells.forEach(function (c) { if (c.getAttribute('data-k') === k) c.classList.toggle('is-linked', on); });
    }
    function clear() { cells.forEach(function (c) { c.classList.remove('is-linked'); }); }
    function stopDemo() { clearInterval(demo); demo = null; clear(); }

    cells.forEach(function (c) {
      c.addEventListener('mouseenter', function () { userHovered = true; stopDemo(); link(c.getAttribute('data-k'), true); });
      c.addEventListener('mouseleave', function () { link(c.getAttribute('data-k'), false); });
    });

    // On screens without hover, play a short walkthrough of the mapping.
    if (!reduce && keys.length) {
      whileVisible(box, function () {
        if (demo || userHovered) return;
        demo = setInterval(function () {
          clear();
          link(keys[demoIndex % keys.length], true);
          demoIndex++;
        }, 1300);
      }, function () { clearInterval(demo); demo = null; if (!userHovered) clear(); });
      box.addEventListener('mouseenter', function () { userHovered = true; stopDemo(); }, { once: true });
    }
  });
})();
