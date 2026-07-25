/* CA Bikas Kumar — site interactions (no dependencies) */
(function () {
  "use strict";

  /* ----- Mobile navigation ----- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ----- Header shadow + back-to-top visibility ----- */
  var header = document.querySelector(".header");
  var totop = document.getElementById("totop");

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (totop) totop.classList.toggle("is-visible", y > 600);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----- Reveal on scroll ----- */
  var revealed = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ----- Active section highlighting in nav ----- */
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll('.nav > a[href^="#"]:not(.btn)');

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    var activeIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute("id");
            navLinks.forEach(function (link) {
              link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
            });
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(function (s) { activeIo.observe(s); });
  }

  /* ----- Live site settings (managed from /admin) -----
     The page works fully with the values baked into the HTML; when the
     settings API is available (Docker deployment), details edited in the
     admin panel are applied on top. Failures are silently ignored so the
     same files also work on purely static hosting. */
  var contactEmail = "mailmebikas@gmail.com";

  function setAll(name, fn) {
    document.querySelectorAll('[data-set~="' + name + '"]').forEach(fn);
  }

  function digitsOf(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length === 10) d = "91" + d;
    return d;
  }

  function applySettings(s) {
    if (!s || typeof s !== "object") return;

    if (s.phone) {
      setAll("phone-text", function (el) { el.textContent = s.phone; });
      setAll("phone-link", function (el) { el.href = "tel:+" + digitsOf(s.phone); });
    }
    if (s.whatsapp) {
      setAll("wa-text", function (el) { el.textContent = "WhatsApp: " + s.whatsapp; });
      setAll("wa-link", function (el) { el.href = "https://wa.me/" + digitsOf(s.whatsapp); });
    }
    if (s.email) {
      contactEmail = s.email;
      setAll("email-text", function (el) { el.textContent = s.email; });
      setAll("email-link", function (el) { el.href = "mailto:" + s.email; });
    }
    if (Array.isArray(s.addressLines) && s.addressLines.length) {
      setAll("address", function (el) {
        el.textContent = "";
        s.addressLines.forEach(function (line, i) {
          if (i > 0) el.appendChild(document.createElement("br"));
          el.appendChild(document.createTextNode(line));
        });
      });
    }
    if (s.membershipNo) {
      setAll("membership", function (el) {
        el.textContent = "ICAI Membership No. " + s.membershipNo;
        el.hidden = false;
      });
    }
    if (s.officeHours) {
      setAll("officeHours-text", function (el) { el.textContent = s.officeHours; });
      document.querySelectorAll('[data-wrap="officeHours"]').forEach(function (el) {
        el.hidden = false;
      });
    }
    if (s.notice) {
      var bar = document.getElementById("notice-bar");
      setAll("notice-text", function (el) { el.textContent = s.notice; });
      if (bar) bar.hidden = false;
    }
    if (s.photoUrl) {
      var media = document.getElementById("profile-media");
      if (media) {
        var img = document.createElement("img");
        img.src = s.photoUrl;
        img.alt = "CA Bikas Kumar";
        media.textContent = "";
        media.appendChild(img);
        media.classList.add("has-photo");
      }
    }
  }

  if (window.fetch) {
    fetch("/api/settings", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(applySettings)
      .catch(function () { /* static hosting — keep baked-in defaults */ });
  }

  /* ----- Enquiry form: compose a mailto message ----- */
  var form = document.getElementById("enquiry-form");
  var status = document.getElementById("form-status");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (form.elements.name.value || "").trim();
      var phone = (form.elements.phone.value || "").trim();
      var subject = form.elements.subject.value;
      var message = (form.elements.message.value || "").trim();

      if (!name || !message) {
        if (status) status.textContent = "Please fill in your name and message.";
        return;
      }

      var body =
        "Dear CA Bikas Kumar,\n\n" +
        message +
        "\n\nRegards,\n" +
        name +
        (phone ? "\nPhone: " + phone : "");

      var href =
        "mailto:" + contactEmail +
        "?subject=" + encodeURIComponent("Enquiry — " + subject + " (" + name + ")") +
        "&body=" + encodeURIComponent(body);

      window.location.href = href;
      if (status) status.textContent = "Your email application should now open with the message ready to send.";
    });
  }

  /* ----- Current year in footer ----- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
