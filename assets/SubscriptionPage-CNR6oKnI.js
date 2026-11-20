import{a as F,e as M,j as e}from"./index-DAKRxL2U.js";import{u as U,b as r,f as _}from"./router-DwhAeopF.js";import{g as W,S as Y,f as P}from"./subscriptionPlans-dJ-S9RHe.js";import{c as q}from"./createLucideIcon-GO1cmjYo.js";import{X as $}from"./x-Ca0yeSrG.js";import{C as O}from"./check-DVbN6DxH.js";import"./react-vendor-CJiko70M.js";const V=[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]],T=q("key-round",V);function H(a){if(!a)return"без даты окончания";const s=new Date(a);return Number.isFinite(s.getTime())?s.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"без даты окончания"}function K(a){if(!a)return null;const s=new Date(a);if(!Number.isFinite(s.getTime()))return null;const i=s.getTime()-Date.now();return i<=0?0:Math.ceil(i/(1e3*60*60*24))}function G(a){if(a==null)return"";if(a<=0)return"истекает сегодня";const s=a%10,i=a%100;return s===1&&i!==11?`${a} день`:s>=2&&s<=4&&(i<12||i>14)?`${a} дня`:`${a} дней`}function J({open:a,plan:s,billingCycle:i,isCurrentPlan:x,isAuthenticated:l,promoCode:b,onPromoCodeChange:o,onRedeem:f,redeeming:t,notice:m,error:h,onSignIn:y,onClose:c}){const w=r.useRef(null);if(r.useEffect(()=>{if(!a||typeof document>"u")return;const j=document.documentElement.style.overflow,N=document.body.style.overflow;document.documentElement.style.overflow="hidden",document.body.style.overflow="hidden";const g=v=>{v.key==="Escape"&&c()};window.addEventListener("keydown",g);const z=window.setTimeout(()=>{w.current?.focus()},60);return()=>{document.documentElement.style.overflow=j,document.body.style.overflow=N,window.removeEventListener("keydown",g),window.clearTimeout(z)}},[a,c]),!a||!s||typeof document>"u")return null;const S=i==="monthly"?s.monthlyPriceRub:s.yearlyPriceRub,k=i==="monthly"?"/ мес":"/ год";return _.createPortal(e.jsxs("div",{className:"wavee-sub-modal",role:"dialog","aria-modal":"true","aria-labelledby":"wavee-sub-modal-title",children:[e.jsx("button",{type:"button",className:"wavee-sub-modal-backdrop",onClick:c,"aria-label":"Закрыть окно"}),e.jsxs("div",{className:"wavee-sub-modal-card",children:[e.jsxs("div",{className:"wavee-sub-modal-top",children:[e.jsxs("div",{children:[e.jsxs("p",{className:"wavee-sub-modal-meta",children:[x?"Текущий тариф":"Активация тарифа",e.jsx("span",{"aria-hidden":"true",children:" · "}),e.jsxs("span",{className:"wavee-sub-tabular",children:[P(S)," ",k]})]}),e.jsx("h2",{id:"wavee-sub-modal-title",children:s.name})]}),e.jsx("button",{type:"button",className:"wavee-sub-modal-close",onClick:c,"aria-label":"Закрыть",children:e.jsx($,{size:18})})]}),e.jsxs("p",{className:"wavee-sub-modal-copy",children:["Онлайн-оплата скоро заработает. Сейчас ",s.name," активируется по промокоду:"]}),l?e.jsxs("form",{className:"wavee-sub-modal-form",onSubmit:f,children:[e.jsxs("div",{className:"wavee-sub-input-shell",children:[e.jsx(T,{size:16,className:"wavee-sub-input-icon","aria-hidden":"true"}),e.jsx("input",{ref:w,value:b,onChange:j=>o(j.target.value.toUpperCase()),placeholder:"WAVEE-XXXX-XXXX",autoCapitalize:"characters",autoComplete:"off",spellCheck:!1,"aria-label":"Промокод"}),b?e.jsx("button",{type:"button",className:"wavee-sub-input-clear",onClick:()=>o(""),"aria-label":"Очистить поле",children:e.jsx($,{size:14})}):null]}),e.jsx("button",{type:"submit",className:"wavee-sub-btn-primary",disabled:t||!b.trim(),children:t?"Активация...":"Активировать промокод"})]}):e.jsx("div",{className:"wavee-sub-modal-auth",children:e.jsx("button",{type:"button",className:"wavee-sub-btn-primary",onClick:y,children:"Войти в аккаунт"})}),m?e.jsx("div",{className:"wavee-sub-feedback is-success",role:"status",children:m}):null,h?e.jsx("div",{className:"wavee-sub-feedback is-error",role:"alert",children:h}):null]})]}),document.body)}function Q({plan:a,active:s,billingCycle:i,onSelect:x}){const l=a.id==="pro",b=a.id==="infinite",o=i==="yearly",f=o?Math.round(a.yearlyPriceRub/12):a.monthlyPriceRub,t=Math.max(0,a.monthlyPriceRub*12-a.yearlyPriceRub);return e.jsxs("article",{className:`wavee-sub-plan${l?" is-featured":""}${b?" is-infinite":""}${s?" is-active":""}`,children:[e.jsxs("div",{className:"wavee-sub-plan-head",children:[e.jsxs("div",{className:"wavee-sub-plan-title-row",children:[e.jsx("h3",{children:a.label}),s?e.jsx("span",{className:"wavee-sub-plan-tag is-current",children:"Активен"}):a.badge?e.jsx("span",{className:"wavee-sub-plan-tag",children:a.badge}):null]}),e.jsx("p",{className:"wavee-sub-plan-tagline",children:a.tagline})]}),e.jsxs("div",{className:"wavee-sub-price-block",children:[e.jsxs("div",{className:"wavee-sub-price",children:[e.jsx("strong",{className:"wavee-sub-tabular",children:P(f)}),e.jsx("span",{children:"/ мес"})]}),e.jsx("p",{className:"wavee-sub-price-note wavee-sub-tabular",children:o?`${P(a.yearlyPriceRub)} в год · выгода ${P(t)}`:"При помесячной оплате"})]}),e.jsx("div",{className:"wavee-sub-divider","aria-hidden":"true"}),e.jsx("ul",{className:"wavee-sub-features",children:a.features.map(m=>e.jsxs("li",{children:[e.jsx(O,{size:16,className:"wavee-sub-feature-icon","aria-hidden":"true"}),e.jsx("span",{children:m})]},m))}),e.jsx("button",{type:"button",className:`wavee-sub-plan-cta${l&&!s?" is-primary":""}${s?" is-current":""}`,onClick:()=>x(a),children:s?"Продлить тариф":a.cta})]})}function Z(){return e.jsx("div",{className:"wavee-sub-plans","aria-busy":"true","aria-label":"Загрузка тарифов",children:[0,1,2].map(a=>e.jsxs("div",{className:`wavee-sub-plan is-skeleton${a===1?" is-featured":""}`,children:[e.jsx("div",{className:"wavee-sub-skel-line is-sm"}),e.jsx("div",{className:"wavee-sub-skel-line is-md"}),e.jsx("div",{className:"wavee-sub-skel-line is-lg"}),e.jsx("div",{className:"wavee-sub-divider"}),e.jsxs("div",{className:"wavee-sub-skel-list",children:[e.jsx("div",{className:"wavee-sub-skel-line"}),e.jsx("div",{className:"wavee-sub-skel-line"}),e.jsx("div",{className:"wavee-sub-skel-line"}),e.jsx("div",{className:"wavee-sub-skel-line is-short"})]}),e.jsx("div",{className:"wavee-sub-skel-btn"})]},a))})}function te(){const a=U(),{accessToken:s,accessState:i,refreshSessionState:x}=F(),[l,b]=r.useState("monthly"),[o,f]=r.useState(null),[t,m]=r.useState(""),[h,y]=r.useState(""),[c,w]=r.useState(""),[S,k]=r.useState(""),[j,N]=r.useState(!0),[g,z]=r.useState(!1),[v,E]=r.useState(null),u=o?.subscription??i?.subscription??null,R=o?.audioSourceAccess??o?.access?.audioSourceAccess??i?.audioSourceAccess??null,B=r.useMemo(()=>W(u?.planId),[u?.planId]),d=u?.status==="active",D=r.useMemo(()=>d?K(u?.currentPeriodEnd):null,[d,u?.currentPeriodEnd]),X=r.useCallback(async()=>{if(!s){N(!1),k("");return}N(!0),k("");try{const n=await M.getSubscription(s);f(n)}catch(n){k(n?.message||"Не удалось обновить статус подписки")}finally{N(!1)}},[s]);r.useEffect(()=>{X()},[X]);const A=n=>{m(n),c&&w(""),h&&y("")},L=async n=>{n.preventDefault();const I=t.trim();if(!I){w("Введите промокод");return}z(!0),w(""),y("");try{const p=await M.redeemPromoCode(I,s);f(C=>({...C??{},subscription:p.subscription??C?.subscription??null,access:p.access??C?.access??null,audioSourceAccess:p.audioSourceAccess??p.access?.audioSourceAccess??C?.audioSourceAccess??null})),m(""),y(p?.kind==="audio_source_key"?p?.message||"Специальный ключ активирован":"Промокод применён — подписка активирована"),await x(s)}catch(p){w(p?.message||"Не удалось активировать промокод")}finally{z(!1)}};return e.jsxs("div",{className:"wavee-sub-page",children:[e.jsxs("header",{className:"wavee-sub-header",children:[e.jsxs("div",{className:"wavee-sub-identity",children:[e.jsxs("div",{className:`wavee-sub-status-line${d?" is-active":""}`,children:[e.jsx("span",{children:d?B?.name||"Wavee":"Нет активного плана"}),d&&u?.currentPeriodEnd?e.jsxs(e.Fragment,{children:[e.jsx("span",{"aria-hidden":"true",children:"·"}),e.jsxs("span",{children:["до ",H(u.currentPeriodEnd)]})]}):null,d&&D!==null?e.jsxs(e.Fragment,{children:[e.jsx("span",{"aria-hidden":"true",children:"·"}),e.jsx("span",{className:"wavee-sub-tabular",children:G(D)})]}):null]}),e.jsx("h1",{children:"Подписка"}),e.jsx("p",{className:"wavee-sub-subtitle",children:d?"Подписка активна. Можно продлить текущий тариф или переключиться на другой по промокоду.":"Выберите подходящий тариф или активируйте промокод."})]}),e.jsxs("div",{className:"wavee-sub-promo-box",children:[e.jsx("span",{className:"wavee-sub-promo-label",children:"Активация промокода или ключа"}),s?e.jsxs("form",{className:"wavee-sub-promo-form",onSubmit:L,children:[e.jsxs("div",{className:"wavee-sub-input-shell",children:[e.jsx(T,{size:16,className:"wavee-sub-input-icon","aria-hidden":"true"}),e.jsx("input",{value:t,onChange:n=>A(n.target.value.toUpperCase()),placeholder:"WAVEE-XXXX-XXXX",autoCapitalize:"characters",autoComplete:"off",spellCheck:!1,"aria-label":"Промокод или ключ"}),t?e.jsx("button",{type:"button",className:"wavee-sub-input-clear",onClick:()=>A(""),"aria-label":"Очистить поле",children:e.jsx($,{size:14})}):null]}),e.jsx("button",{type:"submit",className:"wavee-sub-promo-submit",disabled:g||!t.trim(),children:g?"Проверка...":"Применить"})]}):e.jsxs("div",{className:"wavee-sub-auth-row",children:[e.jsx("span",{children:"Войдите, чтобы активировать код"}),e.jsx("button",{type:"button",className:"wavee-sub-promo-submit",onClick:()=>a("/auth"),children:"Войти"})]}),R?.enabled?e.jsx("div",{className:"wavee-sub-feedback is-success",role:"status",children:R.tier==="admin"?"Выбор источника аудио (SoundCloud / Яндекс): без ограничений":`Выбор источника аудио (SoundCloud / Яндекс): 1 раз в ${R.cooldownSec||10} сек`}):null,h&&!v?e.jsx("div",{className:"wavee-sub-feedback is-success",role:"status",children:h}):null,c&&!v?e.jsx("div",{className:"wavee-sub-feedback is-error",role:"alert",children:c}):null,S?e.jsxs("div",{className:"wavee-sub-feedback is-error",role:"alert",children:[e.jsx("span",{children:S}),e.jsx("button",{type:"button",className:"wavee-sub-retry",onClick:X,children:"Повторить"})]}):null]})]}),e.jsxs("section",{className:"wavee-sub-plans-section","aria-label":"Тарифные планы",children:[e.jsxs("div",{className:"wavee-sub-plans-bar",children:[e.jsx("h2",{children:"Тарифы"}),e.jsxs("div",{className:"wavee-sub-billing-toggle",role:"group","aria-label":"Период оплаты",children:[e.jsx("button",{type:"button",className:l==="monthly"?"is-active":"","aria-pressed":l==="monthly",onClick:()=>b("monthly"),children:"Месяц"}),e.jsxs("button",{type:"button",className:l==="yearly"?"is-active":"","aria-pressed":l==="yearly",onClick:()=>b("yearly"),children:[e.jsx("span",{children:"Год"}),e.jsx("span",{className:"wavee-sub-discount",children:"−20%"})]})]})]}),j?e.jsx(Z,{}):e.jsx("div",{className:"wavee-sub-plans",children:Y.map(n=>e.jsx(Q,{plan:n,billingCycle:l,active:d&&u?.planId===n.id,onSelect:E},n.id))})]}),e.jsx(J,{open:!!v,plan:v,billingCycle:l,isCurrentPlan:!!(d&&v&&u?.planId===v.id),isAuthenticated:!!s,promoCode:t,onPromoCodeChange:A,onRedeem:L,redeeming:g,notice:h,error:c,onSignIn:()=>{E(null),a("/auth")},onClose:()=>E(null)}),e.jsx("style",{children:`
        .wavee-sub-page {
          width: min(1160px, 100%);
          margin: 0 auto;
          padding: 0 0 2.5rem;
          display: flex;
          flex-direction: column;
          gap: clamp(2rem, 4vw, 3.25rem);
        }

        .wavee-sub-tabular {
          font-family: var(--wavee-mono-font);
          font-variant-numeric: tabular-nums;
        }

        /* Header & Status + Promo */
        .wavee-sub-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 430px);
          gap: clamp(1.5rem, 3.5vw, 3.5rem);
          align-items: end;
        }

        .wavee-sub-identity {
          min-width: 0;
        }

        .wavee-sub-status-line {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
        }

        .wavee-sub-status-line.is-active {
          color: var(--wavee-accent);
        }

        .wavee-sub-identity h1 {
          margin: 0;
          font-family: var(--wavee-display-font);
          font-size: clamp(2.4rem, 4.5vw, 3.5rem);
          font-weight: 900;
          line-height: 0.98;
          letter-spacing: -0.04em;
          text-wrap: balance;
          color: #ffffff;
        }

        .wavee-sub-subtitle {
          margin: 0.85rem 0 0;
          max-width: 46ch;
          font-size: 0.98rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.54);
        }

        /* Unified Frosted Chrome Promo Surface */
        .wavee-sub-promo-box {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding: 1.15rem 1.2rem;
          border-radius: 24px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          border: 0;
          box-shadow: none;
        }

        .wavee-sub-promo-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          padding-left: 0.15rem;
        }

        .wavee-sub-promo-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .wavee-sub-input-shell {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          height: 2.85rem;
          padding: 0 0.85rem;
          border-radius: 14px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          border: 0;
          box-shadow: none;
          transition: background-color 160ms ease;
        }

        .wavee-sub-input-shell:focus-within {
          background: var(--wavee-shell-chrome-hover-bg);
          box-shadow: none;
        }

        .wavee-sub-input-icon {
          color: rgba(255, 255, 255, 0.35);
          flex-shrink: 0;
        }

        .wavee-sub-input-shell input {
          flex: 1;
          min-width: 0;
          height: 100%;
          border: 0;
          background: transparent;
          color: #ffffff;
          font-family: var(--wavee-mono-font);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          outline: none;
        }

        .wavee-sub-input-shell input::placeholder {
          color: rgba(255, 255, 255, 0.25);
          font-weight: 500;
        }

        .wavee-sub-input-clear {
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 50%;
          background: var(--wavee-shell-chrome-bg);
          color: rgba(255, 255, 255, 0.7);
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 150ms ease, color 150ms ease;
        }

        .wavee-sub-input-clear:hover {
          background: var(--wavee-shell-chrome-hover-bg);
          color: #ffffff;
        }

        .wavee-sub-promo-submit,
        .wavee-sub-btn-primary {
          height: 2.85rem;
          padding: 0 1.25rem;
          border: 0;
          border-radius: 14px;
          background: var(--wavee-accent);
          color: #090d16;
          font-size: 0.88rem;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms ease, opacity 160ms ease;
        }

        .wavee-sub-promo-submit:hover:not(:disabled),
        .wavee-sub-btn-primary:hover:not(:disabled) {
          background: #a8bcf0;
        }

        .wavee-sub-promo-submit:active:not(:disabled),
        .wavee-sub-btn-primary:active:not(:disabled) {
          transform: scale(0.98);
        }

        .wavee-sub-promo-submit:disabled,
        .wavee-sub-btn-primary:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .wavee-sub-auth-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .wavee-sub-feedback {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.65rem 0.9rem;
          border-radius: 12px;
          font-size: 0.84rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .wavee-sub-feedback.is-success {
          background: rgba(146, 169, 225, 0.14);
          color: #dbe6ff;
        }

        .wavee-sub-feedback.is-error {
          background: rgba(248, 113, 113, 0.12);
          color: #fecaca;
        }

        .wavee-sub-retry {
          border: 0;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          color: #ffffff;
          border-radius: 8px;
          padding: 0.3rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .wavee-sub-retry:hover {
          background: var(--wavee-shell-chrome-hover-bg);
        }

        /* Plans Section */
        .wavee-sub-plans-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .wavee-sub-plans-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .wavee-sub-plans-bar h2 {
          margin: 0;
          font-family: var(--wavee-display-font);
          font-size: clamp(1.35rem, 2.2vw, 1.75rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #ffffff;
        }

        .wavee-sub-billing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.3rem;
          border-radius: 999px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          border: 0;
          box-shadow: none;
        }

        .wavee-sub-billing-toggle button {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 2.35rem;
          padding: 0.45rem 1.05rem;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: rgba(255, 255, 255, 0.56);
          font-size: 0.86rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 180ms ease, color 180ms ease;
        }

        .wavee-sub-billing-toggle button:hover:not(.is-active) {
          color: rgba(255, 255, 255, 0.9);
        }

        .wavee-sub-billing-toggle button.is-active {
          background: var(--wavee-accent);
          color: #090d16;
          font-weight: 700;
        }

        .wavee-sub-discount {
          font-family: var(--wavee-mono-font);
          font-size: 0.76rem;
          opacity: 0.82;
        }

        /* Plan Cards Grid */
        .wavee-sub-plans {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
          align-items: stretch;
        }

        .wavee-sub-plan {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
          padding: 1.75rem;
          border-radius: 28px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          border: 0;
          box-shadow: none;
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease;
        }

        .wavee-sub-plan:hover:not(.is-skeleton) {
          transform: translateY(-2px);
          background: var(--wavee-shell-chrome-hover-bg);
        }

        .wavee-sub-plan.is-featured,
        .wavee-sub-plan.is-infinite,
        .wavee-sub-plan.is-active {
          background: var(--wavee-shell-chrome-bg);
          border: 0;
          box-shadow: none;
        }

        .wavee-sub-plan.is-featured:hover:not(.is-skeleton),
        .wavee-sub-plan.is-infinite:hover:not(.is-skeleton) {
          background: var(--wavee-shell-chrome-hover-bg);
        }

        .wavee-sub-plan-head {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .wavee-sub-plan-title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .wavee-sub-plan-title-row h3 {
          margin: 0;
          font-family: var(--wavee-display-font);
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .wavee-sub-plan-tag {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--wavee-accent);
          white-space: nowrap;
        }

        .wavee-sub-plan-tag.is-current {
          color: #dbe6ff;
        }

        .wavee-sub-plan-tagline {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.5);
          min-height: 2.6em;
        }

        .wavee-sub-price-block {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .wavee-sub-price {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }

        .wavee-sub-price strong {
          font-size: 2.55rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .wavee-sub-price span {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.44);
        }

        .wavee-sub-price-note {
          margin: 0;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.38);
        }

        .wavee-sub-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
        }

        .wavee-sub-features {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.78rem;
          flex: 1;
        }

        .wavee-sub-features li {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: 0.92rem;
          line-height: 1.42;
          color: rgba(255, 255, 255, 0.78);
        }

        .wavee-sub-feature-icon {
          flex-shrink: 0;
          margin-top: 0.18rem;
          color: rgba(255, 255, 255, 0.36);
        }

        .wavee-sub-plan.is-featured .wavee-sub-feature-icon,
        .wavee-sub-plan.is-active .wavee-sub-feature-icon {
          color: var(--wavee-accent);
        }

        .wavee-sub-plan-cta {
          margin-top: 0.35rem;
          width: 100%;
          min-height: 3rem;
          padding: 0.8rem 1.25rem;
          border: 0;
          border-radius: 999px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          box-shadow: none;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 180ms ease, color 180ms ease, transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wavee-sub-plan-cta:hover {
          background: var(--wavee-shell-chrome-hover-bg);
        }

        .wavee-sub-plan-cta:active {
          transform: scale(0.985);
        }

        .wavee-sub-plan-cta.is-primary {
          background: var(--wavee-accent);
          color: #090d16;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .wavee-sub-plan-cta.is-primary:hover {
          background: #a8bcf0;
          box-shadow: none;
        }

        .wavee-sub-plan-cta.is-current {
          background: var(--wavee-shell-chrome-bg);
          color: #dbe6ff;
        }

        .wavee-sub-plan-cta.is-current:hover {
          background: var(--wavee-shell-chrome-hover-bg);
        }

        /* Skeleton Loading */
        .wavee-sub-plan.is-skeleton {
          min-height: 440px;
        }

        .wavee-sub-skel-line,
        .wavee-sub-skel-btn {
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          animation: wavee-sub-pulse 1.5s ease-in-out infinite;
        }

        .wavee-sub-skel-line {
          height: 14px;
          width: 85%;
        }

        .wavee-sub-skel-line.is-sm {
          width: 36%;
          height: 22px;
        }

        .wavee-sub-skel-line.is-md {
          width: 72%;
        }

        .wavee-sub-skel-line.is-lg {
          width: 48%;
          height: 40px;
          margin: 0.4rem 0;
        }

        .wavee-sub-skel-line.is-short {
          width: 62%;
        }

        .wavee-sub-skel-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          flex: 1;
        }

        .wavee-sub-skel-btn {
          height: 3rem;
          width: 100%;
          border-radius: 999px;
          margin-top: auto;
        }

        @keyframes wavee-sub-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }

        /* Modal */
        .wavee-sub-modal {
          position: fixed;
          inset: 0;
          z-index: 160;
          display: grid;
          place-items: center;
          padding: 1.25rem;
        }

        .wavee-sub-modal-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(6, 7, 10, 0.76);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          cursor: pointer;
        }

        .wavee-sub-modal-card {
          position: relative;
          z-index: 1;
          width: min(100%, 440px);
          padding: 1.75rem;
          border-radius: 28px;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          border: 0;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          animation: wavee-sub-modal-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes wavee-sub-modal-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .wavee-sub-modal-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .wavee-sub-modal-meta {
          margin: 0 0 0.35rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--wavee-accent);
        }

        .wavee-sub-modal-top h2 {
          margin: 0;
          font-family: var(--wavee-display-font);
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #ffffff;
        }

        .wavee-sub-modal-close {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: var(--wavee-shell-chrome-bg);
          backdrop-filter: var(--wavee-shell-chrome-blur);
          -webkit-backdrop-filter: var(--wavee-shell-chrome-blur);
          box-shadow: none;
          color: rgba(255, 255, 255, 0.72);
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 150ms ease, color 150ms ease;
        }

        .wavee-sub-modal-close:hover {
          background: var(--wavee-shell-chrome-hover-bg);
          color: #ffffff;
        }

        .wavee-sub-modal-copy {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.58);
        }

        .wavee-sub-modal-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .wavee-sub-modal-auth .wavee-sub-btn-primary {
          width: 100%;
          border-radius: 999px;
        }

        .wavee-sub-modal-form .wavee-sub-btn-primary {
          width: 100%;
          border-radius: 999px;
        }

        @media (max-width: 960px) {
          .wavee-sub-header {
            grid-template-columns: minmax(0, 1fr);
            align-items: start;
          }

          .wavee-sub-plans {
            grid-template-columns: minmax(0, 1fr);
          }

          .wavee-sub-plan-tagline {
            min-height: 0;
          }
        }

        @media (max-width: 560px) {
          .wavee-sub-plans-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .wavee-sub-billing-toggle {
            width: 100%;
          }

          .wavee-sub-billing-toggle button {
            flex: 1;
            justify-content: center;
          }

          .wavee-sub-promo-form {
            flex-direction: column;
            align-items: stretch;
          }

          .wavee-sub-promo-submit {
            width: 100%;
          }
        }
      `})]})}export{te as default};
