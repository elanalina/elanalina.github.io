/*
 * ResumeSQL: a tiny, read-only SQL engine for the résumé console.
 *
 *   SELECT [DISTINCT] * | col [AS alias], ... | COUNT(*)
 *   FROM table
 *   [WHERE cond [AND|OR cond ...]]      -- =, <>, !=, <, >, <=, >=, [NOT] LIKE/ILIKE, [NOT] IN (...), NOT, ( )
 *   [ORDER BY col [ASC|DESC]]
 *   [LIMIT n [OFFSET m]]
 *
 * Plus psql-style meta commands: \dt, \d <table>, \x, \?, help, clear.
 * No dependencies; exposes window.ResumeSQL.
 */
(function (global) {
  'use strict';

  var KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER', 'BY', 'ASC', 'DESC',
    'LIMIT', 'OFFSET', 'LIKE', 'ILIKE', 'COUNT', 'DISTINCT', 'AS', 'IN',
  ]);
  var WRITE_COMMANDS = new Set(['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'MERGE', 'REPLACE']);
  var UNSUPPORTED = new Set(['JOIN', 'GROUP', 'HAVING', 'UNION', 'WITH', 'CASE', 'OVER']);
  var HIGHLIGHT_KEYWORDS = new Set(Array.from(KEYWORDS).concat(Array.from(WRITE_COMMANDS), Array.from(UNSUPPORTED), [
    'TABLE', 'INTO', 'VALUES', 'SET', 'ON', 'IS', 'NULL', 'TRUE', 'FALSE', 'HELP', 'CLEAR',
  ]));

  function SqlError(message, hint) {
    this.name = 'SqlError';
    this.message = message;
    this.hint = hint || '';
  }
  SqlError.prototype = Object.create(Error.prototype);
  SqlError.prototype.constructor = SqlError;

  /* ------------------------------------------------------------------ */
  /* Tokenizer                                                           */
  /* ------------------------------------------------------------------ */
  function tokenize(src) {
    var tokens = [];
    var i = 0;
    var m;
    while (i < src.length) {
      var rest = src.slice(i);
      var ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (rest.startsWith('--')) {
        var nl = src.indexOf('\n', i);
        i = nl === -1 ? src.length : nl + 1;
        continue;
      }
      if (ch === "'") {
        var j = i + 1;
        var value = '';
        for (;;) {
          if (j >= src.length) throw new SqlError('unterminated quoted string at or near "' + src.slice(i, i + 16) + '"');
          if (src[j] === "'") {
            if (src[j + 1] === "'") { value += "'"; j += 2; continue; }
            break;
          }
          value += src[j++];
        }
        tokens.push({ type: 'str', value: value, raw: src.slice(i, j + 1) });
        i = j + 1;
        continue;
      }
      if (ch === '"') {
        var end = src.indexOf('"', i + 1);
        if (end === -1) throw new SqlError('unterminated quoted identifier at or near "' + src.slice(i, i + 16) + '"');
        tokens.push({ type: 'ident', value: src.slice(i + 1, end).toLowerCase(), raw: src.slice(i, end + 1) });
        i = end + 1;
        continue;
      }
      if ((m = /^\d+(?:\.\d+)?/.exec(rest))) {
        tokens.push({ type: 'num', value: parseFloat(m[0]), raw: m[0] });
        i += m[0].length;
        continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        var upper = m[0].toUpperCase();
        tokens.push(KEYWORDS.has(upper)
          ? { type: 'kw', value: upper, raw: m[0] }
          : { type: 'ident', value: m[0].toLowerCase(), raw: m[0] });
        i += m[0].length;
        continue;
      }
      if ((m = /^(<>|!=|>=|<=|=|<|>)/.exec(rest))) {
        tokens.push({ type: 'op', value: m[0] === '!=' ? '<>' : m[0], raw: m[0] });
        i += m[0].length;
        continue;
      }
      if ('(),;*'.indexOf(ch) !== -1) {
        tokens.push({ type: 'punct', value: ch, raw: ch });
        i++;
        continue;
      }
      throw new SqlError('syntax error at or near "' + ch + '"');
    }
    return tokens;
  }

  /* ------------------------------------------------------------------ */
  /* Parser                                                              */
  /* ------------------------------------------------------------------ */
  function parse(tokens) {
    var pos = 0;
    function peek(offset) { return tokens[pos + (offset || 0)]; }
    function next() { return tokens[pos++]; }
    function isKw(kw, t) { t = t === undefined ? peek() : t; return !!t && t.type === 'kw' && t.value === kw; }
    function isPunct(p, t) { t = t === undefined ? peek() : t; return !!t && t.type === 'punct' && t.value === p; }
    function fail(t) {
      if (t && t.type === 'ident' && UNSUPPORTED.has(t.value.toUpperCase())) {
        throw new SqlError('this tiny engine does not support ' + t.value.toUpperCase() + ' (yet!)',
          'Stick to SELECT … FROM … WHERE … ORDER BY … LIMIT. Type help for examples.');
      }
      throw new SqlError('syntax error at or near "' + (t ? t.raw : 'end of input') + '"');
    }
    function expectKw(kw) { if (!isKw(kw)) fail(peek()); return next(); }
    function expectIdent() {
      var t = peek();
      if (!t || t.type !== 'ident') fail(t);
      return next().value;
    }
    function parseValue() {
      var t = next();
      if (!t || (t.type !== 'str' && t.type !== 'num')) fail(t);
      return t.value;
    }

    var first = peek();
    if (!first) throw new SqlError('empty query', "Try: SELECT * FROM skills;");
    if (first.type === 'ident' && WRITE_COMMANDS.has(first.value.toUpperCase())) {
      var cmd = first.value.toUpperCase();
      var second = peek(1);
      if (/^(DROP|CREATE|ALTER|TRUNCATE)$/.test(cmd) && second && second.type === 'ident') cmd += ' ' + second.value.toUpperCase();
      throw new SqlError('cannot execute ' + cmd + ' in a read-only transaction', 'This résumé is read-only, but SELECT works great.');
    }
    if (!isKw('SELECT')) fail(first);
    next();

    var distinct = false;
    if (isKw('DISTINCT')) { next(); distinct = true; }

    var columns = [];
    if (isPunct('*')) {
      next();
      columns.push({ kind: 'star' });
    } else {
      do {
        var item;
        if (isKw('COUNT')) {
          next();
          if (!isPunct('(')) fail(peek());
          next();
          var arg = '*';
          if (isPunct('*')) next(); else arg = expectIdent();
          if (!isPunct(')')) fail(peek());
          next();
          item = { kind: 'count', arg: arg };
        } else {
          item = { kind: 'col', name: expectIdent() };
        }
        if (isKw('AS')) { next(); item.alias = expectIdent(); }
        columns.push(item);
      } while (isPunct(',') && next());
    }

    expectKw('FROM');
    var table = expectIdent();

    var where = null;
    var orderBy = null;
    var limit = null;
    var offset = 0;

    function parseOr() {
      var left = parseAnd();
      while (isKw('OR')) { next(); left = { op: 'OR', left: left, right: parseAnd() }; }
      return left;
    }
    function parseAnd() {
      var left = parseNot();
      while (isKw('AND')) { next(); left = { op: 'AND', left: left, right: parseNot() }; }
      return left;
    }
    function parseNot() {
      if (isKw('NOT')) { next(); return { op: 'NOT', expr: parseNot() }; }
      return parsePrimary();
    }
    function parsePrimary() {
      if (isPunct('(')) {
        next();
        var inner = parseOr();
        if (!isPunct(')')) fail(peek());
        next();
        return inner;
      }
      var col = expectIdent();
      var negate = false;
      if (isKw('NOT')) { next(); negate = true; }
      var node;
      if (isKw('LIKE') || isKw('ILIKE')) {
        next();
        node = { op: 'LIKE', col: col, value: parseValue() };
      } else if (isKw('IN')) {
        next();
        if (!isPunct('(')) fail(peek());
        next();
        var values = [];
        do { values.push(parseValue()); } while (isPunct(',') && next());
        if (!isPunct(')')) fail(peek());
        next();
        node = { op: 'IN', col: col, values: values };
      } else {
        if (negate) fail(peek());
        var t = next();
        if (!t || t.type !== 'op') fail(t);
        node = { op: t.value, col: col, value: parseValue() };
      }
      return negate ? { op: 'NOT', expr: node } : node;
    }

    if (isKw('WHERE')) { next(); where = parseOr(); }
    if (isKw('ORDER')) {
      next();
      expectKw('BY');
      var orderCol = expectIdent();
      var dir = 'ASC';
      if (isKw('ASC') || isKw('DESC')) dir = next().value;
      orderBy = { col: orderCol, dir: dir };
    }
    if (isKw('LIMIT')) {
      next();
      var lt = next();
      if (!lt || lt.type !== 'num') fail(lt);
      limit = Math.floor(lt.value);
    }
    if (isKw('OFFSET')) {
      next();
      var ot = next();
      if (!ot || ot.type !== 'num') fail(ot);
      offset = Math.floor(ot.value);
    }
    if (isPunct(';')) next();
    if (pos < tokens.length) fail(peek());

    return { distinct: distinct, columns: columns, table: table, where: where, orderBy: orderBy, limit: limit, offset: offset };
  }

  /* ------------------------------------------------------------------ */
  /* Execution                                                           */
  /* ------------------------------------------------------------------ */
  function toNumber(v) {
    if (typeof v === 'number') return v;
    var m = /^\s*(\d+(?:\.\d+)?)\s*([kKmMbB])?/.exec(String(v));
    if (!m) return NaN;
    var mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
    return parseFloat(m[1]) * mult;
  }

  /* "70%", "100M+", "15" sort as numbers; dates like "2025-05" sort as text. */
  var NUMERIC_LIKE = /^\s*\d+(?:\.\d+)?\s*[kKmMbB]?\s*[%+]*\s*$/;
  function compareValues(a, b) {
    var aNum = typeof a === 'number' || NUMERIC_LIKE.test(String(a));
    var bNum = typeof b === 'number' || NUMERIC_LIKE.test(String(b));
    if (aNum && bNum) return toNumber(a) - toNumber(b);
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  function likeToRegExp(pattern) {
    var escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + escaped.replace(/%/g, '[\\s\\S]*').replace(/_/g, '[\\s\\S]') + '$', 'i');
  }

  function matchesEquals(cell, value) {
    if (typeof value === 'number') return toNumber(cell) === value;
    return String(cell).toLowerCase() === String(value).toLowerCase();
  }

  function evaluate(node, row, indexOf) {
    switch (node.op) {
      case 'AND': return evaluate(node.left, row, indexOf) && evaluate(node.right, row, indexOf);
      case 'OR': return evaluate(node.left, row, indexOf) || evaluate(node.right, row, indexOf);
      case 'NOT': return !evaluate(node.expr, row, indexOf);
      case 'LIKE': return likeToRegExp(node.value).test(String(row[indexOf(node.col)]));
      case 'IN': {
        var cellIn = row[indexOf(node.col)];
        return node.values.some(function (v) { return matchesEquals(cellIn, v); });
      }
      default: {
        var cell = row[indexOf(node.col)];
        var v = node.value;
        if (node.op === '=') return matchesEquals(cell, v);
        if (node.op === '<>') return !matchesEquals(cell, v);
        var cmp;
        if (typeof v === 'number') {
          var n = toNumber(cell);
          if (isNaN(n)) return false;
          cmp = n - v;
        } else {
          cmp = String(cell).localeCompare(String(v), undefined, { numeric: true, sensitivity: 'base' });
        }
        if (node.op === '<') return cmp < 0;
        if (node.op === '>') return cmp > 0;
        if (node.op === '<=') return cmp <= 0;
        if (node.op === '>=') return cmp >= 0;
        return false;
      }
    }
  }

  function collectColumns(node, out) {
    if (!node) return out;
    if (node.col) out.push(node.col);
    if (node.left) collectColumns(node.left, out);
    if (node.right) collectColumns(node.right, out);
    if (node.expr) collectColumns(node.expr, out);
    return out;
  }

  function levenshtein(a, b) {
    var dp = [];
    for (var i = 0; i <= a.length; i++) {
      dp[i] = [i];
      for (var j = 1; j <= b.length; j++) {
        dp[i][j] = i === 0 ? j : Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }

  function closest(name, candidates) {
    var best = null;
    var bestScore = Infinity;
    candidates.forEach(function (c) {
      var d = levenshtein(name, c);
      if (c.indexOf(name) === 0 || name.indexOf(c) === 0) d = Math.min(d, 1);
      if (d < bestScore) { bestScore = d; best = c; }
    });
    return bestScore <= Math.max(2, Math.floor(name.length / 3)) ? best : null;
  }

  function resolveTable(db, aliases, name) {
    if (Object.prototype.hasOwnProperty.call(db, name)) return { name: name, table: db[name] };
    if (aliases && Object.prototype.hasOwnProperty.call(aliases, name)) {
      var target = aliases[name];
      return { name: target, table: db[target] };
    }
    var guess = closest(name, Object.keys(db));
    throw new SqlError('relation "' + name + '" does not exist',
      guess ? 'Perhaps you meant "' + guess + '"? Run \\dt to list tables.' : 'Run \\dt to list the tables in this résumé.');
  }

  function execute(ast, db, aliases) {
    var resolved = resolveTable(db, aliases, ast.table);
    var tableName = resolved.name;
    var table = resolved.table;
    var cols = table.columns;

    function indexOf(name) {
      var idx = cols.indexOf(name);
      if (idx === -1) {
        var guess = closest(name, cols);
        throw new SqlError('column "' + name + '" does not exist',
          (guess ? 'Perhaps you meant "' + guess + '"? ' : '') + 'Columns in ' + tableName + ': ' + cols.join(', ') + '.');
      }
      return idx;
    }

    collectColumns(ast.where, []).forEach(indexOf);

    var rows = table.rows.slice();
    if (ast.where) rows = rows.filter(function (r) { return evaluate(ast.where, r, indexOf); });

    var counts = ast.columns.filter(function (c) { return c.kind === 'count'; });
    if (counts.length) {
      var plain = ast.columns.filter(function (c) { return c.kind === 'col'; })[0];
      if (plain) {
        throw new SqlError('column "' + tableName + '.' + plain.name + '" must appear in the GROUP BY clause or be used in an aggregate function',
          'This tiny engine supports COUNT(*) on its own, e.g. SELECT COUNT(*) FROM skills;');
      }
      counts.forEach(function (c) { if (c.arg !== '*') indexOf(c.arg); });
      return {
        columns: ast.columns.map(function (c) { return c.alias || 'count'; }),
        rows: [ast.columns.map(function () { return rows.length; })],
      };
    }

    if (ast.orderBy) {
      var orderIdx = cols.indexOf(ast.orderBy.col);
      if (orderIdx === -1) {
        var aliased = ast.columns.filter(function (c) { return c.alias === ast.orderBy.col; })[0];
        orderIdx = aliased ? indexOf(aliased.name) : indexOf(ast.orderBy.col);
      }
      var sign = ast.orderBy.dir === 'DESC' ? -1 : 1;
      rows.sort(function (a, b) { return compareValues(a[orderIdx], b[orderIdx]) * sign; });
    }

    var picks;
    var outCols;
    if (ast.columns[0].kind === 'star') {
      picks = cols.map(function (_, i) { return i; });
      outCols = cols.slice();
    } else {
      picks = ast.columns.map(function (c) { return indexOf(c.name); });
      outCols = ast.columns.map(function (c) { return c.alias || c.name; });
    }

    var out = rows.map(function (r) { return picks.map(function (i) { return r[i]; }); });
    if (ast.distinct) {
      var seen = new Set();
      out = out.filter(function (r) {
        var key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (ast.offset) out = out.slice(ast.offset);
    if (ast.limit !== null && ast.limit !== undefined) out = out.slice(0, ast.limit);
    return { columns: outCols, rows: out };
  }

  /* ------------------------------------------------------------------ */
  /* Meta commands (psql style)                                          */
  /* ------------------------------------------------------------------ */
  function columnType(table, idx) {
    var values = table.rows.map(function (r) { return r[idx]; });
    if (values.length && values.every(function (v) { return typeof v === 'number'; })) return 'numeric';
    if (values.length && values.every(function (v) { return /^(\d{4}-\d{2}|present)$/.test(String(v)); })) return 'text (yyyy-mm)';
    return 'text';
  }

  function meta(text, db, aliases, state) {
    var parts = text.trim().split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = (parts[1] || '').replace(/;$/, '').toLowerCase();

    if (cmd === '\\dt' || (cmd === '\\d' && !arg)) {
      return {
        kind: 'result',
        title: 'List of relations',
        columns: ['name', 'rows', 'description'],
        rows: Object.keys(db).map(function (name) { return [name, db[name].rows.length, db[name].description || '']; }),
      };
    }
    if (cmd === '\\d') {
      var resolved = resolveTable(db, aliases, arg);
      return {
        kind: 'result',
        title: 'Table "public.' + resolved.name + '"',
        columns: ['column', 'type'],
        rows: resolved.table.columns.map(function (c, i) { return [c, columnType(resolved.table, i)]; }),
      };
    }
    if (cmd === '\\x') {
      var nextMode = arg === 'auto' || arg === 'on' || arg === 'off' ? arg : (state.expanded === 'on' ? 'off' : 'on');
      return { kind: 'expanded', value: nextMode };
    }
    if (cmd === '\\?' || cmd === '\\h' || cmd === '\\help') return { kind: 'help' };
    if (cmd === '\\q') return { kind: 'notice', text: 'There is no quitting this résumé. Try \\dt instead.' };
    if (cmd === '\\c' || cmd === '\\connect') return { kind: 'notice', text: 'You are already connected to the only database that matters: resume.db.' };
    throw new SqlError('invalid command ' + parts[0], 'Try \\? for help.');
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */
  function run(input, db, options) {
    options = options || {};
    var aliases = options.aliases || {};
    var text = String(input || '').trim();
    if (!text) return { kind: 'empty' };
    if (text.charAt(0) === '\\') return meta(text, db, aliases, options);
    if (/^(help|\?)\s*;?$/i.test(text)) return { kind: 'help' };
    if (/^(clear|cls)\s*;?$/i.test(text)) return { kind: 'clear' };
    if (/^(exit|quit)\s*;?$/i.test(text)) return { kind: 'notice', text: 'There is no quitting this résumé. Try \\dt instead.' };

    var started = (global.performance || Date).now();
    var ast = parse(tokenize(text));
    var result = execute(ast, db, aliases);
    result.kind = 'result';
    result.ms = (global.performance || Date).now() - started;
    return result;
  }

  /* Forgiving syntax highlighter for display (never throws). */
  var HL_RE = /(--[^\n]*)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|(\\[A-Za-z?]+)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([\s\S])/g;
  function highlight(text) {
    var out = [];
    var m;
    HL_RE.lastIndex = 0;
    while ((m = HL_RE.exec(text))) {
      if (m[1]) out.push({ cls: 'tok-com', text: m[1] });
      else if (m[2]) out.push({ cls: 'tok-str', text: m[2] });
      else if (m[3]) out.push({ cls: 'tok-num', text: m[3] });
      else if (m[4]) out.push({ cls: 'tok-meta', text: m[4] });
      else if (m[5]) out.push({ cls: HIGHLIGHT_KEYWORDS.has(m[5].toUpperCase()) ? 'tok-kw' : '', text: m[5] });
      else if (m[6]) out.push({ cls: '', text: m[6] });
      else out.push({ cls: /[(),;*=<>!]/.test(m[7]) ? 'tok-punct' : '', text: m[7] });
    }
    return out;
  }

  global.ResumeSQL = {
    run: run,
    tokenize: tokenize,
    parse: parse,
    execute: execute,
    highlight: highlight,
    SqlError: SqlError,
  };
})(window);
