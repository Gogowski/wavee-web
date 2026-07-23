import{u as I,j as e,c as z}from"./index-BWqy4mrd.js";import{b as r,e as D}from"./router-D45NM8QT.js";import{c as P,g as _,a as $,S as C,f as B,C as L,X as W}from"./x-CzMEcJ_-.js";import"./react-vendor-brxDHbz2.js";const M=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]],E=P("credit-card",M);const O=[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]],T=P("key-round",O);function q(a){if(!a)return"без даты окончания";const t=new Date(a);return Number.isFinite(t.getTime())?t.toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"}):"без даты окончания"}function U({open:a,plan:t,onClose:i}){return r.useEffect(()=>{if(!a||typeof document>"u")return;const o=document.documentElement.style.overflow,l=document.body.style.overflow;return document.documentElement.style.overflow="hidden",document.body.style.overflow="hidden",()=>{document.documentElement.style.overflow=o,document.body.style.overflow=l}},[a]),!a||typeof document>"u"?null:D.createPortal(e.jsxs("div",{className:"wavee-sub-modal",role:"dialog","aria-modal":"true","aria-label":"Оплата подписки",children:[e.jsx("button",{type:"button",className:"wavee-sub-modal-backdrop",onClick:i,"aria-label":"Закрыть"}),e.jsxs("div",{className:"wavee-sub-modal-panel",children:[e.jsx("button",{type:"button",className:"wavee-sub-modal-close",onClick:i,"aria-label":"Закрыть",children:e.jsx(W,{size:18})}),e.jsxs("div",{className:"wavee-sub-modal-card",children:[e.jsx(E,{size:28}),e.jsx("h2",{children:"Оплата временно недоступна"}),e.jsxs("p",{children:["Оплатить ",t?.name||"подписку"," можно будет через некоторое время. Сейчас основной способ активации - промокод."]}),e.jsx("button",{type:"button",onClick:i,children:"Понятно"})]})]})]}),document.body)}function V({plan:a,active:t,billingCycle:i,onPayment:o}){const l=a.id==="pro",b=i==="monthly"?a.monthlyPriceRub:a.yearlyPriceRub;return e.jsxs("article",{className:`wavee-sub-plan${l?" is-featured":""}${t?" is-active":""}`,children:[e.jsxs("div",{className:"wavee-sub-plan-head",children:[e.jsxs("div",{children:[e.jsx("h3",{children:a.name}),e.jsx("p",{children:a.tagline})]}),a.badge?e.jsx("span",{children:a.badge}):null]}),e.jsxs("div",{className:"wavee-sub-price",children:[e.jsx("strong",{children:B(b)}),e.jsx("small",{children:i==="monthly"?"/ мес":"/ год"})]}),e.jsx("ul",{children:a.features.map(c=>e.jsxs("li",{children:[e.jsx(L,{size:17}),e.jsx("span",{children:c})]},c))}),e.jsx("button",{type:"button",onClick:()=>o(a),children:t?"Текущий план":a.cta})]})}function J(){const{accessToken:a,accessState:t,refreshSessionState:i}=I(),[o,l]=r.useState("monthly"),[b,c]=r.useState(null),[p,x]=r.useState(""),[w,f]=r.useState(""),[y,u]=r.useState(""),[X,g]=r.useState(!0),[j,k]=r.useState(!1),[N,v]=r.useState(null),d=b?.subscription??t?.subscription??null,S=r.useMemo(()=>_(d?.planId),[d?.planId]),h=d?.status==="active";r.useEffect(()=>{let s=!0;async function m(){if(!a){g(!1);return}g(!0),u("");try{const n=await z.getSubscription(a);s&&c(n)}catch(n){s&&u(n?.message||"Не удалось загрузить подписку")}finally{s&&g(!1)}}return m(),()=>{s=!1}},[a]);const R=async s=>{s.preventDefault();const m=p.trim();if(!m){u("Введите промокод");return}k(!0),u(""),f("");try{const n=await z.redeemPromoCode(m,a);c(A=>({...A??{},subscription:n.subscription,access:n.access})),x(""),f("Промокод активирован. Подписка подключена."),await i(a)}catch(n){u(n?.message||"Не удалось активировать промокод")}finally{k(!1)}};return e.jsxs("div",{className:"wavee-sub-page",children:[e.jsxs("section",{className:"wavee-sub-hero",children:[e.jsxs("div",{children:[e.jsx("p",{className:"wavee-sub-kicker",children:"Подписка"}),e.jsx("h1",{children:"Управление Wavee"}),e.jsx("p",{className:"wavee-sub-copy",children:"Оплата появится позже. Сейчас подписка подключается промокодом, который можно получить вручную или через бота."})]}),e.jsxs("div",{className:`wavee-sub-status${h?" is-active":""}`,children:[e.jsx($,{size:24}),e.jsx("span",{children:h?"Активна":"Не подключена"}),e.jsx("strong",{children:S?.name||"Нет плана"}),e.jsx("small",{children:h?`до ${q(d?.currentPeriodEnd)}`:"активируйте промокод"})]})]}),e.jsxs("section",{className:"wavee-sub-grid",children:[e.jsxs("div",{className:"wavee-sub-panel",children:[e.jsxs("div",{className:"wavee-sub-panel-head",children:[e.jsx(T,{size:22}),e.jsxs("div",{children:[e.jsx("h2",{children:"Промокод"}),e.jsx("p",{children:"Введите код, который выдал администратор Wavee."})]})]}),e.jsxs("form",{className:"wavee-sub-promo-form",onSubmit:R,children:[e.jsx("input",{value:p,onChange:s=>x(s.target.value),placeholder:"WAVEE-XXXX-XXXX-XXXX",autoCapitalize:"characters",autoComplete:"off"}),e.jsx("button",{type:"submit",disabled:j||!p.trim(),children:j?"Проверка...":"Активировать"})]}),w?e.jsx("div",{className:"wavee-sub-notice",children:w}):null,y?e.jsx("div",{className:"wavee-sub-error",children:y}):null]}),e.jsxs("div",{className:"wavee-sub-panel",children:[e.jsxs("div",{className:"wavee-sub-panel-head",children:[e.jsx(E,{size:22}),e.jsxs("div",{children:[e.jsx("h2",{children:"Оплата"}),e.jsx("p",{children:"Платежный модуль уже зарезервирован в интерфейсе."})]})]}),e.jsx("button",{type:"button",className:"wavee-sub-payment-stub",onClick:()=>v(S||C[1]),children:"Оплата временно недоступна"})]})]}),e.jsxs("section",{className:"wavee-sub-plans-section",children:[e.jsxs("div",{className:"wavee-sub-plans-head",children:[e.jsxs("div",{children:[e.jsx("p",{className:"wavee-sub-kicker",children:"Планы"}),e.jsx("h2",{children:"Три платных уровня без бесплатного тарифа"})]}),e.jsxs("div",{className:"wavee-sub-toggle",children:[e.jsx("button",{type:"button",className:o==="monthly"?"is-active":"",onClick:()=>l("monthly"),children:"Месяц"}),e.jsx("button",{type:"button",className:o==="yearly"?"is-active":"",onClick:()=>l("yearly"),children:"Год -20%"})]})]}),X?e.jsx("div",{className:"wavee-sub-loading",children:"Загрузка подписки..."}):e.jsx("div",{className:"wavee-sub-plans",children:C.map(s=>e.jsx(V,{plan:s,billingCycle:o,active:d?.status==="active"&&d?.planId===s.id,onPayment:v},s.id))})]}),e.jsx(U,{open:!!N,plan:N,onClose:()=>v(null)}),e.jsx("style",{children:`
        .wavee-sub-page {
          width: min(1280px, 100%);
          min-height: 100vh;
          margin: 0 auto;
          padding: calc(7.5rem + env(safe-area-inset-top)) clamp(1rem, 2.4vw, 2rem) calc(10rem + env(safe-area-inset-bottom));
          display: grid;
          gap: 1.25rem;
        }

        .wavee-sub-hero,
        .wavee-sub-panel,
        .wavee-sub-plan {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.022)), rgba(18, 19, 21, 0.68);
          box-shadow: 0 20px 44px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px) saturate(88%);
          -webkit-backdrop-filter: blur(20px) saturate(88%);
        }

        .wavee-sub-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
          gap: 1.25rem;
          align-items: stretch;
          padding: clamp(1.4rem, 3vw, 2.4rem);
          border-radius: 30px;
        }

        .wavee-sub-kicker {
          margin: 0 0 0.65rem;
          color: rgba(146, 169, 225, 0.9);
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .wavee-sub-hero h1,
        .wavee-sub-plans-head h2 {
          margin: 0;
          font-family: var(--wavee-display-font);
          font-size: clamp(2.2rem, 5vw, 4rem);
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .wavee-sub-copy {
          max-width: 66ch;
          margin: 1rem 0 0;
          color: rgba(255, 255, 255, 0.64);
          line-height: 1.6;
        }

        .wavee-sub-status {
          display: grid;
          align-content: center;
          gap: 0.35rem;
          padding: 1.4rem;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.62);
        }

        .wavee-sub-status.is-active {
          color: #dbe5ff;
          background: rgba(146, 169, 225, 0.11);
        }

        .wavee-sub-status strong {
          font-size: 1.5rem;
        }

        .wavee-sub-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
          gap: 1rem;
        }

        .wavee-sub-panel {
          border-radius: 26px;
          padding: 1.25rem;
          display: grid;
          gap: 1.1rem;
        }

        .wavee-sub-panel-head {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
        }

        .wavee-sub-panel h2 {
          margin: 0 0 0.25rem;
          font-size: 1.25rem;
        }

        .wavee-sub-panel p {
          margin: 0;
          color: rgba(255, 255, 255, 0.56);
          font-size: 0.9rem;
        }

        .wavee-sub-promo-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.7rem;
        }

        .wavee-sub-promo-form input {
          min-height: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.22);
          color: #fff;
          padding: 0.85rem 1rem;
          outline: none;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .wavee-sub-promo-form button,
        .wavee-sub-plan button,
        .wavee-sub-payment-stub,
        .wavee-sub-modal-card button {
          min-height: 3rem;
          border: 0;
          border-radius: 999px;
          background: #92A9E1;
          color: #08101d;
          padding: 0.8rem 1.25rem;
          font-weight: 800;
          cursor: pointer;
        }

        .wavee-sub-promo-form button:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .wavee-sub-notice,
        .wavee-sub-error,
        .wavee-sub-loading {
          border-radius: 16px;
          padding: 0.85rem 1rem;
          font-size: 0.9rem;
          font-weight: 650;
        }

        .wavee-sub-notice {
          background: rgba(146, 169, 225, 0.12);
          color: #dbe5ff;
        }

        .wavee-sub-error {
          background: rgba(248, 113, 113, 0.11);
          color: #fecaca;
        }

        .wavee-sub-payment-stub {
          width: fit-content;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .wavee-sub-plans-section {
          display: grid;
          gap: 1rem;
        }

        .wavee-sub-plans-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 1rem;
          padding: 0.75rem 0.25rem;
        }

        .wavee-sub-plans-head h2 {
          font-size: clamp(1.7rem, 3.2vw, 2.7rem);
        }

        .wavee-sub-toggle {
          display: flex;
          gap: 0.3rem;
          padding: 0.35rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .wavee-sub-toggle button {
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: rgba(255, 255, 255, 0.56);
          padding: 0.7rem 1rem;
          cursor: pointer;
          font-weight: 750;
        }

        .wavee-sub-toggle button.is-active {
          background: #ffffff;
          color: #08090b;
        }

        .wavee-sub-plans {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          align-items: stretch;
        }

        .wavee-sub-plan {
          min-height: 470px;
          border-radius: 28px;
          padding: 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .wavee-sub-plan.is-featured {
          border-color: rgba(146, 169, 225, 0.38);
          background: linear-gradient(180deg, rgba(146, 169, 225, 0.13), rgba(18, 19, 21, 0.74));
        }

        .wavee-sub-plan.is-active {
          box-shadow: 0 0 0 1px rgba(146, 169, 225, 0.5), 0 20px 44px rgba(0, 0, 0, 0.22);
        }

        .wavee-sub-plan-head {
          display: flex;
          justify-content: space-between;
          gap: 0.8rem;
          align-items: flex-start;
        }

        .wavee-sub-plan h3 {
          margin: 0 0 0.45rem;
          font-size: 1.45rem;
        }

        .wavee-sub-plan p {
          margin: 0;
          color: rgba(255, 255, 255, 0.56);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .wavee-sub-plan-head span {
          border-radius: 999px;
          background: #92A9E1;
          color: #08101d;
          padding: 0.35rem 0.65rem;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .wavee-sub-price strong {
          font-size: 2.4rem;
        }

        .wavee-sub-price small {
          color: rgba(255, 255, 255, 0.44);
          margin-left: 0.35rem;
        }

        .wavee-sub-plan ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.85rem;
          flex: 1;
        }

        .wavee-sub-plan li {
          display: flex;
          gap: 0.65rem;
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.92rem;
        }

        .wavee-sub-plan li svg {
          color: #92A9E1;
          flex: 0 0 auto;
          margin-top: 0.08rem;
        }

        .wavee-sub-plan button {
          width: 100%;
        }

        .wavee-sub-modal {
          position: fixed;
          inset: 0;
          z-index: 160;
          display: grid;
          place-items: center;
          padding: 1.5rem;
        }

        .wavee-sub-modal-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(14px);
        }

        .wavee-sub-modal-panel {
          position: relative;
          z-index: 1;
          width: min(100%, 440px);
        }

        .wavee-sub-modal-close {
          position: absolute;
          top: -12px;
          right: -12px;
          z-index: 2;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: #111118;
          color: #fff;
          cursor: pointer;
        }

        .wavee-sub-modal-card {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          background: #111118;
          padding: 2rem;
          display: grid;
          gap: 1rem;
        }

        .wavee-sub-modal-card h2,
        .wavee-sub-modal-card p {
          margin: 0;
        }

        .wavee-sub-modal-card p {
          color: rgba(255, 255, 255, 0.62);
          line-height: 1.55;
        }

        @media (max-width: 920px) {
          .wavee-sub-hero,
          .wavee-sub-grid,
          .wavee-sub-plans {
            grid-template-columns: 1fr;
          }

          .wavee-sub-plans-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .wavee-sub-promo-form {
            grid-template-columns: 1fr;
          }

          .wavee-sub-toggle {
            width: 100%;
          }

          .wavee-sub-toggle button {
            flex: 1;
          }
        }
      `})]})}export{J as default};
