// app.js — Калкулатор за данок при увоз на возила во Македонија (ДДВ + ДМВ)
//
// Правна основа:
//   • Закон за данок на моторни возила (Сл. весник на РСМ бр. 261/19)
//   • Уредба за пресметка на ДМВ (2019)
//   • Уредба за изменување (Сл. весник на РСМ бр. 220, 19.10.2023)
//
// Забелешка за 2026: коефициентите кCO2 подолу се ВАЖЕЧКИТЕ вредности од
// изменувањето во 2023 година. Тие веќе ги заменуваат вредностите од 2019,
// па ескалацијата „+25% / +50% по 2022 год.“ од уредбата од 2019 НЕ се
// применува дополнително (би било двојно сметање).

'use strict';

// ── Константи ────────────────────────────────────────────────────────────
// Фиксен среден курс на НБРМ (приближно). 1 EUR = 61.5 MKD.
const EXCHANGE_RATE = 61.5;

// Стапка на ДДВ (18%).
const VAT_RATE = 0.18;

// Фиксни трошоци за транспорт во евра (приближна проценка).
const TRANSPORT_COSTS = {
    drive: 300, // возење на возилото
    tow: 750,   // шлеп / камион
};

// ── Табела 1: процент на вредност на возилото (пВВ) ──────────────────────
// [долна_граница, горна_граница, процент]
const VALUE_TIERS = [
    [0, 10000, 0.00],
    [10001, 12000, 0.01],
    [12001, 14000, 0.02],
    [14001, 16000, 0.04],
    [16001, 18000, 0.06],
    [18001, 20000, 0.08],
    [20001, 23000, 0.10],
    [23001, 26000, 0.12],
    [26001, 29000, 0.14],
    [29001, 32000, 0.16],
    [32001, 35000, 0.17],
    [35001, 40000, 0.18],
    [40001, 50000, 0.19],
    [50001, Infinity, 0.20],
];

// ── Табела 2: коефициент кCO2 (изменување 2023) ──────────────────────────
// [долна_граница, горна_граница, коефициент] во денари по грам CO2/km.
const CO2_TIERS = {
    benzin: [
        [0, 0, 0],
        [1, 63, 8],
        [64, 94, 15],
        [95, 113, 30],
        [114, 123, 45],
        [124, 135, 60],
        [136, 153, 75],
        [154, 160, 105],
        [161, 172, 180],
        [173, 188, 265],
        [189, 210, 390],
        [211, 249, 495],
        [250, 282, 590],
        [283, Infinity, 695],
    ],
    dizel: [
        [0, 0, 0],
        [1, 63, 15],
        [64, 94, 30],
        [95, 113, 60],
        [114, 123, 90],
        [124, 135, 120],
        [136, 153, 150],
        [154, 160, 195],
        [161, 172, 270],
        [173, 188, 375],
        [189, 210, 510],
        [211, 249, 605],
        [250, 282, 750],
        [283, Infinity, 880],
    ],
};

// ── Помошни функции за пресметка ─────────────────────────────────────────
function getValueRate(carValue) {
    for (const [low, high, rate] of VALUE_TIERS) {
        if (carValue >= low && carValue <= high) return rate;
    }
    return 0;
}

function getCO2Coefficient(co2Emissions, fuelType) {
    const tiers = fuelType === 'dizel' ? CO2_TIERS.dizel : CO2_TIERS.benzin;
    for (const [low, high, coefficient] of tiers) {
        if (co2Emissions >= low && co2Emissions <= high) return coefficient;
    }
    return 0;
}

// Главна пресметка. Враќа разбивка на сите ставки во евра.
//   ДМВ = (ВМВ × пВВ) × курс + CO2 × кCO2   (во денари)
function calculate({ carValue, transport, co2, fuelType }) {
    const valueRate = getValueRate(carValue);
    const co2Coef = getCO2Coefficient(co2, fuelType);

    const dmvDenars = (carValue * valueRate) * EXCHANGE_RATE + (co2 * co2Coef);
    const dmvEur = dmvDenars / EXCHANGE_RATE;

    // Основа за ДДВ: вредност на возило + транспорт + ДМВ.
    const vatBase = carValue + transport + dmvEur;
    const vat = vatBase * VAT_RATE;
    const total = vatBase + vat; // вкупна цена со возилото

    return {
        valueRate,
        co2Coef,
        dmvEur,
        dmvDenars,
        vat,
        total,
        // Износ за плаќање над купената цена на возилото (транспорт + ДМВ + ДДВ).
        toPay: total - carValue,
    };
}

// ── Помошни функции за форматирање / парсирање ───────────────────────────
function parseAmount(value) {
    return parseInt(String(value).replace(/[^0-9]/g, ''), 10);
}

function formatEur(amount) {
    return Math.round(amount).toLocaleString('mk-MK') + ' €';
}

// Додава разделувач на илјади додека корисникот пишува.
function attachThousandsFormatter(input) {
    input.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
}

// ── UI ───────────────────────────────────────────────────────────────────
function showError(message) {
    const box = document.getElementById('form-error');
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
}

function clearError() {
    const box = document.getElementById('form-error');
    if (box) box.hidden = true;
}

function renderResult(inputs, result, fuelLabel, transportLabel) {
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    set('res-headline', formatEur(result.toPay));
    set('res-car-value', formatEur(inputs.carValue));
    set('res-transport', formatEur(inputs.transport) + ` (${transportLabel})`);
    set('res-co2', inputs.co2 + ' g/km' + (result.co2Coef ? ` · ${result.co2Coef} ден/g` : ''));
    set('res-fuel', fuelLabel);
    set('res-value-rate', (result.valueRate * 100).toFixed(0) + ' %');
    set('res-dmv', formatEur(result.dmvEur));
    set('res-vat', formatEur(result.vat));
    set('res-total', formatEur(result.total));

    const section = document.getElementById('result');
    if (section) {
        section.hidden = false;
        section.classList.remove('result--enter');
        // повторно активирај ја анимацијата
        void section.offsetWidth;
        section.classList.add('result--enter');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function handleSubmit(event) {
    event.preventDefault();
    clearError();

    const carValue = parseAmount(document.getElementById('car_value').value);
    const co2 = parseAmount(document.getElementById('co2_emissions').value);
    const transportKey = document.getElementById('transportation_cost').value;
    const fuelType = document.querySelector('input[name="fuel_type"]:checked')?.value;

    const transport = TRANSPORT_COSTS[transportKey];

    if (!Number.isFinite(carValue) || carValue <= 0) {
        return showError('Внесете валидна вредност на возилото (поголема од 0).');
    }
    if (!Number.isFinite(co2) || co2 < 0) {
        return showError('Внесете валидна емисија на CO2 (0 или повеќе).');
    }
    if (!transport) {
        return showError('Изберете начин на транспорт.');
    }

    const inputs = { carValue, transport, co2, fuelType };
    const result = calculate(inputs);

    const fuelLabel = fuelType === 'dizel' ? 'Дизел' : 'Бензин';
    const transportLabel = transportKey === 'tow' ? 'шлеп/камион' : 'возење';
    renderResult(inputs, result, fuelLabel, transportLabel);
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const rateEl = document.getElementById('exchange-rate-value');
        if (rateEl) rateEl.textContent = EXCHANGE_RATE.toFixed(1);

        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        document.querySelectorAll('.numeric-input').forEach(attachThousandsFormatter);

        const form = document.getElementById('tax-form');
        if (form) form.addEventListener('submit', handleSubmit);
    });
}

// Експортирање за тестирање во Node (не влијае на прелистувачот).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculate, getValueRate, getCO2Coefficient, EXCHANGE_RATE, VAT_RATE, TRANSPORT_COSTS };
}
