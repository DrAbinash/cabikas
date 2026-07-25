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
        "mailto:mailmebikas@gmail.com" +
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
