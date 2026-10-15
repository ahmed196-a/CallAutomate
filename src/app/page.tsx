"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import VoiceOrbScreen from "@/components/VoiceOrbScreen";

const LOGO_SRC = "/logo.png";

export default function Home() {
  const [isVoiceOrbOpen, setIsVoiceOrbOpen] = useState(false);

  useEffect(() => {
    // Ensure window.THREE is available
    if (typeof window !== "undefined") {
      (window as any).THREE = THREE;
      (window as any).__openVoiceOrb = () => setIsVoiceOrbOpen(true);
    }

    // Set images to our logo
    const brandImg = document.querySelector(".brand img") as HTMLImageElement;
    const baseSrc = brandImg?.src || LOGO_SRC;

    const cr = document.getElementById("cr") as HTMLImageElement;
    if (cr) cr.src = baseSrc;

    const ia = document.getElementById("ia") as HTMLImageElement;
    if (ia) ia.src = baseSrc;

    const fl = document.querySelector(".fl") as HTMLImageElement;
    if (fl) fl.src = baseSrc;

    document.querySelectorAll(".pa").forEach((img) => {
      (img as HTMLImageElement).src = baseSrc;
    });

    // Module 1: Order console demo (Phone / WhatsApp / Web)
    const D: Record<
      string,
      {
        l: [string, string][];
        t: [string, string][];
        w?: number;
      }
    > = {
      call: {
        l: [
          ["c", "Thanks for calling Tony's! What can I get you?"],
          ["u", "Two large pepperoni and a garlic bread."],
          ["c", "Collection or delivery?"],
          ["u", "Collection, in 30 minutes."],
        ],
        t: [
          ["2× Large pepperoni", "€26.00"],
          ["1× Garlic bread", "€5.50"],
          ["Collect 7:45 pm", "€31.50"],
        ],
        w: 1,
      },
      wa: {
        l: [
          ["u", "Hi, any tables or takeaway tonight?"],
          ["c", "Takeaway's open till 11. Want to see today's specials?"],
          ["u", "Yes, one Tikka wrap and a cola."],
          ["c", "Done. Pay by link, ready in 15 min."],
        ],
        t: [
          ["1× Tikka wrap", "€8.50"],
          ["1× Cola", "€2.00"],
          ["Ready 6:40 pm", "€10.50"],
        ],
      },
      web: {
        l: [
          ["c", "Welcome back! Same as last Friday?"],
          ["u", "Yes, plus extra fries."],
          ["c", "Added. Delivery to your saved address?"],
          ["u", "Yes please."],
        ],
        t: [
          ["1× Smash burger", "€12.00"],
          ["2× Fries", "€7.00"],
          ["Delivery 8:10 pm", "€19.00"],
        ],
      },
    };

    const ch = document.getElementById("ch");
    const tl = document.getElementById("tl");
    const st = document.getElementById("st");
    const tryBox = document.getElementById("try") as any;

    if (tryBox?._demoCleanup) {
      tryBox._demoCleanup();
    }
    if ((window as any).__orderDemoCleanup) {
      (window as any).__orderDemoCleanup();
    }

    let T: ReturnType<typeof setTimeout>[] = [];
    let orderGen = 0;

    function cleanupOrderDemo() {
      orderGen++;
      T.forEach(clearTimeout);
      T = [];
    }

    if (tryBox) {
      tryBox._demoCleanup = cleanupOrderDemo;
    }
    (window as any).__orderDemoCleanup = cleanupOrderDemo;

    const R = document.documentElement.classList.contains("rm");
    const HM = R;

    function wave() {
      let h = "";
      for (let i = 0; i < 28; i++) h += '<b style="--i:' + i + '"></b>';
      return h;
    }

    document.querySelectorAll(".wv").forEach((e) => {
      e.innerHTML = wave();
    });

    let currentKey = "call";

    function play(k: string) {
      currentKey = k;
      if (!ch || !tl || !st) return;
      cleanupOrderDemo();
      const currentGen = orderGen;
      const d = D[k];
      if (!d) return;
      ch.innerHTML = d.w ? '<div class="wv">' + wave() + "</div>" : "";
      tl.innerHTML = "";
      st.innerHTML = "";

      d.l.forEach((x, i) => {
        T.push(
          setTimeout(
            () => {
              if (orderGen !== currentGen) return;
              const m = document.createElement("div");
              m.className = "m " + (x[0] === "c" ? "cs" : "us");
              m.textContent = x[1];
              ch.appendChild(m);
              const r = d.t[i - 1];
              if (i > 0 && r) {
                const l = document.createElement("div");
                l.className = "ln";
                l.innerHTML = "<span>" + r[0] + "</span><b>" + r[1] + "</b>";
                tl.appendChild(l);
              }
            },
            R ? 0 : i * 1500
          )
        );
      });

      T.push(
        setTimeout(
          () => {
            if (orderGen !== currentGen) return;
            st.innerHTML = '<div class="sent">✓ Sent to your POS</div>';
          },
          R ? 0 : 6200
        )
      );

      if (!R) {
        T.push(
          setTimeout(
            () => {
              if (orderGen !== currentGen) return;
              play(currentKey);
            },
            9200
          )
        );
      }
    }

    document.querySelectorAll(".tabs button").forEach((b) => {
      (b as HTMLElement).onclick = () => {
        document.querySelectorAll(".tabs button").forEach((x) => {
          x.setAttribute("aria-selected", String(x === b));
        });
        const key = (b as HTMLElement).dataset.k || "call";
        currentKey = key;
        play(key);
      };
    });
    play("call");

    // Module 2: Constellation Canvas & Card Tilt & Text Reveal & Lines simulation
    (() => {
      const cv = document.getElementById("cv") as HTMLCanvasElement;
      const hero = document.querySelector(".hero") as HTMLElement;
      const con = document.querySelector(".con") as HTMLElement;
      if (cv) {
        const c = cv.getContext("2d");
        let P: { x: number; y: number; vx: number; vy: number }[] = [];
        const M = { x: -999, y: -999 };
        let W = 0,
          H = 0;

        function rs() {
          if (!cv || !c) return;
          const d = window.devicePixelRatio || 1;
          W = cv.offsetWidth;
          H = cv.offsetHeight;
          cv.width = W * d;
          cv.height = H * d;
          c.setTransform(d, 0, 0, d, 0, 0);
          P = [];
          for (let i = 0; i < (W < 700 ? 34 : 84); i++) {
            P.push({
              x: Math.random() * W,
              y: Math.random() * H,
              vx: Math.random() - 0.5,
              vy: Math.random() - 0.5,
            });
          }
        }

        function ln(
          a: number,
          b: number,
          x: number,
          y: number,
          r: number,
          g: number,
          al: number
        ) {
          if (!c) return;
          c.strokeStyle = "rgba(" + r + "," + g + ",240," + al + ")";
          c.beginPath();
          c.moveTo(a, b);
          c.lineTo(x, y);
          c.stroke();
        }

        function fr() {
          if (!c) return;
          c.clearRect(0, 0, W, H);
          for (let i = 0; i < P.length; i++) {
            const p = P[i];
            if (!R) {
              p.x += p.vx * 0.4;
              p.y += p.vy * 0.4;
              if (p.x < 0 || p.x > W) p.vx *= -1;
              if (p.y < 0 || p.y > H) p.vy *= -1;
            }
            c.fillStyle = "rgba(46,115,237,.75)";
            c.beginPath();
            c.arc(p.x, p.y, 2.2, 0, 6.3);
            c.fill();
            for (let j = i + 1; j < P.length; j++) {
              const q = P[j];
              const d = Math.hypot(p.x - q.x, p.y - q.y);
              if (d < 130) ln(p.x, p.y, q.x, q.y, 110, 80, 0.28 * (1 - d / 130));
            }
            const m = Math.hypot(p.x - M.x, p.y - M.y);
            if (m < 200) ln(p.x, p.y, M.x, M.y, 59, 108, 0.8 * (1 - m / 200));
          }
          if (!R) requestAnimationFrame(fr);
        }

        if (hero) {
          hero.addEventListener("mousemove", (e) => {
            const r = cv.getBoundingClientRect();
            M.x = e.clientX - r.left;
            M.y = e.clientY - r.top;
            if (!HM && window.innerWidth > 860 && con) {
              const b = hero.getBoundingClientRect();
              con.style.transform =
                "perspective(1400px) rotateX(" +
                ((e.clientY - b.top) / b.height - 0.6) * -7 +
                "deg) rotateY(" +
                ((e.clientX - b.left) / b.width - 0.5) * 7 +
                "deg)";
            }
          });
          hero.addEventListener("mouseleave", () => {
            M.x = M.y = -999;
            if (con) con.style.transform = "";
          });
        }
        window.addEventListener("resize", rs);
        rs();
        fr();
      }

      document.querySelectorAll(".c").forEach((e) => {
        const el = e as HTMLElement;
        el.onmousemove = (v) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--x", v.clientX - r.left + "px");
          el.style.setProperty("--y", v.clientY - r.top + "px");
        };
      });

      const rv = document.getElementById("rv");
      if (rv) {
        rv.innerHTML = (rv.textContent || "")
          .split(" ")
          .map((w) => "<span>" + w + "</span>")
          .join(" ");
        const sp = rv.children;
        const sc = () => {
          const r = rv.getBoundingClientRect();
          const pr =
            (window.innerHeight * 0.85 - r.top) /
            (r.height + window.innerHeight * 0.35);
          const n = R
            ? sp.length
            : Math.max(0, Math.min(1, pr)) * sp.length;
          for (let i = 0; i < sp.length; i++) {
            sp[i].className = i < n ? "on" : "";
          }
        };
        window.addEventListener("scroll", sc, { passive: true });
        sc();
      }

      const L = document.getElementById("lines");
      const n1 = document.getElementById("n1");
      const n2 = document.getElementById("n2");
      let a = 0,
        rev = 0,
        iv: any;
      if (L) {
        for (let i = 1; i <= 12; i++) {
          L.insertAdjacentHTML(
            "beforeend",
            '<div class="t"><small>Line ' + i + "</small><b>Idle</b></div>"
          );
        }
        const tick = () => {
          const f = [].filter.call(L.children, (t: any) => t.dataset.s !== "b");
          if (!f.length) return;
          const t: any = f[Math.floor(Math.random() * f.length)];
          t.dataset.s = "b";
          t.className = "t ring";
          t.lastChild.textContent = "Ringing";

          setTimeout(() => {
            t.className = "t ans";
            t.lastChild.textContent = "AI taking order";
          }, 900);

          setTimeout(() => {
            const v = 18 + Math.floor(Math.random() * 46);
            a++;
            rev += v;
            if (n1) n1.textContent = String(a);
            if (n2) n2.textContent = "€" + rev;
            t.className = "t done";
            t.lastChild.textContent = "€" + v + " order";
          }, 2900);

          setTimeout(() => {
            t.className = "t";
            t.lastChild.textContent = "Idle";
            t.dataset.s = "";
          }, 4400);
        };

        new IntersectionObserver((e) => {
          if (e[0].isIntersecting) {
            if (!iv) iv = setInterval(tick, 450);
          } else {
            clearInterval(iv);
            iv = 0;
          }
        }).observe(L);
      }
    })();

    // Module 3: Three.js Orb & Story Scroll Synchronization
    (() => {
      const S = [
        '<div class="rg"></div><h4>Incoming call</h4><p>Tony\'s Pizzeria · (555) 014-2290</p>',
        '<div class="wv">' +
          wave() +
          '</div><h4>AI is listening</h4><p class="q">“Two large pepperoni and a garlic bread, collection in thirty minutes.”</p>',
        '<h4>Order understood</h4><div class="ch2">2× Large pepperoni</div><div class="ch2" style="animation-delay:.25s">1× Garlic bread</div><div class="ch2" style="animation-delay:.5s">Collect 7:45 pm · €31.50</div>',
        '<div class="ok">✓</div><h4>Sent to Toast</h4><p>Order #1042 · printed in the kitchen</p>',
      ];

      const st = document.getElementById("story");
      const stpEl = document.getElementById("stp");
      const li = stpEl ? stpEl.children : ([] as unknown as HTMLCollection);
      const dv = document.getElementById("dev");
      let cur = -1;
      let isClickScrolling = false;
      let clickTarget = -1;
      let clickTimer: ReturnType<typeof setTimeout> | null = null;

      function triggerPop(idx: number) {
        if (!dv || idx < 0 || idx >= S.length) return;
        cur = idx;
        dv.innerHTML = S[idx];
        dv.classList.remove("pop");
        void dv.offsetWidth;
        dv.classList.add("pop");
      }

      function selectStep(targetIdx: number) {
        if (!st || !dv || targetIdx < 0 || targetIdx >= 4) return;
        triggerPop(targetIdx);

        for (let i = 0; i < 4; i++) {
          if (li[i]) {
            li[i].className = i === targetIdx ? "on pop" : "";
            if (i === targetIdx) {
              (li[i] as HTMLElement).style.setProperty("--p", "0.2");
            }
          }
        }

        isClickScrolling = true;
        clickTarget = targetIdx;
        if (clickTimer) clearTimeout(clickTimer);

        const r = st.getBoundingClientRect();
        const storyDocumentTop = window.scrollY + r.top;
        const totalScrollable = r.height - window.innerHeight;
        const targetP = (targetIdx + 0.15) / 4;
        const targetScrollY = storyDocumentTop + targetP * totalScrollable;

        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth",
        });

        clickTimer = setTimeout(() => {
          isClickScrolling = false;
          clickTarget = -1;
        }, 800);
      }

      for (let i = 0; i < li.length; i++) {
        const item = li[i] as HTMLElement;
        if (!item) continue;
        item.style.cursor = "pointer";
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.onclick = () => selectStep(i);
        item.onkeydown = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectStep(i);
          }
        };
      }

      if (dv) {
        dv.addEventListener("animationend", (e: AnimationEvent) => {
          if (e.animationName === "devPop") {
            dv.classList.remove("pop");
          }
        });
      }

      const resetClickLock = () => {
        isClickScrolling = false;
        clickTarget = -1;
      };
      window.addEventListener("wheel", resetClickLock, { passive: true });
      window.addEventListener("touchstart", resetClickLock, { passive: true });

      function f() {
        if (!st || !dv) return;
        const r = st.getBoundingClientRect();
        const p = Math.max(
          0,
          Math.min(0.999, -r.top / (r.height - window.innerHeight))
        );
        const k = Math.floor(p * 4);

        if (isClickScrolling) {
          if (k === clickTarget) {
            isClickScrolling = false;
            clickTarget = -1;
          }
        }

        if (!isClickScrolling) {
          for (let i = 0; i < 4; i++) {
            if (li[i]) {
              li[i].className = i === k ? "on" : "";
              if (i === k) {
                (li[i] as HTMLElement).style.setProperty(
                  "--p",
                  String(p * 4 - k)
                );
              }
            }
          }
          if (k !== cur) {
            cur = k;
            dv.innerHTML = S[k];
          }
        } else {
          for (let i = 0; i < 4; i++) {
            if (li[i]) {
              li[i].className = i === clickTarget ? "on" : "";
              if (i === clickTarget) {
                (li[i] as HTMLElement).style.setProperty(
                  "--p",
                  String(Math.max(0, Math.min(1, p * 4 - clickTarget)))
                );
              }
            }
          }
        }
      }
      window.addEventListener("scroll", f, { passive: true });
      f();

      const box = document.querySelector(".orb") as HTMLElement;
      const cs = document.getElementById("oc") as HTMLCanvasElement;
      if (!box || !cs || !(window as any).THREE) return;

      const r = (() => {
        try {
          return new THREE.WebGLRenderer({
            canvas: cs,
            alpha: true,
            antialias: true,
          });
        } catch {
          return {
            setPixelRatio: () => {},
            setSize: () => {},
            render: () => {},
            getContext: () => ({
              readPixels: (
                a: any,
                b: any,
                c: any,
                d: any,
                e: any,
                f: any,
                px: any
              ) => {
                px[3] = 0;
              },
            }),
          } as any;
        }
      })();

      const sc = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 10);
      cam.position.z = 4.4;

      let TA = new THREE.Color(0.043, 0.055, 0.102);
      let TB = new THREE.Color(0.18, 0.45, 0.93);
      const U = {
        t: { value: 0 },
        u: { value: 0 },
        A: { value: TA.clone() },
        B: { value: TB.clone() },
      };

      (window as any).orbTo = (a: number[], b: number[]) => {
        TA = new THREE.Color(a[0], a[1], a[2]);
        TB = new THREE.Color(b[0], b[1], b[2]);
      };

      const N =
        "float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float no(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}";
      const V =
        "uniform float t,u;varying float vd;varying vec3 vn,vv;" +
        N +
        "void main(){float d=no(position*1.5+t*.35)*.55+no(position*3.2-t*.6)*.22;vd=d;vec3 q=position*(1.+(d-.4)*(.7+u*1.6));vec4 mv=modelViewMatrix*vec4(q,1.);vn=normalMatrix*normal;vv=-mv.xyz;gl_Position=projectionMatrix*mv;}";
      const F =
        "uniform float t;uniform vec3 A,B;varying float vd;varying vec3 vn,vv;void main(){float fr=pow(1.-abs(dot(normalize(vn),normalize(vv))),2.2);vec3 c=mix(A,B,smoothstep(.2,.8,vd));c=mix(c,vec3(1.,.55,.88),smoothstep(.55,1.,sin(vd*8.+t*.8)*.5+.5)*.55);c=mix(c,vec3(.78,.9,1.),fr*.75);gl_FragColor=vec4(mix(c,vec3(1.),.14),1.);}";

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 120, 120),
        new THREE.ShaderMaterial({
          uniforms: U,
          vertexShader: V,
          fragmentShader: F,
        })
      );
      sc.add(mesh);

      let sy = 0;
      window.addEventListener(
        "scroll",
        () => {
          sy = window.scrollY;
        },
        { passive: true }
      );

      const chArr = [].slice.call(box.querySelectorAll(".chip")) as HTMLElement[];
      let mx = 0,
        my = 0,
        sm = 0.1;
      let rx = 0,
        ry = 0;
      const og = document.querySelectorAll(".orr") as NodeListOf<HTMLElement>;

      function rz() {
        const s = box.clientWidth;
        rx = s * (s < 420 ? 0.44 : 0.52);
        ry = s * (s < 420 ? 0.22 : 0.24);
        og.forEach((o) => {
          o.style.width = rx * 2 + "px";
          o.style.height = ry * 2 + "px";
          o.style.margin = -ry + "px 0 0 " + -rx + "px";
        });
        r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        r.setSize(s, s, false);
      }
      rz();
      window.addEventListener("resize", rz);
      window.addEventListener("mousemove", (e) => {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
      });

      let fc = 0;
      if (window.ResizeObserver) new ResizeObserver(rz).observe(box);

      function lp(ts: number) {
        const t = R ? 2 : ts / 1000;
        U.t.value = t;
        sm +=
          (((window as any).mic ||
            0.1 + 0.26 * Math.abs(Math.sin(t * 2.7) * Math.sin(t * 0.9 + 1))) -
            sm) *
          0.15;
        U.u.value = sm;
        U.A.value.lerp(TA, 0.05);
        U.B.value.lerp(TB, 0.05);
        mesh.rotation.y = t * 0.12 + mx * 0.8 + sy * 0.004;
        box.style.transform =
          "translateY(" +
          sy * 0.16 +
          "px) scale(" +
          (1 - Math.min(sy / 1500, 0.22)) +
          ")";
        mesh.rotation.x = my * 0.5;
        r.render(sc, cam);

        if (++fc === 3 || fc === 90) {
          const g = r.getContext();
          const px = new Uint8Array(4);
          if (g && g.readPixels) {
            g.readPixels(
              Math.floor(cs.width / 2),
              Math.floor(cs.height / 2),
              1,
              1,
              g.RGBA,
              g.UNSIGNED_BYTE,
              px
            );
            box.classList.toggle("gl", !!px[3]);
          }
        }

        const n = chArr.length;
        chArr.forEach((e, i) => {
          const a = t * 0.45 + (i * 6.2832) / n;
          const x = Math.cos(a) * rx;
          const z = Math.sin(a);
          const y = z * ry - x * 0.16;
          e.style.transform =
            "translate(-50%,-50%) translate(" +
            x +
            "px," +
            y +
            "px) scale(" +
            (0.94 + 0.1 * ((z + 1) / 2)) +
            ")";
          e.style.zIndex = z > 0 ? "4" : "3";
          e.style.opacity = "1";
        });

        if (!R) requestAnimationFrame(lp);
      }
      requestAnimationFrame(lp);
    })();

    // Module 4: Custom cursor & Marquee & Agent Preview Customizer
    (() => {
      const fine = window.matchMedia("(pointer:fine)").matches;
      if (fine && !HM) {
        document.body.classList.add("cn");
        const cr = document.getElementById("cur");
        const cd = document.getElementById("cdt");
        let x = 0,
          y = 0,
          tx = 0,
          ty = 0;
        window.addEventListener("mousemove", (e) => {
          tx = e.clientX;
          ty = e.clientY;
          if (cd) cd.style.transform = "translate(" + tx + "px," + ty + "px)";
        });
        (function l() {
          x += (tx - x) * 0.15;
          y += (ty - y) * 0.15;
          if (cr) cr.style.transform = "translate(" + x + "px," + y + "px)";
          requestAnimationFrame(l);
        })();
        document.addEventListener("mouseover", (e) => {
          if (cr) {
            cr.classList.toggle(
              "h",
              !!(e.target as HTMLElement).closest("a,button,.c,input")
            );
          }
        });
        document.querySelectorAll(".btn").forEach((b) => {
          const btn = b as HTMLElement;
          btn.addEventListener("mousemove", (e) => {
            const r = btn.getBoundingClientRect();
            btn.style.transform =
              "translate(" +
              (e.clientX - r.left - r.width / 2) * 0.3 +
              "px," +
              (e.clientY - r.top - r.height / 2) * 0.4 +
              "px)";
          });
          btn.addEventListener("mouseleave", () => {
            btn.style.transform = "";
          });
        });
      }

      const r1 = document.getElementById("r1");
      const r2 = document.getElementById("r2");
      function bs() {
        if (!r1 || !r2 || !r1.parentNode) return;
        let p =
          window.innerHeight -
          (r1.parentNode as HTMLElement).getBoundingClientRect().top;
        if (HM) p = 0;
        r1.style.transform = "translateX(" + -p * 0.4 + "px)";
        r2.style.transform = "translateX(" + (-1100 + p * 0.4) + "px)";
      }
      window.addEventListener("scroll", bs, { passive: true });
      bs();

      const C: Record<
        string,
        { c: [number[], number[]]; m: string[] }
      > = {
        Pizza: {
          c: [
            [0.95, 0.3, 0.2],
            [0.98, 0.65, 0.2],
          ],
          m: ["Margherita", "Pepperoni", "Garlic bread"],
        },
        Indian: {
          c: [
            [0.98, 0.55, 0.1],
            [0.85, 0.2, 0.5],
          ],
          m: ["Chicken tikka", "Garlic naan", "Lamb biryani"],
        },
        Burgers: {
          c: [
            [0.95, 0.6, 0.1],
            [0.9, 0.2, 0.2],
          ],
          m: ["Smash burger", "Loaded fries", "Milkshake"],
        },
        Sushi: {
          c: [
            [0.1, 0.7, 0.7],
            [0.25, 0.4, 0.95],
          ],
          m: ["Salmon nigiri", "Dragon roll", "Miso soup"],
        },
      };

      const nm = document.getElementById("nm") as HTMLInputElement;
      const pv = document.getElementById("pv");
      const gr = document.getElementById("gr");
      let ty: any,
        cz = "Pizza",
        ps = "Toast";

      function rgb(a: number[]) {
        return "rgb(" + a.map((v) => Math.round(v * 255)).join(",") + ")";
      }

      function pick(id: string, fn: (val: string) => void) {
        const bs = document.querySelectorAll("#" + id + " button");
        bs.forEach((b) => {
          (b as HTMLElement).onclick = () => {
            bs.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            fn(b.textContent || "");
            up();
          };
        });
      }

      pick("cz", (v) => {
        cz = v;
      });
      pick("ps", (v) => {
        ps = v;
      });
      if (nm) nm.oninput = up;

      function up() {
        if (!pv || !gr) return;
        const n = (nm ? nm.value.trim() : "") || "Your restaurant";
        const d = C[cz] || C.Pizza;
        const g =
          "Hi, thanks for calling " + n + "! Pickup or delivery today?";
        let i = 0;

        const pn = document.getElementById("pn");
        if (pn) pn.textContent = n + " AI";
        pv.style.setProperty("--pa", rgb(d.c[0]));
        pv.style.setProperty("--pb", rgb(d.c[1]));

        const mnEl = document.getElementById("mn");
        if (mnEl) {
          mnEl.innerHTML = d.m
            .map(
              (m, k) =>
                '<span style="animation-delay:' +
                k * 0.12 +
                's">' +
                m +
                "</span>"
            )
            .join("");
        }

        const syEl = document.getElementById("sy");
        if (syEl) syEl.textContent = "✓ Menu and prices synced with " + ps;

        if ((window as any).orbTo) (window as any).orbTo(d.c[0], d.c[1]);
        clearInterval(ty);
        gr.textContent = R ? g : "";
        if (!R) {
          ty = setInterval(() => {
            gr.textContent = g.slice(0, ++i);
            if (i >= g.length) clearInterval(ty);
          }, 28);
        }
      }
      up();
    })();

    // Module 5: ROI Calculator
    (() => {
      const $ = (i: string) => document.getElementById(i);
      const od = $("od");
      function roll(n: number) {
        if (!od) return;
        const t = "€" + Math.round(n).toLocaleString("en-GB");
        if (od.dataset.l !== String(t.length)) {
          od.dataset.l = String(t.length);
          od.innerHTML = t
            .split("")
            .map((c) =>
              /\d/.test(c)
                ? '<span class="dg"><i>' +
                  "0123456789"
                    .split("")
                    .map((d) => "<b>" + d + "</b>")
                    .join("") +
                  "</i></span>"
                : "<span>" + c + "</span>"
            )
            .join("");
          void od.offsetWidth;
        }
        [].forEach.call(od.children, (e: any, i: number) => {
          if (e.className === "dg")
            e.firstChild.style.transform = "translateY(-" + t[i] + "em)";
        });
      }

      function calc() {
        const cw = $("cw") as HTMLInputElement;
        const ca = $("ca") as HTMLInputElement;
        const cc = $("cc") as HTMLInputElement;
        if (!cw || !ca || !cc) return;
        const w = +cw.value,
          a = +ca.value,
          c = +cc.value / 100,
          o = w * 4.33 * c,
          r = o * a;
        const vw = $("vw"),
          va = $("va"),
          vc = $("vc"),
          oo = $("oo"),
          yy = $("yy");
        if (vw) vw.textContent = String(w);
        if (va) va.textContent = "€" + a;
        if (vc) vc.textContent = Math.round(c * 100) + "%";
        if (oo) oo.textContent = Math.round(o).toLocaleString("en-GB");
        if (yy) yy.textContent = "€" + Math.round(r * 12).toLocaleString("en-GB");
        roll(r);
      }

      ["cw", "ca", "cc"].forEach((i) => {
        const el = $(i);
        if (el) (el as HTMLInputElement).oninput = calc;
      });
      calc();

      if (!HM && window.matchMedia("(pointer:fine)").matches) {
        document.querySelectorAll(".c").forEach((e) => {
          const el = e as HTMLElement;
          el.addEventListener("mousemove", (v) => {
            const r = el.getBoundingClientRect();
            el.style.transform =
              "perspective(900px) rotateX(" +
              ((v.clientY - r.top) / r.height - 0.5) * -6 +
              "deg) rotateY(" +
              ((v.clientX - r.left) / r.width - 0.5) * 6 +
              "deg)";
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "";
          });
        });
      }
    })();

    // Module 6: Scroll Progress & Range background filling
    (() => {
      const pg = document.getElementById("pg");
      function sp() {
        if (!pg) return;
        pg.style.transform =
          "scaleX(" +
          window.scrollY /
            (document.documentElement.scrollHeight - window.innerHeight) +
          ")";
      }
      window.addEventListener("scroll", sp, { passive: true });
      sp();

      ["cw", "ca", "cc"].forEach((i) => {
        const e = document.getElementById(i) as HTMLInputElement;
        if (!e) return;
        function f() {
          const p =
            ((Number(e.value) - Number(e.min)) /
              (Number(e.max) - Number(e.min))) *
            100;
          e.style.background =
            "linear-gradient(90deg,var(--a) " +
            p +
            "%,var(--soft) " +
            p +
            "%)";
        }
        f();
        e.addEventListener("input", f);
      });
    })();

    // Module 7: Giant typography parallax
    (() => {
      const G = [].slice.call(
        document.querySelectorAll(".gt")
      ) as HTMLElement[];
      function gp() {
        G.forEach((g) => {
          if (!g.parentNode) return;
          const r = (g.parentNode as HTMLElement).getBoundingClientRect();
          const c = r.top + r.height / 2 - window.innerHeight / 2;
          const d = Number(g.dataset.d) || 1;
          g.style.setProperty(
            "--ty",
            Math.max(-90, Math.min(90, c * -0.12)) + "px"
          );
          g.style.setProperty(
            "--tx",
            Math.max(-140, Math.min(140, c * 0.18 * d)) + "px"
          );
        });
      }
      if (!HM) {
        window.addEventListener("scroll", gp, { passive: true });
        gp();
      }
    })();

    // Module 8: Microphone audio & Floating toasts
    (() => {
      const b = document.getElementById("mic");
      let on = 0;
      let ctx: any;
      let st: any;
      const lb = b?.querySelector("span");

      function stop() {
        on = 0;
        (window as any).mic = 0;
        b?.classList.remove("on");
        if (lb) lb.textContent = "Talk to the orb";
        if (st) st.getTracks().forEach((t: any) => t.stop());
        st = 0;
        if (ctx) {
          ctx.close();
          ctx = 0;
        }
      }

      function fake() {
        on = 1;
        b?.classList.add("on");
        if (lb) lb.textContent = "Mic blocked here, simulating voice";
        (function l() {
          if (!on) return;
          const n = Date.now();
          (window as any).mic =
            0.1 + 0.4 * Math.abs(Math.sin(n / 190) * Math.sin(n / 730));
          requestAnimationFrame(l);
        })();
      }

      if (b) {
        b.onclick = () => {
          if ((window as any).__openVoiceOrb) {
            (window as any).__openVoiceOrb();
            return;
          }
          if (on) {
            stop();
            return;
          }
          if (
            !(
              navigator.mediaDevices &&
              navigator.mediaDevices.getUserMedia
            )
          )
            return fake();
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((m) => {
              st = m;
              const AudioCtx =
                window.AudioContext || (window as any).webkitAudioContext;
              ctx = new AudioCtx();
              const a = ctx.createAnalyser();
              a.fftSize = 256;
              ctx.createMediaStreamSource(m).connect(a);
              const d = new Uint8Array(a.frequencyBinCount);
              on = 1;
              b.classList.add("on");
              if (lb) lb.textContent = "Listening, say hello";
              (function l() {
                if (!on) return;
                a.getByteFrequencyData(d);
                let s = 0;
                for (let i = 0; i < d.length; i++) s += d[i];
                (window as any).mic = Math.min(
                  0.62,
                  (s / d.length / 255) * 2.6 + 0.05
                );
                requestAnimationFrame(l);
              })();
            })
            .catch(fake);
        };
      }

      const T = [
        {
          cls: "ti-voice",
          title: "Call answered",
          sub: "Pizza order, collection 7:45",
          time: "AI voice",
          svg: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
        },
        {
          cls: "ti-wa",
          title: "WhatsApp order",
          sub: "Tikka wrap and cola, €10.50",
          time: "WhatsApp",
          svg: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
        },
        {
          cls: "ti-pos",
          title: "Synced to Toast",
          sub: "Order #1043 sent to kitchen",
          time: "Live in POS",
          svg: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
        },
        {
          cls: "ti-meta",
          title: "Instagram DM",
          sub: "Opening hours question answered",
          time: "Meta DM",
          svg: '<svg viewBox="0 0 24 24"><path d="M7 8c-3 0-4 8 0 8 3 0 5-8 10-8 4 0 4 8 0 8-5 0-7-8-10-8z"/></svg>',
        },
        {
          cls: "ti-web",
          title: "Website order",
          sub: "Smash burger, delivery €19.00",
          time: "AI website",
          svg: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 9h18"/></svg>',
        },
      ];
      let k = 0;
      const ts = document.getElementById("tst");
      function nt() {
        if (!ts) return;
        const x = T[k++ % T.length];
        ts.innerHTML =
          '<div class="ti ' +
          x.cls +
          '"><i class="ti-ic">' +
          x.svg +
          '</i><div class="ti-bd"><div class="ti-top"><b>' +
          x.title +
          '</b><span class="ti-time">' +
          x.time +
          "</span></div><span>" +
          x.sub +
          "</span></div></div>";
      }

      if ((window as any).__toastInterval) {
        clearInterval((window as any).__toastInterval);
      }
      if ((window as any).__toastTimeout) {
        clearTimeout((window as any).__toastTimeout);
      }

      (window as any).__toastTimeout = setTimeout(
        () => {
          nt();
          if (!R) {
            (window as any).__toastInterval = setInterval(nt, 3200);
          }
        },
        R ? 0 : 2300
      );
    })();

    // Module 9: POS Screen Simulation
    (() => {
      const P = [
        ["Toast", "#ff6a2b"],
        ["Clover", "#2fb55b"],
        ["Square", "#2b6cf0"],
        ["Lightspeed", "#e5484d"],
        ["Revel", "#7440f5"],
        ["Epos Now", "#0ea5a5"],
      ];
      const O = [
        [
          "Phone",
          "Pickup 7:45 pm",
          ["2× Large pepperoni", "1× Garlic bread"],
          "€31.50",
        ],
        [
          "WhatsApp",
          "Pickup 6:40 pm",
          ["1× Tikka wrap", "1× Cola"],
          "€10.50",
        ],
        [
          "Website",
          "Delivery 8:10 pm",
          ["1× Smash burger", "2× Fries"],
          "€19.00",
        ],
        [
          "Instagram",
          "Pickup 7:05 pm",
          ["1× Dragon roll", "1× Miso soup"],
          "€14.80",
        ],
        [
          "Phone",
          "Delivery 8:30 pm",
          ["1× Lamb biryani", "2× Garlic naan"],
          "€22.40",
        ],
      ];
      const $ = (i: string) => document.getElementById(i);
      const pl = $("pl");
      const dv = $("dv2");
      const sc = dv?.querySelector(".sc") as HTMLElement;
      const xr = $("xr");
      let cur = 0,
        k = 0,
        no = 1043,
        tm: any,
        au: any,
        tt: any[] = [];

      if (pl && xr) {
        pl.innerHTML = P.map(
          (p) =>
            '<button class="pb" style="--pc:' +
            p[1] +
            '"><i>' +
            p[0][0] +
            "</i>" +
            p[0] +
            "<small>Ready</small></button>"
        ).join("");
        const bs = [].slice.call(pl.children) as HTMLElement[];
        xr.innerHTML = '<div class="xs">Waiting for orders</div>'.repeat(3);
        const sl = [].slice.call(xr.children) as HTMLElement[];

        function clr() {
          tt.forEach(clearTimeout);
          tt = [];
          sl.forEach((s) => {
            s.className = "xs";
            s.innerHTML = "Waiting for orders";
          });
        }

        function put() {
          const n = window.innerWidth <= 860 ? 2 : 3;
          const s = sl[k % n];
          const o = O[k % O.length];
          const id = no++;
          k++;
          s.className = "xs f";
          s.innerHTML =
            '<div class="th"><b>#' +
            id +
            '</b><span class="sb">' +
            o[0] +
            '</span><em class="st">New</em></div><ul>' +
            (o[2] as string[]).map((x) => "<li>" + x + "</li>").join("") +
            '</ul><div class="tf"><span>' +
            o[1] +
            "</span><b>" +
            o[3] +
            "</b></div>";
          void s.offsetWidth;
          s.classList.add("in2");
          const stBadge = s.querySelector(".st");
          if (stBadge) {
            tt.push(
              setTimeout(() => {
                stBadge.textContent = "Printing";
                stBadge.className = "st p";
              }, 800)
            );
            tt.push(
              setTimeout(() => {
                stBadge.textContent = "In kitchen";
                stBadge.className = "st k";
              }, 1700)
            );
          }
        }

        function sel(i: number) {
          cur = i;
          const p = P[i];
          if (dv) dv.style.setProperty("--pc", p[1]);
          const xn = $("xn");
          if (xn) xn.textContent = p[0];
          bs.forEach((b, j) => {
            b.classList.toggle("on", j === i);
            const smEl = b.querySelector("small");
            if (smEl) smEl.textContent = j === i ? "Live now" : "Ready";
          });
          clearInterval(tm);
          clr();
          k = 0;
          if (sc) sc.classList.add("sy");
          const smText = $("sm");
          if (smText)
            smText.textContent =
              "Connecting to " + p[0] + " and syncing your menu";
          tt.push(
            setTimeout(
              () => {
                if (sc) sc.classList.remove("sy");
                put();
                tm = setInterval(put, 2000);
              },
              R ? 0 : 1100
            )
          );
          if (pl && pl.scrollWidth > pl.clientWidth) {
            pl.scrollTo({ left: bs[i].offsetLeft - 24, behavior: "smooth" });
          }
        }

        bs.forEach((b, i) => {
          b.onclick = () => {
            clearInterval(au);
            sel(i);
          };
        });

        function ck() {
          const xc = $("xc");
          if (xc)
            xc.textContent = new Date().toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            });
        }
        ck();
        setInterval(ck, 20000);
        sel(0);
        if (!R) {
          au = setInterval(() => {
            sel((cur + 1) % P.length);
          }, 11000);
        }
      }
    })();

    // Module 10: Product showcase runners
    (() => {
      const $ = (i: string) => document.getElementById(i);
      function SF(el: any, n: string) {
        if (el._n <= 2 && (window as any).sfx && (window as any).sfx[n]) {
          (window as any).sfx[n]();
        }
      }

      function demo(el: any, f: any) {
        if (!el) return;
        if (el._demoCleanup) {
          el._demoCleanup();
        }
        let T: any[] = [],
          on = 0;
        const L = (g: any, m: any) => {
          T.push(setTimeout(g, m));
        };
        function stop() {
          T.forEach(clearTimeout);
          T = [];
        }
        function go() {
          stop();
          el._n = (el._n || 0) + 1;
          f.reset();
          f.steps.forEach((x: any) => {
            L(() => {
              x[1](L);
            }, x[0]);
          });
          L(go, f.len);
        }
        if (R) {
          f.reset();
          f.steps.forEach((x: any) => {
            x[1](L);
          });
          return;
        }
        const obs = new IntersectionObserver(
          (e) => {
            if (e[0].isIntersecting) {
              if (!on) {
                on = 1;
                go();
              }
            } else {
              on = 0;
              stop();
              f.reset();
            }
          },
          { threshold: 0.3 }
        );
        obs.observe(el);
        el._demoCleanup = () => {
          on = 0;
          stop();
          obs.disconnect();
          f.reset();
        };
      }

      // Voice runner
      const vd = $("vd");
      if (vd) {
        const wf = vd.querySelector(".vw");
        const cap = vd.querySelector(".vcp");
        const vs = $("vs");
        const vt = $("vt");
        const ri = $("vri");
        const tv = $("vtv");
        let tk: any,
          sc = 0;

        if (wf) {
          wf.innerHTML = new Array(34)
            .join(",")
            .split(",")
            .map((_, i) => '<b style="--i:' + i + '"></b>')
            .join("");
        }

        function say(w: string, t: string) {
          if (!wf || !cap) return;
          wf.className = "vw " + w;
          cap.innerHTML =
            '<p class="' +
            w +
            '"><b>' +
            (w === "ai" ? "AI agent" : "Caller") +
            "</b>" +
            t +
            "</p>";
        }

        function add(n: string, p: string) {
          if (!ri) return;
          ri.insertAdjacentHTML(
            "beforeend",
            "<li><span>" + n + "</span><b>" + p + "</b></li>"
          );
          SF(vd, "pop");
        }

        demo(vd, {
          len: 19500,
          reset: () => {
            clearInterval(tk);
            sc = 0;
            if (ri) ri.innerHTML = "";
            if (tv) tv.textContent = "€0.00";
            const vstp = $("vstp");
            if (vstp) vstp.className = "vs";
            const vsd = $("vsd");
            if (vsd) vsd.className = "vsd";
            if (wf) wf.className = "vw";
            if (cap) cap.innerHTML = "";
            if (vs) vs.textContent = "Incoming call";
            if (vt) vt.textContent = "0:00";
          },
          steps: [
            [
              300,
              () => {
                if (vs) vs.textContent = "Ringing";
              },
            ],
            [
              1100,
              () => {
                if (vs) vs.textContent = "Connected";
                SF(vd, "pick");
                tk = setInterval(() => {
                  sc++;
                  if (vt)
                    vt.textContent =
                      "0:" + (sc < 10 ? "0" : "") + sc;
                }, 1000);
                say(
                  "ai",
                  "Thanks for calling Tony's Pizzeria. What can I get you?"
                );
              },
            ],
            [
              3600,
              () => {
                say(
                  "cu",
                  "Two large pepperoni and a garlic bread, please."
                );
              },
            ],
            [
              5100,
              () => {
                add("2× Large pepperoni", "€26.00");
              },
            ],
            [
              5700,
              () => {
                add("1× Garlic bread", "€5.50");
                if (tv) tv.textContent = "€31.50";
              },
            ],
            [
              6300,
              () => {
                say("ai", "Got it. Anything to drink?");
              },
            ],
            [
              8200,
              () => {
                say("cu", "One cola.");
              },
            ],
            [
              9100,
              () => {
                add("1× Cola", "€2.00");
                if (tv) tv.textContent = "€33.50";
              },
            ],
            [
              9600,
              () => {
                say("ai", "Collection or delivery?");
              },
            ],
            [
              11200,
              () => {
                say("cu", "Collection, in thirty minutes.");
              },
            ],
            [
              12400,
              () => {
                add("Collection, 7:45 pm", "");
              },
            ],
            [
              12900,
              () => {
                say(
                  "ai",
                  "Perfect. That's €33.50 and your order is in."
                );
              },
            ],
            [
              14700,
              () => {
                if (wf) wf.className = "vw";
                clearInterval(tk);
                if (vs) vs.textContent = "Call ended";
                const vstp = $("vstp");
                if (vstp) vstp.className = "vs on";
                SF(vd, "thump");
                setTimeout(() => {
                  SF(vd, "ding");
                }, 200);
              },
            ],
            [
              15500,
              () => {
                const vsd = $("vsd");
                if (vsd) vsd.className = "vsd on";
              },
            ],
          ],
        });
      }

      // Chat engine
      function chat(id: string, S: any) {
        const b = $(id);
        let ty: any;
        function rm() {
          if (ty) {
            ty.remove();
            ty = 0;
          }
        }
        return {
          len: S.len,
          reset: () => {
            if (b) b.innerHTML = "";
            ty = 0;
          },
          steps: S.s.map((x: any) => [
            x[0],
            () => {
              if (!b) return;
              const k = x[1];
              if (k === "t") {
                rm();
                b.insertAdjacentHTML(
                  "beforeend",
                  '<div class="ty"><i></i><i></i><i></i></div>'
                );
                ty = b.lastChild;
              } else if (k === "q") {
                const qrSpan = b.querySelector(".qr span");
                if (qrSpan) qrSpan.className = "on";
              } else if (k === "pay") {
                const p = b.querySelector(".pay");
                if (p) {
                  p.className = "pay pd";
                  p.textContent = "Paid ✓";
                }
                SF(b, "ding");
              } else if (k === "sys") {
                rm();
                b.insertAdjacentHTML(
                  "beforeend",
                  '<div class="sy3">Order sent to your POS</div>'
                );
                SF(b, "chime");
              } else {
                rm();
                b.insertAdjacentHTML(
                  "beforeend",
                  '<div class="bb ' + k + '">' + x[2] + "</div>"
                );
                SF(b, k === "b" ? "pop" : "tick");
              }
              b.scrollTop = b.scrollHeight;
            },
          ]),
        };
      }

      const card =
        '<b>Your order</b><div class="oc"><span>2× Large pepperoni</span><span>€26.00</span></div><div class="oc"><span>1× Garlic bread</span><span>€5.50</span></div><div class="oc t"><span>Total</span><span>€31.50</span></div><div class="pay">Pay now</div>';

      demo(
        $("wab"),
        chat("wab", {
          len: 16500,
          s: [
            [400, "u", "Hi, can I order for tonight?"],
            [1100, "t"],
            [
              2200,
              "b",
              'Hi Sam! Collection or delivery?<div class="qr"><span>Collection</span><span>Delivery</span></div>',
            ],
            [3800, "q"],
            [4300, "u", "Collection"],
            [4900, "t"],
            [5900, "b", "Great. What would you like?"],
            [7400, "u", "2 large pepperoni and a garlic bread"],
            [8000, "t"],
            [9200, "b", card],
            [11000, "pay"],
            [11800, "t"],
            [12600, "b", "Paid. Your order is confirmed for 7:45 pm."],
            [13600, "sys"],
          ],
        })
      );

      demo(
        $("mtb"),
        chat("mtb", {
          len: 15500,
          s: [
            [400, "u", "Hey, are you open late tonight?"],
            [1100, "t"],
            [2200, "b", "Yes, until 11 pm. Want to see the menu?"],
            [4000, "u", "Any vegan options?"],
            [4700, "t"],
            [
              5900,
              "b",
              'Yes, we have 4 vegan dishes. Shall I start an order?<div class="qr"><span>Start order</span><span>Show menu</span></div>',
            ],
            [7800, "q"],
            [8300, "u", "Start order"],
            [8900, "t"],
            [10000, "b", "Done. I've sent you a secure payment link."],
            [11200, "sys"],
          ],
        })
      );

      // Website ordering runner
      const ov = $("ov");
      const wbw = ov?.parentNode as HTMLElement;
      const am = $("am");
      const ai = $("ait");
      const cu = $("cu");
      const ct = $("ctv");
      const co = $("co");
      const mi = [].slice.call(
        document.querySelectorAll(".mi")
      ) as HTMLElement[];

      function amsg(t: string) {
        if (am) am.innerHTML = "<p>" + t + "</p>";
      }
      function typ(t: string, L: any) {
        if (!ai) return;
        ai.textContent = "";
        for (let i = 1; i <= t.length; i++) {
          ((idx) => {
            L(() => {
              ai.textContent = t.slice(0, idx);
            }, idx * 38);
          })(i);
        }
      }
      function ad(L: any, k: number, q: number, n: string, p: string) {
        SF(wbw, "pop");
        const m = mi[k];
        if (m) {
          m.classList.add("hl", "q");
          const em = m.querySelector("em");
          if (em) em.textContent = String(q);
          if (cu)
            cu.insertAdjacentHTML(
              "beforeend",
              "<li><span>" + q + "× " + n + "</span><b>" + p + "</b></li>"
            );
          L(() => {
            m.classList.remove("hl");
          }, 800);
        }
      }

      demo(wbw, {
        len: 15500,
        reset: () => {
          if (cu) cu.innerHTML = "";
          if (ct) ct.textContent = "€0.00";
          mi.forEach((m) => {
            m.className = "mi";
          });
          if (co) co.className = "co";
          if (ov) ov.className = "ov";
          if (ai) ai.textContent = "";
          if (am) am.innerHTML = "";
        },
        steps: [
          [
            300,
            () => {
              amsg("Hungry? Tell me what you'd like.");
            },
          ],
          [
            1500,
            (L: any) => {
              typ("Two pepperoni and a garlic bread", L);
            },
          ],
          [
            3100,
            () => {
              if (ai) ai.textContent = "";
              amsg("Adding that to your basket...");
            },
          ],
          [
            3600,
            (L: any) => {
              ad(L, 0, 2, "Pepperoni", "€26.00");
            },
          ],
          [
            4400,
            (L: any) => {
              ad(L, 1, 1, "Garlic bread", "€5.50");
              if (ct) ct.textContent = "€31.50";
            },
          ],
          [
            5400,
            () => {
              amsg("Added. Anything to drink?");
            },
          ],
          [
            6500,
            (L: any) => {
              typ("A cola please", L);
            },
          ],
          [
            7800,
            () => {
              if (ai) ai.textContent = "";
              amsg("One cola, coming up.");
            },
          ],
          [
            8300,
            (L: any) => {
              ad(L, 2, 1, "Cola", "€2.00");
              if (ct) ct.textContent = "€33.50";
            },
          ],
          [
            9100,
            () => {
              amsg("Ready to check out?");
            },
          ],
          [
            10000,
            () => {
              if (co) co.classList.add("pz");
              SF(wbw, "tick");
            },
          ],
          [
            10600,
            () => {
              if (ov) ov.classList.add("on");
              SF(wbw, "ding");
            },
          ],
        ],
      });
    })();

    // Module 11: Navigation Menu, Drawer & Scroll Spy
    (() => {
      const $ = (i: string) => document.getElementById(i);
      const hb = $("hb2");
      const mp = $("mp");
      const dd = document.querySelector(".dd") as HTMLElement;
      const dt = dd?.querySelector(".dt") as HTMLElement;
      const md = mp?.querySelector(".mpd") as HTMLElement;
      const ms = mp?.querySelector(".mps") as HTMLElement;

      function tog(o: boolean) {
        if (!hb || !mp) return;
        hb.setAttribute("aria-expanded", String(o));
        hb.setAttribute("aria-label", o ? "Close menu" : "Open menu");
        mp.classList.toggle("on", o);
        mp.setAttribute("aria-hidden", String(!o));
        document.documentElement.style.overflow = o ? "hidden" : "";
      }

      if (hb) {
        hb.onclick = () => {
          tog(hb.getAttribute("aria-expanded") !== "true");
        };
      }
      if (mp) {
        mp.querySelectorAll("a").forEach((a) => {
          a.addEventListener("click", () => {
            tog(false);
          });
        });
      }
      if (md && ms) {
        md.onclick = () => {
          const o = md.getAttribute("aria-expanded") !== "true";
          md.setAttribute("aria-expanded", String(o));
          ms.classList.toggle("on", o);
        };
      }
      if (dt && dd) {
        dt.onclick = (e) => {
          e.stopPropagation();
          const o = !dd.classList.contains("open");
          dd.classList.toggle("open", o);
          dt.setAttribute("aria-expanded", String(o));
        };
        dd.querySelectorAll(".dm2 a").forEach((a) => {
          a.addEventListener("click", () => {
            dd.classList.remove("open");
            dt.setAttribute("aria-expanded", "false");
            dd.blur();
            if (document.activeElement)
              (document.activeElement as HTMLElement).blur();
          });
        });
      }
      document.addEventListener("click", (e) => {
        if (dd && !dd.contains(e.target as Node)) {
          dd.classList.remove("open");
          if (dt) dt.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (dd) dd.classList.remove("open");
          tog(false);
        }
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 960) tog(false);
      });

      const sp: [string, string][] = [
        ["home", ".hero"],
        ["products", "#products"],
        ["roi", "#roi"],
        ["integrations", "#integrations"],
        ["contact", "#contact"],
      ];
      function spy() {
        let cur = "home";
        const y = window.innerHeight * 0.4;
        sp.forEach((x) => {
          const e = document.querySelector(x[1]);
          if (e && e.getBoundingClientRect().top <= y) cur = x[0];
        });
        document.querySelectorAll(".nl [data-s]").forEach((a) => {
          a.classList.toggle(
            "act",
            (a as HTMLElement).dataset.s === cur
          );
        });
      }
      window.addEventListener("scroll", spy, { passive: true });
      spy();
    })();

    // Module 12: Sound Effects System (Web Audio API)
    (() => {
      let AC: any;
      let rt = 0;
      const bt = document.getElementById("snd");
      let on = 1;
      try {
        if (localStorage.getItem("ca-snd") === "0") on = 0;
      } catch {}

      function ok(f?: any) {
        return AC && AC.state === "running" && (on || f);
      }
      function ctx() {
        if (!AC) {
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) AC = new AudioContext();
        }
        return AC;
      }
      function unlock() {
        const c = ctx();
        return c
          ? Promise.resolve(c.resume()).catch(() => {})
          : Promise.resolve();
      }
      function tone(
        f: number,
        t0: number,
        d: number,
        ty?: OscillatorType,
        v?: number,
        f2?: number,
        fo?: any
      ) {
        if (!ok(fo)) return;
        const o = AC.createOscillator();
        const g = AC.createGain();
        const t = AC.currentTime + t0;
        o.type = ty || "sine";
        o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);

        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v || 0.1, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g);
        g.connect(AC.destination);
        o.start(t);
        o.stop(t + d + 0.05);
      }
      function noise(d: number, f1: number, f2: number, v: number) {
        if (!ok()) return;
        const n = (AC.sampleRate * d) | 0;
        const b = AC.createBuffer(1, n, AC.sampleRate);
        const a = b.getChannelData(0);
        for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;

        const s = AC.createBufferSource();
        const fl = AC.createBiquadFilter();
        const g = AC.createGain();
        const t = AC.currentTime;
        s.buffer = b;
        fl.type = "bandpass";
        fl.Q.value = 1.1;
        fl.frequency.setValueAtTime(f1, t);
        fl.frequency.exponentialRampToValueAtTime(f2, t + d);

        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + d * 0.4);
        g.gain.linearRampToValueAtTime(0, t + d);
        s.connect(fl);
        fl.connect(g);
        g.connect(AC.destination);
        s.start(t);
      }
      function ring() {
        [0, 0.6].forEach((t) => {
          tone(440, t, 0.4, "sine", 0.07, 0, 1);
          tone(480, t, 0.4, "sine", 0.07, 0, 1);
        });
      }
      function ui() {
        if (!bt) return;
        bt.classList.toggle("on", !!on);
        bt.setAttribute("aria-pressed", String(!!on));
        bt.setAttribute(
          "aria-label",
          on ? "Turn sound off" : "Turn sound on"
        );
      }

      (window as any).sfx = {
        unlock,
        ringNow: () => {
          if (rt >= 0) {
            if (!rt) rt = window.setInterval(ring, 2800);
            ring();
          }
        },
        stopRing: () => {
          clearInterval(rt);
          rt = -1;
        },
        on: (v: number) => {
          on = v;
          ui();
        },
        pick: () => {
          tone(520, 0, 0.08, "square", 0.04);
          tone(780, 0.08, 0.14, "sine", 0.09);
        },
        chime: () => {
          [523, 659, 784].forEach((f, i) => {
            tone(f, i * 0.09, 0.4, "triangle", 0.08);
          });
        },
        tick: () => {
          tone(1700 + Math.random() * 500, 0, 0.03, "square", 0.02);
        },
        pop: () => {
          tone(520, 0, 0.1, "sine", 0.08, 860);
        },
        ding: () => {
          tone(1175, 0, 0.55, "sine", 0.1);
          tone(1568, 0.1, 0.7, "sine", 0.08);
        },
        thump: () => {
          tone(150, 0, 0.2, "sine", 0.2, 45);
          noise(0.12, 900, 300, 0.06);
        },
        whoosh: () => {
          noise(0.7, 260, 2600, 0.22);
        },
      };

      if (bt) {
        bt.onclick = () => {
          on = on ? 0 : 1;
          ui();
          try {
            localStorage.setItem("ca-snd", on ? "1" : "0");
          } catch {}
          if (on)
            unlock().then(() => {
              (window as any).sfx.pop();
            });
        };
      }
      ui();
      const EV = ["pointerdown", "keydown", "touchstart"];
      function first() {
        unlock();
        EV.forEach((e) => {
          window.removeEventListener(e, first, true);
        });
      }
      EV.forEach((e) => {
        window.addEventListener(e, first, true);
      });
    })();

    // Module 13: Incoming Call Intro Modal
    (() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      const $ = (i: string) => document.getElementById(i);
      const inn = $("in");
      const ia = $("ia") as HTMLImageElement;
      const iv = $("ivw");
      const cp = $("icp");
      let done = 0,
        ans = 0,
        seen: any;

      function go() {
        document.body.classList.add("go");
        document.documentElement.style.overflow = "";
      }

      try {
        seen = sessionStorage.getItem("ca1");
      } catch {}

      const rpl = $("rpl");
      if (rpl) {
        rpl.onclick = (e) => {
          e.preventDefault();
          try {
            sessionStorage.removeItem("ca1");
          } catch {}
          location.reload();
        };
      }

      if (R || seen) {
        if (inn) inn.style.display = "none";
        go();
        return;
      }

      document.documentElement.style.overflow = "hidden";
      if (ia) ia.src = baseSrc;

      if (iv) {
        iv.innerHTML = new Array(30)
          .join(",")
          .split(",")
          .map((_, i) => '<b style="--i:' + i + '"></b>')
          .join("");
      }

      if ((window as any).sfx) (window as any).sfx.ringNow();
      let spk = 0;
      (function l() {
        if (spk)
          (window as any).mic =
            0.14 +
            0.36 *
              Math.abs(Math.sin(Date.now() / 95) * Math.sin(Date.now() / 310));
        requestAnimationFrame(l);
      })();

      function quiet() {
        spk = 0;
        (window as any).mic = 0;
      }

      function finish() {
        if (done || !inn || !ia) return;
        done = 1;
        try {
          sessionStorage.setItem("ca1", "1");
        } catch {}

        const brandImg = document.querySelector(".brand img") as HTMLElement;
        const a = ia.getBoundingClientRect();
        const n = brandImg
          ? brandImg.getBoundingClientRect()
          : { left: 20, top: 20, width: 34, height: 34 };
        inn.classList.add("fly");
        if ((window as any).sfx) (window as any).sfx.whoosh();
        ia.style.transform =
          "translate(" +
          (n.left + n.width / 2 - a.left - a.width / 2) +
          "px," +
          (n.top + n.height / 2 - a.top - a.height / 2) +
          "px) scale(" +
          n.width / a.width +
          ")";
        setTimeout(() => {
          inn.classList.add("out");
          go();
          if ((window as any).sfx) (window as any).sfx.ding();
        }, 700);
        setTimeout(() => {
          inn.style.display = "none";
        }, 1600);
        setTimeout(quiet, 2600);
      }

      const iskp = $("iskp");
      if (iskp) {
        iskp.onclick = () => {
          if (done) return;
          done = 1;
          if ((window as any).sfx) (window as any).sfx.stopRing();
          try {
            window.speechSynthesis.cancel();
          } catch {}
          quiet();
          if (inn) inn.classList.add("out");
          go();
          setTimeout(() => {
            if (inn) inn.style.display = "none";
          }, 700);
        };
      }

      function tw(t: string, cb: () => void) {
        if (!cp) return;
        let i = 0;
        cp.textContent = "";
        const h = setInterval(() => {
          cp.textContent = t.slice(0, ++i);
          if (i % 2 && (window as any).sfx) (window as any).sfx.tick();
          if (i >= t.length) {
            clearInterval(h);
            setTimeout(cb, 420);
          }
        }, 36);
      }

      function pickFemaleVoice(): SpeechSynthesisVoice | null {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
        const all = window.speechSynthesis.getVoices();
        if (!all || !all.length) return null;

        const isEnglish = (v: SpeechSynthesisVoice) => /^en/i.test(v.lang);
        const isMale = (v: SpeechSynthesisVoice) =>
          /\b(male|david|guy|mark|christopher|eric|george|brian|richard|steffan|roger|ryan|andrew|adam|steve|john|charles|paul|michael|james|alex|fred|daniel|oliver|thomas|william)\b/i.test(
            v.name
          );

        const en = all.filter((v) => isEnglish(v) && !isMale(v));

        const preferred = [
          /jenny.*natural/i,
          /aria.*natural/i,
          /ava.*natural/i,
          /michelle.*natural/i,
          /emma.*natural/i,
          /sonia.*natural/i,
          /ana.*natural/i,
          /natasha.*natural/i,
          /clara.*natural/i,
          /libby.*natural/i,
          /samantha/i,
          /karen/i,
          /victoria/i,
          /serena/i,
          /moira/i,
          /tessa/i,
          /allison/i,
          /google.*uk.*female/i,
          /google.*female/i,
          /google.*us/i,
          /zira/i,
          /jenny/i,
          /aria/i,
          /female/i,
        ];

        for (const regex of preferred) {
          const match = en.find((v) => regex.test(v.name));
          if (match) return match;
        }

        const natural = en.find((v) => /natural/i.test(v.name));
        if (natural) return natural;

        return en[0] || null;
      }

      function talk(snd: number) {
        if (ans) return;
        ans = 1;
        if ((window as any).sfx) (window as any).sfx.stopRing();
        if (inn) {
          inn.classList.remove("ring");
          inn.classList.add("on");
        }
        const ics = $("ics");
        if (ics) ics.textContent = "Connected";
        if (iv) iv.className = "vw ai";
        spk = 1;

        let capD = 0,
          spD = !snd;
        function chk() {
          if (capD && spD) setTimeout(finish, 500);
        }

        tw("Hi, I'm CallAutomate.", () => {
          tw("I answer every call, so you never miss an order.", () => {
            capD = 1;
            if (iv) iv.className = "vw";
            chk();
          });
        });

        if (snd && typeof window !== "undefined" && "speechSynthesis" in window) {
          const runSpeak = () => {
            try {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(
                "Hi! I'm CallAutomate. I answer every call, so you never miss an order."
              );
              u.rate = 0.98;
              u.pitch = 1.15;

              const v = pickFemaleVoice();
              if (v) {
                u.voice = v;
                u.lang = v.lang || "en-US";
              } else {
                u.lang = "en-US";
              }

              let finished = false;
              const complete = () => {
                if (finished) return;
                finished = true;
                spD = true;
                chk();
              };

              u.onend = complete;
              u.onerror = complete;
              window.speechSynthesis.speak(u);
              setTimeout(complete, 8500);
            } catch {
              spD = true;
              chk();
            }
          };

          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            runSpeak();
          } else {
            let called = false;
            const handler = () => {
              if (called) return;
              called = true;
              window.speechSynthesis.removeEventListener("voiceschanged", handler);
              runSpeak();
            };
            window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
            setTimeout(() => {
              if (!called) {
                called = true;
                window.speechSynthesis.removeEventListener("voiceschanged", handler);
                runSpeak();
              }
            }, 250);
          }
        }
      }

      const ians = $("ians");
      if (ians) {
        ians.onclick = () => {
          if ((window as any).sfx) {
            (window as any).sfx.stopRing();
            (window as any).sfx.unlock().then(() => {
              (window as any).sfx.on(1);
              (window as any).sfx.pick();
              setTimeout((window as any).sfx.chime, 260);
            });
          }
          talk(1);
        };
      }

      if (inn) {
        inn.addEventListener(
          "pointerdown",
          (e) => {
            if (!ans && !(e.target as HTMLElement).closest("button")) {
              if ((window as any).sfx)
                (window as any).sfx.unlock().then((window as any).sfx.ringNow);
            }
          },
          { once: true }
        );
      }

      setTimeout(() => {
        talk(0);
      }, 4200);
    })();

    // Module 14: Contact / Demo Booking Interactive Form
    (() => {
      const $ = (i: string) => document.getElementById(i);
      const form = $("kf") as HTMLFormElement;
      if (!form) return;

      const nb = $("kn") as HTMLButtonElement | null;
      const ds = $("ds");
      const ts = $("ts");
      const sm = $("psum");
      const W = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const M = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const D: Date[] = [];
      let dk = 0;
      let tk = -1;
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";
      const SL: [number, number][] = [];

      for (let h = 9; h < 18; h++) {
        SL.push([h, 0]);
        SL.push([h, 30]);
      }

      function fm(a: [number, number]) {
        return (
          (a[0] % 12 || 12) +
          ":" +
          (a[1] ? "30" : "00") +
          " " +
          (a[0] < 12 ? "am" : "pm")
        );
      }

      function off(d: Date, a: [number, number]) {
        if (d.toDateString() !== new Date().toDateString()) return false;
        const t = new Date(d);
        t.setHours(a[0], a[1], 0, 0);
        return t < new Date(Date.now() + 36e5);
      }

      for (let i = 0, d = new Date(); D.length < 10 && i < 30; i++) {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
        if (x.getDay() % 6 && SL.some((a) => !off(x, a))) D.push(x);
      }

      const tzEl = $("tz");
      if (tzEl) tzEl.textContent = "(times in " + tz.replace("_", " ") + ")";

      function sl() {
        if (!D[dk] || !SL[tk]) return "Flexible / To be confirmed";
        return (
          W[D[dk].getDay()] +
          " " +
          D[dk].getDate() +
          " " +
          M[D[dk].getMonth()] +
          " at " +
          fm(SL[tk])
        );
      }

      function paint() {
        if (!ds || !ts || !sm) return;
        ds.innerHTML = D.map(
          (x, k) =>
            '<button type="button" class="dc' +
            (k === dk ? " on" : "") +
            '" data-k="' +
            k +
            '" aria-pressed="' +
            (k === dk) +
            '">' +
            W[x.getDay()] +
            "<b>" +
            x.getDate() +
            "</b>" +
            M[x.getMonth()] +
            "</button>"
        ).join("");

        ts.innerHTML = SL.map((a, k) => {
          const o = off(D[dk], a);
          return (
            '<button type="button" class="tsl' +
            (k === tk ? " on" : "") +
            '" data-k="' +
            k +
            '"' +
            (o ? " disabled" : "") +
            ' aria-pressed="' +
            (k === tk) +
            '">' +
            fm(a) +
            "</button>"
          );
        }).join("");

        if (tk > -1) {
          sm.className = "ps";
          sm.textContent = "✓ " + sl();
        }
      }

      if (ds) {
        ds.onclick = (e) => {
          const b = (e.target as HTMLElement).closest(".dc") as HTMLElement;
          if (!b) return;
          dk = +b.dataset.k!;
          if (tk > -1 && off(D[dk], SL[tk])) tk = -1;
          if (tk < 0 && sm) {
            sm.className = "ps";
            sm.textContent = "Now choose a time.";
          }
          paint();
        };
      }

      if (ts) {
        ts.onclick = (e) => {
          const b = (e.target as HTMLElement).closest(
            ".tsl"
          ) as HTMLButtonElement;
          if (!b || b.disabled) return;
          tk = +b.dataset.k!;
          if (sm) sm.classList.remove("pe");
          paint();
        };
      }

      if (D.length) paint();
      else if (ds)
        ds.textContent = "No slots available right now, please email us.";

      const kc = $("kc");
      if (kc) {
        kc.onclick = (e) => {
          const b = (e.target as HTMLElement).closest("button");
          if (!b) return;
          b.setAttribute(
            "aria-pressed",
            String(b.getAttribute("aria-pressed") !== "true")
          );
          const wi = $("w-i");
          if (wi) {
            wi.classList.remove("err");
            const err = wi.querySelector(".kxe");
            if (err) err.textContent = "";
          }
        };
      }

      const kp = $("k-p") as HTMLSelectElement;
      if (kp) {
        kp.onchange = (ev: Event) => {
          const el = ev.target as HTMLSelectElement;
          const o = el.value === "Other POS";
          const wo = $("w-o");
          if (wo) wo.hidden = !o;
          const wp = $("w-p");
          if (wp) {
            wp.classList.remove("err");
            const err = wp.querySelector(".kxe");
            if (err) err.textContent = "";
          }
          if (o) {
            const ko = $("k-o");
            if (ko) ko.focus();
          }
        };
      }

      ["k-n", "k-c", "k-o"].forEach((id) => {
        const el = $(id);
        if (el) {
          el.oninput = () => {
            const wrapId = id === "k-n" ? "w-n" : id === "k-c" ? "w-c" : "w-o";
            const w = $(wrapId);
            if (w) {
              w.classList.remove("err");
              const err = w.querySelector(".kxe");
              if (err) err.textContent = "";
            }
          };
        }
      });

      function bad(id: string, m: string) {
        const w = $(id);
        if (w) {
          w.classList.add("err");
          const err = w.querySelector(".kxe");
          if (err) err.textContent = m;
        }
      }

      function clr() {
        form.querySelectorAll(".kxi").forEach((w) => {
          w.classList.remove("err");
          const e = w.querySelector(".kxe");
          if (e) e.textContent = "";
        });
        if (sm) {
          sm.className = "ps";
          if (tk > -1) {
            sm.textContent = "✓ " + sl();
          } else {
            sm.textContent = "Choose a date and time for your 20-minute demo.";
          }
        }
      }

      function picks() {
        if (!kc) return [];
        return [].filter
          .call(kc.children, (b: any) => b.getAttribute("aria-pressed") === "true")
          .map((b: any) => b.textContent);
      }

      function validateForm(): boolean {
        clr();
        let valid = true;
        let firstErrEl: HTMLElement | null = null;

        const kn = $("k-n") as HTMLInputElement;
        const kcInput = $("k-c") as HTMLInputElement;
        const kpSelect = $("k-p") as HTMLSelectElement;
        const koInput = $("k-o") as HTMLInputElement;

        // 1. Name validation
        if (!kn?.value.trim()) {
          bad("w-n", "Please tell us your name.");
          valid = false;
          if (!firstErrEl) firstErrEl = kn;
        }

        // 2. Contact validation (phone or email)
        const c = kcInput?.value.trim() || "";
        if (!(/@/.test(c) || c.replace(/\D/g, "").length >= 7)) {
          bad("w-c", "Enter a phone number or email we can reach you on.");
          valid = false;
          if (!firstErrEl) firstErrEl = kcInput;
        }

        // 3. Channels / Interest validation
        if (!picks().length) {
          bad("w-i", "Choose at least one option.");
          valid = false;
          if (!firstErrEl) firstErrEl = $("kc");
        }

        // 4. POS validation
        if (!kpSelect?.value) {
          bad("w-p", "Please select your POS system.");
          valid = false;
          if (!firstErrEl) firstErrEl = kpSelect;
        } else if (kpSelect.value === "Other POS" && !koInput?.value.trim()) {
          bad("w-o", "Tell us which POS you use.");
          valid = false;
          if (!firstErrEl) firstErrEl = koInput;
        }

        // 5. Time slot validation
        if (tk < 0) {
          if (sm) {
            sm.className = "ps pe";
            sm.textContent = "Please pick a date and a time slot.";
          }
          valid = false;
          if (!firstErrEl) firstErrEl = $("ts") || $("ds");
        }

        if (!valid && firstErrEl) {
          firstErrEl.scrollIntoView({ behavior: "smooth", block: "center" });
          if (typeof (firstErrEl as any).focus === "function") {
            (firstErrEl as any).focus();
          }
        }

        return valid;
      }

      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const kpVal = ( $("k-p") as HTMLSelectElement )?.value || "";
        const koVal = ( $("k-o") as HTMLInputElement )?.value.trim() || "";
        const pos = kpVal === "Other POS" ? "Other: " + koVal : kpVal;
        const p = picks().join(", ") || "Voice agent";
        const n = ( $("k-n") as HTMLInputElement )?.value.trim() || "";
        const r = ( $("k-r") as HTMLInputElement )?.value.trim() || "";
        const c = ( $("k-c") as HTMLInputElement )?.value.trim() || "";
        const m = ( $("k-m") as HTMLTextAreaElement )?.value.trim() || "";
        const slotStr = sl();

        if (nb) {
          nb.setAttribute("disabled", "true");
          nb.textContent = "Booking demo...";
        }

        try {
          await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: n,
              restaurant: r,
              contact: c,
              interestedIn: p,
              pos: pos,
              slot: slotStr,
              tz: tz,
              notes: m,
            }),
          });
        } catch (err) {
          console.error("Error sending demo request via SMTP:", err);
        } finally {
          if (nb) {
            nb.removeAttribute("disabled");
            nb.textContent = "Book Demo";
          }
        }

        if (tk > -1 && D[dk] && SL[tk]) {
          const stDate = new Date(D[dk]);
          stDate.setHours(SL[tk][0], SL[tk][1], 0, 0);
          const enDate = new Date(stDate.getTime() + 12e5);
          const z = (t: Date) =>
            t.getFullYear() +
            ("0" + (t.getMonth() + 1)).slice(-2) +
            ("0" + t.getDate()).slice(-2) +
            "T" +
            ("0" + t.getHours()).slice(-2) +
            ("0" + t.getMinutes()).slice(-2) +
            "00";

          const kgc = $("kgc") as HTMLAnchorElement;
          if (kgc) {
            kgc.href =
              "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
              encodeURIComponent("CallAutomate demo") +
              "&dates=" +
              z(stDate) +
              "/" +
              z(enDate) +
              "&ctz=" +
              encodeURIComponent(tz) +
              "&details=" +
              encodeURIComponent(
                "20-minute demo of CallAutomate for " + (r || n)
              );
          }
        }

        const ksu = $("ksu");
        if (ksu) {
          ksu.innerHTML =
            "<span><b>When</b>" +
            slotStr +
            "</span><span><b>Name</b>" +
            n.replace(/</g, "&lt;") +
            "</span><span><b>Restaurant</b>" +
            r.replace(/</g, "&lt;") +
            "</span><span><b>POS</b>" +
            pos.replace(/</g, "&lt;") +
            "</span><span><b>Interested in</b>" +
            p +
            "</span>";
        }

        form.hidden = true;
        const kdone = $("kdone");
        if (kdone) kdone.hidden = false;
        const kxf = $("kxf");
        if (kxf) kxf.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };

      const kre = $("kre");
      if (kre) {
        kre.onclick = () => {
          form.reset();
          tk = -1;
          dk = 0;
          paint();
          if (sm) {
            sm.className = "ps";
            sm.textContent = "Choose a date and time for your 20-minute demo.";
          }
          if (kc) {
            [].forEach.call(kc.children, (b: any, idx: number) => {
              b.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
            });
          }
          const wo = $("w-o");
          if (wo) wo.hidden = true;
          const kdone = $("kdone");
          if (kdone) kdone.hidden = true;
          form.hidden = false;
          clr();
        };
      }
    })();

    // Module 15: Reduced Motion Toggle
    (() => {
      const b = document.getElementById("mot");
      if (!b) return;
      const r = document.documentElement.classList.contains("rm");
      b.setAttribute("aria-pressed", String(r));
      b.setAttribute(
        "aria-label",
        r ? "Play animations" : "Reduce motion"
      );
      b.title = r ? "Play animations" : "Reduce motion";

      b.onclick = () => {
        const on = document.documentElement.classList.toggle("rm");
        let ok = 0;
        try {
          localStorage.setItem("ca-rm", on ? "1" : "0");
          ok = localStorage.getItem("ca-rm") === (on ? "1" : "0") ? 1 : 0;
        } catch {}
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute(
          "aria-label",
          on ? "Play animations" : "Reduce motion"
        );
        b.title = on ? "Play animations" : "Reduce motion";
        if (ok) location.reload();
      };
    })();

    return () => {
      const tryBox = document.getElementById("try") as any;
      if (tryBox?._demoCleanup) tryBox._demoCleanup();
      if ((window as any).__orderDemoCleanup) {
        (window as any).__orderDemoCleanup();
      }
      if ((window as any).__toastInterval) {
        clearInterval((window as any).__toastInterval);
      }
      if ((window as any).__toastTimeout) {
        clearTimeout((window as any).__toastTimeout);
      }

      ["vd", "wab", "mtb"].forEach((id) => {
        const el = document.getElementById(id) as any;
        if (el?._demoCleanup) el._demoCleanup();
      });
      const ovEl = document.getElementById("ov");
      const wbwEl = ovEl?.parentNode as any;
      if (wbwEl?._demoCleanup) wbwEl._demoCleanup();
    };
  }, []);

  return (
    <>
      <button
        className="snd mot"
        id="mot"
        type="button"
        aria-label="Reduce motion"
        aria-pressed="false"
        title="Reduce motion"
      >
        <svg className="m0" viewBox="0 0 24 24">
          <path d="M8 5v14M16 5v14" />
        </svg>
        <svg className="m1" viewBox="0 0 24 24">
          <path d="M7 5l12 7-12 7z" />
        </svg>
      </button>

      <button
        className="snd"
        id="snd"
        type="button"
        aria-label="Turn sound on"
        aria-pressed="false"
      >
        <svg className="s0" viewBox="0 0 24 24">
          <path d="M11 5L6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6" />
        </svg>
        <svg className="s1" viewBox="0 0 24 24">
          <path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      </button>

      <a className="skip" href="#products">
        Skip to content
      </a>
      <div id="cur"></div>
      <div id="cdt"></div>
      <div id="pg"></div>

      <div
        id="in"
        className="ring"
        role="dialog"
        aria-label="Welcome to CallAutomate"
      >
        <div className="icb">
          <div className="av3">
            <u></u>
            <u></u>
            <u></u>
            <img alt="" id="ia" src={LOGO_SRC} />
          </div>
          <b className="icn">CallAutomate</b>
          <span className="ics" id="ics">
            Incoming call
          </span>
          <div className="vw" id="ivw" aria-hidden="true"></div>
          <p className="icp" id="icp" aria-live="polite"></p>
          <div className="iab">
            <button className="ans" id="ians" type="button">
              <svg viewBox="0 0 24 24">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              </svg>
              Answer
            </button>
            <button className="skp" id="iskp" type="button">
              Skip
            </button>
          </div>
          <small className="ih">Sound is on. Tap Answer to hear it.</small>
        </div>
      </div>

      <noscript>
        <style>{`#in{display:none}.mk b{transform:none}`}</style>
      </noscript>

      <nav id="nav" aria-label="Main">
        <a className="brand" href="#home">
          <img src={LOGO_SRC} alt="" />
          CallAutomate
        </a>
        <ul className="nl">
          <li>
            <a href="#home" data-s="home">
              Home
            </a>
          </li>
          <li className="dd">
            <button
              className="dt"
              data-s="products"
              aria-expanded="false"
              aria-haspopup="true"
            >
              Products
              <svg className="chv" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div className="dm2">
              <a href="#p-voice">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                  </svg>
                </i>
                <div>
                  <b>AI voice agent</b>
                  <span>Answers calls and takes orders</span>
                </div>
              </a>
              <a href="#p-wa">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M4 5h16v11H9l-5 4z" />
                  </svg>
                </i>
                <div>
                  <b>WhatsApp chatbot</b>
                  <span>Orders and payments in chat</span>
                </div>
              </a>
              <a href="#p-web">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M3 5h18v14H3zM3 9h18" />
                  </svg>
                </i>
                <div>
                  <b>AI ordering website</b>
                  <span>Direct orders, no commission</span>
                </div>
              </a>
              <a href="#p-meta">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M7 8c-3 0-4 8 0 8 3 0 5-8 10-8 4 0 4 8 0 8-5 0-7-8-10-8z" />
                  </svg>
                </i>
                <div>
                  <b>Meta chatbot</b>
                  <span>Instagram and Messenger DMs</span>
                </div>
              </a>
              <a className="ma" href="#story">
                See how it works <span>→</span>
              </a>
            </div>
          </li>
          <li>
            <a href="#roi" data-s="roi">
              ROI calculator
            </a>
          </li>
          <li>
            <a href="#integrations" data-s="integrations">
              Integrations
            </a>
          </li>
          <li>
            <a href="#contact" data-s="contact">
              Contact us
            </a>
          </li>
        </ul>
        <div className="nr">
          <a className="btn p nb" href="#contact">
            Book a demo
          </a>
          <button
            className="hb"
            id="hb2"
            aria-label="Open menu"
            aria-expanded="false"
            aria-controls="mp"
          >
            <i></i>
            <i></i>
          </button>
        </div>
      </nav>

      <div className="mp" id="mp" aria-hidden="true">
        <div className="mpi">
          <a href="#home">Home</a>
          <button className="mpd" aria-expanded="false">
            Products
            <svg className="chv" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="mps">
            <a href="#p-voice">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                </svg>
              </i>
              <div>AI voice agent</div>
            </a>
            <a href="#p-wa">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M4 5h16v11H9l-5 4z" />
                </svg>
              </i>
              <div>WhatsApp chatbot</div>
            </a>
            <a href="#p-web">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M3 5h18v14H3zM3 9h18" />
                </svg>
              </i>
              <div>AI ordering website</div>
            </a>
            <a href="#p-meta">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M7 8c-3 0-4 8 0 8 3 0 5-8 10-8 4 0 4 8 0 8-5 0-7-8-10-8z" />
                </svg>
              </i>
              <div>Meta chatbot</div>
            </a>
            <a href="#story">
              <i>→</i>
              <div>How it works</div>
            </a>
          </div>
          <a href="#roi">ROI calculator</a>
          <a href="#integrations">Integrations</a>
          <a href="#contact">Contact us</a>
          <a className="btn p" href="#contact">
            Book a free demo
          </a>
        </div>
      </div>

      <header className="hero" id="home">
        <div
          className="gt"
          aria-hidden="true"
          data-d="1"
          style={{ left: 0, right: 0, bottom: "-.06em", textAlign: "center" }}
        >
          Always on
        </div>
        <canvas id="cv" aria-hidden="true"></canvas>
        <div className="w">
          <div className="hg">
            <div className="ht">
              <span className="pill">
                <i></i>Meet CallAutomate: the AI that picks up for you
              </span>
              <h1>
                <em className="mk">
                  <b style={{ "--d": 0 } as React.CSSProperties}>Every</b>
                </em>{" "}
                <em className="mk">
                  <b style={{ "--d": 1 } as React.CSSProperties}>call</b>
                </em>{" "}
                <em className="mk">
                  <b style={{ "--d": 2 } as React.CSSProperties}>answered.</b>
                </em>{" "}
                <span>
                  <em className="mk">
                    <b style={{ "--d": 3 } as React.CSSProperties}>Every</b>
                  </em>{" "}
                  <em className="mk">
                    <b style={{ "--d": 4 } as React.CSSProperties}>order</b>
                  </em>{" "}
                  <em className="mk">
                    <b style={{ "--d": 5 } as React.CSSProperties}>in</b>
                  </em>{" "}
                  <em className="mk">
                    <b style={{ "--d": 6 } as React.CSSProperties}>your</b>
                  </em>{" "}
                  <em className="mk">
                    <b style={{ "--d": 7 } as React.CSSProperties}>POS.</b>
                  </em>
                </span>
              </h1>
              <p className="lead">
                Voice agents, WhatsApp and Meta chatbots, and a full AI ordering
                website, wired into Toast, Clover and Square.
              </p>
              <div className="cta">
                <a className="btn p" href="#contact">
                  Book a free demo
                </a>
                <a className="btn" href="#try">
                  Watch an order happen
                </a>
                <button
                  className="btn mic"
                  id="mic"
                  type="button"
                  onClick={() => setIsVoiceOrbOpen(true)}
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                  <span>Talk to the orb</span>
                </button>
              </div>
            </div>
            <div className="orb">
              <div className="fo" aria-hidden="true"></div>
              <div className="orr"></div>
              <canvas id="oc" aria-hidden="true"></canvas>
              <div className="orr f"></div>
              <div className="pul" aria-hidden="true">
                <u></u>
                <u></u>
                <u></u>
              </div>
              <div className="core">
                <img alt="" id="cr" src={LOGO_SRC} />
              </div>
              <div className="tst" id="tst" aria-hidden="true"></div>
              <span className="chip chip-voice">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                  </svg>
                </i>
                <span>AI voice</span>
              </span>
              <span className="chip chip-wa">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M4 5h16v11H9l-5 4z" />
                  </svg>
                </i>
                <span>WhatsApp</span>
              </span>
              <span className="chip chip-meta">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M7 8c-3 0-4 8 0 8 3 0 5-8 10-8 4 0 4 8 0 8-5 0-7-8-10-8z" />
                  </svg>
                </i>
                <span>Meta DMs</span>
              </span>
              <span className="chip chip-web">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M3 5h18v14H3zM3 9h18" />
                  </svg>
                </i>
                <span>AI website</span>
              </span>
              <span className="chip chip-pos">
                <i>
                  <svg viewBox="0 0 24 24">
                    <path d="M4 7h16v10H4zM8 12h8M12 7V4M12 20v-3" />
                  </svg>
                </i>
                <span>Your POS</span>
              </span>
            </div>
          </div>
          <div
            className="con"
            id="try"
            role="region"
            aria-label="Interactive order demo"
          >
            <div className="tabs" role="tablist">
              <button role="tab" data-k="call" aria-selected="true">
                Phone call
              </button>
              <button role="tab" data-k="wa" aria-selected="false">
                WhatsApp
              </button>
              <button role="tab" data-k="web" aria-selected="false">
                Website
              </button>
              <small>Tap a channel to replay</small>
            </div>
            <div className="cb">
              <div className="ch" id="ch" aria-live="polite"></div>
              <div className="tk">
                <h3>Order ticket · live in your POS</h3>
                <div id="tl"></div>
                <div id="st"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="products" style={{ paddingTop: "70px" }}>
        <div
          className="gt"
          aria-hidden="true"
          data-d="-1"
          style={{ top: "24px", right: "-1%", textAlign: "right" }}
        >
          Channels
        </div>
        <div className="w">
          <div
            className="pill"
            style={{
              marginBottom: "16px",
              borderColor: "rgba(37,99,235,.25)",
              background: "rgba(37,99,235,.06)",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <i
              style={{
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              }}
            ></i>{" "}
            Channels &amp; Ordering Suite
          </div>
          <h2 className="h2">
            Four AI products. <br />
            One restaurant that{" "}
            <span className="gr-logo">never misses an order.</span>
          </h2>
          <p className="sub">
            Run one or run them all. Press play by scrolling: each demo below is
            a real flow, from the first hello to the order in your POS.
          </p>
          <div className="pj">
            <a href="#p-voice" className="pj-voice">
              <i></i>Voice agent
            </a>
            <a href="#p-wa" className="pj-wa">
              <i></i>WhatsApp
            </a>
            <a href="#p-web" className="pj-web">
              <i></i>AI website
            </a>
            <a href="#p-meta" className="pj-meta">
              <i></i>Meta DMs
            </a>
          </div>

          <div className="pr" id="p-voice">
            <div className="tx">
              <span className="ib">
                <svg viewBox="0 0 24 24">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                </svg>
              </span>
              <h3 style={{ color: "#2563eb" }}>AI voice agent</h3>
              <p>
                Answers on the first ring, takes the whole order in a natural
                voice and never puts anyone on hold.
              </p>
              <ul>
                <li>Handles modifiers, allergens and upsells</li>
                <li>Takes every call at once, even at the Friday rush</li>
                <li>Order and receipt land in your POS</li>
              </ul>
              <a className="btn" href="#contact">
                See it on your menu
              </a>
            </div>
            <div className="dm">
              <div className="vd" id="vd">
                <div className="vcl">
                  <div className="vh">
                    <img className="pa" alt="" src={LOGO_SRC} />
                    <div>
                      <b>Incoming call</b>
                      <small id="vs">Incoming call</small>
                    </div>
                    <em id="vt">0:00</em>
                  </div>
                  <div className="vw"></div>
                  <div className="vcp"></div>
                </div>
                <div className="vr">
                  <div className="vrh">
                    <b>Tony&apos;s Pizzeria</b>
                    <small>Order #1044</small>
                  </div>
                  <ul id="vri"></ul>
                  <div className="vt">
                    <span>Total</span>
                    <b id="vtv">€0.00</b>
                  </div>
                  <div className="vs" id="vstp">
                    Order placed
                  </div>
                  <div className="vsd" id="vsd">
                    ✓ Sent to Toast
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pr rv" id="p-wa">
            <div className="tx">
              <span className="ib">
                <svg viewBox="0 0 24 24">
                  <path d="M4 5h16v11H9l-5 4z" />
                </svg>
              </span>
              <h3 style={{ color: "#16a34a" }}>WhatsApp chatbot</h3>
              <p>
                Customers message you like a friend. The bot builds the basket,
                sends the payment link and confirms the order.
              </p>
              <ul>
                <li>Quick-reply buttons and secure payment links</li>
                <li>Order updates sent automatically</li>
                <li>Hands over to your team whenever asked</li>
              </ul>
              <a className="btn" href="#contact">
                See it on your menu
              </a>
            </div>
            <div className="dm">
              <div className="ph">
                <div className="pw">
                  <div className="pwh">
                    <img className="pa" alt="" src={LOGO_SRC} />
                    <div>
                      <b>Tony&apos;s Pizzeria</b>
                      <small>online</small>
                    </div>
                  </div>
                  <div className="pwb" id="wab"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pr" id="p-web">
            <div className="tx">
              <span className="ib">
                <svg viewBox="0 0 24 24">
                  <path d="M3 5h18v14H3zM3 9h18" />
                </svg>
              </span>
              <h3 style={{ color: "#ea580c" }}>AI ordering website</h3>
              <p>
                Your own branded ordering site with an AI assistant that fills
                the basket for customers. No marketplace commission.
              </p>
              <ul>
                <li>Customers type or tap and the basket builds itself</li>
                <li>Direct orders, no commission</li>
                <li>Always in step with your live menu</li>
              </ul>
              <a className="btn" href="#contact">
                See it on your menu
              </a>
            </div>
            <div className="dm">
              <div className="br2">
                <div className="bu">
                  <i></i>
                  <i></i>
                  <i></i>
                  <span>tonyspizzeria.com/order</span>
                </div>
                <div className="bw">
                  <div className="mn2">
                    <div className="mi">
                      <b>Pepperoni</b>
                      <span>€13.00</span>
                      <em></em>
                    </div>
                    <div className="mi">
                      <b>Garlic bread</b>
                      <span>€5.50</span>
                      <em></em>
                    </div>
                    <div className="mi">
                      <b>Cola</b>
                      <span>€2.00</span>
                      <em></em>
                    </div>
                    <div className="mi">
                      <b>Margherita</b>
                      <span>€11.00</span>
                      <em></em>
                    </div>
                  </div>
                  <div className="ct">
                    <h4>Your order</h4>
                    <ul id="cu"></ul>
                    <div className="ctt">
                      <span>Total</span>
                      <b id="ctv">€0.00</b>
                    </div>
                    <div className="co" id="co">
                      Checkout
                    </div>
                  </div>
                  <div className="aib">
                    <div className="am" id="am"></div>
                    <div className="ain">
                      <span id="ait"></span>
                      <u>Send</u>
                    </div>
                  </div>
                  <div className="ov" id="ov">
                    <div className="ck2">✓</div>
                    <b>Order confirmed</b>
                    <span>#1045 · Sent to Toast</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pr rv" id="p-meta">
            <div className="tx">
              <span className="ib">
                <svg viewBox="0 0 24 24">
                  <path d="M7 8c-3 0-4 8 0 8 3 0 5-8 10-8 4 0 4 8 0 8-5 0-7-8-10-8z" />
                </svg>
              </span>
              <h3 style={{ color: "#e11d48" }}>Meta chatbot</h3>
              <p>
                Answers Instagram and Messenger DMs about hours, menu and
                bookings in seconds, even at 2 am, and turns chats into orders.
              </p>
              <ul>
                <li>Instant replies to every DM</li>
                <li>Turns questions into paid orders</li>
                <li>Same menu and rules as your other channels</li>
              </ul>
              <a className="btn" href="#contact">
                See it on your menu
              </a>
            </div>
            <div className="dm">
              <div className="ph mm">
                <div className="pw">
                  <div className="pwh mt">
                    <img className="pa" alt="" src={LOGO_SRC} />
                    <div>
                      <b>tonys_pizzeria</b>
                      <small>Instagram · Active now</small>
                    </div>
                  </div>
                  <div className="pwb" id="mtb"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <div className="stk">
          <div
            className="gt"
            aria-hidden="true"
            data-d="1"
            style={{ left: "-1%", bottom: "-.1em" }}
          >
            Four steps
          </div>
          <div className="w sg">
            <div>
              <h2 className="h2">One call. Four steps. Zero staff.</h2>
              <ol id="stp">
                <li>The phone rings</li>
                <li>AI answers and listens</li>
                <li>The order is understood</li>
                <li>It lands in your POS</li>
              </ol>
            </div>
            <div className="dev" id="dev"></div>
          </div>
        </div>
      </section>

      <section id="roi">
        <div
          className="gt"
          aria-hidden="true"
          data-d="1"
          style={{
            right: "6%",
            top: "-.12em",
            fontSize: "clamp(220px,42vw,640px)",
          }}
        >
          €
        </div>
        <div className="w">
          <div
            className="pill"
            style={{
              marginBottom: "16px",
              borderColor: "rgba(37,99,235,.25)",
              background: "rgba(37,99,235,.06)",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <i
              style={{
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              }}
            ></i>{" "}
            Interactive Revenue Calculator
          </div>
          <h2 className="h2">
            What is a missed call really{" "}
            <span className="gr-logo">costing you?</span>
          </h2>
          <p className="sub">
            Move the sliders. It&apos;s an estimate built from your own numbers,
            not a promise.
          </p>
          <div className="cf">
            <div className="fm">
              <label>
                Calls you miss each week <b id="vw">40</b>
                <input
                  type="range"
                  id="cw"
                  min="5"
                  max="200"
                  defaultValue="40"
                />
              </label>
              <label>
                Average order value <b id="va">€28</b>
                <input
                  type="range"
                  id="ca"
                  min="10"
                  max="80"
                  defaultValue="28"
                />
              </label>
              <label>
                Missed calls that would have ordered <b id="vc">60%</b>
                <input
                  type="range"
                  id="cc"
                  min="20"
                  max="90"
                  defaultValue="60"
                />
              </label>
            </div>
            <div className="rs">
              <span>Revenue you could recover every month</span>
              <div className="od" id="od" aria-live="polite"></div>
              <div className="rr">
                <div>
                  <b id="oo">0</b>orders a month
                </div>
                <div>
                  <b id="yy">€0</b>a year
                </div>
              </div>
              <a
                className="btn"
                href="#contact"
                style={{ width: "fit-content", marginTop: "12px" }}
              >
                Get this for my restaurant
              </a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 16px 100px" }}>
        <div className="rush">
          <div
            className="gt"
            aria-hidden="true"
            data-d="-1"
            style={{
              right: "3%",
              bottom: "-.1em",
              fontSize: "clamp(140px,30vw,440px)",
            }}
          >
            7 pm
          </div>
          <div className="w">
            <h2 className="h2">Friday, 7 pm. Twelve phones ringing at once.</h2>
            <p className="sub">
              One person can take one call. CallAutomate takes them all at the
              same time. Watch it happen.
            </p>
            <div className="lines" id="lines"></div>
            <div className="stats">
              <div>
                <b id="n1">0</b>
                <span>calls answered</span>
              </div>
              <div>
                <b id="n2">€0</b>
                <span>in orders captured</span>
              </div>
              <div>
                <b>0</b>
                <span>callers on hold</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" style={{ paddingTop: "0" }}>
        <div className="w">
          <div
            className="pill"
            style={{
              marginBottom: "20px",
              borderColor: "rgba(37,99,235,.25)",
              background: "rgba(37,99,235,.06)",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <i
              style={{
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              }}
            ></i>{" "}
            The CallAutomate Advantage
          </div>
          <p className="rv" id="rv">
            Your busiest hour shouldn&apos;t be your biggest leak. CallAutomate
            answers every call, chat and DM at once, so no order walks out the
            door.
          </p>
          <div className="cmp">
            <div className="off">
              <h3>Without CallAutomate</h3>
              <ul>
                <li>Phones ring out during the rush</li>
                <li>DMs sit unread overnight</li>
                <li>Staff retype every order</li>
                <li>Marketplaces take a cut</li>
              </ul>
            </div>
            <div className="on">
              <h3>With CallAutomate</h3>
              <ul>
                <li>Every call answered instantly</li>
                <li>Chats replied to, 24/7</li>
                <li>Orders flow into your POS</li>
                <li>Direct orders you keep</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="big" aria-hidden="true">
        <div id="r1">
          <span>Every call.</span>
          <span className="o">Every chat.</span>
          <span>Every order.</span>
          <span className="o">Every call.</span>
        </div>
        <div id="r2">
          <span className="o">Never missed.</span>
          <span>Never late.</span>
          <span className="o">Never busy.</span>
          <span>Never missed.</span>
        </div>
      </div>

      <section id="integrations" style={{ paddingTop: "20px" }}>
        <div
          className="gt"
          aria-hidden="true"
          data-d="1"
          style={{ left: "-1%", top: "10px" }}
        >
          Synced
        </div>
        <div className="w">
          <div
            className="pill"
            style={{
              marginBottom: "16px",
              borderColor: "rgba(37,99,235,.25)",
              background: "rgba(37,99,235,.06)",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <i
              style={{
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              }}
            ></i>{" "}
            Point of Sale Integration
          </div>
          <h2 className="h2">
            Plugs straight into the{" "}
            <span className="gr-logo">POS you already use.</span>
          </h2>
          <p className="sub">
            Choose your system and watch real-looking orders land on its screen,
            the moment a customer finishes talking.
          </p>
          <div className="ig">
            <div className="pl" id="pl"></div>
            <div className="dv2" id="dv2">
              <div className="bz">
                <div className="sc">
                  <div className="xh">
                    <b id="xn">Toast</b>
                    <span>Orders</span>
                    <em>
                      <u></u>
                      <s id="xc"></s>
                    </em>
                  </div>
                  <div className="xb">
                    <div className="xr" id="xr"></div>
                    <div className="sy2">
                      <i></i>
                      <span id="sm"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="meet" style={{ paddingTop: "20px" }}>
        <div
          className="gt"
          aria-hidden="true"
          data-d="-1"
          style={{ right: "0", bottom: "-.1em" }}
        >
          Your AI
        </div>
        <div className="w">
          <div
            className="pill"
            style={{
              marginBottom: "16px",
              borderColor: "rgba(37,99,235,.25)",
              background: "rgba(37,99,235,.06)",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <i
              style={{
                background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              }}
            ></i>{" "}
            Instant Agent Setup
          </div>
          <h2 className="h2">
            Meet your agent.{" "}
            <span className="gr-logo">Name it in ten seconds.</span>
          </h2>
          <p className="sub">
            Type your restaurant, pick a cuisine and your POS, and watch your
            agent take shape.
          </p>
          <div className="cf">
            <div className="fm">
              <label>
                Restaurant name
                <input
                  id="nm"
                  defaultValue="Tony's Pizzeria"
                  maxLength={26}
                  autoComplete="off"
                />
              </label>
              <div className="fg">
                <span>Cuisine</span>
                <div className="opt" id="cz">
                  <button aria-pressed="true">Pizza</button>
                  <button aria-pressed="false">Indian</button>
                  <button aria-pressed="false">Burgers</button>
                  <button aria-pressed="false">Sushi</button>
                </div>
              </div>
              <div className="fg">
                <span>Your POS</span>
                <div className="opt" id="ps">
                  <button aria-pressed="true">Toast</button>
                  <button aria-pressed="false">Clover</button>
                  <button aria-pressed="false">Square</button>
                </div>
              </div>
            </div>
            <div className="pv" id="pv">
              <div className="pvh">
                <span className="av"></span>
                <div>
                  <b id="pn"></b>
                  <small>Voice · WhatsApp · Website</small>
                </div>
              </div>
              <p className="q" id="gr" aria-live="polite"></p>
              <div className="mn" id="mn"></div>
              <div className="sy" id="sy"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" style={{ paddingTop: "0" }}>
        <div
          className="gt"
          aria-hidden="true"
          data-d="-1"
          style={{ right: "0", bottom: "-.1em" }}
        >
          FAQ
        </div>
        <div className="w">
          <h2 className="h2" style={{ marginBottom: "40px" }}>
            Questions owners ask us first.
          </h2>
          <details>
            <summary>How long does setup take?</summary>
            <p>
              Most restaurants are live within days. It depends on your menu
              size and POS, and we handle the connection and training for you.
            </p>
          </details>
          <details>
            <summary>Which POS systems do you connect to?</summary>
            <p>
              Toast, Clover and Square are our core integrations. Tell us what
              you use and we&apos;ll confirm how it connects.
            </p>
          </details>
          <details>
            <summary>What if a customer wants a real person?</summary>
            <p>
              The agent can pass the call or chat to your team whenever someone
              asks, or when it can&apos;t help with a request.
            </p>
          </details>
          <details>
            <summary>Do I need a new phone number?</summary>
            <p>
              No. We can work with your existing number so customers keep
              calling the one they already know.
            </p>
          </details>
          <details>
            <summary>Can I start with just one channel?</summary>
            <p>
              Yes. Many owners start with the voice agent or WhatsApp and add the
              others later.
            </p>
          </details>
        </div>
      </section>

      <section className="kx" id="contact">
        <div className="w">
          <div className="kxg">
            <div className="kxl">
              <h2>Hear your menu taken by AI.</h2>
              <p>
                Book a 20-minute live demo and see CallAutomate handle orders on your actual menu.
              </p>
              <ul>
                <li>
                  <i>
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6h16M4 12h16M4 18h10" />
                    </svg>
                  </i>
                  <span>
                    <b>Built around your menu</b>
                    <br />
                    Your dishes, prices and opening hours, set up for you.
                  </span>
                </li>
                <li>
                  <i>
                    <svg viewBox="0 0 24 24">
                      <path d="M9 7V3m6 4V3M7 7h10v5a5 5 0 0 1-10 0zM12 17v4" />
                    </svg>
                  </i>
                  <span>
                    <b>Works with your POS</b>
                    <br />
                    Toast, Clover, Square, Lightspeed and more.
                  </span>
                </li>
                <li>
                  <i>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </i>
                  <span>
                    <b>Zero risk, no obligation</b>
                    <br />
                    See it working on live calls before you decide.
                  </span>
                </li>
                <li>
                  <i>
                    <svg viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </i>
                  <span>
                    <b>Live in under 48 hours</b>
                    <br />
                    Zero new hardware, keep your existing phone number.
                  </span>
                </li>
              </ul>
              <div className="ci-card">
                <h3>Contact Information</h3>
                <div className="ci-list">
                  <a href="mailto:support@callautomate.ai" className="ci-item">
                    <div className="ci-icon ci-email">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <path d="M22 6l-10 7L2 6" />
                      </svg>
                    </div>
                    <div className="ci-details">
                      <span className="ci-label">EMAIL US</span>
                      <span className="ci-val">support@callautomate.ai</span>
                    </div>
                  </a>

                  <a href="tel:+35361555222" className="ci-item">
                    <div className="ci-icon ci-call">
                      <svg viewBox="0 0 24 24">
                        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                      </svg>
                    </div>
                    <div className="ci-details">
                      <span className="ci-label">CALL US</span>
                      <span className="ci-val">+353-61-555-222</span>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/35361555222"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ci-item"
                  >
                    <div className="ci-icon ci-wa">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 5h16v11H9l-5 4z" />
                      </svg>
                    </div>
                    <div className="ci-details">
                      <span className="ci-label">WHATSAPP US</span>
                      <span className="ci-val ci-val-wa">+353-61-555-222</span>
                    </div>
                  </a>

                  <div className="ci-item">
                    <div className="ci-icon ci-clock">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </div>
                    <div className="ci-details">
                      <span className="ci-label">SUPPORT HOURS</span>
                      <span className="ci-val">24/7 Voice Monitoring &amp; Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="kxf" id="kxf">
              <form id="kf" noValidate>
                <div className="kxf-header">
                  <h3>Book Your 20-Minute Demo</h3>
                  <p>
                    See CallAutomate live on your menu, custom-configured for your restaurant and POS.
                  </p>
                </div>

                <div className="kxr">
                  <div className="kxi" id="w-n">
                    <label htmlFor="k-n">Your name</label>
                    <input
                      id="k-n"
                      autoComplete="name"
                      placeholder="Sam Taylor"
                    />
                    <small className="kxe"></small>
                  </div>
                  <div className="kxi">
                    <label htmlFor="k-r">Restaurant name</label>
                    <input
                      id="k-r"
                      autoComplete="organization"
                      placeholder="Tony's Pizzeria"
                    />
                  </div>
                </div>

                <div className="kxr" style={{ marginTop: "12px" }}>
                  <div className="kxi" id="w-c">
                    <label htmlFor="k-c">Phone or email</label>
                    <input
                      id="k-c"
                      autoComplete="email"
                      placeholder="Phone or email"
                    />
                    <small className="kxe"></small>
                  </div>
                  <div className="kxi" id="w-p">
                    <label htmlFor="k-p">Your POS system</label>
                    <select id="k-p">
                      <option value="">Select your POS</option>
                      <option>Toast</option>
                      <option>Clover</option>
                      <option>Square</option>
                      <option>Lightspeed</option>
                      <option>Revel</option>
                      <option>Epos Now</option>
                      <option>Other POS</option>
                      <option>I don&apos;t use a POS yet</option>
                    </select>
                    <small className="kxe"></small>
                  </div>
                </div>

                <div
                  className="kxi"
                  id="w-o"
                  style={{ marginTop: "10px" }}
                  hidden
                >
                  <label htmlFor="k-o">Which POS do you use?</label>
                  <input id="k-o" placeholder="Name of your POS" />
                  <small className="kxe"></small>
                </div>

                <div className="kxf-sec" style={{ marginTop: "14px", paddingTop: "12px" }}>
                  <div className="kxi" id="w-i">
                    <label>What are you interested in?</label>
                    <span className="kxc" id="kc">
                      <button type="button" aria-pressed="true">
                        Voice agent
                      </button>
                      <button type="button" aria-pressed="false">
                        WhatsApp chatbot
                      </button>
                      <button type="button" aria-pressed="false">
                        AI ordering website
                      </button>
                      <button type="button" aria-pressed="false">
                        Meta chatbot
                      </button>
                      <button type="button" aria-pressed="false">
                        Everything
                      </button>
                    </span>
                    <small className="kxe"></small>
                  </div>
                </div>

                <div className="kxf-sec" style={{ marginTop: "14px", paddingTop: "12px" }}>
                  <h4 className="kxh">Pick a date</h4>
                  <span
                    className="ds"
                    id="ds"
                    role="group"
                    aria-label="Choose a date"
                  ></span>
                  <h4 className="kxh" style={{ marginTop: "12px" }}>
                    Pick a time <small id="tz"></small>
                  </h4>
                  <span
                    className="ts"
                    id="ts"
                    role="group"
                    aria-label="Choose a time"
                  ></span>
                  <span className="ps" id="psum" aria-live="polite">
                    Choose a date and time for your 20-minute demo.
                  </span>
                </div>

                <div className="kxi" style={{ marginTop: "12px" }}>
                  <label htmlFor="k-m">
                    Anything we should know? <small>(optional)</small>
                  </label>
                  <textarea
                    id="k-m"
                    rows={2}
                    placeholder="Locations, current phone setup, special requests..."
                  ></textarea>
                </div>

                <div className="kxn" style={{ marginTop: "18px" }}>
                  <button className="btn p" id="kn" type="submit" style={{ width: "100%", justifyContent: "center" }}>
                    Book Demo
                  </button>
                </div>

                <div className="kxf-trust">
                  🔒 No obligation &bull; 20-min tailored demo &bull; Direct POS integration
                </div>
              </form>

              <div className="kxo" id="kdone" hidden>
                <div className="kxk">✓</div>
                <h3>Demo Request Received!</h3>
                <p>
                  We have received your demo request and our team has been notified at support@callautomate.ai. We will be in touch shortly to confirm your setup.
                </p>
                <div className="kxsu" id="ksu"></div>
                <a
                  className="btn p"
                  id="kgc"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="#"
                >
                  Add to Google Calendar
                </a>
                <button
                  className="kxb"
                  id="kre"
                  type="button"
                  style={{ display: "block", margin: "14px auto 0" }}
                >
                  Send another request
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="w">
          <div className="fg2">
            <div>
              <div className="brand">
                <img className="fl" alt="" src={LOGO_SRC} />
                CallAutomate
              </div>
              <p>
                AI voice agents, chatbots and ordering for restaurants and
                takeaways.
              </p>
            </div>
            <div>
              <h4>Products</h4>
              <a href="#products">Voice agent</a>
              <a href="#products">WhatsApp and Meta</a>
              <a href="#products">AI ordering website</a>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="#try">Live demo</a>
              <a href="#roi">Missed-call calculator</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Contact</h4>
              <a href="mailto:support@callautomate.ai">support@callautomate.ai</a>
              <a href="tel:+35361555222">+353-61-555-222</a>
              <a
                href="https://wa.me/35361555222"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#25d366" }}
              >
                WhatsApp: +353-61-555-222
              </a>
              <span className="fh">24/7 Voice Monitoring &amp; Support</span>
              <a href="#contact" style={{ marginTop: "6px", display: "inline-block" }}>
                Book a demo →
              </a>
            </div>
          </div>
          <div className="fb">
            <span>© 2026 CallAutomate</span>
            <span>Works with Toast, Clover and Square</span>
            <a href="#home" id="rpl">
              Replay intro
            </a>
          </div>
        </div>
        <div className="wm" aria-hidden="true">
          CallAutomate
        </div>
      </footer>

      <VoiceOrbScreen
        isOpen={isVoiceOrbOpen}
        onClose={() => setIsVoiceOrbOpen(false)}
      />
    </>
  );
}
