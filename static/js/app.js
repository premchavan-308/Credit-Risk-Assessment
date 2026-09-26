const form = document.getElementById('applicant-form');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');
const errorMessage = document.getElementById('error-message');
const resultEmpty = document.getElementById('result-empty');
const resultContent = document.getElementById('result-content');
const gaugeValue = document.getElementById('gauge-value');
const gaugePercent = document.getElementById('gauge-percent');
const verdictBadge = document.getElementById('verdict-badge');
const verdictDetail = document.getElementById('verdict-detail');
const driverList = document.getElementById('driver-list');
const driverEmpty = document.getElementById('driver-empty');
const thresholdValue = document.getElementById('threshold-value');

const incomeInput = document.getElementById('person_income');
const amountInput = document.getElementById('loan_amnt');
const ratioInput = document.getElementById('loan_percent_income');

// ---- Live field validation ------------------------------------------
// A field only shows as invalid after the user has actually left it —
// scolding someone before they've typed anything isn't feedback, it's noise.
form.querySelectorAll('input, select').forEach((field) => {
  field.addEventListener('blur', () => field.classList.add('touched'));
});

// Keep the loan/income ratio in sync automatically, but let the user
// override it by hand — it stops auto-updating once they've touched it
// directly, and resumes if they clear the form.
let ratioTouchedManually = false;
ratioInput.addEventListener('input', () => { ratioTouchedManually = true; });

function syncRatio() {
  if (ratioTouchedManually) return;
  const income = parseFloat(incomeInput.value);
  const amount = parseFloat(amountInput.value);
  if (income > 0 && amount >= 0) {
    ratioInput.value = (amount / income).toFixed(2);
  }
}
incomeInput.addEventListener('input', syncRatio);
amountInput.addEventListener('input', syncRatio);
syncRatio();

// ---- Gauge ----------------------------------------------------------

const gaugeLength = gaugeValue.getTotalLength();
gaugeValue.style.strokeDasharray = `${gaugeLength}`;
gaugeValue.style.strokeDashoffset = `${gaugeLength}`;

// Eases a number from `from` to `to` over `duration` ms, writing the
// result into `el` — used so the gauge's percentage counts up in step
// with the arc drawing in, instead of just snapping to the final value.
function animateNumber(el, from, to, duration, formatter) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = formatter(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let currentGaugeValue = 0;

function setGauge(probability, isHighRisk) {
  const clamped = Math.max(0, Math.min(1, probability));
  const offset = gaugeLength * (1 - clamped);
  gaugeValue.style.stroke = isHighRisk ? 'var(--risk-high)' : 'var(--gold)';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => {
    gaugeValue.style.strokeDashoffset = `${offset}`;
  });

  if (prefersReducedMotion) {
    gaugePercent.textContent = `${Math.round(clamped * 100)}%`;
  } else {
    animateNumber(gaugePercent, currentGaugeValue * 100, clamped * 100, 1000, (v) => `${Math.round(v)}%`);
  }
  currentGaugeValue = clamped;
}

// ---- Driver bars (SHAP contributions) --------------------------------

function formatFeatureName(name) {
  return name
    .replace(/^feature_/, 'input ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderDrivers(factors) {
  driverList.innerHTML = '';
  if (!factors || factors.length === 0) {
    driverEmpty.hidden = false;
    return;
  }
  driverEmpty.hidden = true;

  const maxImpact = Math.max(...factors.map((f) => Math.abs(f.impact)), 0.0001);

  factors.forEach((f) => {
    const increases = f.impact > 0;
    const li = document.createElement('li');
    li.className = 'driver-item';
    li.innerHTML = `
      <div class="driver-label">
        <span>${formatFeatureName(f.feature)}</span>
        <span class="driver-direction ${increases ? 'up' : 'down'}">${increases ? '▲ increases risk' : '▼ lowers risk'}</span>
      </div>
      <div class="driver-track">
        <div class="driver-bar ${increases ? 'up' : 'down'}" style="width:0%"></div>
      </div>
    `;
    driverList.appendChild(li);
    const bar = li.querySelector('.driver-bar');
    const widthPct = (Math.abs(f.impact) / maxImpact) * 100;
    requestAnimationFrame(() => {
      bar.style.width = `${widthPct}%`;
    });
  });
}

// ---- Submit -----------------------------------------------------------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  if (!form.checkValidity()) {
    form.querySelectorAll('input, select').forEach((field) => field.classList.add('touched'));
    form.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Assessing…';

  const data = new FormData(form);
  const payload = {
    person_age: Number(data.get('person_age')),
    person_income: Number(data.get('person_income')),
    person_home_ownership: data.get('person_home_ownership'),
    person_emp_length: Number(data.get('person_emp_length')),
    loan_intent: data.get('loan_intent'),
    loan_grade: data.get('loan_grade'),
    loan_amnt: Number(data.get('loan_amnt')),
    loan_int_rate: Number(data.get('loan_int_rate')),
    loan_percent_income: Number(data.get('loan_percent_income')),
    cb_person_default_on_file: data.get('cb_person_default_on_file'),
    cb_person_cred_hist_length: Number(data.get('cb_person_cred_hist_length')),
  };

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        detail = body.detail ? JSON.stringify(body.detail) : detail;
      } catch (_) { /* response wasn't JSON */ }
      throw new Error(detail);
    }

    const result = await response.json();
    const isHighRisk = result.default_prediction === 1;

    resultEmpty.hidden = true;
    resultContent.hidden = false;

    setGauge(result.default_probability, isHighRisk);

    verdictBadge.textContent = result.Result;
    verdictBadge.dataset.risk = isHighRisk ? 'high' : 'low';
    animateNumber(
      verdictDetail,
      0,
      result.default_probability * 100,
      1000,
      (v) => `Probability of default: ${v.toFixed(1)}%`
    );

    thresholdValue.textContent = typeof result.threshold === 'number'
      ? result.threshold.toFixed(2)
      : '—';

    renderDrivers(result.top_factors);
  } catch (err) {
    errorMessage.textContent = `Couldn't complete the assessment — ${err.message}`;
    errorMessage.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Run assessment';
  }
});

resetBtn.addEventListener('click', () => {
  form.reset();
  form.querySelectorAll('input, select').forEach((field) => field.classList.remove('touched'));
  ratioTouchedManually = false;
  syncRatio();
  currentGaugeValue = 0;
  gaugeValue.style.strokeDashoffset = `${gaugeLength}`;
  resultContent.hidden = true;
  resultEmpty.hidden = false;
  errorMessage.hidden = true;
});
