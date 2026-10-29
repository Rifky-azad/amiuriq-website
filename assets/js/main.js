/* Amiuriq — site interactions */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.remove('no-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  // page zoom applied on large screens (see main.css); pixel maths must divide by it
  var zoom = function () { return parseFloat(getComputedStyle(doc).zoom) || 1; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Nav: scrolled state, hide on scroll down ---------- */
  var nav = $('.nav');
  var progress = $('.scroll-progress');
  var toTop = $('.to-top');
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('scrolled', y > 20);
      nav.classList.toggle('hidden', y > lastY && y > 500 && !doc.classList.contains('menu-open'));
    }
    if (progress) {
      var max = document.body.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
    if (toTop) toTop.classList.toggle('show', y > 800);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-toggle');
  if (menuBtn) {
    var setMenu = function (open) {
      doc.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
    $$('.mobile-menu a').forEach(function (a, i) {
      a.style.transitionDelay = (0.12 + i * 0.035) + 's';
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Split headline words ---------- */
  $$('[data-split]').forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('word-rotator')) {
          walk(child);
        } else if (child.nodeType === 1) {
          // keep rotator intact but give it a stagger slot
          var wrap = document.createElement('span');
          wrap.className = 'w';
          var inner2 = document.createElement('span');
          inner2.style.setProperty('--i', i++);
          child.parentNode.replaceChild(wrap, child);
          inner2.appendChild(child);
          wrap.appendChild(inner2);
        }
      });
    };
    walk(el);
    el.classList.add('split-words');
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.reveal, .split-words, .process');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in', 'in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in', 'in-view'); });
  }
  // stagger children marked with data-stagger
  $$('[data-stagger]').forEach(function (group) {
    var step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
    Array.prototype.slice.call(group.children).forEach(function (c, i) {
      if (c.classList.contains('reveal')) c.style.setProperty('--d', (i * step) + 's');
    });
  });

  /* ---------- Counters ---------- */
  var counters = $$('[data-count]');
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var dur = 1800, start = null;
      var fmt = function (v) { return Math.round(v).toLocaleString(); };
      if (reduceMotion) { el.textContent = fmt(target); return; }
      var tick = function (t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Word rotator ---------- */
  $$('.word-rotator').forEach(function (rot) {
    var words = $$('span', rot);
    if (words.length < 2) return;
    var idx = 0;
    words[0].classList.add('in');
    if (reduceMotion) return;
    setInterval(function () {
      var cur = words[idx];
      idx = (idx + 1) % words.length;
      var nxt = words[idx];
      cur.classList.remove('in');
      cur.classList.add('out');
      nxt.classList.remove('out');
      nxt.classList.add('in');
      setTimeout(function () { cur.classList.remove('out'); }, 800);
    }, 2600);
  });

  /* ---------- Typing code card ---------- */
  var typed = $('[data-typed]');
  if (typed) {
    var full = typed.innerHTML;
    if (!reduceMotion) {
      // tokenise into tags and characters so syntax colours survive typing
      var parts = full.match(/<[^>]+>|&[a-z#0-9]+;|[\s\S]/g) || [];
      typed.innerHTML = '';
      var k = 0, out = '';
      var type = function () {
        var chunk = 0;
        while (k < parts.length && chunk < 3) {
          out += parts[k];
          if (parts[k].charAt(0) !== '<') chunk++;
          k++;
        }
        typed.innerHTML = out + '<span class="caret"></span>';
        if (k < parts.length) setTimeout(type, 18);
      };
      setTimeout(type, 700);
    }
  }

  /* ---------- Pointer effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    // spotlight follow
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.spotlight');
      if (!card) return;
      var r = card.getBoundingClientRect();
      var z = zoom();
      card.style.setProperty('--x', (e.clientX - r.left) / z + 'px');
      card.style.setProperty('--y', (e.clientY - r.top) / z + 'px');
    });

    // magnetic buttons
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var z = zoom();
        btn.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.25 / z) + 'px');
        btn.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.35 / z) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });

    // 3D tilt
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // hero parallax
    var hv = $('.hero-visual');
    if (hv) {
      var layers = $$('[data-depth]', hv);
      window.addEventListener('pointermove', function (e) {
        var cx = e.clientX / window.innerWidth - 0.5;
        var cy = e.clientY / window.innerHeight - 0.5;
        layers.forEach(function (l) {
          var d = parseFloat(l.getAttribute('data-depth'));
          l.style.translate = (cx * d * 40) + 'px ' + (cy * d * 40) + 'px';
        });
      });
    }

  }

  /* ---------- Welcome fox: follows the pointer, talks and asks questions ---------- */
  // own scope: other widgets below also use names like go/timer
  (function () {
  var stage = $('.fox-stage');
  if (stage) {
    var fox = $('.fox', stage);
    var head = $('#fx-head', fox), face = $('#fx-face', fox), body = $('#fx-body', fox);
    var pupils = $$('.fx-pupil', fox);
    var textEl = $('.fx-text', stage), optsEl = $('.fx-options', stage);
    var contact = '#contact';

    // conversation tree: each node is what Foxy says, plus the answers offered
    var talk = {
      hello: { say: 'Hey there! 👋 I’m Foxy from Amiuriq.', next: 'ask', mood: 'wave' },
      ask: { say: 'What are you looking to build today?', ask: true, opts: [
        ['🌐 A website', 'web'], ['📱 A mobile app', 'mobile'], ['🤖 An AI solution', 'ai'], ['👀 Just browsing', 'browse']] },
      web: { say: 'Awesome! We build fast, beautiful websites that turn visitors into customers.', mood: 'happy', opts: [
        ['Show me how →', 'web-development.html', 1], ['Talk to the team', contact], ['Ask me again', 'ask']] },
      mobile: { say: 'Apps are my favourite! iPhone and Android — we’ve got you covered.', mood: 'happy', opts: [
        ['Explore mobile apps →', 'mobile-app-development.html', 1], ['Get a free quote', contact], ['Ask me again', 'ask']] },
      ai: { say: 'Ooh, clever choice! Let’s make your business smarter with AI.', mood: 'happy', opts: [
        ['Explore AI & ML →', 'ai-machine-learning.html', 1], ['Get a free quote', contact], ['Ask me again', 'ask']] },
      browse: { say: 'No problem! Have a look at our work — I’ll be right here. 🦊', mood: 'wave', opts: [
        ['See our work →', '#work', 1], ['Meet the team', '#team'], ['Ask me again', 'ask']] },
      tickle: { say: 'Hehe, that tickles! 😄', next: 'ask', mood: 'happy' }
    };

    var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = 0, visible = true, timer = null;

    var aim = function (x, y) {
      var r = fox.getBoundingClientRect();
      var dx = x - (r.left + r.width * 0.5);
      var dy = y - (r.top + r.height * 0.42);
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var k = Math.min(1, dist / (r.width * 1.1));
      tx = dx / dist * k;
      ty = dy / dist * k;
      lastMove = Date.now();
    };
    window.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchstart', function (e) { var t = e.touches[0]; aim(t.clientX, t.clientY); }, { passive: true });

    var flash = function (cls, ms) {
      fox.classList.remove(cls);
      void fox.getBoundingClientRect();
      fox.classList.add(cls);
      setTimeout(function () { fox.classList.remove(cls); }, ms);
    };

    // idle life: glance around, twitch an ear now and then
    setInterval(function () {
      if (!visible) return;
      if (Date.now() - lastMove > 3500) {
        tx = (Math.random() * 2 - 1) * 0.8;
        ty = (Math.random() * 2 - 1) * 0.4;
      }
      if (!reduceMotion && Math.random() < 0.45) flash(Math.random() < 0.5 ? 'twitch-l' : 'twitch-r', 520);
    }, 2300);

    var frame = function () {
      if (visible) {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        head.style.transform = 'translate(' + (cx * 10) + 'px,' + (cy * 6) + 'px) rotate(' + (cx * 8 + (fox.classList.contains('asking') ? -6 : 0)) + 'deg)';
        face.style.transform = 'translate(' + (cx * 7) + 'px,' + (cy * 5) + 'px)';
        pupils.forEach(function (p) { p.style.transform = 'translate(' + (cx * 6) + 'px,' + (cy * 6) + 'px)'; });
        body.style.translate = (cx * 3) + 'px 0';
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);
    }

    var showOptions = function (opts) {
      optsEl.innerHTML = '';
      (opts || []).forEach(function (o, i) {
        var target = o[1];
        var isLink = /\.html|^#/.test(target);
        var el = document.createElement(isLink ? 'a' : 'button');
        el.className = 'fx-opt' + (o[2] ? ' primary' : '');
        el.style.setProperty('--i', i);
        el.textContent = o[0];
        if (isLink) el.href = target;
        else { el.type = 'button'; el.addEventListener('click', function () { go(target); }); }
        optsEl.appendChild(el);
      });
    };

    var go = function (key) {
      var node = talk[key];
      clearTimeout(timer);
      optsEl.innerHTML = '';
      fox.classList.toggle('asking', !!node.ask);
      if (node.mood === 'wave' && !reduceMotion) flash('waving', 2250);
      if (node.mood === 'happy' && !reduceMotion) { flash('hop', 720); flash('happy', 1100); }
      var done = function () {
        fox.classList.remove('talking');
        showOptions(node.opts);
        if (node.next) timer = setTimeout(function () { go(node.next); }, 1300);
      };
      if (reduceMotion) { textEl.textContent = node.say; done(); return; }
      var i = 0;
      fox.classList.add('talking');
      var caret = '<span class="caret" aria-hidden="true"></span>';
      var step = function () {
        i++;
        textEl.innerHTML = '';
        textEl.appendChild(document.createTextNode(node.say.slice(0, i)));
        textEl.insertAdjacentHTML('beforeend', caret);
        if (i < node.say.length) timer = setTimeout(step, 30);
        else timer = setTimeout(done, 200);
      };
      step();
    };

    setTimeout(function () { go('hello'); }, 800);
    fox.addEventListener('click', function () { go('tickle'); });
  }
  })();

  /* ---------- Background videos: play only while visible ---------- */
  var vids = $$('video[data-autoplay]');
  if (vids.length) {
    if (reduceMotion || saveData) {
      vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
    } else if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) {
            if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.05 });
      vids.forEach(function (v) { v.muted = true; vio.observe(v); });
    }
  }

  /* ---------- Video modal ---------- */
  var modal = $('#videoModal');
  if (modal) {
    var mv = $('video', modal);
    var lastFocus = null;
    var openModal = function (src) {
      lastFocus = document.activeElement;
      if (src && mv.getAttribute('src') !== src) mv.setAttribute('src', src);
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      var p = mv.play(); if (p && p.catch) p.catch(function () {});
      $('.close', modal).focus();
    };
    var closeModal = function () {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      mv.pause();
      if (lastFocus) lastFocus.focus();
    };
    $$('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () { openModal(b.getAttribute('data-video')); });
    });
    $('.close', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  }

  /* ---------- Portfolio filter + load more ---------- */
  var workGrid = $('.work-grid');
  if (workGrid) {
    var works = $$('.work', workGrid);
    var moreBtn = $('#loadMore');
    var pageSize = 6, shown = pageSize, current = 'all';
    var render = function () {
      var matching = works.filter(function (w) { return current === 'all' || w.getAttribute('data-cat') === current; });
      works.forEach(function (w) { w.classList.add('hide'); });
      matching.forEach(function (w, i) {
        if (i < shown) {
          w.classList.remove('hide');
          w.classList.add('in');
        }
      });
      if (moreBtn) moreBtn.parentElement.style.display = matching.length > shown ? '' : 'none';
    };
    $$('.filter').forEach(function (f) {
      f.addEventListener('click', function () {
        $$('.filter').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
        f.classList.add('active');
        f.setAttribute('aria-pressed', 'true');
        current = f.getAttribute('data-filter');
        shown = pageSize;
        render();
      });
    });
    if (moreBtn) moreBtn.addEventListener('click', function () { shown += pageSize; render(); });
    render();
  }

  /* ---------- Testimonials slider ---------- */
  var track = $('.testi-track');
  if (track) {
    var slides = $$('.testi', track);
    var dotsWrap = $('.dots');
    var prev = $('#testiPrev'), next = $('#testiNext');
    var pos = 0, timer = null;
    var perView = function () { var vw = window.innerWidth / zoom(); return vw <= 640 ? 1 : vw <= 960 ? 2 : 3; };
    var pages = function () { return Math.max(1, slides.length - perView() + 1); };
    var buildDots = function () {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < pages(); i++) {
        var d = document.createElement('button');
        d.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
        (function (n) { d.addEventListener('click', function () { go(n); restart(); }); })(i);
        dotsWrap.appendChild(d);
      }
    };
    var go = function (n) {
      var total = pages();
      pos = (n + total) % total;
      var gap = 24;
      var w = slides[0].getBoundingClientRect().width / zoom() + gap;
      track.style.transform = 'translateX(' + (-pos * w) + 'px)';
      $$('button', dotsWrap).forEach(function (d, i) { d.classList.toggle('active', i === pos); });
    };
    var restart = function () {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(pos + 1); }, 5500);
    };
    if (prev) prev.addEventListener('click', function () { go(pos - 1); restart(); });
    if (next) next.addEventListener('click', function () { go(pos + 1); restart(); });
    track.parentElement.addEventListener('pointerenter', function () { clearInterval(timer); });
    track.parentElement.addEventListener('pointerleave', restart);
    // swipe
    var sx = null;
    track.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { go(pos + (dx < 0 ? 1 : -1)); restart(); }
      sx = null;
    });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildDots(); go(Math.min(pos, pages() - 1)); }, 150); });
    buildDots(); go(0); restart();
  }

  /* ---------- Contact form (Web3Forms) ---------- */
  var form = $('#contactForm');
  if (form) {
    var btn = $('button[type="submit"]', form);
    var status = $('.form-status', form);
    var label = btn.innerHTML;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
      status.className = 'form-status';
      status.textContent = '';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function () {
          form.reset();
          btn.innerHTML = '<i class="fas fa-check"></i> Message sent';
          status.className = 'form-status ok';
          status.textContent = 'Thanks! We’ll get back to you within 24 hours.';
        })
        .catch(function () {
          btn.innerHTML = label;
          status.className = 'form-status err';
          status.textContent = 'Something went wrong. Please try again or email info@amiuriq.org.';
        })
        .then(function () {
          setTimeout(function () { btn.disabled = false; btn.innerHTML = label; }, 3500);
        });
    });
  }

  /* ---------- Legal TOC active section ---------- */
  var tocLinks = $$('.legal-toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    $$('.legal-section[id]').forEach(function (s) { tio.observe(s); });
  }

  /* ---------- Active nav link for in-page sections ---------- */
  var sectionLinks = $$('.nav-links a[href^="#"]');
  if (sectionLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        sectionLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) sio.observe(s); });
    var heroEl = $('.hero');
    if (heroEl) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) sectionLinks.forEach(function (a) { a.classList.remove('active'); });
      }, { rootMargin: '-45% 0px -50% 0px' }).observe(heroEl);
    }
  }

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
